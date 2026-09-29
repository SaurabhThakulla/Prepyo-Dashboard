import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, Play, Square, Pause, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { assignVoices, FALLBACK_LANG, scriptLanguage, splitSentences, splitTurns } from '@/lib/listeningScript';
import { browserVoiceBroken, markBrowserVoiceBroken, Playback, playClips, StoppedError, unlockAudio } from '@/lib/scriptPlayer';

interface PromptAudioProps {
  /** A real recording, when the question has one. Always preferred. */
  audioUrl?: string;
  /** The script. Used for synthesis and, on request, shown as text. */
  audioTranscript?: string;
  title: string;
  /** Reset playback even when consecutive questions share the same script. */
  questionId?: string;
  /**
   * Off unless asked for. In most listening tasks the script is the answer —
   * Write from Dictation is the script, and the gaps of Listening Fill in the
   * Blanks are words from it — so callers turn it on only after submission.
   */
  allowTranscript?: boolean;
  /**
   * Called each time the audio plays through to the end. Speaking tasks use it
   * to start recording only once the learner has heard the prompt, as the exam
   * does.
   */
  onFinished?: () => void;
  /**
   * The script is not in the question (IELTS listening sends it on request,
   * because it is the answer key). It is fetched when the learner presses play.
   */
  scriptOnRequest?: boolean;
  /**
   * Play once, as the test does: no stopping, pausing or replaying until the
   * answer has been submitted (allowTranscript), when replay returns.
   */
  singlePlay?: boolean;
  /**
   * How many times one play runs the recording, back to back with a short
   * pause between. EPS-TOPIK plays every listening item twice; with singlePlay
   * that is the learner's whole allowance, as in the test.
   */
  repeat?: number;
  /**
   * Where the script is fetched from when it is not carried inline. Defaults
   * to the question's playback endpoint.
   */
  scriptUrl?: string;
  /**
   * Where the server-spoken clips of the script are listed, for browsers that
   * cannot speak it themselves. Defaults to the question's playback audio.
   */
  serverAudioUrl?: string;
}

/** What the panel says before and after a limited play, for one or two runs. */
function playNotes(repeat: number) {
  return repeat > 1
    ? { done: 'Played twice. In the test you hear each recording twice.', ready: 'Press play when you are ready. It plays twice.' }
    : { done: 'Played once. In the test you hear each recording only once.', ready: 'Press play when you are ready. It plays once.' };
}

/** The gap between two runs of a repeated recording, as between the test's two plays. */
const REPEAT_GAP_MS = 1500;
const PAUSE_SEGMENT = '[[pause]]';
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * The audio a learner listens to before answering.
 *
 * Most seeded questions carry a script but no recording, so the script is
 * spoken by the browser's own voice. That is said plainly rather than dressed
 * up as exam audio: a synthetic voice has none of the accent, pace or
 * background noise a real recording has, and a learner who mistakes one for the
 * other will misjudge how ready they are.
 */
