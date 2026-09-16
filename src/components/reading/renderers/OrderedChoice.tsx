import React from 'react';
import { Check, X } from 'lucide-react';
import { AnswerProps, correctIds } from './types';

/**
 * Match the Heading: the boxes are printed out of order and each question asks
 * which one belongs at this position.
 *
 * It looks like a multiple choice and is not one. The options are the same four
 * boxes on every question in the set, and the answer is a position in a sequence
 * — so the option text is long, it repeats down the set, and the letter is what
 * the learner actually reasons about. Hence a labelled row of boxes with the
 * chosen one lifted, rather than four full-width cards restated four times.
 *
 * The boxes themselves live on the group as resources, which is where the set's
 * shared material belongs; the options carry the same labels.
 */
export default function OrderedChoice({ question, answer, result, locked, onChange }: AnswerProps) {
  const options = question.options ?? [];
  const selected = answer?.selectedOptions ?? [];
  const correct = correctIds(result);

  return (
    <div className="space-y-1.5">
      {options.map(option => {
        const isSelected = selected.includes(option.id);
        const isCorrect = correct.includes(option.id);
        const isWrong = Boolean(result) && isSelected && !isCorrect;

        let classes =
          'bg-background border-border text-foreground hover:border-primary/40 hover:bg-muted/40';
        let badge = 'bg-muted text-muted-foreground border-border';

        if (result && isCorrect) {
          classes = 'bg-emerald-600/10 border-emerald-500/50 text-foreground';
          badge = 'bg-emerald-600 text-white border-transparent';
        } else if (isWrong) {
          classes = 'bg-rose-600/10 border-rose-500/50 text-foreground';
          badge = 'bg-rose-600 text-white border-transparent';
        } else if (isSelected) {
          classes = 'bg-primary/10 border-primary/50 text-foreground';
          badge = 'bg-primary text-primary-foreground border-transparent';
        } else if (result) {
          classes = 'opacity-50 bg-background border-border text-muted-foreground';
        }

        return (
          <button
            key={option.id}
            type="button"
            disabled={locked}
            aria-pressed={isSelected}
            onClick={() => onChange({ selectedOptions: [option.id] })}
            className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-lg border text-left text-xs sm:text-[13px] transition-all ${
              locked ? 'cursor-default' : 'cursor-pointer active:scale-[0.99]'
            } ${classes}`}
          >
            <span
              className={`w-6 h-6 mt-px rounded-md font-mono font-bold text-[11px] flex items-center justify-center shrink-0 border ${badge}`}
            >
              {option.id}
            </span>
            <span className="leading-snug">{option.text}</span>

            {result && isCorrect ? (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 ml-auto mt-px" />
            ) : isWrong ? (
              <X className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 ml-auto mt-px" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
