import syllabusData from '@/data/syllabus-topics.json';
import { ExamType, SkillType } from '@/lib/types';

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

export const typeKey = (name: string) =>
  name
    .toLowerCase()
    .replace(/\b(and|or|the)\b/g, '')
    .replace(/[^a-z0-9]/g, '');

/** Compare display names and existing URL keys without changing generated links. */
export const matchesTypeKey = (name: string, key: string) => {
  const normalize = (value: string) => typeKey(value).replace(/^summarise/, 'summarize');
  return normalize(name) === normalize(key);
};

/** The syllabus name behind a `?type=` key, for headings and empty states. */
export const typeLabel = (exam: ExamType, skill: SkillType, key: string) =>
  (SYLLABUS[exam]?.[skill] ?? []).find(name => matchesTypeKey(name, key));
