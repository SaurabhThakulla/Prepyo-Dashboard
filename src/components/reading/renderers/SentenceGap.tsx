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
 *
 * The control is sized to the words it can hold rather than to a fixed width.
 * A gap wide enough for the longest answer and no wider keeps the sentence
 * readable as a sentence; the fixed width it replaced turned a seven-gap
 * summary into a column of boxes with prose scattered between them.
 */
export default function SentenceGap({ question, answer, result, locked, onChange }: SentenceGapProps) {
  const options = question.options ?? [];
  const parts = question.prompt.split(/\[\[\w+\]\]|_{3,}/);
  const hasGap = parts.length > 1;

  const chosen = answer?.selectedOptions?.[0] ?? '';
  const typed = answer?.textResponse ?? '';
  const isCorrect = result?.attempt.isCorrect;
  const filled = Boolean(chosen || typed.trim());

  // Wide enough for the longest word on offer, with room for the chevron. A
  // typed gap has nothing to measure, so it gets a middling blank.
  const widest = options.reduce((longest, option) => Math.max(longest, option.text.length), 0);
  const width = options.length ? `${Math.min(Math.max(widest + 4, 7), 22)}ch` : '11ch';

  let tone = filled
    ? 'border-primary/50 bg-primary/5 text-foreground font-semibold'
    : 'border-dashed border-muted-foreground/50 bg-muted/40 text-muted-foreground';
  if (result) {
    tone = isCorrect
      ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-semibold'
      : 'border-rose-500/60 bg-rose-500/15 text-rose-800 dark:text-rose-200 font-semibold';
  }

  const shared =
    'inline-block align-baseline mx-1 px-1.5 py-0 h-6 leading-6 rounded-md border text-xs sm:text-sm text-center ' +
    'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-100 transition-colors';

  const field = options.length ? (
    <select
      value={chosen}
      disabled={locked}
      style={{ width }}
      onChange={event => onChange({ selectedOptions: [event.target.value] })}
      aria-label="Choose the word that fits"
      className={`${shared} appearance-none cursor-pointer ${tone}`}
    >
      <option value="">—</option>
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
      style={{ width }}
      onChange={event => onChange({ textResponse: event.target.value })}
      aria-label="Your answer"
      className={`${shared} ${tone}`}
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
