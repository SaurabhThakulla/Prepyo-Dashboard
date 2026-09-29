import { api } from '@/lib/api';
import { assignVoices, FALLBACK_LANG, scriptLanguage, splitSentences, splitTurns } from '@/lib/listeningScript';

/**
 * Plays a recording script once, start to finish, without controls: the way an
 * IELTS recording is heard.
 *
 * The browser's own voice speaks it wherever the browser has a working one
 * (Chrome, Edge, Safari). A browser with no voice, or one whose voice never
 * starts (Brave's shields can do either), gets the server's clips (Groq
 * speech) instead. Which one is used is decided by trying, not by the
 * browser's name.
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

/** The browser lists voices, but speech never started. */
export class SpeechUnavailableError extends Error {
  constructor() {
    super('speech did not start');
  }
}

// Once the browser's voice has failed it is not tried again on this page:
// every later recording goes straight to the server's voice.
let voiceBroken = false;

export function browserVoiceBroken(): boolean {
  return voiceBroken;
}

export function markBrowserVoiceBroken(): void {
  voiceBroken = true;
}

/** For tests. */
export function resetBrowserVoice(): void {
  voiceBroken = false;
}

/** Whether the browser can speak, waiting briefly for voices that load late. */
export async function browserCanSpeak(timeoutMs = 1500): Promise<boolean> {
  if (voiceBroken || typeof window === 'undefined' || !window.speechSynthesis) return false;
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
 * never handed over whole. If no sentence ever starts, `done` rejects with a
 * SpeechUnavailableError and the browser's voice is not tried again.
 */
export function speakScript(script: string, onProgress?: (fraction: number) => void): Playback {
  const synth = window.speechSynthesis;
  const turns = splitTurns(script);
  const language = scriptLanguage(script);
  const voices = assignVoices(turns.map(turn => turn.speaker), synth.getVoices(), language);
  const pieces = turns.flatMap(turn => splitSentences(turn.text).map(text => ({ speaker: turn.speaker, text })));
  const total = pieces.reduce((sum, piece) => sum + piece.text.length, 0) || 1;

  let stopped = false;
  let reject: (reason: unknown) => void = () => {};
  // The utterance being spoken is held here: Chrome can collect one that
  // nothing references while it is still speaking, and then its end event
  // never fires and the recording would hang.
  let current: { utterance: SpeechSynthesisUtterance; started: boolean; finish: () => void } | null = null;
  let anyStarted = false;
  let watchdog: ReturnType<typeof setInterval> | undefined;
  const done = new Promise<void>((resolve, fail) => {
    const end = (error?: Error) => {
      clearInterval(watchdog);
      current = null;
      if (error) fail(error);
      else resolve();
    };
    const unavailable = () => {
      voiceBroken = true;
      end(new SpeechUnavailableError());
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
      const voice = voices.get(piece.speaker) ?? synth.getVoices().find(v => v.lang.startsWith(language));
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = FALLBACK_LANG[language];
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
        anyStarted = true;
      };
      utterance.onboundary = event => onProgress?.((spoken + event.charIndex) / total);
      utterance.onend = finish;
      utterance.onerror = event => {
        if (stopped || event.error === 'interrupted' || event.error === 'canceled') return;
        if (!anyStarted) unavailable();
        else end(new Error(`speech failed: ${event.error}`));
      };
      synth.speak(utterance);
    };

    // The engine can also go quiet without an end event. Quiet for a moment
    // after a sentence began counts as its end. Nothing ever starting means
    // the voice does not work here.
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
      else if (!anyStarted) unavailable();
      else end(new Error('speech stopped part-way'));
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

// Every server clip plays through this one element. iOS lets audio start only
// from a tap; an element that has played once from a tap may then play again
// later, after a countdown or a fetch, when a new element would be refused.
let clipAudio: HTMLAudioElement | null = null;
let activeClips: Playback | null = null;

function clipElement(): HTMLAudioElement {
  if (!clipAudio) clipAudio = new Audio();
  return clipAudio;
}

let silenceUrl: string | null = null;

/** A tenth of a second of silence, as a WAV, for unlocking the clip element. */
function silence(): string {
  if (silenceUrl) return silenceUrl;
  const samples = 800;
  const bytes = new Uint8Array(44 + samples);
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + samples, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, 8000, true); // sample rate
  view.setUint32(28, 8000, true); // byte rate
  view.setUint16(32, 1, true); // block align
  view.setUint16(34, 8, true); // bits per sample
  ascii(36, 'data');
  view.setUint32(40, samples, true);
  bytes.fill(128, 44); // silence in 8-bit PCM
  silenceUrl = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
  return silenceUrl;
}

/**
 * Call from a tap or click, before anything that waits. iOS Safari lets speech
 * and audio start only inside a gesture; saying nothing and playing silence
 * here lets a recording that starts later (after reading time, or a fetch)
 * play by itself.
 */
export function unlockAudio(): void {
  if (typeof window === 'undefined') return;
  try {
    const synth = window.speechSynthesis;
    if (synth && !voiceBroken && !synth.speaking && !synth.pending) {
      const hush = new SpeechSynthesisUtterance(' ');
      hush.volume = 0;
      synth.speak(hush);
    }
  } catch {
    // Nothing to unlock.
  }
  try {
    const audio = clipElement();
    if (audio.paused) {
      audio.src = silence();
      void audio.play()?.catch(() => {});
    }
  } catch {
    // Nothing to unlock.
  }
}

/** Plays server clips one after another, fetching the next while one plays. */
export function playClips(segments: Segment[], onProgress?: (fraction: number) => void): Playback {
  // One recording at a time: a new one stops whatever was playing.
  activeClips?.stop();
  const audio = clipElement();
  let stopped = false;
  let reject: (reason: unknown) => void = () => {};
  const detach = () => {
    audio.ontimeupdate = null;
    audio.onended = null;
    audio.onerror = null;
  };
  const done = new Promise<void>((resolve, fail) => {
    reject = fail;
    const next = (index: number) => {
      if (stopped) return;
      const segment = segments[index];
      if (!segment) {
        detach();
        onProgress?.(1);
        resolve();
        return;
      }
      const following = segments[index + 1];
      if (following) void fetch(following.url, { credentials: 'include' }).catch(() => {});
      audio.ontimeupdate = () => {
        if (audio.duration) onProgress?.((index + audio.currentTime / audio.duration) / segments.length);
      };
      audio.onended = () => next(index + 1);
      audio.onerror = () => {
        detach();
        fail(new Error('clip failed'));
      };
      audio.src = segment.url;
      audio.play().catch(error => {
        detach();
        fail(error);
      });
    };
    next(0);
  });
  const playback: Playback = {
    done,
    stop: () => {
      if (stopped) return;
      stopped = true;
      if (activeClips === playback) {
        detach();
        audio.pause();
        activeClips = null;
      }
      reject(new StoppedError());
    },
  };
  activeClips = playback;
  return playback;
}

/**
 * Plays `first`; if the browser's voice turns out not to work, plays `second`
 * instead, from the start, since nothing was heard.
 */
function orElse(first: Playback, second: () => Promise<Playback>): Playback {
  let active = first;
  let stopped = false;
  const done = first.done.catch(async (error: unknown) => {
    if (stopped || !(error instanceof SpeechUnavailableError)) throw error;
    const fallback = await second();
    active = fallback;
    if (stopped) {
      fallback.stop();
      throw new StoppedError();
    }
    return fallback.done;
  });
  return {
    done,
    stop: () => {
      if (stopped) return;
      stopped = true;
      active.stop();
    },
  };
}

type RecordingSource = { audioUrl: string } & ({ script: string } | { scriptUrl: string });

/**
 * Plays a recording: the browser's voice where it works, otherwise the
 * server's clips from `audioUrl`. The script is given, or fetched from
 * `scriptUrl` only when the browser will speak it.
 */
export async function playRecording(source: RecordingSource, onProgress?: (fraction: number) => void): Promise<Playback> {
  const fromServer = async () => {
    const { segments } = await api.get<{ segments: Segment[] }>(source.audioUrl);
    return playClips(segments ?? [], onProgress);
  };
  if (!(await browserCanSpeak())) return fromServer();
  const script = 'script' in source ? source.script : (await api.get<{ script: string }>(source.scriptUrl)).script;
  return orElse(speakScript(script, onProgress), fromServer);
}
