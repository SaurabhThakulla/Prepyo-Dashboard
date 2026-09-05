/**
 * Date helpers for the exam countdown.
 *
 * Both parse `YYYY-MM-DD` by hand rather than handing the string to `new Date`,
 * because `new Date('2026-10-15')` is parsed as UTC midnight and can land on
 * the previous day for a learner in Nepal (UTC+5:45).
 */

/** Splits `YYYY-MM-DD` (with or without a time part) into local date parts. */
function parseDateParts(value: string): { year: number; month: number; day: number } | null {
  const parts = value.split('T')[0].split('-');
  if (parts.length !== 3) return null;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return null;

  return { year, month, day };
}

/** `2026-10-15` → `15 Oct 2026`. Returns `fallback` for anything unparseable. */
export function formatExamDate(value: string | undefined, fallback = ''): string {
  if (!value) return fallback;

  const parts = parseDateParts(value);
  const date = parts ? new Date(parts.year, parts.month, parts.day) : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return `${date.getDate()} ${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear()}`;
}

/**
 * Whole days from now until the exam, never negative.
 *
 * The exam is treated as 9am local, so the count does not tick down at
 * midnight on the day itself.
 */
export function daysUntilExam(value: string | undefined, fallback = 0): number {
  if (!value) return fallback;

  const parts = parseDateParts(value);
  const target = parts
    ? new Date(parts.year, parts.month, parts.day, 9, 0, 0)
    : new Date(value);
  if (Number.isNaN(target.getTime())) return fallback;

  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.ceil((target.getTime() - Date.now()) / millisecondsPerDay));
}
