import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { AnswerSubmission, ReadingGroup } from '@/lib/types';
import { ReadingAnswerResult } from '@/lib/hooks/useReading';
import { correctIds } from '@/components/reading/renderers/types';
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
 * Verdicts are not printed per sentence here, for the same reason: an inline
 * box after every gap would break the paragraph apart again. The gap itself
 * turns green or rose, and anything wrong is listed underneath.
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
    <div className="rounded-lg p-3.5 bg-card/60 dark:bg-white/[0.015] border border-border/70 space-y-2.5 shadow-2xs">
      {/* The paper heads a summary box with a title of its own, which tells the
          learner which stretch of the passage the summary covers. */}
      {group.boxTitle && (
        <h4 className="text-center text-xs sm:text-sm font-bold text-foreground">{group.boxTitle}</h4>
      )}

      {/* leading-loose keeps the lines apart enough that inline controls do not
          collide once the text wraps. */}
      <p className="text-xs sm:text-sm text-foreground leading-loose">
        {group.questions.map(question => (
          <React.Fragment key={question.id}>
            <SentenceGap
              question={question}
              answer={answers[question.id]}
              result={results?.[question.id]}
              locked={disabled || Boolean(results?.[question.id])}
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
            <>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
                <XCircle className="w-3.5 h-3.5" />
                {wrong.length} of {graded.length} to review
              </p>
              <ul className="space-y-0.5">
                {wrong.map(entry => {
                  const key = entry.result ? correctIds(entry.result) : [];
                  if (key.length === 0) return null;
                  return (
                    <li key={entry.question.id} className="text-[11px] text-muted-foreground">
                      <span className="font-mono font-bold text-foreground">{entry.number}.</span>{' '}
                      <span className="font-semibold text-foreground">{key.join(' / ')}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
