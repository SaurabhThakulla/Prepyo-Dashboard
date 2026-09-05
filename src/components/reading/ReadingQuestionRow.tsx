import React from 'react';
import { Check, CheckCircle2, XCircle } from 'lucide-react';
import { AnswerSubmission, Question, ReadingParagraph } from '@/lib/types';
import { ReadingAnswerResult } from '@/lib/hooks/useReading';
import { READING_TYPES, isGapFill, isMultiSelect } from '@/lib/readingTypes';
import BlankedText from '@/components/reading/BlankedText';
import ReorderAnswer from '@/components/reading/ReorderAnswer';

interface ReadingQuestionRowProps {
  question: Question;
  number: number;
  answer?: AnswerSubmission;
  result?: ReadingAnswerResult;
  disabled?: boolean;
  /** The group's word bank, for a gap-fill that draws from a shared pool. */
  wordBank?: ReadingParagraph[];
  onChange: (patch: Partial<AnswerSubmission>) => void;
}

/**
 * One question: the number, the prompt, an answer control, and the verdict.
 *
 * Which control a question gets is decided by its task type, not by guessing
 * from the fields it happens to carry. Guessing worked while every reading task
 * was a single-answer choice or a typed word, and stopped working the moment
 * three tasks needed the same field to mean different things — `selectedOptions`
 * is one id for a multiple choice, several for a multi-answer set, and an
 * ordering for Re-order Paragraphs.
 */
export default function ReadingQuestionRow({
  question,
  number,
  answer,
  result,
  disabled,
  wordBank,
  onChange,
}: ReadingQuestionRowProps) {
  const locked = disabled || Boolean(result);

  return (
    <div className="rounded-2xl p-5 bg-card border border-border/80 space-y-4 shadow-xs hover:border-border transition-colors">
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-7 h-7 rounded-xl bg-primary/10 text-primary font-mono font-bold text-xs flex items-center justify-center border border-primary/20">
          {number}
        </span>
        <p className="text-sm sm:text-[15px] font-semibold text-foreground leading-relaxed pt-0.5">
          {question.prompt}
        </p>
      </div>

      <div className="pl-0 sm:pl-10">
        <AnswerControl
          question={question}
          answer={answer}
          result={result}
          locked={locked}
          wordBank={wordBank}
          onChange={onChange}
        />
      </div>

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
            {!result.attempt.isCorrect && showsAnswerInline(question.typeId) && (
              <p className="font-bold">
                Correct answer: <span className="underline">{displayAnswer(result.review)}</span>
              </p>
            )}
            {result.review.explanation && (
              <p className="text-muted-foreground leading-relaxed">{result.review.explanation}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface AnswerControlProps {
  question: Question;
  answer?: AnswerSubmission;
  result?: ReadingAnswerResult;
  locked: boolean;
  wordBank?: ReadingParagraph[];
  onChange: (patch: Partial<AnswerSubmission>) => void;
}

/** The registry: one task type, one control. */
function AnswerControl({ question, answer, result, locked, wordBank, onChange }: AnswerControlProps) {
  if (question.typeId === READING_TYPES.reorderParagraphs) {
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

  if (isGapFill(question.typeId) && question.contextPassage) {
    return (
      <BlankedText
        text={question.contextPassage}
        blanks={question.blanks ?? []}
        value={answer?.blankResponses ?? {}}
        disabled={locked}
        wordBank={wordBank}
        correct={result ? correctByBlank(result.review) : undefined}
        onChange={responses => onChange({ blankResponses: responses })}
      />
    );
  }

  if (question.options?.length) {
    return (
      <OptionGrid
        question={question}
        selected={answer?.selectedOptions ?? []}
        result={result}
        locked={locked}
        multiple={isMultiSelect(question.typeId)}
        onChange={ids => onChange({ selectedOptions: ids })}
      />
    );
  }

  return (
    <input
      value={answer?.textResponse ?? ''}
      disabled={locked}
      onChange={event => onChange({ textResponse: event.target.value })}
      placeholder="Type your answer from the passage…"
      className="w-full bg-background border border-border text-sm font-medium text-foreground px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-70 shadow-2xs"
    />
  );
}

interface OptionGridProps {
  question: Question;
  selected: string[];
  result?: ReadingAnswerResult;
  locked: boolean;
  multiple: boolean;
  onChange: (ids: string[]) => void;
}

/**
 * The option cards, as radios or checkboxes.
 *
 * A multi-answer set is not a radio group with a looser rule: choosing a second
 * option must add to the answer rather than replace it, and a chosen option must
 * be un-choosable again, neither of which a radio can express.
 */
function OptionGrid({ question, selected, result, locked, multiple, onChange }: OptionGridProps) {
  const letterFor = (index: number) => String.fromCharCode(65 + index);
  const stripLetter = (text: string, letter: string) =>
    text.replace(new RegExp(`^${letter}[:.]\\s*`, 'i'), '');

  const toggle = (id: string) => {
    if (!multiple) return onChange([id]);
    onChange(selected.includes(id) ? selected.filter(value => value !== id) : [...selected, id]);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {question.options!.map((option, index) => {
        const letter = letterFor(index);
        const isSelected = selected.includes(option.id);
        const isCorrect = result?.review.correctAnswers?.includes(option.id);
        const isWrongSelection = result && isSelected && !isCorrect;

        let cardClasses =
          'bg-background border-border text-foreground hover:border-primary/40 hover:bg-muted/40';
        let badgeClasses = 'bg-muted text-muted-foreground border-border';

        if (result && isCorrect) {
          cardClasses = 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-semibold';
          badgeClasses = 'bg-white/20 text-white border-transparent';
        } else if (isWrongSelection) {
          cardClasses = 'bg-rose-600 text-white border-rose-600 shadow-sm font-semibold';
          badgeClasses = 'bg-white/20 text-white border-transparent';
        } else if (isSelected) {
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
              type={multiple ? 'checkbox' : 'radio'}
              name={question.id}
              checked={isSelected}
              disabled={locked}
              onChange={() => toggle(option.id)}
              className="sr-only"
            />

            <div className="flex items-center gap-2.5 min-w-0 pr-1">
              <span
                className={`w-6 h-6 font-mono font-bold text-xs flex items-center justify-center shrink-0 border ${badgeClasses} ${
                  multiple ? 'rounded-md' : 'rounded-lg'
                }`}
              >
                {letter}
              </span>
              <span className="truncate">{stripLetter(option.text, letter)}</span>
            </div>

            {result && isCorrect ? (
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
  );
}

/**
 * Gap-fills and Re-order show their answer key inside the control itself — in
 * the gaps, and under the boxes — so repeating it in the verdict banner would
 * say the same thing twice.
 */
function showsAnswerInline(typeId: string): boolean {
  return !isGapFill(typeId) && typeId !== READING_TYPES.reorderParagraphs;
}

/** The answer key by blank id, which is where BlankedText looks it up. */
function correctByBlank(review: Question): Record<string, string> {
  const answers: Record<string, string> = {};
  for (const blank of review.blanks ?? []) {
    if (blank.correctAnswer) answers[blank.id] = blank.correctAnswer;
  }
  return answers;
}

/** The answer key as a learner reads it. */
function displayAnswer(review: Question): string {
  const answers = review.correctAnswers ?? [];
  return answers
    .map(value => review.options?.find(option => option.id === value)?.text ?? value)
    .join(' / ');
}
