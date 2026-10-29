import React from 'react';
import { AnswerSubmission, ReadingGroup } from '@/lib/types';
import { ReadingAnswerResult } from '@/lib/hooks/useReading';
import SentenceGap from '@/components/reading/renderers/SentenceGap';
import { SetScore } from '@/components/reading/ListMatchingGroup';

interface DiagramGroupProps {
  group: ReadingGroup;
  startNumber: number;
  answers: Record<string, AnswerSubmission>;
  results?: Record<string, ReadingAnswerResult>;
  disabled?: boolean;
  onAnswer: (questionId: string, patch: Partial<AnswerSubmission>) => void;
}

/**
 * Diagram label completion: the diagram, then one typed label per question.
 *
 * The diagram carries numbered markers, 1, 2, 3 in question order, and each
 * label repeats its marker ("3. ____ (outlet for meltwater)") so the learner
 * can find the part on the picture whatever number the question has on the
 * paper. Answers are typed, as on the computer-delivered test.
 */
export default function DiagramGroup({ group, startNumber, answers, results, disabled, onAnswer }: DiagramGroupProps) {
  const graded = group.questions.filter(question => results?.[question.id]);
  const right = graded.filter(question => results?.[question.id]?.attempt.isCorrect).length;

  return (
    <div data-dictionary className="space-y-4 p-3 sm:p-4">
      {group.imageUrl ? (
        <figure className="overflow-hidden rounded-xl border border-border bg-white">
          <img
            src={group.imageUrl}
            alt={group.boxTitle ? `Diagram: ${group.boxTitle}` : 'Diagram to label'}
            className="mx-auto block h-auto w-full max-w-2xl"
          />
          {group.boxTitle && (
            <figcaption className="border-t border-border bg-muted/30 px-3 py-1.5 text-center text-xs font-semibold text-foreground">
              {group.boxTitle}
            </figcaption>
          )}
        </figure>
      ) : (
        <p className="text-xs italic text-muted-foreground">This set has no diagram.</p>
      )}

      <ol className="space-y-2.5">
        {group.questions.map((question, index) => {
          const number = startNumber + index;
          const result = results?.[question.id];
          return (
            <li key={question.id} className="flex items-start gap-3">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-background text-[11px] font-bold tabular-nums text-muted-foreground">
                {number}
              </span>
              <p className="min-w-0 flex-1 font-reading text-[15px] leading-loose text-foreground/90">
                <SentenceGap
                  question={question}
                  answer={answers[question.id]}
                  result={result}
                  locked={disabled || Boolean(result)}
                  number={number}
                  onChange={patch => onAnswer(question.id, patch)}
                />
              </p>
            </li>
          );
        })}
      </ol>

      {graded.length > 0 && <SetScore right={right} total={graded.length} />}
    </div>
  );
}
