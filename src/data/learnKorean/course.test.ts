import { describe, expect, it } from 'vitest';
import { COURSE, findLesson, taskLessonHref } from '@/data/learnKorean';
import { getTaskMetadata } from '@/lib/taskMetadata';
import { SYLLABUS, taskInstruction, typeKey } from '@/lib/syllabus';

const lessons = COURSE.flatMap(unit => unit.lessons.map(lesson => ({ unit, lesson })));

describe('the beginner Korean course', () => {
  it('has the five units, in order, with five lessons each before the exam tasks', () => {
    expect(COURSE.map(unit => unit.title)).toEqual(['Hangul', 'Basic Korean', 'EPS Vocabulary', 'Daily Life', 'EPS-TOPIK']);
    expect(COURSE.slice(0, 4).map(unit => unit.lessons.map(l => l.title))).toEqual([
      ['Vowels', 'Consonants', 'Syllables', 'Reading', 'First words'],
      ['Greetings', 'People', 'Common words', 'Verbs', 'Simple sentences'],
      ['Numbers & time', 'Workplace', 'Tools', 'Machines', 'Safety'],
      ['Shopping', 'Transport', 'Hospital', 'Bank', 'Food'],
    ]);
  });

  it('gives every unit and lesson a unique id', () => {
    expect(new Set(COURSE.map(u => u.id)).size).toBe(COURSE.length);
    for (const unit of COURSE) expect(new Set(unit.lessons.map(l => l.id)).size).toBe(unit.lessons.length);
  });

  it.each(lessons.map(({ unit, lesson }) => [`${unit.id}/${lesson.id}`, lesson]))('%s is well formed', (_, lesson) => {
    expect(lesson.exercises.length).toBeGreaterThan(0);
    // Something to answer, not only cards to read.
    expect(lesson.exercises.some(ex => ex.kind === 'choice' || ex.kind === 'match')).toBe(true);
    for (const ex of lesson.exercises) {
      if (ex.kind === 'choice') {
        expect(ex.answer).toBeGreaterThanOrEqual(0);
        expect(ex.answer).toBeLessThan(ex.options.length);
        expect(new Set(ex.options).size).toBe(ex.options.length);
        // A listening question needs something to say.
        if (ex.listenOnly) expect(ex.speak).toBeTruthy();
      }
      if (ex.kind === 'match') {
        expect(ex.pairs.length).toBeGreaterThanOrEqual(2);
        expect(new Set(ex.pairs.map(([l]) => l)).size).toBe(ex.pairs.length);
        expect(new Set(ex.pairs.map(([, r]) => r)).size).toBe(ex.pairs.length);
      }
    }
  });
});

describe('the EPS-TOPIK unit', () => {
  const unit = COURSE.find(u => u.id === 'eps-topik')!;

  it('has one lesson per official task, R1–R9 then L1–L7', () => {
    expect(unit.lessons.map(l => l.practice?.code)).toEqual([
      'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9',
      'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7',
    ]);
  });

  it('agrees with the practice pages on each task code, name and instruction', () => {
    for (const lesson of unit.lessons) {
      const practice = lesson.practice!;
      const meta = getTaskMetadata('EPS_TOPIK', practice.skill, practice.typeKey);
      expect(meta.code).toBe(practice.code);
      expect(lesson.title).toBe(`${practice.code} · ${meta.name}`);
      expect(SYLLABUS.EPS_TOPIK[practice.skill]?.map(typeKey)).toContain(practice.typeKey);
      expect(taskInstruction('EPS_TOPIK', practice.skill, practice.typeKey)).toBeTruthy();
      expect(lesson.exercises[0].kind).toBe('taskIntro');
    }
  });

  it('links each practice task to its own lesson', () => {
    expect(taskLessonHref('listening', 'listenchoosepicture')).toBe('/learn/eps-topik/l2');
    expect(taskLessonHref('reading', 'picturetowordsentence')).toBe('/learn/eps-topik/r1');
    expect(taskLessonHref('reading', null)).toBeUndefined();
    expect(taskLessonHref('reading', 'nosuchtask')).toBeUndefined();
  });
});

describe('finding a lesson', () => {
  it('finds one by its unit and lesson id, and nothing for unknown ids', () => {
    expect(findLesson('hangul', 'vowels')?.lesson.title).toBe('Vowels');
    expect(findLesson('hangul', 'nope')).toBeUndefined();
    expect(findLesson('nope', 'vowels')).toBeUndefined();
  });
});
