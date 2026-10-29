import React from 'react';
import { AlertTriangle, Check, Mic, Volume2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { PlaybackPhase } from './usePromptPlayback';

/**
 * The two panels every PTE audio item shows: the recording being played, and
 * for a spoken answer the microphone. They are drawn as practice draws them (a
 * "Listen" card, and the large countdown panel), so the test looks like the
 * screens the learner practised on; the words still say what the test is doing.
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
      ? `Audio begins in ${countdown} second${countdown === 1 ? '' : 's'}`
      : phase === 'playing'
        ? 'Playing'
        : phase === 'failed'
          ? 'The recording could not be played'
          : 'Completed';

  return (
    <div className="flex w-full items-center gap-4 rounded-xl bg-muted/50 p-4" role="status" aria-live="polite">
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-md ${
          phase === 'failed' ? 'bg-amber-500 text-white' : 'bg-primary text-primary-foreground'
        } ${phase === 'playing' ? 'ring-4 ring-primary/20' : ''}`}
      >
        {phase === 'failed' ? <AlertTriangle className="h-5 w-5" /> : <Volume2 className={`h-5 w-5 ${phase === 'playing' ? 'animate-pulse' : ''}`} />}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Volume2 className="h-4 w-4 text-muted-foreground" aria-hidden /> Listen
          </p>
          <p className="text-xs font-medium text-muted-foreground">{status}</p>
        </div>
        <Progress value={Math.round(progress * 100)} className="h-1.5" />
      </div>
    </div>
  );
}

export type RecorderPhase = 'waiting' | 'prep' | 'recording' | 'done' | 'skipped';

const TONE: Record<RecorderPhase, { panel: string; dial: string; text: string; bar: string }> = {
  waiting: { panel: 'border-border bg-muted/40', dial: 'bg-muted-foreground/30 text-white', text: 'text-muted-foreground', bar: 'bg-muted-foreground/20' },
  prep: { panel: 'border-amber-200/70 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10', dial: 'bg-amber-500 text-white ring-8 ring-amber-500/15', text: 'text-amber-700 dark:text-amber-300', bar: 'bg-amber-400' },
  recording: { panel: 'border-rose-200/70 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10', dial: 'bg-rose-500 text-white ring-8 ring-rose-500/15', text: 'text-rose-700 dark:text-rose-300', bar: 'bg-rose-500' },
  done: { panel: 'border-emerald-200/70 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10', dial: 'bg-emerald-500 text-white', text: 'text-emerald-700 dark:text-emerald-300', bar: 'bg-emerald-500' },
  skipped: { panel: 'border-border bg-muted/40', dial: 'bg-amber-500 text-white', text: 'text-muted-foreground', bar: 'bg-muted-foreground/20' },
};

export function RecorderStatusPanel({
  phase,
  countdown,
  total,
  prepTotal = 0,
  level,
  note,
}: {
  phase: RecorderPhase;
  countdown: number;
  /** Seconds of recording allowed. */
  total: number;
  /** Seconds of preparation, for the bar while it counts down. */
  prepTotal?: number;
  level: number;
  note?: string;
}) {
  const title =
    phase === 'waiting'
      ? 'Recording starts after the audio'
      : phase === 'prep'
        ? `Recording begins in ${countdown}s`
        : phase === 'recording'
          ? 'Recording… speak now'
          : phase === 'skipped'
            ? 'No answer recorded'
            : 'Answer recorded';
  const fill =
    phase === 'recording' && total > 0
      ? ((total - countdown) / total) * 100
      : phase === 'prep' && prepTotal > 0
        ? ((prepTotal - countdown) / prepTotal) * 100
        : phase === 'done'
          ? 100
          : 0;
  const tone = TONE[phase];
  const live = phase === 'recording';

  return (
    <div className={`w-full space-y-4 rounded-2xl border p-5 text-center transition-colors ${tone.panel}`} role="status" aria-live="polite">
      <p className="font-display text-lg font-bold text-foreground">{title}</p>

      <div className="flex items-center justify-center gap-4">
        {/* The microphone's level either side of the dial while it records */}
        <Bars count={14} level={live ? level : 0} on={tone.bar} reverse />
        <span className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-2xl font-bold tabular-nums shadow-md ${tone.dial}`}>
          {phase === 'prep' || phase === 'recording' ? (
            countdown
          ) : phase === 'done' ? (
            <Check className="h-8 w-8" strokeWidth={3} />
          ) : phase === 'skipped' ? (
            <AlertTriangle className="h-7 w-7" />
          ) : (
            <Mic className="h-7 w-7" />
          )}
        </span>
        <Bars count={14} level={live ? level : 0} on={tone.bar} />
      </div>

      <p className={`text-sm font-semibold ${tone.text}`}>
        {phase === 'prep'
          ? 'Get ready. The microphone opens by itself after the beep.'
          : phase === 'recording'
            ? `${countdown} second${countdown === 1 ? '' : 's'} left`
            : phase === 'waiting'
              ? 'Listen carefully first.'
              : phase === 'done'
                ? 'Your answer is saved. Press Next when you are ready.'
                : ''}
      </p>

      <Progress value={fill} className="h-1.5" indicatorClassName={phase === 'recording' ? 'bg-rose-500' : phase === 'prep' ? 'bg-amber-500' : undefined} />
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

/** A row of level bars; lit from the dial outwards as the voice gets louder. */
function Bars({ count, level, on, reverse }: { count: number; level: number; on: string; reverse?: boolean }) {
  return (
    <div className={`hidden items-center gap-1 sm:flex ${reverse ? 'flex-row-reverse' : ''}`} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`w-1 rounded-full transition-colors ${level * count > i ? on : 'bg-muted-foreground/20'}`}
          style={{ height: `${10 + ((i * 7) % 5) * 4}px` }}
        />
      ))}
    </div>
  );
}
