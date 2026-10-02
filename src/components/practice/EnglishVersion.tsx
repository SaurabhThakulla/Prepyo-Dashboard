import { useEffect, useRef, useState } from 'react';
import { Languages, Play, Square } from 'lucide-react';
import { splitTurns } from '@/lib/listeningScript';
import { Playback, speakScript, StoppedError } from '@/lib/scriptPlayer';

interface EnglishVersionProps {
  /** The script in English, with the same speaker labels ("Man:", "Woman:"). */
  text: string;
  /** A stored recording of it. Without one the browser's English voice reads it. */
  audioUrl?: string;
}

/**
 * What a Korean listening item said, in English, for a learner who did not
 * follow it. Shown only after the answer is in: the script is the answer key,
 * and hearing it in English first would turn listening into translation.
 */
export default function EnglishVersion({ text, audioUrl }: EnglishVersionProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const speech = useRef<Playback | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSpeak = Boolean(audioUrl) || (typeof window !== 'undefined' && 'speechSynthesis' in window);
  const turns = splitTurns(text);

  useEffect(() => () => speech.current?.stop(), []);

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
      audio.play().catch(() => setError("The audio couldn't play. Check your sound is on and try again."));
      return;
    }
    const playback = speakScript(text);
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
          <button
            type="button"
            onClick={playing ? stop : play}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-bold text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {playing ? <Square className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current" />}
            {playing ? 'Stop' : 'Hear it in English'}
          </button>
        )}
      </div>
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() => setError("The audio couldn't load. Please try again.")}
          className="hidden"
        />
      )}
      <div className="space-y-1 text-xs sm:text-sm leading-relaxed text-foreground">
        {turns.map((turn, i) => (
          <p key={i}>
            {turn.speaker && <span className="font-bold">{turn.speaker}: </span>}
            {turn.text}
          </p>
        ))}
      </div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
