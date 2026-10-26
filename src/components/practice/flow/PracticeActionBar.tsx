import type { ReactNode } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Coins, Info, Shuffle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SkillType } from '@/lib/types';

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
  /** Position in the list, 0-based; navigation is hidden without a list. */
  index?: number;
  total?: number;
  onJump?: (index: number) => void;
  onShuffle?: () => void;
  disabled?: boolean;
}

// One look for every control on the right: same height, border and surface.
const CHIP = 'inline-flex h-9 shrink-0 items-center rounded-full border border-border bg-background shadow-2xs';
// For see-through buttons placed on the dark blue bar.
export const ON_BAR = 'text-white hover:bg-white/15 hover:text-white';
const ARROW = 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-30';

/** The row under every practice item: actions on the left; cost, shuffle, and pagination in the right corner. */
export default function PracticeActionBar({ actions, middle, hideMiddleOnPhone, cost, index = -1, total = 0, onJump, onShuffle, disabled }: Props) {
  const nav = onJump && total > 0;
  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-[#0f2a6b] bg-[#13307f] dark:border-border dark:bg-card p-2.5 shadow-md sm:gap-3 sm:p-3">
      {/* On a phone: buttons on one row, credits and paging on the next. */}
      <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto sm:gap-2">{actions}</div>
      {/* The recorder gets its own row above the buttons until there is room for one line. */}
      {middle && (
        <div className={cn('order-first flex w-full justify-center xl:order-none xl:w-auto xl:flex-1', hideMiddleOnPhone && 'max-sm:hidden')}>{middle}</div>
      )}
      <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
        {cost != null && (
          <div
            title={`Marking this answer uses ${cost} AI-grading units of your allowance`}
            className={cn(CHIP, 'gap-1.5 px-3 text-sm sm:px-3.5')}
          >
            <Coins className="h-4 w-4 text-amber-500" aria-hidden />
            <span className="font-semibold tabular-nums text-foreground">{cost}</span>
            <span className="sr-only text-muted-foreground sm:not-sr-only">credits</span>
          </div>
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
        {nav && (
          <div className={cn(CHIP, 'ml-auto')}>
            <button
              type="button"
              onClick={() => onJump(index - 1)}
              disabled={disabled || index <= 0}
              aria-label="Previous question"
              title="Previous question"
              className={ARROW}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <label className="flex h-full cursor-pointer items-center gap-1 border-x border-border px-3 text-sm transition-colors hover:bg-muted/60">
              <select
                aria-label={`Question number, of ${total}`}
                value={index >= 0 ? index : ''}
                onChange={e => onJump(Number(e.target.value))}
                disabled={disabled}
                className="cursor-pointer appearance-none bg-transparent pr-4 font-semibold tabular-nums text-foreground focus:outline-none"
              >
                {index < 0 && <option value="">–</option>}
                {Array.from({ length: total }, (_, i) => (
                  <option key={i} value={i} className="bg-background text-foreground">
                    {i + 1}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none -ml-4 h-3 w-3 text-muted-foreground" aria-hidden />
              <span className="tabular-nums text-muted-foreground select-none">of {total}</span>
            </label>
            <button
              type="button"
              onClick={() => onJump(index + 1)}
              disabled={disabled || index >= total - 1}
              aria-label="Go to next question"
              title="Go to next question"
              className={cn(ARROW, 'text-primary hover:bg-primary/10 hover:text-primary')}
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Short notes under the action row. */
export function PracticeNotes({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {notes.map(n => (
        <li key={n} className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-px h-4 w-4 shrink-0 text-primary" aria-hidden /> {n}
        </li>
      ))}
    </ul>
  );
}

/** What to tell the learner about marking, by skill. */
export function notesFor(skill: SkillType): string[] {
  if (skill === 'speaking') {
    return ['AI scoring is available once you submit your response.', 'Use a headset with a microphone to get an accurate AI score.'];
  }
  if (skill === 'writing') return ['AI scoring is available once you submit your response.'];
  return ['Your answer is marked as soon as you submit it.'];
}
