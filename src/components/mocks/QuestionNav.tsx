import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * One question number in the bar along the bottom of an IELTS mock, as in the
 * computer-delivered test: filled once answered, a flag once flagged, and a
 * ring on the question being worked on.
 */
export function NavNumber({
  number,
  answered,
  flagged,
  current,
  onClick,
  light = false,
}: {
  number: number;
  answered: boolean;
  flagged: boolean;
  current: boolean;
  onClick: () => void;
  /** On a dark bar (part practice): an unanswered number is white. */
  light?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Question ${number}${answered ? ', answered' : ''}${flagged ? ', flagged' : ''}`}
      aria-current={current ? 'step' : undefined}
      className={`inline-flex h-8 min-w-8 shrink-0 items-center justify-center gap-0.5 rounded-full px-1.5 text-xs font-bold tabular-nums transition-colors ${
        answered
          ? 'bg-primary text-primary-foreground shadow-sm'
          : light
            ? 'bg-white text-slate-900 hover:bg-white/85'
            : 'bg-muted text-foreground hover:bg-primary/10 hover:text-primary'
      } ${current ? 'ring-2 ring-inset ring-amber-400' : ''}`}
    >
      {number}
      {flagged && <Flag aria-hidden className="h-3 w-3 fill-amber-400 text-amber-500" />}
    </button>
  );
}

/** Flags the question being worked on, to come back to before submitting. */
export function FlagToggle({
  number,
  flagged,
  onToggle,
}: {
  number?: number;
  flagged: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onToggle}
      disabled={number === undefined}
      aria-pressed={flagged}
      aria-label={number === undefined ? 'Flag' : `${flagged ? 'Unflag' : 'Flag'} question ${number}`}
      title={number === undefined ? 'Pick a question to flag it' : undefined}
      className="h-9 shrink-0 gap-1 rounded-full px-2.5 text-xs font-bold sm:gap-1.5 sm:px-3"
    >
      <Flag className={`h-4 w-4 ${flagged ? 'fill-amber-400 text-amber-500' : ''}`} />
      {/* Phones show the icon and number only. */}
      <span className="hidden sm:inline">{flagged ? 'Unflag' : 'Flag'}</span>
      {number}
    </Button>
  );
}

/** A set with one key added or removed, for flag state. */
export const toggled = <T,>(set: Set<T>, key: T) => {
  const next = new Set(set);
  if (!next.delete(key)) next.add(key);
  return next;
};
