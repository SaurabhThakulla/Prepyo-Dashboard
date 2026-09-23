import syllabusData from '@/data/syllabus-topics.json';
import { ExamType, IELTSModule, SkillType } from '@/lib/types';

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
};

type Topic = { name: string; module?: string };

/**
 * The task names a learner is offered: the whole syllabus, less the other
 * IELTS module's own tasks. Academic learners describe a visual in Writing
 * Task 1; General Training learners write a letter.
 */
export function syllabusFor(exam: ExamType, skill: SkillType, module: IELTSModule = 'academic'): string[] {
  const topics = (syllabusData.exams[exam]?.skills as Record<string, { topics: Topic[] }> | undefined)?.[skill]?.topics ?? [];
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
  (SYLLABUS[exam]?.[skill] ?? []).find(name => matchesTypeKey(name, key));
