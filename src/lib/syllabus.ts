import { ExamType, SkillType } from '@/lib/types';
export const SYLLABUS: Record<ExamType, Partial<Record<SkillType, string[]>>> = {
  IELTS: {
    reading: [
      'Answer according to paragraph',
      'Find out the writer',
      'Topic of the paragraph',
      'True / False / Not Given',
      'Fill in the blanks',
    ],
    writing: ['Describe the figure', 'Opinion / Agree or Disagree'],
    listening: ['Fill in the blanks', 'Choose the correct answer', 'Navigating according to audio'],
    speaking: ['Introduction', 'Speaking Part 2 (Cue Card)'],
  },
  PTE: {
    reading: [
      'Reading & Writing: Fill in the Blanks',
      'Multiple Choice, Single Answer',
      'Multiple Choice, Multiple Answers',
      'Re-order Paragraphs',
      'Reading: Fill in the Blanks',
    ],
    writing: ['Summarize Written Text', 'Write Essay'],
    listening: [
      'Summarize Spoken Text',
      'Multiple Choice, Multiple Answers',
      'Fill in the Blanks',
      'Highlight Correct Summary',
      'Select Missing Word',
      'Write from Dictation',
    ],
    speaking: ['Read Aloud', 'Repeat Sentence', 'Describe Image', 'Re-tell Lecture', 'Answer Short Question'],
  },
};

export const typeKey = (name: string) =>
  name
    .toLowerCase()
    .replace(/\b(and|or|the)\b/g, '')
    .replace(/[^a-z0-9]/g, '');

/** The syllabus name behind a `?type=` key, for headings and empty states. */
export const typeLabel = (exam: ExamType, skill: SkillType, key: string) =>
  (SYLLABUS[exam]?.[skill] ?? []).find(name => typeKey(name) === key);
