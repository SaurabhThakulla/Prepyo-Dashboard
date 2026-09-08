import { AnswerSubmission, Question, ReadingParagraph } from '@/lib/types';
import { ReadingAnswerResult } from '@/lib/hooks/useReading';

/**
 * What every answer renderer is given, and the only thing any of them may send
 * back.
 *
 * One contract for all of them on purpose. The server grades a reading answer
 * from three fields — `selectedOptions`, `blankResponses`, `textResponse` — and
 * a renderer that needed a fourth would be a renderer the grader cannot score.
 * A new task type is a new component and a new entry in the registry; it is not
 * a new shape of answer.
 */
export interface AnswerProps {
  question: Question;
  /** The learner's answer so far, absent until they touch the control. */
  answer?: AnswerSubmission;
  /** The verdict, present only once the answer has been checked. */
  result?: ReadingAnswerResult;
  /** True while checking, and after: an answered question is not re-answerable. */
  locked: boolean;
  /**
   * The task set's own material: the word bank of a gap-fill, the boxes of an
   * ordering task. It belongs to the group rather than the question because it
   * is shared across every question in the set.
   */
  resources?: ReadingParagraph[];
  onChange: (patch: Partial<AnswerSubmission>) => void;
}

/** The correct option ids, once there is a verdict to read them from. */
export const correctIds = (result?: ReadingAnswerResult): string[] =>
  result?.review.correctAnswers ?? [];

/** The answer key by blank id, which is where BlankedText looks it up. */
export function correctByBlank(result?: ReadingAnswerResult): Record<string, string> | undefined {
  if (!result) return undefined;

  const answers: Record<string, string> = {};
  for (const blank of result.review.blanks ?? []) {
    if (blank.correctAnswer) answers[blank.id] = blank.correctAnswer;
  }
  return answers;
}
