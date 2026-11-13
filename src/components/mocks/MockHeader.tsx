import type { ReactNode } from 'react';
import { Clock } from 'lucide-react';
import FullscreenButton from '@/components/layout/FullscreenButton';

interface MockHeaderProps {
  /** A few letters in the round badge: "P2", "R", "W". */
  code: string;
  title: string;
  subtitle: string;
  /** Seconds left on the paper; no time box without it. */
  secondsLeft?: number;
  answered?: { done: number; total: number };
  /** Anything else on the right, before the clock. */
  actions?: ReactNode;
  /** Negative margins that cancel the parent's padding, so the bar runs edge to edge. */
  className?: string;
}

/**
 * The test bar at the top of every IELTS mock paper, kept in view as the page
 * scrolls: the paper and where the learner is on the left, then how many are
 * answered, the time left and full screen. Leaving is in the bar at the bottom
 * (TestFooter).
 */
export default function MockHeader({ code, title, subtitle, secondsLeft, answered, actions, className = '' }: MockHeaderProps) {
  const lowTime = secondsLeft !== undefined && secondsLeft <= 300;
  const left = Math.max(0, secondsLeft ?? 0);
  return (
    <div className={`sticky top-0 z-30 border-b border-border bg-card/95 px-4 py-2.5 shadow-sm backdrop-blur sm:px-6 lg:px-8 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 px-2 text-xs font-bold text-primary-foreground shadow-md sm:h-11 sm:min-w-11 sm:text-sm">
            {code}
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-base font-bold leading-tight text-primary sm:text-lg">{title}</h1>
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {answered && (
            <div className="hidden rounded-xl bg-muted px-3 py-1.5 text-center leading-tight sm:block">
              <p className="text-[11px] text-muted-foreground">Answered</p>
              <p className={`text-sm font-bold tabular-nums ${answered.done === answered.total ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                {answered.done} / {answered.total}
              </p>
            </div>
          )}
          {actions}
          {secondsLeft !== undefined && (
            <div
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 ${
                lowTime ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-primary/[0.07] text-primary'
              }`}
            >
              <Clock className="h-5 w-5" aria-hidden />
              <div className="leading-tight">
                <p className="text-[11px] text-muted-foreground">Time left</p>
                <p className="font-mono text-sm font-bold tabular-nums">
                  {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
                </p>
              </div>
            </div>
          )}
          <FullscreenButton />
        </div>
      </div>
    </div>
  );
}
