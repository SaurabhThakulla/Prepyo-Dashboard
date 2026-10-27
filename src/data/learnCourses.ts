import { COURSE as KOREAN_UNITS } from './learnKorean';
import { LEARN_AUDIO as KOREAN_AUDIO } from './learnKorean/audio';
import { JAPANESE_UNITS } from './learnJapanese';
import { LEARN_AUDIO_JA as JAPANESE_AUDIO } from './learnJapanese/audio';
import type { Unit } from './learnKorean/types';
import type { ExamType } from '@/lib/types';

export type CourseId = 'korean' | 'japanese';

/**
 * A beginner language course in the Learn section: a path of units and short
 * lessons for one exam's language. Every course runs on the same lesson,
 * review and progress engine; only its words and wording differ.
 */
export interface LearnCourse {
  id: CourseId;
  /** The exam the course leads to; the last unit is that exam's tasks. */
  exam: ExamType;
  /** The language taught, as a word in sentences ("in Korean"). */
  language: 'Korean' | 'Japanese';
  /** Its BCP 47 code, for `lang` attributes and choosing a voice. */
  lang: 'ko' | 'ja';
  /** The menu heading: "Learn Korean". */
  title: string;
  /** The heading on the path page. */
  heading: string;
  /** One line under the menu heading. */
  tagline: string;
  /** A short paragraph under the path heading. */
  intro: string;
  units: Unit[];
  /** The unit of exam-task lessons, which the practice pages link to. */
  taskUnitId: string;
  /** Spoken course text → its stored recording's asset id. */
  audio: Record<string, string>;
}

export const LEARN_COURSES: Record<CourseId, LearnCourse> = {
  korean: {
    id: 'korean',
    exam: 'EPS_TOPIK',
    language: 'Korean',
    lang: 'ko',
    title: 'Learn Korean',
    heading: 'Learn Korean for EPS-TOPIK',
    tagline: 'Hangul to exam-ready, one small lesson at a time',
    intro:
      'Start from the alphabet. Short lessons, a few minutes each, take you through everyday and workplace Korean to every task in the test.',
    units: KOREAN_UNITS,
    taskUnitId: 'eps-topik',
    audio: KOREAN_AUDIO,
  },
  japanese: {
    id: 'japanese',
    exam: 'JLPT',
    language: 'Japanese',
    lang: 'ja',
    title: 'Learn Japanese',
    heading: 'Learn Japanese for JLPT N5',
    tagline: 'Hiragana to exam-ready, one small lesson at a time',
    intro:
      'Start from hiragana. Short lessons, a few minutes each, take you through katakana, everyday words, grammar and N5 kanji to every task in the test. Good for NAT-TEST 5Q too.',
    units: JAPANESE_UNITS,
    taskUnitId: 'jlpt-n5',
    audio: JAPANESE_AUDIO,
  },
};

/** Whether an exam has a beginner course in Learn. */
export const hasLearnCourse = (exam: ExamType) => exam === 'EPS_TOPIK' || exam === 'JLPT';

/**
 * The course for a learner's exam: Japanese for JLPT, Korean otherwise, so
 * links into /learn keep working for an admin looking from another exam.
 */
export const courseForExam = (exam: ExamType): LearnCourse =>
  exam === 'JLPT' ? LEARN_COURSES.japanese : LEARN_COURSES.korean;

export const lessonCount = (course: LearnCourse) => course.units.reduce((sum, unit) => sum + unit.lessons.length, 0);
