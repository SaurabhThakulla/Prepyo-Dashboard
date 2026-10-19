import { Question } from '@/lib/types';

/**
 * Minimum for feedback to be requested, not the exam's required essay length.
 * IELTS takes any response: the server rates one of 20 words or fewer at
 * Band 1 on every criterion, as the public descriptors do, rather than refusing it.
 */
export function minimumWritingWords(question: Pick<Question, 'exam' | 'typeId'>): number {
  if (question.exam === 'IELTS') return 1;
  return question.exam === 'PTE' && question.typeId === 'summarize-written-text' ? 5 : 20;
}

/**
 * The length the task itself asks for, where the exam sets one: IELTS asks for
 * at least 150 words in Task 1 (a figure, or a General Training letter) and at
 * least 250 in Task 2. Null where the task sets no minimum.
 */
export function writingWordTarget(question: Pick<Question, 'exam' | 'typeId'>): number | null {
  if (question.exam !== 'IELTS') return null;
  const typeId = question.typeId ?? '';
  return typeId.includes('task1') || typeId.includes('letter') ? 150 : 250;
}

/**
 * Counts words as IELTS does for the learner's own count: whitespace-separated
 * words, so a hyphenated word such as "check-in" is one word. The server also
 * sets aside wording copied from the task before it rates a response.
 */
export function writingWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** The note under the answer box, saying what length is being asked for. */
export function writingLengthNote(question: Pick<Question, 'exam' | 'typeId'>): string {
  const typeId = question.typeId ?? '';
  if (question.exam === 'PTE' && typeId.includes('email')) {
    return 'Write an email of 80–120 words (minimum 50 words). Address all bullet points in the prompt.';
  }
  const target = writingWordTarget(question);
  if (target) {
    return `Write at least ${target} words. Shorter answers still get feedback, but IELTS rates 20 words or fewer at Band 1, and copied task wording does not count.`;
  }
  return minimumWritingWords(question) === 5
    ? 'Write one sentence of 5–75 words. Responses outside the task limits can still receive feedback.'
    : 'At least 20 words for feedback. Follow the prompt for the exam word requirement.';
}
