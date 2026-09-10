import React from 'react';
import { CheckCircle2, CircleDot, XCircle } from 'lucide-react';
import { AnswerSubmission, Question, ReadingParagraph } from '@/lib/types';
import { ReadingAnswerResult } from '@/lib/hooks/useReading';
import { READING_TYPES, isGapFill } from '@/lib/readingTypes';
import { rendererFor } from '@/components/reading/renderers';

interface ReadingQuestionRowProps {
  question: Question;
  number: number;
  answer?: AnswerSubmission;
  result?: ReadingAnswerResult;
  disabled?: boolean;
  /** The task set's own material: a word bank, the boxes of an ordering task. */
  resources?: ReadingParagraph[];
  onChange: (patch: Partial<AnswerSubmission>) => void;
}

/**
 * One question: the number, the prompt, its answer control, and the verdict.
 *
 * Which control a question gets is decided by its task type alone — see
 * `renderers/index.ts`. Nothing here inspects the fields a question happens to
 * carry, because that is what made six different tasks render identically.
 */
export default function ReadingQuestionRow({
  question,
  number,
  answer,
  result,
  disabled,
  resources,
  onChange,
}: ReadingQuestionRowProps) {
  const locked = disabled || Boolean(result);
  const Renderer = rendererFor(question.typeId);

  return (
    <div className="rounded-lg p-3 bg-card/60 dark:bg-white/[0.015] border border-border/70 space-y-2 shadow-2xs hover:border-border transition-colors">
      <div className="flex items-start gap-2.5">
        <span className="shrink-0 w-5 h-5 rounded-md bg-primary/10 text-primary font-mono font-bold text-xs flex items-center justify-center border border-primary/20">
          {number}
        </span>
        {/* Sentence completion prints the prompt inside its own control, with the
            gap in place, so printing it here as well would say it twice. */}
        {question.typeId !== READING_TYPES.sentenceCompletion && (
          <p className="text-xs sm:text-sm font-medium text-foreground leading-snug pt-0.5">
            {question.prompt}
          </p>
        )}
      </div>

      <div className="pl-0 sm:pl-7">
        <Renderer
          question={question}
          answer={answer}
          result={result}
          locked={locked}
          resources={resources}
          onChange={onChange}
        />
      </div>

      {result && (
        <div
          className={`p-2.5 rounded-lg border flex items-start gap-2 text-xs ${
            result.attempt.isCorrect
              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-800 dark:text-emerald-200'
              : result.attempt.accuracyPercentage > 0
                ? 'bg-amber-500/10 border-amber-500/25 text-amber-800 dark:text-amber-200'
                : 'bg-rose-500/10 border-rose-500/25 text-rose-800 dark:text-rose-200'
          }`}
        >
          {result.attempt.isCorrect ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : result.attempt.accuracyPercentage > 0 ? (
            <CircleDot className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          )}

          <div className="space-y-0.5">
            {/* A task with several parts is rarely all right or all wrong, and
                the server has already counted them. */}
            {!result.attempt.isCorrect && result.attempt.accuracyPercentage > 0 && result.attempt.feedback && (
              <p className="font-bold">{result.attempt.feedback}</p>
            )}
            {!result.attempt.isCorrect && showsAnswerInline(question.typeId) && (
              <p className="font-bold">
                Correct answer: <span className="underline">{displayAnswer(result.review)}</span>
              </p>
            )}
            {result.review.explanation && (
              <p className="text-muted-foreground leading-normal">{result.review.explanation}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Controls that already show the answer key inside themselves — in the gaps,
 * under the boxes, in the sentence — so the verdict banner would repeat it.
 */
function showsAnswerInline(typeId: string): boolean {
  return (
    !isGapFill(typeId) &&
    typeId !== READING_TYPES.reorderParagraphs &&
    typeId !== READING_TYPES.sentenceCompletion
  );
}

/** The answer key as a learner reads it. */
function displayAnswer(review: Question): string {
  const answers = review.correctAnswers ?? [];
  return answers
    .map(value => review.options?.find(option => option.id === value)?.text ?? value)
    .join(' / ');
}
