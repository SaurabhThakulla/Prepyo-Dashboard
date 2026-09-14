import React from 'react';
import { ChevronDown } from 'lucide-react';
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
  const width = options.length ? `${Math.min(Math.max(widest + 5, 8), 28)}ch` : '12ch';

  let tone = filled
    ? 'border-primary/60 bg-primary/10 text-primary font-semibold shadow-2xs'
    : 'border-border/90 bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:border-primary/40';
  if (result) {
    tone = isCorrect
      ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-semibold'
      : 'border-rose-500/60 bg-rose-500/15 text-rose-800 dark:text-rose-200 font-semibold';
  }

  const field = options.length ? (
    <span className="relative inline-flex items-center align-middle mx-1 my-0.5 group">
      <select
        value={chosen}
        disabled={locked}
        style={{ width }}
        onChange={event => onChange({ selectedOptions: [event.target.value] })}
        aria-label="Choose the word that fits"
        className={`h-7 text-xs sm:text-sm pl-2.5 pr-6 rounded-lg border font-medium cursor-pointer appearance-none transition-all shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:cursor-not-allowed ${tone}`}
      >
        <option value="">— select —</option>
        {options.map(option => (
          <option key={option.id} value={option.id}>
            {option.text}
          </option>
        ))}
      </select>
      <ChevronDown className="w-3.5 h-3.5 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/80 group-hover:text-primary transition-colors" />
    </span>
  ) : (
    <input
      value={typed}
      disabled={locked}
      style={{ width }}
      onChange={event => onChange({ textResponse: event.target.value })}
      aria-label="Your answer"
      placeholder="..."
      className={`inline-block align-middle mx-1 my-0.5 h-7 text-xs sm:text-sm px-2.5 rounded-lg border text-center font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-100 transition-all shadow-2xs ${tone}`}
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
