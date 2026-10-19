import { describe, expect, it } from 'vitest';
import { COURSE } from '@/data/learnKorean';
import {
  buildReview,
  completeLesson,
  completeReview,
  currentStreak,
  dueCount,
  EMPTY_PROGRESS,
  learnedWords,
  LESSON_XP,
  lessonState,
  mergeProgress,
  nextLesson,
  parseProgress,
  PERFECT_BONUS,
  REVIEW_SIZE,
  REVIEW_XP,
} from '@/lib/learn/progress';

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

const basic = COURSE.find(unit => unit.id === 'basic')!;
/** A learner who has finished the first two Basic Korean lessons. */
const withTwoLessons = () => {
  let progress = completeLesson(EMPTY_PROGRESS, basic.id, basic.lessons[0].id, 0, day('2026-09-01')).progress;
  progress = completeLesson(progress, basic.id, basic.lessons[1].id, 0, day('2026-09-01')).progress;
  return progress;
};

describe('word review', () => {
  it('reviews only words from finished lessons, leaving out letter charts', () => {
    expect(learnedWords(EMPTY_PROGRESS)).toEqual([]);
    expect(buildReview(EMPTY_PROGRESS)).toEqual([]);
    const words = learnedWords(withTwoLessons()).map(w => w.ko);
    expect(words).toContain('안녕하세요');
    expect(words).toContain('친구');
    expect(words.every(ko => !/[·→+=]/.test(ko))).toBe(true);
  });

  it('builds a session of fair questions, at most REVIEW_SIZE long', () => {
    const session = buildReview(withTwoLessons(), day('2026-09-02'));
    expect(session.length).toBeGreaterThan(0);
    expect(session.length).toBeLessThanOrEqual(REVIEW_SIZE);
    for (const { word, exercise } of session) {
      expect(exercise.options).toHaveLength(4);
      expect(new Set(exercise.options).size).toBe(4);
      expect([word.en, word.ko]).toContain(exercise.options[exercise.answer]);
    }
    // Asked three ways: meaning, by ear, and saying it.
    expect(session.some(({ exercise }) => exercise.listenOnly)).toBe(true);
  });

  it('spaces out words answered right, and brings back a missed word tomorrow', () => {
    const progress = withTwoLessons();
    const { progress: after, earned } = completeReview(
      progress,
      [{ ko: '친구', correct: true }, { ko: '사람', correct: false }],
      day('2026-09-02'),
    );
    expect(earned).toBe(REVIEW_XP);
    expect(after.xp).toBe(progress.xp + REVIEW_XP);
    expect(after.review['친구']).toMatchObject({ box: 0, due: '2026-09-03' });
    expect(after.review['사람']).toMatchObject({ box: 0, due: '2026-09-03' });

    const again = completeReview(after, [{ ko: '친구', correct: true }], day('2026-09-03')).progress;
    expect(again.review['친구']).toMatchObject({ box: 1, due: '2026-09-05' });
    // A review counts towards the streak, as a lesson does.
    expect(again.streak).toBe(3);
  });

  it('puts words due today first, and counts them for the path', () => {
    const progress = completeReview(withTwoLessons(), [{ ko: '친구', correct: false }], day('2026-09-02')).progress;
    expect(buildReview(progress, day('2026-09-03'))[0].word.ko).toBe('친구');
    expect(dueCount(progress, day('2026-09-03'))).toBe(learnedWords(progress).length);
  });
});

describe('progress across devices', () => {
  it('joins lessons from both copies, keeping the best XP', () => {
    const phone = completeLesson(EMPTY_PROGRESS, basic.id, basic.lessons[0].id, 2, day('2026-09-01')).progress;
    const laptop = completeLesson(EMPTY_PROGRESS, basic.id, basic.lessons[0].id, 0, day('2026-09-02')).progress;
    const withMore = completeLesson(laptop, basic.id, basic.lessons[1].id, 0, day('2026-09-02')).progress;
    const merged = mergeProgress(phone, withMore);
    expect(Object.keys(merged.completed)).toHaveLength(2);
    expect(merged.completed[`${basic.id}/${basic.lessons[0].id}`].xp).toBe(LESSON_XP + PERFECT_BONUS);
    expect(merged.lastDay).toBe('2026-09-02');
    expect(merged.xp).toBeGreaterThanOrEqual(2 * (LESSON_XP + PERFECT_BONUS));
  });

  it('keeps the most recent review of each word', () => {
    const base = withTwoLessons();
    const older = completeReview(base, [{ ko: '친구', correct: false }], day('2026-09-02')).progress;
    const newer = completeReview(base, [{ ko: '친구', correct: true }], day('2026-09-03')).progress;
    expect(mergeProgress(older, newer).review['친구']).toEqual(newer.review['친구']);
    expect(mergeProgress(newer, older).review['친구']).toEqual(newer.review['친구']);
  });

  it('reads a record saved before reviews existed', () => {
    expect(parseProgress({ completed: {}, xp: 5, streak: 1, lastDay: '2026-09-01' }).review).toEqual({});
  });
});
