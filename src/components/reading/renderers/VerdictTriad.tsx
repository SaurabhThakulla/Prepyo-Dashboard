import React from 'react';
import { Check, X } from 'lucide-react';
import { AnswerProps, correctIds } from './types';

/**
 * True / False / Not Given, and Yes / No / Not Given.
 *
 * Three wide buttons in a fixed row rather than a grid of option cards. The
 * three answers are the task — a learner reads the statement and decides between
 * agreement, contradiction and silence — so they are always in the same three
 * places, always in the same order, and never wrapped onto a second line where
 * "Not Given" would sit under "True" and read as an afterthought.
 *
 * The option ids come from the server (TRUE, FALSE, NOT_GIVEN) and are submitted
 * unchanged, so this renders the task without knowing anything about how it is
 * graded.
 */
export default function VerdictTriad({ question, answer, result, locked, onChange }: AnswerProps) {
  const options = question.options ?? [];
  const selected = answer?.selectedOptions ?? [];
  const correct = correctIds(result);

  return (
    <div className="grid grid-cols-3 gap-1.5 max-w-sm">
      {options.map(option => {
        const isSelected = selected.includes(option.id);
        const isCorrect = correct.includes(option.id);
        const isWrong = Boolean(result) && isSelected && !isCorrect;

        let classes =
          'bg-muted/50 border-transparent text-foreground hover:bg-primary/[0.08]';
        if (result && isCorrect) {
          classes = 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-sm';
        } else if (isWrong) {
          classes = 'bg-rose-600 text-white border-rose-600 font-semibold shadow-sm';
        } else if (isSelected) {
          classes = 'bg-primary text-primary-foreground border-primary font-semibold shadow-sm';
        } else if (result) {
          classes = 'opacity-50 bg-muted/50 border-transparent text-muted-foreground';
        }

        return (
          <button
            key={option.id}
            type="button"
            disabled={locked}
            aria-pressed={isSelected}
            onClick={() => onChange({ selectedOptions: [option.id] })}
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-[11px] sm:text-xs uppercase tracking-wide transition-all ${
              locked ? 'cursor-default' : 'cursor-pointer active:scale-[0.99]'
            } ${classes}`}
          >
            {option.text}
            {result && isCorrect ? (
              <Check className="w-3.5 h-3.5 shrink-0" />
            ) : isWrong ? (
              <X className="w-3.5 h-3.5 shrink-0" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
