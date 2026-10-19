/** How one answer choice is shown once the answer key is known. */
export type AnswerMark = 'right' | 'wrong' | 'missed' | 'none';

/** Right: picked and correct. Wrong: picked, not correct. Missed: correct, not picked. Null key: not marked yet. */
export function answerMark(id: string, selected: boolean, correct: string[] | null | undefined): AnswerMark {
  if (!correct) return 'none';
  const isCorrect = correct.some(c => c.trim().toLowerCase() === id.trim().toLowerCase());
  if (selected) return isCorrect ? 'right' : 'wrong';
  return isCorrect ? 'missed' : 'none';
}

/** Card styles for an option row in each state. */
export const OPTION_MARK_CLASS: Record<AnswerMark, string> = {
  right: 'border-emerald-500 bg-emerald-500/10',
  wrong: 'border-rose-500 bg-rose-500/10',
  missed: 'border-emerald-500 border-dashed bg-emerald-500/5',
  none: 'border-border bg-card opacity-80',
};

/** Short label read out and shown beside a marked option. */
export const OPTION_MARK_LABEL: Record<AnswerMark, string | null> = {
  right: 'Your answer · correct',
  wrong: 'Your answer · incorrect',
  missed: 'Correct answer',
  none: null,
};

/** Text styles for a single marked word, as in highlight tasks. */
export const WORD_MARK_CLASS: Record<AnswerMark, string> = {
  right: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 underline decoration-2 underline-offset-4',
  wrong: 'bg-rose-500/15 text-rose-800 dark:text-rose-300 line-through',
  missed: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 outline outline-1 outline-dashed outline-emerald-500',
  none: 'text-foreground',
};
