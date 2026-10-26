import { useEffect, useRef, useState } from 'react';
import { Languages, Pause, Play } from 'lucide-react';
import { splitTurns } from '@/lib/listeningScript';
import { Playback, speakScript, StoppedError } from '@/lib/scriptPlayer';
import { cn } from '@/lib/utils';

interface EnglishVersionProps {
  /** The script in English, with the same speaker labels ("Man:", "Woman:"). */
  text: string;
  /** A stored recording of it. Without one the browser's English voice reads it. */
  audioUrl?: string;
}

/**
 * A Korean question in English, for a learner who did not follow it: what was
 * said or written, the question and the choices, labelled as they are
 * ("Woman:", "Text:", "Choices:"). Premium learners can open it at any time;
 * after answering it also comes with the review.
 */
/** "A. Yes. B. No." → ["A. Yes.", "B. No."], one line per choice. */
export function splitChoices(text: string): string[] {
  return text.split(/\s+(?=[B-D]\.\s)/);
}

export default function EnglishVersion({ text, audioUrl }: EnglishVersionProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const speech = useRef<Playback | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const canSpeak = Boolean(audioUrl) || (typeof window !== 'undefined' && 'speechSynthesis' in window);
  const turns = splitTurns(text);

  useEffect(() => () => speech.current?.stop(), []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  const stop = () => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    speech.current?.stop();
    speech.current = null;
    setPlaying(false);
  };

  const play = async () => {
    setError(null);
    if (audioUrl) {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = 0;
      audio.playbackRate = speed;
      audio.play().catch(() => setError("The audio couldn't play. Check your sound is on and try again."));
      return;
    }
    const playback = speakScript(text, undefined, speed);
    speech.current = playback;
    setPlaying(true);
    try {
      await playback.done;
    } catch (err) {
      if (!(err instanceof StoppedError)) setError("This device couldn't read it aloud.");
    } finally {
      if (speech.current === playback) {
        speech.current = null;
        setPlaying(false);
      }
    }
  };

  return (
    <div className="rounded-xl border border-border bg-background p-3 sm:p-4 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <Languages className="h-4 w-4 text-primary" aria-hidden />
          In English
        </span>
        {canSpeak && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={playing ? stop : play}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                playing
                  ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border-border text-foreground hover:bg-muted"
              )}
            >
              {playing ? <Pause className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current" />}
              {playing ? 'Pause' : 'Hear it in English'}
            </button>
            <button
              type="button"
              onClick={() => setSpeed(s => (s === 1 ? 1.25 : s === 1.25 ? 1.5 : s === 1.5 ? 2 : 1))}
              title="Change audio speed (tap to cycle: 1.0x, 1.25x, 1.5x, 2.0x)"
              className="px-2 py-0.5 rounded-full border border-primary/20 bg-background text-primary font-mono text-[11px] font-bold shadow-2xs hover:bg-muted/80 active:scale-95 transition-all"
            >
              {speed === 1 ? '1.0x' : `${speed}x`}
            </button>
          </div>
        )}
      </div>
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="none"
          onPlay={() => {
            if (audioRef.current) audioRef.current.playbackRate = speed;
            setPlaying(true);
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() => setError("The audio couldn't load. Please try again.")}
          className="hidden"
        />
      )}
      <div className="space-y-1 text-xs sm:text-sm leading-relaxed text-foreground">
        {turns.map((turn, i) =>
          turn.speaker === 'Choices' ? (
            <div key={i}>
              <span className="font-bold">Choices:</span>
              <ul className="mt-0.5 space-y-0.5">
                {splitChoices(turn.text).map(choice => (
                  <li key={choice}>{choice}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p key={i}>
              {turn.speaker && <span className="font-bold">{turn.speaker}: </span>}
              {turn.text}
            </p>
          ),
        )}
      </div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
