import { useEffect, useRef, useState } from 'react';
import { Mic, Play, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RecorderStatus } from '../AudioRecorder';

/**
 * The recording pill in the practice action bar: starts and stops the answer
 * while there is none, then plays and stops the learner's own recording.
 */
export default function RecordingPlayback({ recording, status, maxSeconds, onControl, disabled }: {
  recording: Blob | null;
  status?: RecorderStatus | null;
  maxSeconds?: number;
  /** Does what the recorder's mic button does now: start, start now, or stop. */
  onControl?: () => void;
  disabled?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setPlaying(false);
    setTime(0);
    setDuration(0);
    if (!recording || typeof URL.createObjectURL !== 'function') return setUrl(null);
    const next = URL.createObjectURL(recording);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [recording]);

  if (!url) {
    if (!status) return null;
    return <RecorderPill status={status} maxSeconds={maxSeconds ?? 0} onControl={onControl} disabled={disabled} />;
  }

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      audio.currentTime = 0;
      setTime(0);
      setPlaying(false);
    } else {
      void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  // MediaRecorder files often report Infinity until played through once.
  const total = Number.isFinite(duration) && duration > 0 ? duration : 0;

  return (
    <button type="button" onClick={toggle} aria-label={playing ? 'Stop your recording' : 'Play your recording'} className={PILL}>
      <span className={cn(DOT, playing ? 'bg-rose-500 group-hover:bg-rose-600' : 'bg-primary group-hover:bg-primary/90')}>
        {playing ? <Square className="h-3.5 w-3.5 fill-current" aria-hidden /> : <Play className="ml-0.5 h-4 w-4 fill-current" aria-hidden />}
      </span>
      <span className="text-sm font-medium text-foreground">{playing ? 'Click here to stop' : 'Click here to play'}</span>
      <Bar fraction={total ? time / total : 0} />
      <span className="text-sm font-semibold tabular-nums text-foreground">{clock(playing || time ? time : total)}</span>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
        onDurationChange={e => setDuration(e.currentTarget.duration)}
        onTimeUpdate={e => setTime(e.currentTarget.currentTime)}
        onEnded={e => {
          setDuration(e.currentTarget.duration);
          setPlaying(false);
          setTime(0);
        }}
        className="hidden"
      />
    </button>
  );
}

/** Before there is a recording: start it, start it now during think time, or stop it. */
function RecorderPill({ status, maxSeconds, onControl, disabled }: {
  status: RecorderStatus;
  maxSeconds: number;
  onControl?: () => void;
  disabled?: boolean;
}) {
  const { phase, remaining } = status;
  const recordingNow = phase === 'recording';
  const elapsed = recordingNow ? maxSeconds - remaining : 0;
  const label = recordingNow ? 'Click here to stop' : 'Click here to start';

  return (
    <button
      type="button"
      onClick={onControl}
      disabled={!onControl || (phase === 'idle' && disabled)}
      aria-label={recordingNow ? 'Stop recording' : 'Start recording'}
      className={cn(PILL, 'disabled:cursor-default disabled:opacity-50')}
    >
      <span className={cn(DOT, recordingNow ? 'bg-rose-500 group-hover:bg-rose-600' : 'bg-primary group-hover:bg-primary/90')}>
        {recordingNow ? <Square className="h-3.5 w-3.5 fill-current" aria-hidden /> : <Mic className="h-4 w-4" aria-hidden />}
      </span>
      <span className="text-sm font-medium text-foreground" aria-live="polite">{label}</span>
      <Bar fraction={maxSeconds > 0 ? elapsed / maxSeconds : 0} tone={recordingNow ? 'bg-rose-500' : undefined} />
      <span className="text-sm font-semibold tabular-nums text-foreground">{clock(recordingNow ? elapsed : maxSeconds)}</span>
    </button>
  );
}

function Bar({ fraction, tone = 'bg-primary' }: { fraction: number; tone?: string }) {
  return (
    <span className="h-1 w-16 overflow-hidden rounded-full bg-muted">
      <span className={cn('block h-full rounded-full transition-[width] duration-200', tone)} style={{ width: `${Math.min(1, Math.max(0, fraction)) * 100}%` }} />
    </span>
  );
}

const PILL = 'group inline-flex h-11 shrink-0 cursor-pointer items-center whitespace-nowrap gap-3 rounded-full border border-border bg-background pl-1.5 pr-4 shadow-2xs transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';
const DOT = 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition-colors';

const clock = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
