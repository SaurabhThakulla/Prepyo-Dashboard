import React from 'react';
import { Mic, Volume2, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { PlaybackPhase } from './usePromptPlayback';

/**
 * The two boxes every PTE audio item shows: the recording's status, and for a
 * spoken answer the microphone's. They say what the test is doing in the
 * test's own words, because a learner who knows the real screens should not
 * have to learn new ones.
 */

export function AudioStatusPanel({
  phase,
  countdown,
  progress,
}: {
  phase: PlaybackPhase;
  countdown: number;
  progress: number;
}) {
  if (phase === 'none') return null;
  const status =
    phase === 'waiting'
      ? `Beginning in ${countdown} second${countdown === 1 ? '' : 's'}`
      : phase === 'playing'
        ? 'Playing'
        : phase === 'failed'
          ? 'The recording could not be played'
          : 'Completed';

  return (
    <div
      className="w-full max-w-sm rounded-xl border border-border bg-muted/30 px-4 py-3 space-y-2"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 text-xs">
        {phase === 'failed' ? (
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        ) : (
          <Volume2 className={`h-4 w-4 ${phase === 'playing' ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
        )}
        <span className="text-muted-foreground">Status:</span>
        <span className="font-semibold text-foreground">{status}</span>
      </div>
      <Progress value={Math.round(progress * 100)} className="h-1.5" />
    </div>
  );
}

export type RecorderPhase = 'waiting' | 'prep' | 'recording' | 'done' | 'skipped';

export function RecorderStatusPanel({
  phase,
  countdown,
  total,
  level,
  note,
}: {
  phase: RecorderPhase;
  countdown: number;
  total: number;
  level: number;
  note?: string;
}) {
  const status =
    phase === 'waiting'
      ? 'Waiting for the recording to finish'
      : phase === 'prep'
        ? `Recording in ${countdown} second${countdown === 1 ? '' : 's'}`
        : phase === 'recording'
          ? 'Recording…'
          : phase === 'skipped'
            ? 'No answer recorded'
            : 'Completed';
  const fill = phase === 'recording' && total > 0 ? ((total - countdown) / total) * 100 : phase === 'done' ? 100 : 0;

  return (
    <div
      className={`w-full max-w-sm rounded-xl border px-4 py-3 space-y-2 transition-colors ${
        phase === 'recording' ? 'border-rose-400/60 bg-rose-500/5' : 'border-border bg-muted/30'
      }`}
      role="status"
      aria-live="polite"
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Recorded Answer</p>
      <div className="flex items-center gap-2 text-xs">
        <Mic className={`h-4 w-4 ${phase === 'recording' ? 'text-rose-500' : 'text-muted-foreground'}`} />
        <span className="text-muted-foreground">Current Status:</span>
        <span className="font-semibold text-foreground">{status}</span>
      </div>
      <Progress value={fill} className="h-1.5" indicatorClassName={phase === 'recording' ? 'bg-rose-500' : undefined} />
      {phase === 'recording' && (
        <div className="flex items-end gap-0.5 h-5" aria-hidden>
          {Array.from({ length: 24 }, (_, i) => {
            const on = level * 24 > i;
            return <span key={i} className={`w-1 rounded-sm ${on ? 'bg-rose-500' : 'bg-muted-foreground/20'}`} style={{ height: `${30 + (i % 5) * 14}%` }} />;
          })}
        </div>
      )}
      {note && <p className="text-[11px] text-muted-foreground">{note}</p>}
    </div>
  );
}
