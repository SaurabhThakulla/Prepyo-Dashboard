import { Question } from '@/lib/types';

/** Minimum for useful feedback, not the exam's required essay length. */
export function minimumWritingWords(question: Pick<Question, 'exam' | 'typeId'>): number {
  return question.exam === 'PTE' && question.typeId === 'summarize-written-text' ? 5 : 20;
}

export function writingWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
