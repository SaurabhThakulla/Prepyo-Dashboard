import React from 'react';
import AnswerSelect from '@/components/ui/answer-select';
import { AnswerProps } from './types';

/**
 * Matching Information: pick the paragraph (A-J) that holds the statement,
 * from a dropdown. The letters match the [A]-[J] labels beside the passage.
 * The row's verdict line prints the correct paragraph after marking.
 */
export default function ParagraphMatcher({ question, answer, result, locked, onChange }: AnswerProps) {
  const options = question.options ?? [];
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
      options={options.map(option => ({ value: option.id, label: option.text }))}
      disabled={locked}
      onChange={value => onChange({ selectedOptions: [value] })}
      aria-label="Choose the paragraph"
      className={`h-9 min-w-[9rem] ${tone}`}
    />
  );
}
