/**
 * The beginner courses: units of short lessons, each a run of small
 * exercises. Everything here is written by us; no official sample question is
 * copied. The Korean course's vocabulary themes follow the everyday and
 * workplace areas of HRD Korea's EPS-TOPIK standard (출제기준); the Japanese
 * course (data/learnJapanese) follows the JLPT N5 level.
 *
 * The Japanese course uses the same shapes. Its fields named `ko` hold the
 * course language's text, Japanese there, and `roman` its kana reading and
 * romaji where the text has kanji ("がっこう · gakkō").
 */

/** Shows a letter, word or phrase with its sound and meaning. Nothing to answer. */
export interface TeachExercise {
  kind: 'teach';
  /** What is shown, large: a letter, a word or a short sentence. */
  ko: string;
  /** What is spoken when the learner presses play. Defaults to `ko`; set it
   *  for a lone letter, which a voice cannot say on its own (ㅏ is read as 아). */
  speak?: string;
  roman: string;
  en: string;
  /** A picture for the word, as an emoji. */
  picture?: string;
  note?: string;
}

/** One question with one right answer out of a few. */
export interface ChoiceExercise {
  kind: 'choice';
  /** The question, in English. */
  prompt: string;
  /** Korean shown with the question. `[word]` is drawn underlined. */
  ko?: string;
  /** Korean spoken with the question. */
  speak?: string;
  /** Listening: the Korean is heard, not shown, until the answer is checked. */
  listenOnly?: boolean;
  /** A picture shown with the question, as an emoji. */
  picture?: string;
  /** Show `ko` as a sign board, for notices and warning signs. */
  sign?: boolean;
  options: string[];
  /** The options are pictures (emoji), drawn as large tiles. */
  pictureOptions?: boolean;
  answer: number;
  /** Shown after checking, right or wrong. */
  explain?: string;
}

/** Tap a left item, then its partner on the right. */
export interface MatchExercise {
  kind: 'match';
  prompt: string;
  pairs: [string, string][];
}

/**
 * What an exam task is and how to answer it. The task's name, instruction in
 * the exam's language and place in the test are looked up from the syllabus
 * and task metadata, so they cannot drift from the practice pages.
 */
export interface TaskIntroExercise {
  kind: 'taskIntro';
  /** English for the task's Korean instruction line. */
  instructionEn: string;
  /** The words in the instruction worth knowing on sight. */
  keyWords: [ko: string, en: string][];
  what: string;
  howTo: string[];
  tip: string;
}

export type Exercise = TeachExercise | ChoiceExercise | MatchExercise | TaskIntroExercise;

export interface Lesson {
  id: string;
  title: string;
  /** One line under the title, in the path and the menu. */
  summary: string;
  exercises: Exercise[];
  /** Exam-task lessons only: the practice page for the task this lesson introduces. */
  practice?: { code: string; skill: 'reading' | 'listening'; typeKey: string };
}

export interface Unit {
  id: string;
  number: number;
  title: string;
  description: string;
  /** An emoji for the unit banner. */
  emoji: string;
  /** Every lesson is open from the start, for lessons that stand alone. */
  anyOrder?: boolean;
  lessons: Lesson[];
}
