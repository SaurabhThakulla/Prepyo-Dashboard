import React from 'react';
import { Check, CheckCircle2, XCircle } from 'lucide-react';
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
 * Clean, modern question row with simple 2-column option cards.
 * When an option is selected, it fills with the brand primary color.
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

  const getOptionLetter = (index: number) => String.fromCharCode(65 + index);

  const cleanOptionText = (text: string, letter: string) => {
    const regex = new RegExp(`^${letter}[:.]\\s*`, 'i');
    return text.replace(regex, '');
  };

  return (
    <div className="rounded-2xl p-5 bg-card border border-border/80 space-y-4 shadow-xs hover:border-border transition-colors">
      {/* Question Prompt Header */}
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-7 h-7 rounded-xl bg-primary/10 text-primary font-mono font-bold text-xs flex items-center justify-center border border-primary/20">
          {number}
        </span>
        <p className="text-sm sm:text-[15px] font-semibold text-foreground leading-relaxed pt-0.5">
          {question.prompt}
        </p>
      </div>

      {/* 2-Column Options Grid */}
      {hasOptions ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pl-0 sm:pl-10">
          {question.options!.map((option, index) => {
            const letter = getOptionLetter(index);
            const isSelected = selected === option.id;
            const isCorrect = result?.review.correctAnswers?.includes(option.id);
            const isWrongSelection = result && isSelected && !result.attempt.isCorrect;
            const showCorrectReveal = result && isCorrect;

            let cardClasses =
              'bg-background border-border text-foreground hover:border-primary/40 hover:bg-muted/40';
            let badgeClasses = 'bg-muted text-muted-foreground border-border';

            if (showCorrectReveal) {
              cardClasses = 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-semibold';
              badgeClasses = 'bg-white/20 text-white border-transparent';
            } else if (isWrongSelection) {
              cardClasses = 'bg-rose-600 text-white border-rose-600 shadow-sm font-semibold';
              badgeClasses = 'bg-white/20 text-white border-transparent';
            } else if (isSelected) {
              // Selected uses our brand primary color
              cardClasses = 'bg-primary text-primary-foreground border-primary shadow-sm font-semibold';
              badgeClasses = 'bg-white/20 text-white border-transparent';
            } else if (result) {
              cardClasses = 'opacity-50 bg-background border-border text-muted-foreground';
            }

            return (
              <label
                key={option.id}
                className={`relative flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm transition-all select-none ${
                  locked ? 'cursor-default' : 'cursor-pointer active:scale-[0.99]'
                } ${cardClasses}`}
              >
                <input
                  type="radio"
                  name={question.id}
                  checked={isSelected}
                  disabled={locked}
                  onChange={() => onChange({ selectedOptions: [option.id] })}
                  className="sr-only"
                />

                <div className="flex items-center gap-2.5 min-w-0 pr-1">
                  <span
                    className={`w-6 h-6 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 border ${badgeClasses}`}
                  >
                    {letter}
                  </span>
                  <span className="truncate">
                    {cleanOptionText(option.text, letter)}
                  </span>
                </div>

                {/* Status Indicator */}
                {showCorrectReveal ? (
                  <Check className="w-4 h-4 text-white shrink-0 ml-auto" />
                ) : isWrongSelection ? (
                  <XCircle className="w-4 h-4 text-white shrink-0 ml-auto" />
                ) : isSelected ? (
                  <Check className="w-4 h-4 text-white shrink-0 ml-auto" />
                ) : null}
              </label>
            );
          })}
        </div>
      ) : (
        <div className="pl-0 sm:pl-10">
          <input
            value={answer?.textResponse ?? ''}
            disabled={locked}
            onChange={event => onChange({ textResponse: event.target.value })}
            placeholder="Type your answer from the passage…"
            className="w-full bg-background border border-border text-sm font-medium text-foreground px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-70 shadow-2xs"
          />
        </div>
      )}

      {/* Review Feedback */}
      {result && (
        <div
          className={`p-3.5 sm:p-4 rounded-xl border flex items-start gap-2.5 text-xs sm:text-sm ${
            result.attempt.isCorrect
              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-500/10 border-rose-500/25 text-rose-800 dark:text-rose-200'
          }`}
        >
          {result.attempt.isCorrect ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          )}

          <div className="space-y-1">
            {!result.attempt.isCorrect && (
              <p className="font-bold">
                Correct answer: <span className="underline">{displayAnswer(result.review)}</span>
              </p>
            )}

            {result.review.explanation && (
              <p className="text-muted-foreground leading-relaxed">
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
 */
function displayAnswer(review: Question): string {
  const answers = review.correctAnswers ?? [];
  return answers
    .map(value => review.options?.find(option => option.id === value)?.text ?? value)
    .join(' / ');
}
