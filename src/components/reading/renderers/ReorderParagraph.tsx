import React from 'react';
import ReorderAnswer from '@/components/reading/ReorderAnswer';
import { AnswerProps } from './types';

/**
 * Re-order Paragraphs. The boxes arrive shuffled by the server into the Source
 * panel; the answer is the order the learner builds in the Target panel.
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
