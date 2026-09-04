import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { AnswerSubmission, Question } from '@/lib/types';
import { ReadingAnswerResult } from '@/lib/hooks/useReading';

interface ReadingQuestionRowProps {
  question: Question;
  number: number;
  answer?: AnswerSubmission;
  result?: ReadingAnswerResult;
  disabled?: boolean;
  onChange: (patch: Partial<AnswerSubmission>) => void;
}

/**
 * One reading question: its prompt, its input, and — once checked — what the
 * answer was.
 *
 * Which input to render is decided by the question, not by its type id. A
 * question with options is a choice; one without is a gap to type into. That
 * way a task type added on the server renders correctly here without a matching
 * release of this file.
 *
 * Choices are radios rather than checkboxes: every reading task type in the bank
 * has exactly one right answer, and a checkbox invites a learner to select two
 * and be marked down for it.
 */
export default function ReadingQuestionRow({
  question,
  number,
  answer,
  result,
  disabled,
  onChange,
}: ReadingQuestionRowProps) {
  const hasOptions = Boolean(question.options?.length);
  const selected = answer?.selectedOptions?.[0] ?? '';
  const locked = disabled || Boolean(result);

  return (
    <div className="p-3.5 rounded-xl bg-background border border-border space-y-2.5">
      <div className="flex items-start gap-2.5">
        <span
          className={`shrink-0 w-6 h-6 rounded-lg text-[11px] font-bold flex items-center justify-center ${
            result
              ? result.attempt.isCorrect
                ? 'bg-emerald-500/15 text-emerald-600'
                : 'bg-rose-500/15 text-rose-600'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {number}
        </span>
        <p className="text-xs text-foreground font-medium leading-relaxed pt-0.5">{question.prompt}</p>
      </div>

      {hasOptions ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-8.5">
          {question.options!.map(option => {
            const checked = selected === option.id;
            return (
              <label
                key={option.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-colors ${
                  locked ? 'cursor-default' : 'cursor-pointer hover:border-primary/40'
                } ${checked ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
              >
                <input
                  type="radio"
                  name={question.id}
                  checked={checked}
                  disabled={locked}
                  onChange={() => onChange({ selectedOptions: [option.id] })}
                  className="text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span className="text-foreground font-medium">{option.text}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <input
          value={answer?.textResponse ?? ''}
          disabled={locked}
          onChange={event => onChange({ textResponse: event.target.value })}
          placeholder="Type the word from the passage"
          className="w-full bg-card border border-border text-xs font-medium text-foreground px-3 py-2 rounded-lg focus:outline-none focus:border-primary disabled:opacity-70"
        />
      )}

      {result && (
        <div className="flex items-start gap-2 pt-2 border-t border-border">
          {result.attempt.isCorrect ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            {!result.attempt.isCorrect && (
              <p className="text-[11px] text-foreground font-bold">
                Answer: {displayAnswer(result.review)}
              </p>
            )}
            {result.review.explanation && (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {result.review.explanation}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The answer key as a learner reads it.
 *
 * `correctAnswers` holds option ids, which for a choice question are tokens
 * like NOT_GIVEN. Showing the option's own text instead means the review reads
 * the same as the buttons did.
 */
function displayAnswer(review: Question): string {
  const answers = review.correctAnswers ?? [];
  return answers
    .map(value => review.options?.find(option => option.id === value)?.text ?? value)
    .join(' / ');
}
