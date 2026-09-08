import React from 'react';
import { AnswerSubmission, Question } from '@/lib/types';
import { ReadingAnswerResult } from '@/lib/hooks/useReading';

interface SentenceGapProps {
  question: Question;
  answer?: AnswerSubmission;
  result?: ReadingAnswerResult;
  locked?: boolean;
  onChange: (patch: Partial<AnswerSubmission>) => void;
}

/**
 * One sentence with its gap filled in place, as inline content.
 *
 * Deliberately returns no block wrapper: the same sentence has to sit alone in
 * a card and run together with its neighbours inside one flowing paragraph, and
 * a <div> in the second case would break the line and be invalid inside a <p>.
 * Both layouts therefore share this and cannot drift apart about how a gap
 * behaves.
 *
 * Two forms, decided by the item rather than by the type. Items authored with
 * word choices get a chooser; one authored without is typed. The grader takes
 * either, so both submit what they naturally have.
 */
export default function SentenceGap({ question, answer, result, locked, onChange }: SentenceGapProps) {
  const options = question.options ?? [];
  const parts = question.prompt.split(/\[\[\w+\]\]|_{3,}/);
  const hasGap = parts.length > 1;

  const chosen = answer?.selectedOptions?.[0] ?? '';
  const typed = answer?.textResponse ?? '';
  const isCorrect = result?.attempt.isCorrect;

  let fieldClasses = 'border-border bg-background text-foreground focus:ring-primary';
  if (result) {
    fieldClasses = isCorrect
      ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-semibold'
      : 'border-rose-500/60 bg-rose-500/15 text-rose-800 dark:text-rose-200 font-semibold';
  }

  const field = options.length ? (
    <select
      value={chosen}
      disabled={locked}
      onChange={event => onChange({ selectedOptions: [event.target.value] })}
      aria-label="Choose the word that fits"
      className={`inline-block mx-1 px-2 py-0.5 rounded-md border text-xs sm:text-sm text-center align-baseline focus:outline-none focus:ring-1 focus:border-transparent disabled:opacity-90 ${fieldClasses}`}
    >
      <option value="">— select —</option>
      {options.map(option => (
        <option key={option.id} value={option.id}>
          {option.text}
        </option>
      ))}
    </select>
  ) : (
    <input
      value={typed}
      disabled={locked}
      onChange={event => onChange({ textResponse: event.target.value })}
      placeholder="…"
      aria-label="Your answer"
      className={`inline-block w-32 sm:w-40 mx-1 px-2 py-0.5 rounded-md border text-xs sm:text-sm text-center align-baseline focus:outline-none focus:ring-1 focus:border-transparent disabled:opacity-90 ${fieldClasses}`}
    />
  );

  if (!hasGap) {
    return (
      <>
        {question.prompt} {field}
      </>
    );
  }

  return (
    <>
      {parts.map((part, index) => (
        <React.Fragment key={index}>
          {part}
          {index < parts.length - 1 && field}
        </React.Fragment>
      ))}
    </>
  );
}
