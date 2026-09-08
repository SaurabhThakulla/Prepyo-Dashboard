import React from 'react';
import { AnswerProps, correctIds } from './types';

/**
 * Sentence Completion: a sentence with a gap in it, filled from the passage.
 *
 * The gap is rendered inside the sentence, not as a box underneath it. That is
 * the task — the sentence around the gap is what tells the learner which word
 * fits — and a bare field below the prompt makes them hold the sentence in their
 * head while they answer.
 *
 * Two forms, decided by the item rather than by the type. Since 000021 these are
 * authored with four word choices, so the gap is a chooser; an item authored
 * without them is typed instead. The grader takes either — one selected option
 * is "the same answer arriving by a different route" — so both forms submit what
 * they naturally have, and neither needs the other to know about it.
 */
export default function SentenceCompletion({ question, answer, result, locked, onChange }: AnswerProps) {
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

  // The answer key is words, and for a chooser those words are the option ids,
  // so both forms read the same list.
  const answerKey = result ? correctIds(result) : [];

  return (
    <div className="space-y-1.5">
      <p className="text-xs sm:text-sm text-foreground leading-relaxed">
        {hasGap
          ? parts.map((part, index) => (
              <React.Fragment key={index}>
                {part}
                {index < parts.length - 1 && field}
              </React.Fragment>
            ))
          : (
            <>
              {question.prompt} {field}
            </>
          )}
      </p>

      {result && !isCorrect && answerKey.length > 0 && (
        <p className="text-[11px] text-muted-foreground pl-0.5">
          Answer: <span className="font-semibold text-foreground">{answerKey.join(' / ')}</span>
        </p>
      )}
    </div>
  );
}
