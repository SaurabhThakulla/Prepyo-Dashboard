import React from 'react';
import AnswerSelect from '@/components/ui/answer-select';
import { AnswerProps } from './types';

/**
 * One matching question on its own, away from its set: a heading, a person or
 * a sentence ending picked from the set's list. The list is the question's
 * options, so each choice shows its label and its words.
 */
export default function ListChoice({ question, answer, result, locked, onChange }: AnswerProps) {
  const chosen = answer?.selectedOptions?.[0] ?? '';
  const isCorrect = result?.attempt.isCorrect;

  let tone = chosen
    ? 'border-primary/60 bg-primary/10 text-primary font-semibold'
    : 'border-input bg-background text-muted-foreground hover:border-primary/50';
  if (result) {
    tone = isCorrect
      ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-semibold'
      : 'border-rose-500/60 bg-rose-500/15 text-rose-800 dark:text-rose-200 font-semibold';
  }

  return (
    <AnswerSelect
      value={chosen}
      options={(question.options ?? []).map(option => ({ value: option.id, label: `${option.id}  ${option.text}` }))}
      disabled={locked}
      onChange={value => onChange({ selectedOptions: [value] })}
      aria-label="Choose the answer from the list"
      className={`h-9 w-full max-w-md ${tone}`}
    />
  );
}
