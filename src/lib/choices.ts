import { Question } from '@/lib/types';

/** Selection cardinality is determined by the task, never by hidden answer keys. */
export function allowsMultipleChoices(
  question?: Pick<Question, 'typeId'> & Partial<Pick<Question, 'typeName' | 'prompt' | 'correctAnswers'>>,
): boolean {
  if (!question) return false;
  const tid = (question.typeId || '').toLowerCase();
  const tname = (question.typeName || '').toLowerCase();
  const prompt = (question.prompt || '').toLowerCase();

  // Explicit single choice indicators
  if (
    tid === 'reading-mcq-single' ||
    tid === 'pte-listening-mcsa' ||
    tid === 'ielts-listening-mcq-single' ||
    tid === 'multiple-choice-single' ||
    tid.endsWith('-single') ||
    tname.includes('single answer')
  ) {
    return false;
  }

  // Explicit multiple choice indicators
  if (
    tid === 'reading-mcq-multiple' ||
    tid === 'pte-listening-mcma' ||
    tid === 'ielts-listening-mcq-multiple' ||
    tid === 'multiple-choice-multiple' ||
    tid.endsWith('-multiple') ||
    tid.endsWith('-mcma') ||
    tname.includes('multiple answer') ||
    tname.includes('multiple answers')
  ) {
    return true;
  }

  if (question.correctAnswers && question.correctAnswers.length > 1) {
    return true;
  }

  if (/(choose|select)\s+(two|three|four|all|multiple|\d+)\s+(options|letters|answers|responses)/i.test(prompt)) {
    return true;
  }

  return false;
}