export default function PromptAudio({
  audioUrl,
  audioTranscript,
  title,
  questionId,
  allowTranscript = false,
  onFinished,
  scriptOnRequest = false,
  singlePlay = false,
  repeat = 1,
  scriptUrl,
  serverAudioUrl,
}: PromptAudioProps) {
  const notes = playNotes(repeat);
  const playbackUrl = scriptUrl ?? (questionId ? `/questions/${questionId}/playback` : undefined);
  const spokenUrl = serverAudioUrl ?? (questionId ? `/questions/${questionId}/playback/audio` : undefined);
  const browserVoice = useBrowserVoice();
  // The browser listed voices but none would speak: use the server's voice.
  const [voiceFailed, setVoiceFailed] = useState(browserVoiceBroken);
  // Read through a ref so a new callback each render never restarts playback.
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;
  const [canSpeak, setCanSpeak] = useState(() => typeof window !== 'undefined' && 'speechSynthesis' in window);
  const [speaking, setSpeaking] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const generation = useRef(0);
  const [error, setError] = useState<string | null>(null);
  // 0..1 through the script, from the voice's word boundaries.
  const [progress, setProgress] = useState(0);
  const [finished, setFinished] = useState(false);
  // A script fetched at play time, for items that do not carry one.
  const [fetchedScript, setFetchedScript] = useState<string | null>(null);
  // Once is once: set when playback starts, so stopping early does not earn a
  // second hearing. Lifted after submission.
  const [played, setPlayed] = useState(false);
  const oncePlayed = singlePlay && !allowTranscript && played;

  const script = audioTranscript?.trim() || fetchedScript || undefined;

  /**
   * Voices load asynchronously in Chrome: the first getVoices() returns an
   * empty list and the real one arrives with voiceschanged. Checking only once
   * would hide the player from every learner who loads the page cold.
   */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const check = () => {
      if ('speechSynthesis' in window) {
        setCanSpeak(true);
      }
    };
    check();
    window.speechSynthesis.addEventListener('voiceschanged', check);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', check);
  }, []);

  const cancelPlayback = useCallback(() => {
    generation.current += 1;
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      utteranceRef.current = null;
      window.speechSynthesis?.cancel();
    }
    const context = contextRef.current;
    contextRef.current = null;
    if (context && context.state !== 'closed') void context.close().catch(() => {});
  }, []);

  useEffect(() => {
    cancelPlayback();
    setSpeaking(false);
    setShowTranscript(false);
    setError(null);
    setProgress(0);
    setFinished(false);
    return cancelPlayback;
  }, [questionId, audioTranscript, audioUrl, cancelPlayback]);

  useEffect(() => {
    setFetchedScript(null);
    setPlayed(false);
  }, [questionId]);

  const stop = useCallback(() => {
    cancelPlayback();
    setSpeaking(false);
    setProgress(0);
  }, [cancelPlayback]);

  const speak = useCallback(async () => {
    if (!window.speechSynthesis || oncePlayed) return;
    let text = script;
    if (!text && scriptOnRequest && playbackUrl) {
      // Speech starts after the fetch, outside the tap, which iOS refuses
      // unless the tap has unlocked it.
      unlockAudio();
      try {
        const data = await api.get<{ script: string }>(playbackUrl);
        text = data.script?.trim();
        setFetchedScript(text || null);
      } catch {
        setError("The audio couldn't load. Please try again.");
        return;
      }
    }
    if (!text) return;
    cancelPlayback();
    window.speechSynthesis.cancel();
    const run = generation.current;
    setError(null);
    setSpeaking(true);
    setPlayed(true);
    setFinished(false);
    setProgress(0);
    // Speaker labels are not read aloud: each turn is spoken without its label,
    // in its speaker's own voice. Split markers rather than asking the voice to
    // pronounce "beep". All other text is preserved; changing the script would
    // change what the learner hears.
    const turns = splitTurns(text);
    const language = scriptLanguage(text);
    const voiceFor = assignVoices(turns.map(turn => turn.speaker), window.speechSynthesis.getVoices(), language);
    const segments: string[] = [];
    const speakers: (string | null)[] = [];
    for (let round = 0; round < repeat; round++) {
      if (round > 0) {
        segments.push(PAUSE_SEGMENT);
        speakers.push(null);
      }
      for (const turn of turns) {
        for (const part of turn.text.split(/(\[beep\])/gi).filter(piece => piece.trim())) {
          // Chrome cuts long utterances off part-way, so speech goes sentence
          // by sentence; a beep marker stays a segment of its own.
          const pieces = /^\[beep\]$/i.test(part.trim()) ? [part] : splitSentences(part);
          for (const piece of pieces) {
            segments.push(piece);
            speakers.push(turn.speaker);
          }
        }
      }
    }
    // Where each segment starts, so a word boundary inside one maps onto the
    // whole script for the progress bar.
    const total = segments.reduce((sum, part) => sum + (part === PAUSE_SEGMENT ? 0 : part.length), 0) || 1;
    const starts: number[] = [];
    segments.reduce((sum, part, i) => ((starts[i] = sum), sum + (part === PAUSE_SEGMENT ? 0 : part.length)), 0);
    // Whether the voice has said anything yet. A voice that never starts does
    // not work in this browser (Brave's shields can do this), so the server's
    // voice takes over; nothing was heard, so the one play is not used up.
    let anyStarted = false;
    const fail = () => {
      if (run !== generation.current) return;
      cancelPlayback();
      setSpeaking(false);
      if (!anyStarted && spokenUrl) {
        markBrowserVoiceBroken();
        setPlayed(false);
        setProgress(0);
        setVoiceFailed(true);
        return;
      }
      setError("The audio couldn't play. Check your sound is on and try again.");
    };
    let quiet = 0;
    const watchdog = setInterval(() => {
      if (run !== generation.current || anyStarted) {
        clearInterval(watchdog);
        return;
      }
      const synth = window.speechSynthesis;
      quiet = synth.speaking || synth.pending ? 0 : quiet + 1;
      if (quiet >= 4) {
        clearInterval(watchdog);
        fail();
      }
    }, 500);
    try {
      if (segments.some(part => /^\[beep\]$/i.test(part))) {
        // Create/resume on the Play gesture, not later inside a speech callback.
        const context = new AudioContext();
        contextRef.current = context;
        await context.resume();
        if (run !== generation.current) return;
      }
      const next = (index: number) => {
        if (run !== generation.current) return;
        const segment = segments[index];
        if (!segment) {
          cancelPlayback();
          setSpeaking(false);
          setProgress(1);
          setFinished(true);
          onFinishedRef.current?.();
          return;
        }
        setProgress(starts[index] / total);
        try {
          if (segment === PAUSE_SEGMENT) {
            setTimeout(() => next(index + 1), REPEAT_GAP_MS);
            return;
          }
          if (/^\[beep\]$/i.test(segment)) {
            const context = contextRef.current;
            if (!context || context.state !== 'running') { fail(); return; }
            const tone = context.createOscillator();
            const gain = context.createGain();
            tone.frequency.value = 1000;
            gain.gain.setValueAtTime(0, context.currentTime);
            gain.gain.linearRampToValueAtTime(0.12, context.currentTime + 0.01);
            gain.gain.setValueAtTime(0.12, context.currentTime + 0.3);
            gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.35);
            tone.connect(gain);
            gain.connect(context.destination);
            tone.onended = () => {
              tone.disconnect();
              gain.disconnect();
              next(index + 1);
            };
            tone.start();
            tone.stop(context.currentTime + 0.35);
            return;
          }
          const utterance = new SpeechSynthesisUtterance(segment.trim());
          const voices = window.speechSynthesis.getVoices();
          const voice = voiceFor.get(speakers[index]) ??
            voices.find(candidate => candidate.lang.startsWith(FALLBACK_LANG[language])) ??
            voices.find(candidate => candidate.lang.startsWith(language));
          if (voice) utterance.voice = voice;
          utterance.lang = voice?.lang ?? FALLBACK_LANG[language];
          utterance.rate = 0.95;
          utterance.onstart = () => {
            anyStarted = true;
          };
          utterance.onboundary = event => {
            if (run === generation.current) setProgress((starts[index] + event.charIndex) / total);
          };
          utterance.onend = () => next(index + 1);
          utterance.onerror = fail;
          utteranceRef.current = utterance;
          window.speechSynthesis.speak(utterance);
        } catch { fail(); }
      };
      next(0);
    } catch { fail(); }
  }, [script, scriptOnRequest, playbackUrl, spokenUrl, oncePlayed, cancelPlayback, repeat]);

  if (audioUrl) {
    return (
      <RecordedAudio
        src={audioUrl}
        title={title}
        questionId={questionId}
        singlePlay={singlePlay && !allowTranscript}
        repeat={repeat}
        onFinished={() => onFinishedRef.current?.()}
      />
    );
  }

  if (!script && !scriptOnRequest) return null;

  // A device can have voices and still none in the script's language: many
  // Windows PCs have no Korean voice, and an English one reading Hangul says
  // nothing a learner can use. The server's voice speaks it instead.
  const language = script ? scriptLanguage(script) : 'en';
  const noVoiceForScript =
    browserVoice === 'ready' &&
    language !== 'en' &&
    !window.speechSynthesis.getVoices().some(voice => voice.lang.toLowerCase().startsWith(language));

  // A browser that cannot speak gets the same script spoken on the server.
  if ((!canSpeak || browserVoice === 'none' || voiceFailed || noVoiceForScript) && spokenUrl) {
    return (
      <ServerSpokenAudio
        listUrl={spokenUrl}
        title={title}
        questionId={questionId}
        singlePlay={singlePlay && !allowTranscript}
        repeat={repeat}
        onFinished={() => onFinishedRef.current?.()}
        footer={
          allowTranscript && script ? (
            <p className="text-xs text-foreground italic leading-relaxed border-t border-border pt-2 whitespace-pre-line">
              &ldquo;{script}&rdquo;
            </p>
          ) : null
        }
      />
    );
  }

  // A missing speech API is different from voices still loading.
  if (!canSpeak) {
    return (
      <div className="p-4 rounded-xl bg-background border border-border space-y-1.5">
        <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <Volume2 className="w-4 h-4 text-muted-foreground" /> Listen
        </span>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Audio can't play on this device. Try opening Prepyo in Chrome or Edge.
        </p>
        {allowTranscript && <p className="text-xs text-foreground italic leading-relaxed">&ldquo;{script}&rdquo;</p>}
      </div>
    );
  }

  return (
    <VoicePanel
      playing={speaking}
      progress={progress}
      status={
        speaking
          ? 'Listen carefully…'
          : oncePlayed
            ? notes.done
            : finished
              ? 'Finished · play it again any time'
              : singlePlay && !allowTranscript
                ? notes.ready
                : "Press play when you're ready"
      }
      onToggle={speaking ? (singlePlay && !allowTranscript ? () => {} : stop) : speak}
      disabled={oncePlayed}
      toggleLabel={speaking ? `Stop reading ${title}` : `Play ${title}`}
      toggleIcon={speaking && !(singlePlay && !allowTranscript) ? 'stop' : 'play'}
      footer={
        <>
          {allowTranscript && (
            <Button
              type="button"
              onClick={() => setShowTranscript(open => !open)}
              size="sm"
              variant="ghost"
              className="font-bold gap-1.5 text-muted-foreground -ml-2"
            >
              {showTranscript ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>{showTranscript ? 'Hide transcript' : 'Show transcript'}</span>
            </Button>
          )}
          {/* Collapsed by default: reading along while it plays turns a listening
              task into a reading one. */}
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
          {allowTranscript && showTranscript && (
            <p className="text-xs text-foreground italic leading-relaxed border-t border-border pt-2 whitespace-pre-line">
              &ldquo;{script ?? 'The transcript will appear once the recording has been played.'}&rdquo;
            </p>
          )}
        </>
      }
    />
  );
}

