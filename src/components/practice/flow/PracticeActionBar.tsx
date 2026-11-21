import type { ReactNode } from 'react';
import { ChevronRight, Coins, Shuffle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SkillType } from '@/lib/types';
import { useApp } from '@/context/AppContext';
import { gradingsLeft, formatGradings } from '@/lib/subscriptions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/** AI-grading units one answer spends (see billing/gradings.go); reading and listening cost none. */
export function gradingUnits(skill: SkillType, typeId?: string): number | null {
  if (typeId === 'summarize-spoken-text') return 5;
  if (skill === 'reading' || skill === 'listening') return null;
  return /(^|-)(read-aloud|repeat-sentence)$/.test(typeId ?? '') ? 2 : 5;
}

interface Props {
  /** Submit, Redo and the like, in the left corner. */
  actions: ReactNode;
  /** Shown in the middle of the row, e.g. playback of a recording. */
  middle?: ReactNode;
  /** On a phone, drop `middle` when it only repeats what is just above the bar. */
  hideMiddleOnPhone?: boolean;
  cost?: number | null;
  /** A speaking answer marked from its recording costs double past a minute (billing.SpeakingUnits). */
  costDoublesWhenLong?: boolean;
  onShuffle?: () => void;
  /** The next item in the list, in its order (Shuffle picks one at random). */
  onNext?: () => void;
  disabled?: boolean;
}

// One look for every control on the right: same height, border and surface.
const CHIP = 'inline-flex h-9 shrink-0 items-center rounded-full border border-border bg-background shadow-2xs';
// For see-through buttons placed on the dark blue bar.
export const ON_BAR = 'text-white hover:bg-white/15 hover:text-white';
const ARROW = 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-30';

/** The row under every practice item: actions on the left; cost and shuffle in the right corner. */
export default function PracticeActionBar({ actions, middle, hideMiddleOnPhone, cost, costDoublesWhenLong, onShuffle, onNext, disabled }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-[#0f2a6b] bg-[#13307f] dark:border-border dark:bg-card p-2.5 shadow-md sm:gap-3 sm:p-3">
      {/* One row when it fits; otherwise the right corner wraps under the buttons, kept to the right. */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">{actions}</div>
      {/* The recorder gets its own row above the buttons until there is room for one line.
          min-w-max: xl is the window's width, not the bar's, so in a narrow column the
          slot must not squash under the pill; the right corner wraps to a new row instead. */}
      {middle && (
        <div className={cn('order-first flex w-full justify-center xl:order-none xl:w-auto xl:min-w-max xl:flex-1', hideMiddleOnPhone && 'max-sm:hidden')}>{middle}</div>
      )}
      <div className="ml-auto flex items-center gap-2">
        {cost != null && <CostChip cost={cost} costDoublesWhenLong={costDoublesWhenLong} side="top" />}
        {onNext && (
          <button
            type="button"
            onClick={() => {
              onNext();
              // The next item opens at its top, not where this one was scrolled to.
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={disabled}
            aria-label="Next question"
            title="Next question"
            className={cn(CHIP, 'gap-1 px-3.5 text-sm font-bold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-30')}
          >
            Next <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        )}
        {onShuffle && (
          <button
            type="button"
            onClick={onShuffle}
            disabled={disabled}
            aria-label="Random question"
            title="Random question"
            className={cn(CHIP, ARROW)}
          >
            <Shuffle className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

/** What marking one answer costs, in AI-grading units. */
export function CostChip({
  cost,
  costDoublesWhenLong,
  side = 'bottom',
}: {
  cost: number;
  costDoublesWhenLong?: boolean;
  side?: 'top' | 'bottom';
}) {
  const { user } = useApp();
  const sub = user?.subscription;
  const limit = sub?.aiGradingsLimit ?? 1100;
  const totalCredits = limit * 5;
  const remainingGradings = sub ? gradingsLeft(sub) : null;
  const remainingCredits = remainingGradings != null ? Math.round(remainingGradings * 5 * 10) / 10 : null;
  const gradingsEquivalent = cost / 5;
  const isPremium = limit >= 1000;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              CHIP,
              'cursor-pointer gap-1.5 px-3 text-sm sm:px-3.5 transition-colors hover:border-amber-400/60 hover:bg-amber-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 select-none'
            )}
            aria-label={`${cost} credits required for AI evaluation`}
          >
            <Coins className="h-4 w-4 text-amber-500 shrink-0" aria-hidden />
            <span className="font-semibold tabular-nums text-foreground">{cost}</span>
            <span className="sr-only text-muted-foreground sm:not-sr-only">credits</span>
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align="end"
          className="w-80 p-3.5 space-y-3 text-xs bg-popover/95 backdrop-blur-md border-border shadow-2xl rounded-2xl text-left"
        >
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <Coins className="h-4 w-4 text-amber-500" />
              <span>AI Grading Credits</span>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              5 credits = 1 grading
            </span>
          </div>

          <div className="space-y-1 text-muted-foreground leading-relaxed">
            <p>
              Marking this question uses <strong className="text-foreground">{cost} credits</strong> ({gradingsEquivalent === 1 ? '1 full AI grading' : `${gradingsEquivalent} AI gradings`}).
            </p>
            {costDoublesWhenLong && (
              <p className="text-[11px] text-muted-foreground/90">
                Spoken answers over 60 seconds take 10 credits (2 AI gradings).
              </p>
            )}
          </div>

          <div className="rounded-xl bg-muted/60 p-2.5 space-y-1.5 text-[11px]">
            <div className="flex justify-between items-center text-muted-foreground">
              <span>{isPremium ? 'Plan allowance:' : 'Your allowance:'}</span>
              <span className="font-semibold text-foreground">
                {limit.toLocaleString()} AI gradings ({totalCredits.toLocaleString()} credits)
              </span>
            </div>
            {!isPremium && (
              <div className="text-[10.5px] text-amber-600 dark:text-amber-400">
                Premium includes 1,100 AI gradings (5,500 credits).
              </div>
            )}
            {remainingGradings != null && (
              <div className="flex justify-between items-center text-muted-foreground pt-1.5 border-t border-border/50">
                <span>Remaining pool:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {formatGradings(remainingGradings)} gradings ({remainingCredits?.toLocaleString()} credits)
                </span>
              </div>
            )}
          </div>

          <p className="text-[10.5px] text-muted-foreground/80 leading-normal">
            Reading & listening practice is completely free and spends 0 credits. Credits are only used when the AI evaluates speaking or writing answers.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
