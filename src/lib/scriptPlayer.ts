import { api } from '@/lib/api';
import { assignVoices, splitSentences, splitTurns } from '@/lib/listeningScript';

/**
 * Plays a recording script once, start to finish, without controls: the way an
 * IELTS recording is heard. The browser's own voices speak it where the
 * browser has them; otherwise the server's clips (Groq speech) are played.
 */
export interface Playback {
  /** Resolves when the recording has played to the end. */
  done: Promise<void>;
  /** Stops playback; `done` then rejects with a StoppedError. */
  stop: () => void;
}

export class StoppedError extends Error {
  constructor() {
    super('stopped');
  }
}

/** Whether the browser can speak, waiting briefly for voices that load late. */
export async function browserCanSpeak(timeoutMs = 1500): Promise<boolean> {
  if (typeof window === 'undefined' || !window.speechSynthesis) return false;
  const synth = window.speechSynthesis;
  if (synth.getVoices?.().length) return true;
  return new Promise(resolve => {
    const done = (value: boolean) => {
      synth.removeEventListener?.('voiceschanged', onChange);
      clearTimeout(timer);
      resolve(value);
    };
    const onChange = () => {
      if (synth.getVoices?.().length) done(true);
    };
    synth.addEventListener?.('voiceschanged', onChange);
    const timer = setTimeout(() => done(Boolean(synth.getVoices?.().length)), timeoutMs);
  });
}

/**
 * Speaks a script in the browser: one voice per speaker, labels not spoken,
 * sentence by sentence. Chrome cuts long utterances off part-way, so a turn is
 * never handed over whole.
 */
export function speakScript(script: string, onProgress?: (fraction: number) => void): Playback {
  const synth = window.speechSynthesis;
  const turns = splitTurns(script);
  const voices = assignVoices(turns.map(turn => turn.speaker), synth.getVoices());
  const pieces = turns.flatMap(turn => splitSentences(turn.text).map(text => ({ speaker: turn.speaker, text })));
  const total = pieces.reduce((sum, piece) => sum + piece.text.length, 0) || 1;

  let stopped = false;
  let reject: (reason: unknown) => void = () => {};
  // The utterance being spoken is held here: Chrome can collect one that
  // nothing references while it is still speaking, and then its end event
  // never fires and the recording would hang.
  let current: { utterance: SpeechSynthesisUtterance; started: boolean; finish: () => void } | null = null;
  let watchdog: ReturnType<typeof setInterval> | undefined;
  const done = new Promise<void>((resolve, fail) => {
    const end = (error?: Error) => {
      clearInterval(watchdog);
      current = null;
      if (error) fail(error);
      else resolve();
    };
    reject = error => end(error as Error);
    let spoken = 0;
    const next = (index: number) => {
      if (stopped) return;
      const piece = pieces[index];
      if (!piece) {
        onProgress?.(1);
        end();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(piece.text);
      const voice = voices.get(piece.speaker) ?? synth.getVoices().find(v => v.lang.startsWith('en'));
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = 'en-GB';
      }
      utterance.rate = 0.95;
      let finished = false;
      const finish = () => {
        if (finished || stopped) return;
        finished = true;
        spoken += piece.text.length;
        onProgress?.(spoken / total);
        next(index + 1);
      };
      const entry = { utterance, started: false, finish };
      current = entry;
      utterance.onstart = () => {
        entry.started = true;
      };
      utterance.onboundary = event => onProgress?.((spoken + event.charIndex) / total);
      utterance.onend = finish;
      utterance.onerror = event => {
        if (stopped || event.error === 'interrupted' || event.error === 'canceled') return;
        end(new Error(`speech failed: ${event.error}`));
      };
      synth.speak(utterance);
    };

    // The engine can also go quiet without an end event. Quiet for a moment
    // after a sentence began counts as its end; one that never began is a
    // failure, so the caller can fall back rather than wait for ever.
    let quiet = 0;
    watchdog = setInterval(() => {
      if (stopped || !current) return;
      if (synth.speaking || synth.pending) {
        quiet = 0;
        return;
      }
      quiet += 1;
      if (quiet < 4) return;
      quiet = 0;
      if (current.started) current.finish();
      else end(new Error('speech did not start'));
    }, 500);

    // Speaking straight after cancel() can be dropped by Chrome, so only cancel
    // what is actually playing and give the engine a moment.
    if (synth.speaking || synth.pending) synth.cancel();
    setTimeout(() => next(0), 50);
  });
  return {
    done,
    stop: () => {
      if (stopped) return;
      stopped = true;
      synth.cancel();
      reject(new StoppedError());
    },
  };
}

interface Segment {
  url: string;
}

/** Plays server clips one after another, fetching the next while one plays. */
export function playClips(segments: Segment[], onProgress?: (fraction: number) => void): Playback {
  let stopped = false;
  let current: HTMLAudioElement | null = null;
  let reject: (reason: unknown) => void = () => {};
  const done = new Promise<void>((resolve, fail) => {
    reject = fail;
    const next = (index: number) => {
      if (stopped) return;
      const segment = segments[index];
      if (!segment) {
        onProgress?.(1);
        resolve();
        return;
      }
      const following = segments[index + 1];
      if (following) void fetch(following.url, { credentials: 'include' }).catch(() => {});
      const audio = new Audio(segment.url);
      current = audio;
      audio.ontimeupdate = () => {
        if (audio.duration) onProgress?.((index + audio.currentTime / audio.duration) / segments.length);
      };
      audio.onended = () => next(index + 1);
      audio.onerror = () => fail(new Error('clip failed'));
      audio.play().catch(fail);
    };
    next(0);
  });
  return {
    done,
    stop: () => {
      if (stopped) return;
      stopped = true;
      current?.pause();
      reject(new StoppedError());
    },
  };
}

/**
 * Plays a recording from its endpoints: the script for the browser's voice,
 * or the server's clips when the browser cannot speak.
 */
export async function playRecording(
  urls: { scriptUrl: string; audioUrl: string },
  onProgress?: (fraction: number) => void,
): Promise<Playback> {
  if (await browserCanSpeak()) {
    const { script } = await api.get<{ script: string }>(urls.scriptUrl);
    return speakScript(script, onProgress);
  }
  const { segments } = await api.get<{ segments: Segment[] }>(urls.audioUrl);
  return playClips(segments ?? [], onProgress);
}
