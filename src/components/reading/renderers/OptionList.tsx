import React from 'react';
import { Check, X } from 'lucide-react';
import { AnswerProps, correctIds } from './types';

interface OptionListProps extends AnswerProps {
  /** Whether choosing a second option adds to the answer or replaces it. */
  multiple: boolean;
  /**
   * The most options that may be chosen, when the task says ("Choose TWO
   * letters"). An IELTS answer sheet has one box per letter, so a third
   * letter is not something the learner can write; it is refused here too.
   */
  limit?: number;
}

/**
 * The lettered option list behind both multiple-choice renderers.
 *
 * Single and multiple answer are not the same control with a looser rule.
 * Choosing a second option must add rather than replace, a chosen option must be
 * un-choosable again, and the learner has to be able to see how many they have
 * picked — none of which a radio group can express. The two renderers therefore
 * differ in behaviour and in affordance (round for one, square for several), and
 * share only this layout.
 */
export default function OptionList({
  question,
  answer,
  result,
  locked,
  multiple,
  limit,
  onChange,
}: OptionListProps) {
  const options = question.options ?? [];
  const selected = answer?.selectedOptions ?? [];
  const correct = correctIds(result);

  const letterFor = (index: number) => String.fromCharCode(65 + index);
  const stripLetter = (text: string, letter: string) =>
    text.replace(new RegExp(`^${letter}[:.]\\s*`, 'i'), '');

  const toggle = (id: string) => {
    if (!multiple) return onChange({ selectedOptions: [id] });
    if (limit && !selected.includes(id) && selected.length >= limit) return;
    onChange({
      selectedOptions: selected.includes(id)
        ? selected.filter(value => value !== id)
        : [...selected, id],
    });
  };

  return (
    <div className="space-y-1.5">
      {options.map((option, index) => {
        const letter = letterFor(index);
        const isSelected = selected.includes(option.id);
        const isCorrect = correct.includes(option.id);
        const isWrong = Boolean(result) && isSelected && !isCorrect;

        let classes =
          'bg-background border-border text-foreground hover:border-primary/40 hover:bg-muted/40';
        let badge = 'bg-muted text-muted-foreground border-border';

        if (result && isCorrect) {
          classes = 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-semibold';
          badge = 'bg-white/20 text-white border-transparent';
        } else if (isWrong) {
          classes = 'bg-rose-600 text-white border-rose-600 shadow-sm font-semibold';
          badge = 'bg-white/20 text-white border-transparent';
        } else if (isSelected) {
          classes = 'bg-primary text-primary-foreground border-primary shadow-sm font-semibold';
          badge = 'bg-white/20 text-white border-transparent';
        } else if (result) {
          classes = 'opacity-50 bg-background border-border text-muted-foreground';
        }

        return (
          <label
            key={option.id}
            className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border text-xs sm:text-[13.5px] font-medium leading-relaxed transition-all select-none ${
              locked ? 'cursor-default' : 'cursor-pointer active:scale-[0.99]'
            } ${classes}`}
          >
            <input
              type={multiple ? 'checkbox' : 'radio'}
              name={question.id}
              checked={isSelected}
              disabled={locked}
              onChange={() => toggle(option.id)}
              className="sr-only"
            />

            <span
              className={`w-5 h-5 mt-px font-mono font-bold text-xs flex items-center justify-center shrink-0 border ${badge} ${
                multiple ? 'rounded-md' : 'rounded-full'
              }`}
            >
              {letter}
            </span>
            <span className="leading-snug">{stripLetter(option.text, letter)}</span>

            {result && isCorrect ? (
              <Check className="w-4 h-4 shrink-0 ml-auto mt-px" />
            ) : isWrong ? (
              <X className="w-4 h-4 shrink-0 ml-auto mt-px" />
            ) : null}
          </label>
        );
      })}
    </div>
  );
}
