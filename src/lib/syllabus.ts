import syllabusData from '@/data/syllabus-topics.json';
import { ExamType, IELTSModule, SkillType } from '@/lib/types';
import { LISTENING_PART_TYPES } from '@/lib/listeningTypes';

export const SYLLABUS: Record<ExamType, Partial<Record<SkillType, string[]>>> = {
  IELTS: {
    reading: syllabusData.exams.IELTS.skills.reading.topics.map(t => t.name),
    writing: syllabusData.exams.IELTS.skills.writing.topics.map(t => t.name),
    listening: syllabusData.exams.IELTS.skills.listening.topics.map(t => t.name),
    speaking: syllabusData.exams.IELTS.skills.speaking.topics.map(t => t.name),
  },
  PTE: {
    reading: syllabusData.exams.PTE.skills.reading.topics.map(t => t.name),
    writing: syllabusData.exams.PTE.skills.writing.topics.map(t => t.name),
    listening: syllabusData.exams.PTE.skills.listening.topics.map(t => t.name),
    speaking: syllabusData.exams.PTE.skills.speaking.topics.map(t => t.name),
  },
  // EPS-TOPIK has no speaking or writing section, so those skills are absent
  // and the practice menu shows only Reading and Listening.
  EPS_TOPIK: {
    reading: syllabusData.exams.EPS_TOPIK.skills.reading.topics.map(t => t.name),
    listening: syllabusData.exams.EPS_TOPIK.skills.listening.topics.map(t => t.name),
  },
  // JLPT's vocabulary and grammar share the reading score, so they sit under Reading.
  JLPT: {
    reading: syllabusData.exams.JLPT.skills.reading.topics.map(t => t.name),
    listening: syllabusData.exams.JLPT.skills.listening.topics.map(t => t.name),
  },
};

/**
 * The official instruction line for a task, where the exam prints one in its
 * own language (EPS-TOPIK's Korean 지시문, JLPT's Japanese one). Undefined for
 * tasks without one.
 */
export function taskInstruction(exam: ExamType, skill: SkillType, key: string): string | undefined {
  const topics = (syllabusData.exams[exam]?.skills as Record<string, { topics: (Topic & { instruction?: string })[] }> | undefined)?.[skill]?.topics ?? [];
  return topics.find(topic => matchesTypeKey(topic.name, key))?.instruction;
}

/** What a task asks of the learner, in one plain line, for the practice hub's cards. */
export function taskSummary(exam: ExamType, skill: SkillType, name: string): string | undefined {
  const topics = (syllabusData.exams[exam]?.skills as Record<string, { topics: (Topic & { simpleDescription?: string })[] }> | undefined)?.[skill]?.topics ?? [];
  return topics.find(topic => topic.name === name)?.simpleDescription ?? partsOf(exam, skill).find(part => part.name === name)?.simpleDescription;
}

type Topic = { name: string; module?: string };

/** The parts a learner picks a skill by (IELTS Writing's Task 1 and 2, Reading's Part 1-3), if any. */
const partsOf = (exam: ExamType, skill: SkillType): { name: string; simpleDescription?: string }[] =>
  (syllabusData.exams[exam]?.skills as Record<string, { parts?: { name: string; simpleDescription?: string }[] }> | undefined)?.[skill]?.parts ?? [];

/**
 * The task names a learner is offered: the whole syllabus, less the other
 * IELTS module's own tasks. Academic learners describe a visual in Writing
 * Task 1; General Training learners write a letter. A skill split into parts
 * is offered by part instead (IELTS Writing's Task 1 and 2, Reading's Part
 * 1-3); the question list then filters by task type inside it.
 */
export function syllabusFor(exam: ExamType, skill: SkillType, module: IELTSModule = 'academic'): string[] {
  const topics = (syllabusData.exams[exam]?.skills as Record<string, { topics: Topic[] }> | undefined)?.[skill]?.topics ?? [];
  const parts = partsOf(exam, skill);
  if (parts.length > 0) return parts.map(part => part.name);
  return topics.filter(topic => exam !== 'IELTS' || !topic.module || topic.module === module).map(topic => topic.name);
}

export const typeKey = (name?: string | null) =>
  (name ?? '')
    .toLowerCase()
    .replace(/\b(and|or|the)\b/g, '')
    .replace(/[^a-z0-9]/g, '');

export const normalizeTypeKey = (value?: string | null): string => {
  if (!value) return '';
  let v = typeKey(value).replace(/^summarise/, 'summarize');
  // Normalize synonyms for MCQ / Multiple Type / Multiple Choice
  v = v
    .replace(/multipletype/g, 'multiplechoice')
    .replace(/mcq/g, 'multiplechoice')
    .replace(/answers$/g, 'answer')
    .replace(/paragraphs$/g, 'paragraph');
  return v;
};

/** Compare display names and existing URL keys without changing generated links. */
export const matchesTypeKey = (name?: string | null, key?: string | null): boolean => {
  if (!name || !key) return false;
  const normName = normalizeTypeKey(name);
  const normKey = normalizeTypeKey(key);
  if (!normName || !normKey) return false;

  if (normName === normKey) return true;

  // An IELTS Listening part ("part2") takes the clip types set in it, by type id: ielts-listening-map.
  const listeningPart = /^part([1-4])$/.exec(normKey)?.[1];
  if (listeningPart && LISTENING_PART_TYPES[Number(listeningPart)].some(id => normalizeTypeKey(id) === normName)) return true;

  // An IELTS Writing part ("task1") takes every task in it, by type id: ielts-writing-task1-figure.
  if (/^task[12]$/.test(normKey) && normName.includes(`writing${normKey}`)) return true;

  // Single vs Multiple must strictly never cross-match
  const nameIsSingle = normName.includes('single') || normName.includes('mcsa');
  const keyIsSingle = normKey.includes('single') || normKey.includes('mcsa');
  const nameIsMulti = normName.includes('multipleanswer') || normName.includes('multianswer') || normName.includes('mcma');
  const keyIsMulti = normKey.includes('multipleanswer') || normKey.includes('multianswer') || normKey.includes('mcma');

  if ((nameIsSingle && keyIsMulti) || (nameIsMulti && keyIsSingle)) {
    return false;
  }

  // Handle task ID matching e.g. pte-listening-mcsa <-> mcqsingleanswer
  if (normName.includes('mcsa') && keyIsSingle) return true;
  if (normName.includes('mcma') && keyIsMulti) return true;
  if (normKey.includes('mcsa') && nameIsSingle) return true;
  if (normKey.includes('mcma') && nameIsMulti) return true;

  return false;
};

/** The syllabus name behind a `?type=` key, for headings and empty states. */
export const typeLabel = (exam: ExamType, skill: SkillType, key: string) =>
  (SYLLABUS[exam]?.[skill] ?? []).find(name => matchesTypeKey(name, key)) ??
  partsOf(exam, skill).find(part => matchesTypeKey(part.name, key))?.name;