/**
 * Whether the browser has a voice to speak with: 'checking' while voices may
 * still be loading (Chrome delivers them late), 'ready' once one exists, and
 * 'none' when the API is missing or no voice has appeared after a short wait.
 */
function useBrowserVoice(): 'checking' | 'ready' | 'none' {
  const [state, setState] = useState<'checking' | 'ready' | 'none'>(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis || browserVoiceBroken()) return 'none';
    return window.speechSynthesis.getVoices?.().length ? 'ready' : 'checking';
  });
  useEffect(() => {
    if (state !== 'checking' || typeof window === 'undefined' || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    const check = () => {
      if (synth.getVoices?.().length) setState('ready');
    };
    synth.addEventListener?.('voiceschanged', check);
    const timer = setTimeout(() => setState(current => (current === 'checking' ? 'none' : current)), 1500);
    return () => {
      synth.removeEventListener?.('voiceschanged', check);
      clearTimeout(timer);
    };
  }, [state]);
  return state;
}

interface SpokenSegment {
  id: string;
  url: string;
  speaker?: string;
}

/**
 * The script spoken on the server, played clip by clip. Each clip is one short
 * piece in its speaker's voice; the next is fetched while one plays, so the
 * recording runs on without gaps.
 */
function ServerSpokenAudio({
  listUrl,
  title,
  questionId,
  singlePlay,
  repeat = 1,
  onFinished,
  footer,
}: {
  listUrl: string;
  title: string;
  questionId?: string;
  singlePlay: boolean;
  repeat?: number;
  onFinished: () => void;
  footer?: React.ReactNode;
}) {
  const notes = playNotes(repeat);
  const playbackRef = useRef<Playback | null>(null);
  const run = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    run.current += 1;
    playbackRef.current?.stop();
    setPlaying(false);
    setProgress(0);
    setFinished(false);
    setStarted(false);
    setError(null);
  }, [listUrl, questionId]);

  useEffect(() => () => {
    run.current += 1;
    playbackRef.current?.stop();
  }, []);

  const play = async () => {
    if (playing || loading || (singlePlay && started)) return;
    // Before the fetch: iOS lets audio start only inside the tap.
    unlockAudio();
    const current = ++run.current;
    setError(null);
    setLoading(true);
    try {
      const data = await api.get<{ segments: SpokenSegment[] }>(listUrl);
      const segments = data.segments ?? [];
      if (current !== run.current) return;
      if (segments.length === 0) throw new Error('empty');
      setStarted(true);
      setPlaying(true);
      setFinished(false);
      for (let round = 0; round < repeat; round++) {
        if (round > 0) {
          await wait(REPEAT_GAP_MS);
          if (current !== run.current) return;
        }
        const playback = playClips(segments, fraction => {
          if (current === run.current) setProgress((round + fraction) / repeat);
        });
        playbackRef.current = playback;
        await playback.done;
        if (current !== run.current) return;
      }
      setProgress(1);
      setFinished(true);
      onFinished();
    } catch (err) {
      if (err instanceof StoppedError) return;
      if (current === run.current) {
        setError("The audio couldn't play. Check your connection and try again, or open Prepyo in Chrome or Edge.");
        if (!singlePlay) setStarted(false);
      }
    } finally {
      if (current === run.current) {
        setPlaying(false);
        setLoading(false);
      }
    }
  };

  const locked = singlePlay && started && !playing;
  return (
    <VoicePanel
      playing={playing}
      progress={progress}
      status={
        loading && !playing
          ? 'Preparing the recording…'
          : playing
            ? 'Listen carefully…'
            : locked
              ? notes.done
              : finished
                ? 'Finished · play it again any time'
                : singlePlay
                  ? notes.ready
                  : "Press play when you're ready"
      }
      onToggle={() => void play()}
      disabled={locked || loading}
      toggleLabel={`Play ${title}`}
      toggleIcon="play"
      footer={
        <>
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
          {footer}
        </>
      }
    />
  );
}

