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
  /** Skip the prompt when it only repeats the set's instructions or title. */
  hidePrompt?: boolean;
  /** Skip the number badge when the set has only this question. */
  hideNumber?: boolean;
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
  hidePrompt,
  hideNumber,
  onChange,
}: ReadingQuestionRowProps) {
  const locked = disabled || Boolean(result);
  const Renderer = rendererFor(question.typeId);
  const inline = INLINE_TYPES.has(question.typeId);
  const ownsPrompt = question.typeId === READING_TYPES.sentenceCompletion || Boolean(hidePrompt);
  const isCorrect = result?.attempt.isCorrect;
  const partial = Boolean(result) && !isCorrect && (result?.attempt.accuracyPercentage ?? 0) > 0;

  // The number badge fills in once answered, then turns green or red when marked.
  const badge = result
    ? isCorrect
      ? 'bg-emerald-500 text-white border-emerald-500'
      : partial
        ? 'bg-amber-500 text-white border-amber-500'
        : 'bg-rose-500 text-white border-rose-500'
    : isAnswered(answer)
      ? 'bg-primary text-primary-foreground border-primary'
      : 'bg-background text-muted-foreground border-border';

  const control = (
    <Renderer
      question={question}
      answer={answer}
      result={result}
      locked={locked}
      resources={resources}
      onChange={onChange}
    />
  );

  return (
    <div data-dictionary className="px-3 py-3 sm:px-4 sm:py-3.5 transition-colors hover:bg-muted/25">
      <div className={inline ? 'flex flex-wrap items-center gap-x-4 gap-y-2.5' : 'space-y-2.5'}>
        <div className="flex flex-1 items-start gap-3 min-w-[13rem]">
          {!hideNumber && <span
            className={`shrink-0 w-6 h-6 rounded-full border text-[11px] font-bold tabular-nums flex items-center justify-center transition-colors ${badge}`}
          >
            {number}
          </span>}
          {/* Sentence completion prints the prompt inside its own control, and a
              hidden prompt only repeated the instructions: the control goes here. */}
          {ownsPrompt ? (
            <div className="flex-1 min-w-0 pt-0.5">{control}</div>
          ) : (
            <p className="pt-0.5 text-[13px] sm:text-sm font-medium leading-relaxed text-foreground">
              {question.prompt}
            </p>
          )}
        </div>

        {!ownsPrompt && (
          <div className={inline ? 'shrink-0 pl-9 sm:pl-0' : hideNumber ? '' : 'pl-9'}>{control}</div>
        )}
      </div>

      {result && (
        <div
          className={`mt-2.5 ml-9 px-3 py-2 rounded-lg flex items-start gap-2 text-xs ${
            isCorrect
              ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
              : partial
                ? 'bg-amber-500/10 text-amber-800 dark:text-amber-200'
                : 'bg-rose-500/10 text-rose-800 dark:text-rose-200'
          }`}
        >
          {isCorrect ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-px" />
          ) : partial ? (
            <CircleDot className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-px" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-px" />
          )}

          <div className="space-y-0.5">
            {isCorrect && !result.review.explanation && <p className="font-semibold">Correct</p>}
            {/* A task with several parts is rarely all right or all wrong, and
                the server has already counted them. */}
            {partial && result.attempt.feedback && <p className="font-semibold">{result.attempt.feedback}</p>}
            {!isCorrect && showsAnswerInline(question.typeId) && (
              <p className="font-semibold">
                Correct answer: <span className="underline underline-offset-2">{displayAnswer(result.review)}</span>
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

/** A single dropdown fits beside the statement; wider controls go under it. */
const INLINE_TYPES = new Set<string>([
  READING_TYPES.matchingInformation,
  READING_TYPES.findTheParagraph,
]);

/** Whether the learner has put anything down for this question yet. */
export function isAnswered(answer?: AnswerSubmission): boolean {
  if (!answer) return false;
  return (
    (answer.selectedOptions?.length ?? 0) > 0 ||
    Boolean(answer.textResponse?.trim()) ||
    Object.values(answer.blankResponses ?? {}).some(value => String(value).trim())
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
