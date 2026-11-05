import type { ReactNode } from 'react';
import { Clock, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface MockHeaderProps {
  /** A few letters in the round badge: "P2", "R", "W". */
  code: string;
  title: string;
  subtitle: string;
  /** Seconds left on the paper; no time box without it. */
  secondsLeft?: number;
  answered?: { done: number; total: number };
  onLeave?: () => void;
  /** Anything else on the right, before Leave (e.g. a submit button). */
  actions?: ReactNode;
}

/**
 * The top of every mock paper, laid out as a practice task's: a round badge,
 * the title in blue, and the time left on the right. It scrolls with the page,
 * so it never sits over the questions.
 */
export default function MockHeader({ code, title, subtitle, secondsLeft, answered, onLeave, actions }: MockHeaderProps) {
  const lowTime = secondsLeft !== undefined && secondsLeft <= 300;
  const left = Math.max(0, secondsLeft ?? 0);
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3 sm:gap-4">
        <span className="inline-flex h-12 min-w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 px-2 text-sm font-bold text-primary-foreground shadow-md sm:h-14 sm:min-w-14">
          {code}
        </span>
        <div className="min-w-0 space-y-1 pt-0.5">
          <h1 className="text-xl sm:text-2xl font-bold text-primary leading-tight">{title}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{subtitle}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 self-start">
        {answered && (
          <Badge variant={answered.done === answered.total ? 'success' : 'outline'} className="h-9 rounded-full px-3 text-xs font-bold">
            {answered.done}/{answered.total} answered
          </Badge>
        )}
        {actions}
        {onLeave && (
          <Button variant="outline" onClick={onLeave} className="h-9 gap-1.5 rounded-full px-3 text-xs font-bold sm:px-4">
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave</span>
          </Button>
        )}
        {secondsLeft !== undefined && (
          <div
            className={`flex shrink-0 items-center gap-3 rounded-2xl px-4 py-2.5 ${
              lowTime ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-primary/[0.07] text-primary'
            }`}
          >
            <Clock className="h-6 w-6" aria-hidden />
            <div className="leading-tight">
              <p className="text-xs text-muted-foreground">Time left</p>
              <p className="text-sm font-bold font-mono tabular-nums">
                {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
