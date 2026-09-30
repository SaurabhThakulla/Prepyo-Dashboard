import { BASIC } from './basic';
import { DAILY_LIFE } from './dailyLife';
import { EPS_TOPIK } from './epsTopik';
import { EPS_VOCAB } from './epsVocab';
import { HANGUL } from './hangul';
import { Lesson, Unit } from './types';
import { matchesTypeKey } from '@/lib/syllabus';

export type { Exercise, Lesson, Unit } from './types';

/** The whole course, in the order it is taught. */
export const COURSE: Unit[] = [HANGUL, BASIC, EPS_VOCAB, DAILY_LIFE, EPS_TOPIK];

/** A lesson's key in saved progress: "unit/lesson". */
export const lessonKey = (unitId: string, lessonId: string) => `${unitId}/${lessonId}`;

export const lessonHref = (unitId: string, lessonId: string) => `/learn/${unitId}/${lessonId}`;

/** The Unit 5 lesson that explains an EPS-TOPIK practice task, if there is one. */
export function taskLessonHref(skill: string, key?: string | null): string | undefined {
  if (!key) return undefined;
  const lesson = EPS_TOPIK.lessons.find(l => l.practice?.skill === skill && matchesTypeKey(l.practice.typeKey, key));
  return lesson ? lessonHref(EPS_TOPIK.id, lesson.id) : undefined;
}

export function findLesson(unitId?: string, lessonId?: string): { unit: Unit; lesson: Lesson; index: number } | undefined {
  const unit = COURSE.find(u => u.id === unitId);
  const index = unit?.lessons.findIndex(l => l.id === lessonId) ?? -1;
  if (!unit || index < 0) return undefined;
  return { unit, lesson: unit.lessons[index], index };
}
