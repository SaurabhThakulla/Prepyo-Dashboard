import { BASIC } from './basic';
import { DAILY_LIFE } from './dailyLife';
import { EPS_TOPIK } from './epsTopik';
import { EPS_VOCAB } from './epsVocab';
import { GRAMMAR } from './grammar';
import { HANGUL } from './hangul';
import { CONSTRUCTION, FARMING, FISHERY } from './industries';
import { MORE_BASIC, MORE_DAILY_LIFE, MORE_EPS_VOCAB } from './moreWords';
import { Lesson, Unit } from './types';
import { withListening } from './vocab';
import { matchesTypeKey } from '@/lib/syllabus';

export type { Exercise, Lesson, Unit } from './types';

const extend = (unit: Unit, more: Lesson[]): Unit => ({ ...unit, lessons: [...unit.lessons, ...more] });

/**
 * The whole course, in the order it is taught. Every unit except the exam
 * tasks gets extra listening questions (see withListening), since half of the
 * test is listening.
 */
export const COURSE: Unit[] = [
  ...[
    HANGUL,
    extend(BASIC, MORE_BASIC),
    GRAMMAR,
    extend(EPS_VOCAB, MORE_EPS_VOCAB),
    extend(DAILY_LIFE, MORE_DAILY_LIFE),
    CONSTRUCTION,
    FARMING,
    FISHERY,
  ].map(withListening),
  EPS_TOPIK,
];

/** A lesson's key in saved progress: "unit/lesson". */
export const lessonKey = (unitId: string, lessonId: string) => `${unitId}/${lessonId}`;

export const lessonHref = (unitId: string, lessonId: string) => `/learn/${unitId}/${lessonId}`;

/** The Unit 5 lesson that explains an EPS-TOPIK practice task, if there is one. */
export function taskLessonHref(skill: string, key?: string | null): string | undefined {
  if (!key) return undefined;
  const lesson = EPS_TOPIK.lessons.find(l => l.practice?.skill === skill && matchesTypeKey(l.practice.typeKey, key));
  return lesson ? lessonHref(EPS_TOPIK.id, lesson.id) : undefined;
}

/** A lesson by its unit and lesson ids, in `units` (this course's by default). */
export function findLesson(
  unitId?: string,
  lessonId?: string,
  units: Unit[] = COURSE,
): { unit: Unit; lesson: Lesson; index: number } | undefined {
  const unit = units.find(u => u.id === unitId);
  const index = unit?.lessons.findIndex(l => l.id === lessonId) ?? -1;
  if (!unit || index < 0) return undefined;
  return { unit, lesson: unit.lessons[index], index };
}