/** A real recording, in the same voice panel, with true position from the file. */
function RecordedAudio({
  src,
  title,
  questionId,
  singlePlay = false,
  repeat = 1,
  onFinished,
}: {
  src: string;
  title: string;
  questionId?: string;
  singlePlay?: boolean;
  repeat?: number;
  onFinished: () => void;
}) {
  const notes = playNotes(repeat);
  const audioRef = useRef<HTMLAudioElement>(null);
  // Which run of a repeated recording is playing, from 0.
  const round = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    round.current = 0;
    setPlaying(false);
    setProgress(0);
    setFinished(false);
    setError(null);
  }, [src, questionId]);

  const started = progress > 0 || playing || finished;
  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    // Once is once: no pausing, and no second play before submission.
    if (singlePlay && started) return;
    if (playing) {
      audio.pause();
      return;
    }
    setError(null);
    if (finished) round.current = 0;
    audio.play().catch(() => setError("The audio couldn't play. Check your sound is on and try again."));
  };

  return (
    <>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => {
          setPlaying(true);
          setFinished(false);
        }}
        onPause={() => setPlaying(false)}
        onEnded={event => {
          if (round.current + 1 < repeat) {
            // Another run: stay "playing" through the gap so a single-play
            // recording cannot be restarted in between.
            round.current += 1;
            const el = event.currentTarget;
            setPlaying(true);
            setTimeout(() => {
              el.currentTime = 0;
              el.play().catch(() => setError("The audio couldn't play. Check your sound is on and try again."));
            }, REPEAT_GAP_MS);
            return;
          }
          setPlaying(false);
          setFinished(true);
          setProgress(1);
          onFinished();
        }}
        onTimeUpdate={event => {
          const el = event.currentTarget;
          if (el.duration) setProgress((round.current + el.currentTime / el.duration) / repeat);
        }}
        onError={() => setError("The audio couldn't load. Please try again.")}
        className="hidden"
      />
      <VoicePanel
        playing={playing}
        progress={progress}
        status={
          playing
            ? 'Listen carefully…'
            : singlePlay && finished
              ? notes.done
              : finished
                ? 'Finished · play it again any time'
                : progress > 0
                  ? 'Paused'
                  : singlePlay
                    ? notes.ready
                    : "Press play when you're ready"
        }
        onToggle={toggle}
        disabled={singlePlay && started && !playing}
        toggleLabel={playing ? `Pause ${title}` : `Play ${title}`}
        toggleIcon={playing && !singlePlay ? 'pause' : 'play'}
        footer={error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      />
    </>
  );
}

