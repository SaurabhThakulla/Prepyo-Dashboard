/**
 * Where mock questions come from and how hard they are, for the paper cards
 * and the label above questions in a mock. Sources are the catalog's codes
 * (from question tags); levels are the questions' stored difficulty.
 */
export type Level = 'easy' | 'medium' | 'hard';
export const LEVELS: Level[] = ['easy', 'medium', 'hard'];

export const LEVEL_STYLE: Record<Level, { chip: string; bar: string }> = {
  easy: { chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300', bar: 'bg-emerald-500' },
  medium: { chip: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300', bar: 'bg-amber-500' },
  hard: { chip: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300', bar: 'bg-red-500' },
};

/** Question tags that name a source, as the catalog codes them. */
export const SOURCE_TAGS: Record<string, string> = { 'Original practice': 'original', 'Exam Memories': 'exam_memories' };

/** Where a paper's questions come from, in words. */
export function paperSource(sources: string[] | undefined, exam: string): string {
  const names: Record<string, string> = {
    original: `Original Prepyo practice, written to the official ${exam.toUpperCase()} format`,
    exam_memories: 'PTE Tutorials exam memories (Nov 2022)',
  };
  return (sources ?? []).map(s => names[s]).filter(Boolean).join(' · ');
}

/** The level a set of questions mostly sits at: the average of easy 1, medium 2, hard 3. */
export function overallLevel(levels: Partial<Record<string, number>> | undefined): Level | undefined {
  const counts = LEVELS.map(level => levels?.[level] ?? 0);
  const total = counts.reduce((a, b) => a + b, 0);
  if (!total) return undefined;
  const mean = (counts[0] + 2 * counts[1] + 3 * counts[2]) / total;
  return mean < 5 / 3 ? 'easy' : mean < 7 / 3 ? 'medium' : 'hard';
}
