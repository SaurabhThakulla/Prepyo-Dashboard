import React from 'react';
import { AnswerProps, correctIds } from './types';

/**
 * Matching Information and Find the Paragraph.
 *
 * The question is a piece of information; the answer is the letter of the
 * paragraph that contains it. So the control is a row of letters, not a stack of
 * cards reading "Paragraph A", "Paragraph B" down the screen — a passage with
 * ten paragraphs would otherwise give every statement ten full-width options and
 * push the next statement off the page.
 *
 * The letters line up with the [A]-[J] labels PassageReader prints beside the
 * text, which is the whole interaction: read the statement, scan the passage,
 * click the letter.
 */
export default function ParagraphMatcher({ question, answer, result, locked, onChange }: AnswerProps) {
  const options = question.options ?? [];
  const selected = answer?.selectedOptions ?? [];
  const correct = correctIds(result);

  /** "Paragraph F" is the option text; F is what the learner is choosing. */
  const letterOf = (text: string, id: string) => {
    const match = text.match(/\b([A-Z])\b\s*$/);
    return match ? match[1] : id;
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(option => {
        const isSelected = selected.includes(option.id);
        const isCorrect = correct.includes(option.id);
        const isWrong = Boolean(result) && isSelected && !isCorrect;

        let classes =
          'bg-background border-border text-foreground hover:border-primary/40 hover:bg-muted/40';
        if (result && isCorrect) {
          classes = 'bg-emerald-600 text-white border-emerald-600 shadow-sm';
        } else if (isWrong) {
          classes = 'bg-rose-600 text-white border-rose-600 shadow-sm';
        } else if (isSelected) {
          classes = 'bg-primary text-primary-foreground border-primary shadow-sm';
        } else if (result) {
          classes = 'opacity-50 bg-background border-border text-muted-foreground';
        }

        return (
          <button
            key={option.id}
            type="button"
            disabled={locked}
            aria-pressed={isSelected}
            aria-label={option.text}
            title={option.text}
            onClick={() => onChange({ selectedOptions: [option.id] })}
            className={`w-9 h-9 rounded-lg border font-mono font-bold text-sm flex items-center justify-center transition-all ${
              locked ? 'cursor-default' : 'cursor-pointer active:scale-95'
            } ${classes}`}
          >
            {letterOf(option.text, option.id)}
          </button>
        );
      })}
    </div>
  );
}
