import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { AnswerSubmission, ReadingGroup } from '@/lib/types';
import { ReadingAnswerResult } from '@/lib/hooks/useReading';
import SentenceGap from '@/components/reading/renderers/SentenceGap';

interface ReadingParagraphGroupProps {
  group: ReadingGroup;
  /** Number of the first question in this group, across the whole paper. */
  startNumber: number;
  answers: Record<string, AnswerSubmission>;
  results?: Record<string, ReadingAnswerResult>;
  disabled?: boolean;
  onAnswer: (questionId: string, patch: Partial<AnswerSubmission>) => void;
}

/**
 * A set of sentence-completion items as one continuous paragraph.
 *
 * The real paper prints these as running text with numbered gaps, not as a
 * stack of one-sentence cards. The card layout also repeated the chrome — a
 * border, a padded row and a large number — for every gap, which made a
 * seven-gap set look like seven separate tasks.
 *
 * The number survives as a small marker at each gap because it still has work
 * to do: the group header promises "Questions 1–7", and the answer key below
 * refers back by number.
 *
 * After marking, each gap shows a tick, or a cross with the right word beside
 * it, and a one-line score sits underneath.
 */
export default function ReadingParagraphGroup({
  group,
  startNumber,
  answers,
  results,
  disabled,
  onAnswer,
}: ReadingParagraphGroupProps) {
  const graded = group.questions
    .map((question, index) => ({
      question,
      number: startNumber + index,
      result: results?.[question.id],
    }))
    .filter(entry => entry.result);

  const wrong = graded.filter(entry => !entry.result?.attempt.isCorrect);

  return (
    <div data-dictionary className="rounded-xl bg-muted/20 px-3 py-4 sm:px-6 sm:py-5 space-y-3">
      {/* leading-loose keeps the lines apart enough that inline controls do not
          collide once the text wraps. */}
      <p className="mx-auto max-w-[66ch] font-reading text-[15px] sm:text-[17px] leading-[2.6] text-foreground/90">
        {group.questions.map((question, index) => (
          <React.Fragment key={question.id}>
            <SentenceGap
              question={question}
              answer={answers[question.id]}
              result={results?.[question.id]}
              locked={disabled || Boolean(results?.[question.id])}
              number={startNumber + index}
              onChange={patch => onAnswer(question.id, patch)}
            />{' '}
          </React.Fragment>
        ))}
      </p>

      {graded.length > 0 && (
        <div className="pt-2 border-t border-border/70 space-y-1">
          {wrong.length === 0 ? (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" />
              All {graded.length} correct
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
              <XCircle className="w-3.5 h-3.5" />
              {graded.length - wrong.length} of {graded.length} correct, the right words are shown beside each gap
            </p>
          )}
        </div>
      )}
    </div>
  );
}
