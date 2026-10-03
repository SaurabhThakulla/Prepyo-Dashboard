import { COURSE, lessonKey, Unit } from '@/data/learnKorean';
import type { ChoiceExercise } from '@/data/learnKorean/types';

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
  /**
   * The word review schedule: Korean text → how well it is known (box 0–5),
   * the day it is next due, and when it was last reviewed (ISO time).
   */
  review: Record<string, ReviewState>;
}

export interface ReviewState {
  box: number;
  due: string;
  at: string;
}

export const EMPTY_PROGRESS: LearnProgress = { completed: {}, xp: 0, streak: 0, lastDay: null, review: {} };

export const LESSON_XP = 10;
export const PERFECT_BONUS = 5;
export const REVIEW_XP = 5;
/** Days until a word is due again, by box: each right answer moves it up one. */
export const REVIEW_INTERVALS = [1, 2, 4, 7, 14, 30];
export const REVIEW_SIZE = 10;

export type LessonState = 'done' | 'open' | 'locked';

/** A local calendar day, YYYY-MM-DD, so a streak follows the learner's own midnight. */
export function dayOf(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return dayOf(new Date(y, m - 1, d + days));
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

  return {
    earned,
    progress: {
      ...progress,
      ...practisedToday(progress, now),
      completed: {
        ...progress.completed,
        [key]: { at: progress.completed[key]?.at ?? now.toISOString(), xp: Math.max(before, score) },
      },
      xp: progress.xp + earned,
    },
  };
}

/** The streak after practising today: a lesson or a review both count. */
function practisedToday(progress: LearnProgress, now: Date): Pick<LearnProgress, 'streak' | 'lastDay'> {
  const today = dayOf(now);
  const gap = progress.lastDay ? daysBetween(progress.lastDay, today) : Infinity;
  const streak = gap === 0 ? Math.max(progress.streak, 1) : gap === 1 ? progress.streak + 1 : 1;
  return { streak, lastDay: today };
}

/** A word the learner has been taught, as review needs it. */
export interface ReviewWord {
  ko: string;
  /** What is spoken; differs from ko for a lone letter. */
  speak: string;
  roman: string;
  en: string;
}

/**
 * Every word taught in a finished lesson, once each, in course order. Letter
 * charts and sound-building cards ("ㄱ + ㅏ = 가") are left out: they are not
 * words to recall.
 */
export function learnedWords(progress: LearnProgress): ReviewWord[] {
  const words = new Map<string, ReviewWord>();
  for (const unit of COURSE) {
    for (const lesson of unit.lessons) {
      if (!progress.completed[lessonKey(unit.id, lesson.id)]) continue;
      for (const ex of lesson.exercises) {
        if (ex.kind !== 'teach' || /[·→+=]/.test(ex.ko) || words.has(ex.ko)) continue;
        words.set(ex.ko, { ko: ex.ko, speak: ex.speak ?? ex.ko, roman: ex.roman, en: ex.en });
      }
    }
  }
  return [...words.values()];
}

/** Words due for review today, so the path can say how many are waiting. */
export function dueCount(progress: LearnProgress, now: Date = new Date()): number {
  const today = dayOf(now);
  return learnedWords(progress).filter(w => !progress.review[w.ko] || progress.review[w.ko].due <= today).length;
}

/** Four options, the right one at a slot that varies, the rest from `pool`. */
function fourOptions(pool: string[], right: string, slot: number): { options: string[]; answer: number } {
  const others = [...new Set(pool.filter(value => value !== right))];
  const picked: string[] = [];
  for (let i = 0; picked.length < 3 && i < others.length * 2; i++) {
    const candidate = others[(slot * 7 + i * 5) % others.length];
    if (!picked.includes(candidate)) picked.push(candidate);
  }
  for (const candidate of others) if (picked.length < 3 && !picked.includes(candidate)) picked.push(candidate);
  const answer = slot % (picked.length + 1);
  picked.splice(answer, 0, right);
  return { options: picked, answer };
}

/**
 * A review session: up to REVIEW_SIZE learned words, those due first (the
 * weakest first), then words never reviewed, each asked one of three ways in
 * turn: its meaning, by ear, or how to say it. Empty until the learner knows
 * at least four words, the fewest that make a fair choice.
 */
