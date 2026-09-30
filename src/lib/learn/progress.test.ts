import { describe, expect, it } from 'vitest';
import { COURSE } from '@/data/learnKorean';
import {
  completeLesson,
  currentStreak,
  EMPTY_PROGRESS,
  LESSON_XP,
  lessonState,
  nextLesson,
  parseProgress,
  PERFECT_BONUS,
} from './progress';

const hangul = COURSE[0];
const epsTopik = COURSE.find(unit => unit.id === 'eps-topik')!;
const day = (iso: string) => new Date(`${iso}T10:00:00`);

describe('which lessons are open', () => {
  it('opens the first lesson of every unit and locks the rest of an ordered unit', () => {
    expect(lessonState(EMPTY_PROGRESS, hangul, 0)).toBe('open');
    expect(lessonState(EMPTY_PROGRESS, hangul, 1)).toBe('locked');
    for (const unit of COURSE) expect(lessonState(EMPTY_PROGRESS, unit, 0)).toBe('open');
  });

  it('opens the next lesson once the one before it is done', () => {
    const { progress } = completeLesson(EMPTY_PROGRESS, hangul.id, hangul.lessons[0].id, 0, day('2026-09-01'));
    expect(lessonState(progress, hangul, 0)).toBe('done');
    expect(lessonState(progress, hangul, 1)).toBe('open');
    expect(lessonState(progress, hangul, 2)).toBe('locked');
  });

  it('keeps every exam-task lesson open, since each stands alone', () => {
    epsTopik.lessons.forEach((_, i) => expect(lessonState(EMPTY_PROGRESS, epsTopik, i)).toBe('open'));
  });

  it('points a new learner at the very first lesson, then at the next one', () => {
    expect(nextLesson(EMPTY_PROGRESS)).toEqual({ unit: hangul, index: 0 });
    const { progress } = completeLesson(EMPTY_PROGRESS, hangul.id, hangul.lessons[0].id, 2, day('2026-09-01'));
    expect(nextLesson(progress)).toEqual({ unit: hangul, index: 1 });
  });
});

describe('XP', () => {
  it('gives a lesson its XP, plus a bonus for no mistakes', () => {
    expect(completeLesson(EMPTY_PROGRESS, 'hangul', 'vowels', 1).earned).toBe(LESSON_XP);
    expect(completeLesson(EMPTY_PROGRESS, 'hangul', 'vowels', 0).earned).toBe(LESSON_XP + PERFECT_BONUS);
  });

  it('gives nothing for repeating a lesson, except the bonus a first perfect run earns', () => {
    const first = completeLesson(EMPTY_PROGRESS, 'hangul', 'vowels', 3);
    expect(completeLesson(first.progress, 'hangul', 'vowels', 2).earned).toBe(0);
    const perfect = completeLesson(first.progress, 'hangul', 'vowels', 0);
    expect(perfect.earned).toBe(PERFECT_BONUS);
    expect(perfect.progress.xp).toBe(LESSON_XP + PERFECT_BONUS);
    expect(completeLesson(perfect.progress, 'hangul', 'vowels', 0).earned).toBe(0);
  });
});

describe('the daily streak', () => {
  it('starts at one, holds within a day and grows on the next day', () => {
    let p = completeLesson(EMPTY_PROGRESS, 'hangul', 'vowels', 0, day('2026-09-01')).progress;
    expect(p.streak).toBe(1);
    p = completeLesson(p, 'hangul', 'consonants', 0, day('2026-09-01')).progress;
    expect(p.streak).toBe(1);
    p = completeLesson(p, 'hangul', 'syllables', 0, day('2026-09-02')).progress;
    expect(p.streak).toBe(2);
  });

  it('counts a repeat lesson as practice for the day', () => {
    let p = completeLesson(EMPTY_PROGRESS, 'hangul', 'vowels', 0, day('2026-09-01')).progress;
    p = completeLesson(p, 'hangul', 'vowels', 0, day('2026-09-02')).progress;
    expect(p.streak).toBe(2);
  });

  it('starts again after a missed day', () => {
    let p = completeLesson(EMPTY_PROGRESS, 'hangul', 'vowels', 0, day('2026-09-01')).progress;
    p = completeLesson(p, 'hangul', 'consonants', 0, day('2026-09-02')).progress;
    p = completeLesson(p, 'hangul', 'syllables', 0, day('2026-09-04')).progress;
    expect(p.streak).toBe(1);
  });

  it('carries across a month end', () => {
    let p = completeLesson(EMPTY_PROGRESS, 'hangul', 'vowels', 0, day('2026-09-30')).progress;
    p = completeLesson(p, 'hangul', 'consonants', 0, day('2026-10-01')).progress;
    expect(p.streak).toBe(2);
  });

  it('shows as lapsed once a whole day has passed with no lesson', () => {
    const p = completeLesson(EMPTY_PROGRESS, 'hangul', 'vowels', 0, day('2026-09-01')).progress;
    expect(currentStreak(p, day('2026-09-01'))).toBe(1);
    expect(currentStreak(p, day('2026-09-02'))).toBe(1);
    expect(currentStreak(p, day('2026-09-03'))).toBe(0);
  });
});

describe('reading saved progress', () => {
  it('turns anything malformed into a fresh start', () => {
    expect(parseProgress(null)).toEqual(EMPTY_PROGRESS);
    expect(parseProgress('nope')).toEqual(EMPTY_PROGRESS);
    expect(parseProgress({ xp: 'lots', streak: 3 })).toEqual({ ...EMPTY_PROGRESS, streak: 3 });
  });
});
