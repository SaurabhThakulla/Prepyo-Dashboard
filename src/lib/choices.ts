import { Question } from '@/lib/types';

/** Selection cardinality is determined by the task, never by hidden answer keys. */
export function allowsMultipleChoices(question: Pick<Question, 'typeId'>): boolean {
  return ['reading-mcq-multiple', 'multiple-choice-multiple', 'pte-listening-mcma',
    'ielts-listening-mcq-multiple'].includes(question.typeId);
}
