import React from 'react';
import { AnswerProps, correctIds } from './types';
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
  const isCorrect = result?.attempt.isCorrect;

  // The answer key is words, and for a chooser those words are the option ids,
  // so both forms read the same list.
  const answerKey = result ? correctIds(result) : [];

  return (
    <div className="space-y-1.5">
      <p className="text-xs sm:text-sm text-foreground leading-relaxed">
        <SentenceGap
          question={question}
          answer={answer}
          result={result}
          locked={locked}
          onChange={onChange}
        />
      </p>

      {result && !isCorrect && answerKey.length > 0 && (
        <p className="text-[11px] text-muted-foreground pl-0.5">
          Answer: <span className="font-semibold text-foreground">{answerKey.join(' / ')}</span>
        </p>
      )}
    </div>
  );
}
