import React from 'react';
import ReorderAnswer from '@/components/reading/ReorderAnswer';
import { AnswerProps } from './types';

/**
 * Re-order Paragraphs. The boxes arrive already shuffled by the server, and that
 * arrangement is the starting point; an untouched answer is a wrong answer
 * rather than a missing one, which is what the real test does too.
 */
export default function ReorderParagraph({ question, answer, result, locked, onChange }: AnswerProps) {
  return (
    <ReorderAnswer
      options={question.options ?? []}
      value={answer?.selectedOptions ?? []}
      disabled={locked}
      correctOrder={result?.review.correctAnswers}
      onChange={order => onChange({ selectedOptions: order })}
    />
  );
}
