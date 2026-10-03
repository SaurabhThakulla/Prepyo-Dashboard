import { ChoiceExercise, Exercise, Lesson, MatchExercise, TeachExercise, Unit } from './types';

/** One word or phrase to teach: Korean, how it sounds, what it means. */
export interface Word {
  ko: string;
  roman: string;
  en: string;
  /** An emoji for the word, when there is a clear one. */
  picture?: string;
  note?: string;
}

const teach = (word: Word): TeachExercise => ({
  kind: 'teach',
  ko: word.ko,
  roman: word.roman,
  en: word.en,
  ...(word.picture ? { picture: word.picture } : {}),
  ...(word.note ? { note: word.note } : {}),
});

/**
 * Four options with the right one at `slot`, the others taken a fixed stride
 * apart in the list. Fixed rather than random, so a lesson is the same every
 * time and its answers can be tested.
 */
function options<T>(pool: T[], target: number, slot: number): { options: T[]; answer: number } {
  const others: T[] = [];
  // Odd strides first, so neighbours in the list are not always the decoys.
  const steps = Array.from({ length: pool.length - 1 }, (_, i) => i + 1);
  const strides = [...steps.filter(s => s % 2 === 1), ...steps.filter(s => s % 2 === 0)];
  for (const step of strides) {
    if (others.length === 3) break;
    const candidate = pool[(target + step) % pool.length];
    if (candidate !== pool[target] && !others.includes(candidate)) others.push(candidate);
  }
  const all = [...others];
  const answer = slot % (all.length + 1);
  all.splice(answer, 0, pool[target]);
  return { options: all, answer };
}

function meaning(words: Word[], target: number, slot: number): ChoiceExercise {
  const { options: opts, answer } = options(words.map(w => w.en), target, slot);
  return { kind: 'choice', prompt: 'What does this mean?', ko: words[target].ko, options: opts, answer };
}

function listening(words: Word[], target: number, slot: number): ChoiceExercise {
  const { options: opts, answer } = options(words.map(w => w.en), target, slot);
  return {
    kind: 'choice',
    prompt: 'Listen. What does it mean?',
    speak: words[target].ko,
    listenOnly: true,
    options: opts,
    answer,
    explain: `${words[target].ko} (${words[target].roman}) means “${words[target].en}”.`,
  };
}

function hearWord(words: Word[], target: number, slot: number): ChoiceExercise {
  const { options: opts, answer } = options(words.map(w => w.ko), target, slot);
  return { kind: 'choice', prompt: 'Listen. Which one did you hear?', speak: words[target].ko, listenOnly: true, options: opts, answer };
}

function sayIt(words: Word[], target: number, slot: number): ChoiceExercise {
  const { options: opts, answer } = options(words.map(w => w.ko), target, slot);
  return { kind: 'choice', prompt: `How do you say “${words[target].en}” in Korean?`, options: opts, answer };
}

function picture(words: Word[], target: number, slot: number): ChoiceExercise | undefined {
  const pictured = words.filter(w => w.picture);
  if (pictured.length < 4 || new Set(pictured.map(w => w.picture)).size !== pictured.length) return undefined;
  const index = pictured.indexOf(words[target]);
  if (index < 0) return undefined;
  const { options: opts, answer } = options(pictured.map(w => w.picture!), index, slot);
  return { kind: 'choice', prompt: `Which picture is ${words[target].ko}?`, ko: words[target].ko, options: opts, pictureOptions: true, answer };
}

const match = (words: Word[]): MatchExercise => ({
  kind: 'match',
  prompt: 'Match the word to its meaning',
  pairs: words.map(w => [w.ko, w.en] as [string, string]),
});

const built = new WeakSet<Lesson>();

/**
 * A vocabulary lesson from a list of words: the first half taught then
 * tested (meaning, listening, saying it), the same for the second half, a
 * picture question where the words have pictures, and two matching rounds.
 * Every lesson built here has at least two listening questions.
 */
export function vocabLesson(id: string, title: string, summary: string, words: Word[]): Lesson {
  if (words.length < 6) throw new Error(`${id}: a vocabulary lesson needs at least 6 words`);
  if (new Set(words.map(w => w.ko)).size !== words.length || new Set(words.map(w => w.en)).size !== words.length) {
    throw new Error(`${id}: every word needs its own Korean and its own meaning`);
  }
  const half = Math.ceil(words.length / 2);
  const firstPicture = words.findIndex((w, i) => i >= half && w.picture);
  const exercises: Exercise[] = [
    ...words.slice(0, half).map(teach),
    meaning(words, 0, 0),
    listening(words, 1, 1),
    sayIt(words, 2, 2),
    ...words.slice(half).map(teach),
    picture(words, firstPicture >= 0 ? firstPicture : half, 3) ?? meaning(words, half, 3),
    hearWord(words, half + 1, 1),
    listening(words, half + 2 < words.length ? half + 2 : half, 2),
    sayIt(words, words.length - 1, 0),
    match(words.slice(0, 4)),
    match(words.slice(half, half + 4)),
  ];
  const lesson: Lesson = { id, title, summary, exercises };
  built.add(lesson);
  return lesson;
}

/**
 * Adds a listening question to every hand-written lesson that has fewer than
 * two, built from the lesson's own taught items: "Listen. Which one did you
 * hear?" Half of the test is listening, so every lesson trains the ear.
 */
export function withListening(unit: Unit): Unit {
  return {
    ...unit,
    lessons: unit.lessons.map((lesson, index) => {
      if (built.has(lesson)) return lesson;
      const heard = lesson.exercises.filter(ex => ex.kind === 'choice' && ex.listenOnly).length;
      if (heard >= 2) return lesson;
      const items = lesson.exercises.filter(
        (ex): ex is TeachExercise => ex.kind === 'teach' && !/[·→+=]/.test(ex.ko),
      );
      if (items.length < 4) return lesson;
      const pool = items.map(item => item.ko);
      const letter = items.every(item => [...item.ko].length === 1);
      // Enough to reach two, each on a different item.
      const questions: ChoiceExercise[] = Array.from({ length: 2 - heard }, (_, k) => {
        const target = (index * 3 + 1 + k * 2) % items.length;
        const { options: opts, answer } = options(pool, target, index + 1 + k);
        return {
          kind: 'choice',
          prompt: letter ? 'Listen. Which letter did you hear?' : 'Listen. Which one did you hear?',
          speak: items[target].speak ?? items[target].ko,
          listenOnly: true,
          options: opts,
          answer,
          explain: `You heard ${items[target].ko} (${items[target].roman}): “${items[target].en}”.`,
        };
      });
      // Before the closing match, so the lesson still ends on matching.
      const last = lesson.exercises.length - 1;
      const at = lesson.exercises[last]?.kind === 'match' ? last : lesson.exercises.length;
      return { ...lesson, exercises: [...lesson.exercises.slice(0, at), ...questions, ...lesson.exercises.slice(at)] };
    }),
  };
}
