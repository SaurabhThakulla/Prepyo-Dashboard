import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Headphones } from 'lucide-react';
import { SignalBars } from '@/components/mocks/PreTestChecks';
import { watchClipLevels } from '@/lib/scriptPlayer';

export type RecordingState = 'waiting' | 'playing' | 'done' | 'failed';

/**
 * A mock's recording, large and centred between the instructions and the
 * questions: a countdown before it starts, a radio-style signal that follows
 * the sound while it plays, then a flat line once it has finished. Shared by
 * the IELTS Listening mock and the PTE test player.
 */
export default function RecordingStatus({ state, countdown }: { state: RecordingState; countdown: number }) {
  // The bars follow the recording's live sound while it plays (where the browser can read it).
  const [levels, setLevels] = useState<number[] | null>(null);
  useEffect(() => {
    if (state !== 'playing') return;
    const stop = watchClipLevels(40, setLevels);
    return () => {
      stop();
      setLevels(null);
    };
  }, [state]);

  const label =
    state === 'waiting'
      ? `Recording starts in ${countdown} second${countdown === 1 ? '' : 's'}`
      : state === 'playing'
        ? 'Recording playing'
        : state === 'failed'
          ? 'The recording could not be played'
          : 'Recording finished';

  return (
    <div className="flex flex-col items-center gap-4 py-6 sm:py-10" role="status" aria-live="polite">
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
            state === 'waiting' || state === 'failed'
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              : state === 'done'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-primary text-primary-foreground ring-8 ring-primary/15'
          }`}
        >
          {state === 'waiting' ? (
            <span className="text-lg font-extrabold tabular-nums">{countdown}</span>
          ) : state === 'done' ? (
            <CheckCircle2 className="h-6 w-6" />
          ) : state === 'failed' ? (
            <AlertTriangle className="h-6 w-6" />
          ) : (
            <Headphones className="h-6 w-6 animate-pulse" />
          )}
        </span>
        <p className="text-xl font-medium text-foreground sm:text-2xl">{label}</p>
      </div>
      {state === 'playing' && <SignalBars playing levels={levels} className="h-14 w-full max-w-md" />}
      {/* Finished: the signal settles into a flat line. */}
      {state === 'done' && <div className="h-[3px] w-full max-w-md rounded-full bg-primary/30" aria-hidden />}
    </div>
  );
}