export function buildReview(
  progress: LearnProgress,
  now: Date = new Date(),
): { word: ReviewWord; exercise: ChoiceExercise }[] {
  const words = learnedWords(progress);
  if (words.length < 4) return [];
  const today = dayOf(now);
  const state = (w: ReviewWord) => progress.review[w.ko];
  const due = words.filter(w => state(w) && state(w).due <= today).sort((a, b) => state(a).box - state(b).box);
  const fresh = words.filter(w => !state(w));
  const later = words
    .filter(w => state(w) && state(w).due > today)
    .sort((a, b) => state(a).due.localeCompare(state(b).due));
  const chosen = [...due, ...fresh, ...later].slice(0, REVIEW_SIZE);
  const meanings = words.map(w => w.en);
  const koreans = words.map(w => w.ko);

  return chosen.map((word, i) => {
    const explain = `${word.ko} (${word.roman}) means “${word.en}”.`;
    if (i % 3 === 1) {
      const { options, answer } = fourOptions(meanings, word.en, i);
      const exercise: ChoiceExercise = { kind: 'choice', prompt: 'Listen. What does it mean?', speak: word.speak, listenOnly: true, options, answer, explain };
      return { word, exercise };
    }
    if (i % 3 === 2) {
      const { options, answer } = fourOptions(koreans, word.ko, i);
      const exercise: ChoiceExercise = { kind: 'choice', prompt: `How do you say “${word.en}” in Korean?`, options, answer, explain };
      return { word, exercise };
    }
    const { options, answer } = fourOptions(meanings, word.en, i);
    const exercise: ChoiceExercise = { kind: 'choice', prompt: 'What does this mean?', ko: word.ko, options, answer, explain };
    return { word, exercise };
  });
}

/**
 * Records a finished review. A word answered right moves up a box and is due
 * later; a word missed goes back to box 0, due tomorrow. A review earns
 * REVIEW_XP and keeps the streak alive, as a lesson does.
 */
export function completeReview(
  progress: LearnProgress,
  results: { ko: string; correct: boolean }[],
  now: Date = new Date(),
): { progress: LearnProgress; earned: number } {
  const today = dayOf(now);
  const review = { ...progress.review };
  for (const { ko, correct } of results) {
    const box = correct ? Math.min((review[ko]?.box ?? -1) + 1, REVIEW_INTERVALS.length - 1) : 0;
    review[ko] = { box, due: addDays(today, correct ? REVIEW_INTERVALS[box] : 1), at: now.toISOString() };
  }
  return {
    earned: REVIEW_XP,
    progress: { ...progress, ...practisedToday(progress, now), xp: progress.xp + REVIEW_XP, review },
  };
}

/**
 * Combines this device's progress with the copy kept on the server, so no
 * finished lesson or review is lost whichever was newer: lessons are joined
 * (best XP, first finish), the streak comes from whichever practised last,
 * and each word keeps its most recent review.
 */
export function mergeProgress(a: LearnProgress, b: LearnProgress): LearnProgress {
  const completed: LearnProgress['completed'] = { ...a.completed };
  for (const [key, entry] of Object.entries(b.completed)) {
    const mine = completed[key];
    completed[key] = mine ? { at: mine.at < entry.at ? mine.at : entry.at, xp: Math.max(mine.xp, entry.xp) } : entry;
  }
  const review: LearnProgress['review'] = { ...a.review };
  for (const [ko, entry] of Object.entries(b.review)) {
    if (!review[ko] || review[ko].at < entry.at) review[ko] = entry;
  }
  const latest = (a.lastDay ?? '') >= (b.lastDay ?? '') ? a : b;
  const other = latest === a ? b : a;
  const lessonXp = Object.values(completed).reduce((sum, entry) => sum + entry.xp, 0);
  return {
    completed,
    review,
    xp: Math.max(a.xp, b.xp, lessonXp),
    streak: latest.lastDay === other.lastDay ? Math.max(a.streak, b.streak) : latest.streak,
    lastDay: latest.lastDay,
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
    review: value.review && typeof value.review === 'object' ? value.review : {},
  };
}
