import React from 'react';
import { Check, X } from 'lucide-react';
import AnswerSelect from '@/components/ui/answer-select';
import { correctIds } from './types';
import { AnswerSubmission, Question } from '@/lib/types';
import { ReadingAnswerResult } from '@/lib/hooks/useReading';

interface SentenceGapProps {
  question: Question;
  answer?: AnswerSubmission;
  result?: ReadingAnswerResult;
  locked?: boolean;
  /** The question number, for the gap's screen-reader label. */
  number?: number;
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
export default function SentenceGap({ question, answer, result, locked, number, onChange }: SentenceGapProps) {
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
  const width = options.length ? `${Math.min(Math.max(widest + 5, 8), 28)}ch` : '11ch';

  let tone = filled
    ? 'border-primary/60 bg-primary/10 text-primary font-semibold shadow-2xs'
    : 'border-dashed border-primary/45 bg-primary/[0.04] text-foreground hover:border-primary/70';
  if (result) {
    tone = isCorrect
      ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-semibold'
      : 'border-rose-500/60 bg-rose-500/15 text-rose-800 dark:text-rose-200 font-semibold';
  }

  // The answer key holds option ids for a chooser; show the words.
  const rightAnswer = correctIds(result)
    .map(id => options.find(option => option.id === id)?.text ?? id)
    .join(' / ');

  // After marking: a tick, or a cross with the right word beside the gap.
  const verdictMark = result ? (
    isCorrect ? (
      <Check className="ml-1 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Correct" />
    ) : (
      <span className="ml-1 inline-flex items-center gap-1 whitespace-nowrap">
        <X className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" aria-label="Wrong" />
        {rightAnswer && (
          <span className="rounded-md border border-emerald-500/50 bg-emerald-500/15 px-1.5 py-0.5 font-sans text-xs font-bold leading-none text-emerald-700 dark:text-emerald-300">
            {rightAnswer}
          </span>
        )}
      </span>
    )
  ) : null;
  const struck = result && !isCorrect ? 'line-through decoration-rose-500/70' : '';

  const field = options.length ? (
    <span className="inline-flex items-center align-middle mx-1 my-0.5">
      <AnswerSelect
        value={chosen}
        options={options.map(option => ({ value: option.id, label: option.text }))}
        disabled={locked}
        style={{ width }}
        onChange={value => onChange({ selectedOptions: [value] })}
        aria-label="Choose the word that fits"
        className={`h-8 min-w-0 font-sans text-sm ${tone} ${struck}`}
      />
      {verdictMark}
    </span>
  ) : (
    <span className="inline-flex items-center align-middle mx-1 my-0.5">
      <input
        value={typed}
        disabled={locked}
        style={{ width }}
        onChange={event => onChange({ textResponse: event.target.value })}
        autoComplete="off"
        spellCheck={false}
        aria-label={number ? `Question ${number}` : 'Your answer'}
        placeholder="...."
        className={`h-8 font-sans text-sm px-2.5 rounded-lg border text-center font-semibold placeholder:font-bold placeholder:tracking-widest placeholder:text-primary/50focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-solid focus:border-primary disabled:opacity-100 transition-all ${tone} ${struck}`}
      />
      {verdictMark}
    </span>
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
