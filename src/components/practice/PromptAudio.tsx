import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, Play, Square, Pause, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
}

/**
 * The audio a learner listens to before answering.
 *
 * Most seeded questions carry a script but no recording, so the script is
 * spoken by the browser's own voice. That is said plainly rather than dressed
 * up as exam audio: a synthetic voice has none of the accent, pace or
 * background noise a real recording has, and a learner who mistakes one for the
 * other will misjudge how ready they are.
 */
export default function PromptAudio({ audioUrl, audioTranscript, title, questionId, allowTranscript = false, onFinished }: PromptAudioProps) {
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

  const script = audioTranscript?.trim();

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
  }, [questionId, script, audioUrl, cancelPlayback]);

  const stop = useCallback(() => {
    cancelPlayback();
    setSpeaking(false);
    setProgress(0);
  }, [cancelPlayback]);

  const speak = useCallback(async () => {
    if (!script || !window.speechSynthesis) return;
    cancelPlayback();
    window.speechSynthesis.cancel();
    const run = generation.current;
    setError(null);
    setSpeaking(true);
    setFinished(false);
    setProgress(0);
    // Split markers rather than asking the voice to pronounce "beep". Preserve
    // all other text; changing the script would change what the learner hears.
    const segments = script.split(/(\[beep\])/gi).filter(part => part.trim());
    // Where each segment starts, so a word boundary inside one maps onto the
    // whole script for the progress bar.
    const total = segments.reduce((sum, part) => sum + part.length, 0) || 1;
    const starts: number[] = [];
    segments.reduce((sum, part, i) => ((starts[i] = sum), sum + part.length), 0);
    const fail = () => {
      if (run !== generation.current) return;
      cancelPlayback();
      setSpeaking(false);
      setError("The audio couldn't play. Check your sound is on and try again.");
    };
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
          const english = voices.find(voice => voice.lang.startsWith('en-GB')) ??
            voices.find(voice => voice.lang.startsWith('en'));
          if (english) utterance.voice = english;
          utterance.lang = english?.lang ?? 'en-GB';
          utterance.rate = 0.95;
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
  }, [script, cancelPlayback]);

  if (audioUrl) {
    return <RecordedAudio src={audioUrl} title={title} questionId={questionId} onFinished={() => onFinishedRef.current?.()} />;
  }

  if (!script) return null;

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
      status={speaking ? 'Listen carefully…' : finished ? 'Finished · play it again any time' : "Press play when you're ready"}
      onToggle={speaking ? stop : speak}
      toggleLabel={speaking ? `Stop reading ${title}` : `Play ${title}`}
      toggleIcon={speaking ? 'stop' : 'play'}
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
            <p className="text-xs text-foreground italic leading-relaxed border-t border-border pt-2">
              &ldquo;{script}&rdquo;
            </p>
          )}
        </>
      }
    />
  );
}

/** A real recording, in the same voice panel, with true position from the file. */
function RecordedAudio({ src, title, questionId, onFinished }: { src: string; title: string; questionId?: string; onFinished: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPlaying(false);
    setProgress(0);
    setFinished(false);
    setError(null);
  }, [src, questionId]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      return;
    }
    setError(null);
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
        onEnded={() => {
          setPlaying(false);
          setFinished(true);
          setProgress(1);
          onFinished();
        }}
        onTimeUpdate={event => {
          const el = event.currentTarget;
          if (el.duration) setProgress(el.currentTime / el.duration);
        }}
        onError={() => setError("The audio couldn't load. Please try again.")}
        className="hidden"
      />
      <VoicePanel
        playing={playing}
        progress={progress}
        status={playing ? 'Listen carefully…' : finished ? 'Finished · play it again any time' : progress > 0 ? 'Paused' : "Press play when you're ready"}
        onToggle={toggle}
        toggleLabel={playing ? `Pause ${title}` : `Play ${title}`}
        toggleIcon={playing ? 'pause' : 'play'}
        footer={error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      />
    </>
  );
}

const BAR_COUNT = 44;
// Fixed, speech-like heights so the resting wave has a shape, not a flat line.
const BAR_SHAPE = Array.from({ length: BAR_COUNT }, (_, i) => 0.3 + 0.7 * Math.abs(Math.sin(i * 0.9) * Math.cos(i * 0.37)));

interface VoicePanelProps {
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
function VoicePanel({ playing, progress, status, onToggle, toggleLabel, toggleIcon, footer }: VoicePanelProps) {
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
            aria-label={toggleLabel}
            className={`relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-all duration-300 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 ${
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
