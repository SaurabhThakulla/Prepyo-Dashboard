import type { ChoiceExercise, Lesson, Unit } from '@/data/learnKorean/types';
import { fourOptions } from './progress';

/**
 * The test at the end of a unit: UNIT_TEST_SIZE questions on everything the
 * unit taught, with no teaching cards, and UNIT_TEST_LIVES mistakes allowed
 * before it has to be started again. Few units have that many questions of
 * their own, so the test also asks about each pair the unit matches and each
 * letter or word it teaches.
 */
export const UNIT_TEST_ID = 'unit-test';
export const UNIT_TEST_SIZE = 50;
export const UNIT_TEST_LIVES = 8;

/** Adds the unit test as the last lesson of every unit of taught lessons (not the exam-task units). */
export function withUnitTests(units: Unit[]): Unit[] {
  return units.map(unit =>
    unit.anyOrder
      ? unit
      : {
          ...unit,
          lessons: [
            ...unit.lessons,
            {
              id: UNIT_TEST_ID,
              title: 'Unit test',
              summary: `${UNIT_TEST_SIZE} questions on the whole unit · ${UNIT_TEST_LIVES} mistakes allowed`,
              exercises: [],
              test: true,
            } satisfies Lesson,
          ],
        },
  );
}

/** A fresh set of questions for a unit's test, in a new order each time. */
export function buildUnitTest(unit: Unit, language: string, random: () => number = Math.random): ChoiceExercise[] {
  const exercises = unit.lessons.filter(l => !l.test).flatMap(l => l.exercises);
  const pool: ChoiceExercise[] = exercises.filter((e): e is ChoiceExercise => e.kind === 'choice');

  // Each matched pair as a question of its own.
  const pairs = exercises.flatMap(e => (e.kind === 'match' ? e.pairs : []));
  const partners = pairs.map(([, right]) => right);
  pairs.forEach(([left, right], i) => {
    const { options, answer } = fourOptions(partners, right, i);
    if (options.length >= 2) pool.push({ kind: 'choice', prompt: 'Which one goes with this?', ko: left, options, answer });
  });

  // Each letter and word taught, asked by its sound or meaning, the other way round, and by ear.
  // Charts and sound-building cards ("ㄱ + ㅏ = 가") are left out, as review leaves them out.
  const taught = exercises.flatMap(e => (e.kind === 'teach' && !/[·→+=]/.test(e.ko) ? [e] : []));
  const isLetter = (ko: string) => Array.from(ko.trim()).length === 1;
  const letters = taught.filter(t => isLetter(t.ko));
  const words = taught.filter(t => !isLetter(t.ko));
  letters.forEach((t, i) => {
    const sound = fourOptions(letters.map(l => l.roman), t.roman, i);
    pool.push({ kind: 'choice', prompt: 'Which sound does this letter make?', ko: t.ko, speak: t.speak, ...sound });
    const letter = fourOptions(letters.map(l => l.ko), t.ko, i + 1);
    pool.push({ kind: 'choice', prompt: `Which letter is “${t.roman}”?`, ...letter });
    const heard = fourOptions(letters.map(l => l.ko), t.ko, i + 2);
    pool.push({ kind: 'choice', prompt: 'Listen. Which letter did you hear?', speak: t.speak ?? t.ko, listenOnly: true, ...heard });
  });
  words.forEach((t, i) => {
    const meaning = fourOptions(words.map(w => w.en), t.en, i);
    pool.push({ kind: 'choice', prompt: 'What does this mean?', ko: t.ko, speak: t.speak, ...meaning });
    const say = fourOptions(words.map(w => w.ko), t.ko, i + 1);
    pool.push({ kind: 'choice', prompt: `How do you say “${t.en}” in ${language}?`, ...say });
    const heard = fourOptions(words.map(w => w.en), t.en, i + 2);
    pool.push({ kind: 'choice', prompt: 'Listen. What does it mean?', speak: t.speak ?? t.ko, listenOnly: true, ...heard });
  });

  // One of each question, with at least two options to choose from.
  const seen = new Set<string>();
  const unique = pool.filter(q => {
    const key = `${q.prompt}|${q.ko ?? q.speak ?? ''}|${q.options[q.answer]}`;
    if (q.options.length < 2 || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [unique[i], unique[j]] = [unique[j], unique[i]];
  }
  return unique.slice(0, UNIT_TEST_SIZE);
}
