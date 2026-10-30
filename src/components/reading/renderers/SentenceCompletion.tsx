import React from 'react';
import { AnswerProps } from './types';
import SentenceGap from './SentenceGap';

/**
 * Sentence Completion: a sentence with a gap in it, filled from the passage.
 *
 * The gap is rendered inside the sentence, not as a box underneath it. That is
 * the task — the sentence around the gap is what tells the learner which word
 * fits — and a bare field below the prompt makes them hold the sentence in their
 * head while they answer.
 *
 * This is the standalone form, one sentence to a card. A set of these is laid
 * out as one flowing paragraph instead, by ReadingParagraphGroup; both render
 * the gap through SentenceGap so the two cannot diverge.
 */
export default function SentenceCompletion({ question, answer, result, locked, onChange }: AnswerProps) {
  // The gap itself shows the tick, or the cross and the right word.
  return (
    <p className="font-reading text-[15px] sm:text-base text-foreground leading-loose">
      <SentenceGap
        question={question}
        answer={answer}
        result={result}
        locked={locked}
        onChange={onChange}
      />
    </p>
  );
}
