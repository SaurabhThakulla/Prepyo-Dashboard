import { COURSE, lessonKey, Unit } from '@/data/learnKorean';

/**
 * Progress through the beginner Korean course: which lessons are done, XP and
 * the daily streak. Pure functions over a plain object, so the rules can be
 * tested and the storage (browser now, the server later) can change freely.
 */
export interface LearnProgress {
  /** "unit/lesson" → when it was first finished (ISO time) and best XP. */
  completed: Record<string, { at: string; xp: number }>;
  xp: number;
  streak: number;
  /** The local calendar day of the last finished lesson, as YYYY-MM-DD. */
  lastDay: string | null;
}

export const EMPTY_PROGRESS: LearnProgress = { completed: {}, xp: 0, streak: 0, lastDay: null };

export const LESSON_XP = 10;
export const PERFECT_BONUS = 5;

export type LessonState = 'done' | 'open' | 'locked';

/** A local calendar day, YYYY-MM-DD, so a streak follows the learner's own midnight. */
export function dayOf(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function daysBetween(from: string, to: string): number {
  const [a, b] = [from, to].map(day => {
    const [y, m, d] = day.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  });
  return Math.round((b - a) / 86_400_000);
}

/**
 * Lessons open in order within a unit. The first lesson of every unit is
 * always open, so a learner who already reads Hangul can go straight to the
 * vocabulary or the exam tasks instead of being held behind lessons they do
 * not need. A unit of stand-alone lessons (the exam tasks) is open throughout.
 */
export function lessonState(progress: LearnProgress, unit: Unit, index: number): LessonState {
  const lesson = unit.lessons[index];
  if (progress.completed[lessonKey(unit.id, lesson.id)]) return 'done';
  if (index === 0 || unit.anyOrder) return 'open';
  const previous = unit.lessons[index - 1];
  return progress.completed[lessonKey(unit.id, previous.id)] ? 'open' : 'locked';
}

/** The streak as it stands today: it lapses once a whole day passes without a lesson. */
export function currentStreak(progress: LearnProgress, today: Date = new Date()): number {
  if (!progress.lastDay) return 0;
  return daysBetween(progress.lastDay, dayOf(today)) <= 1 ? progress.streak : 0;
}

/**
 * Records a finished lesson. XP is earned once per lesson; a repeat can only
 * raise it to a perfect score. The streak counts calendar days with at least
 * one finished lesson, repeats included, the way a daily habit does.
 */
export function completeLesson(
  progress: LearnProgress,
  unitId: string,
  lessonId: string,
  mistakes: number,
  now: Date = new Date(),
): { progress: LearnProgress; earned: number } {
  const key = lessonKey(unitId, lessonId);
  const score = LESSON_XP + (mistakes === 0 ? PERFECT_BONUS : 0);
  const before = progress.completed[key]?.xp ?? 0;
  const earned = Math.max(0, score - before);

  const today = dayOf(now);
  const gap = progress.lastDay ? daysBetween(progress.lastDay, today) : Infinity;
  const streak = gap === 0 ? Math.max(progress.streak, 1) : gap === 1 ? progress.streak + 1 : 1;

  return {
    earned,
    progress: {
      completed: {
        ...progress.completed,
        [key]: { at: progress.completed[key]?.at ?? now.toISOString(), xp: Math.max(before, score) },
      },
      xp: progress.xp + earned,
      streak,
      lastDay: today,
    },
  };
}

/** The first lesson not yet done that the learner can open, in course order. */
export function nextLesson(progress: LearnProgress): { unit: Unit; index: number } | undefined {
  for (const unit of COURSE) {
    for (let index = 0; index < unit.lessons.length; index++) {
      if (lessonState(progress, unit, index) === 'open') return { unit, index };
    }
  }
  return undefined;
}

export function unitDoneCount(progress: LearnProgress, unit: Unit): number {
  return unit.lessons.filter(lesson => progress.completed[lessonKey(unit.id, lesson.id)]).length;
}

/** Reads saved progress defensively: anything malformed becomes a fresh start. */
export function parseProgress(raw: unknown): LearnProgress {
  if (!raw || typeof raw !== 'object') return EMPTY_PROGRESS;
  const value = raw as Partial<LearnProgress>;
  return {
    completed: value.completed && typeof value.completed === 'object' ? value.completed : {},
    xp: typeof value.xp === 'number' ? value.xp : 0,
    streak: typeof value.streak === 'number' ? value.streak : 0,
    lastDay: typeof value.lastDay === 'string' ? value.lastDay : null,
  };
}