const BAR_COUNT = 44;
// Fixed, speech-like heights so the resting wave has a shape, not a flat line.
const BAR_SHAPE = Array.from({ length: BAR_COUNT }, (_, i) => 0.3 + 0.7 * Math.abs(Math.sin(i * 0.9) * Math.cos(i * 0.37)));

interface VoicePanelProps {
  /** The control can no longer be used, as after a recording's one play. */
  disabled?: boolean;
  playing: boolean;
  progress: number;
  status: string;
  onToggle: () => void;
  toggleLabel: string;
  toggleIcon: 'play' | 'stop' | 'pause';
  footer?: React.ReactNode;
}

/**
 * The listening panel: a glowing play orb and a voice waveform that comes alive
 * while the audio plays and fills in as it goes.
 */
function VoicePanel({ disabled = false, playing, progress, status, onToggle, toggleLabel, toggleIcon, footer }: VoicePanelProps) {
  const played = Math.round(Math.min(1, Math.max(0, progress)) * BAR_COUNT);
  const Icon = toggleIcon === 'play' ? Play : toggleIcon === 'pause' ? Pause : Square;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-colors duration-500 ${
        playing
          ? 'border-primary/40 bg-gradient-to-br from-primary/10 via-background to-indigo-500/10'
          : 'border-border bg-gradient-to-br from-muted/40 via-background to-background'
      }`}
    >
      {playing && (
        <div
          aria-hidden
          className="pointer-events-none absolute -left-10 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl motion-safe:animate-pulse"
        />
      )}

      <div className="relative flex items-center gap-4 sm:gap-5">
        <div className="relative shrink-0">
          {playing && (
            <>
              <span aria-hidden className="absolute inset-0 rounded-full bg-primary/30 motion-safe:animate-ping" />
              <span aria-hidden className="absolute -inset-2 rounded-full border-2 border-primary/30 motion-safe:animate-pulse" />
            </>
          )}
          <button
            type="button"
            onClick={onToggle}
            disabled={disabled}
            aria-label={toggleLabel}
            className={`relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-all duration-300 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${
              toggleIcon === 'stop'
                ? 'bg-gradient-to-br from-rose-500 to-rose-600 shadow-rose-500/30'
                : 'bg-gradient-to-br from-primary to-indigo-600 shadow-primary/30 hover:scale-105'
            }`}
          >
            <Icon className={`h-5 w-5 ${toggleIcon === 'play' ? 'ml-0.5 fill-current' : 'fill-current'}`} />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Volume2 className={`h-4 w-4 ${playing ? 'text-primary' : 'text-muted-foreground'}`} />
              Listen
            </span>
            <span className="truncate text-[11px] font-semibold text-muted-foreground" aria-live="polite">
              {status}
            </span>
          </div>

          <div aria-hidden className="mt-2.5 flex h-10 items-center gap-[3px]">
            {BAR_SHAPE.map((height, i) => (
              <span
                key={i}
                style={{
                  height: `${Math.round(height * 100)}%`,
                  animationDelay: `${(i * 73) % 900}ms`,
                  animationDuration: `${700 + ((i * 131) % 500)}ms`,
                }}
                className={`flex-1 origin-center rounded-full transition-colors duration-300 ${
                  i < played ? 'bg-gradient-to-t from-primary to-indigo-400' : playing ? 'bg-primary/25' : 'bg-muted-foreground/20'
                } ${playing ? 'animate-voice-bar' : 'scale-y-[0.55]'}`}
              />
            ))}
          </div>

          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted-foreground/15">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-indigo-500 transition-[width] duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
            />
          </div>
        </div>
      </div>

      {footer && <div className="relative mt-3 space-y-2">{footer}</div>}
    </div>
  );
}
