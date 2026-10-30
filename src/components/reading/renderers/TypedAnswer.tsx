import React from 'react';
import { Check, X } from 'lucide-react';
import { AnswerProps } from './types';

/**
 * Short-answer questions: the question is printed above, and the answer is a
 * few words typed from the passage. After marking, a tick or a cross; the row
 * under it prints the accepted answers.
 */
export default function TypedAnswer({ question, answer, result, locked, onChange }: AnswerProps) {
  const typed = answer?.textResponse ?? '';
  const isCorrect = result?.attempt.isCorrect;

  let tone = typed.trim()
    ? 'border-primary/60 bg-primary/10 text-primary'
    : 'border-dashed border-primary/45 bg-primary/[0.04] text-foreground';
  if (result) {
    tone = isCorrect
      ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
      : 'border-rose-500/60 bg-rose-500/15 text-rose-800 dark:text-rose-200';
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <input
        value={typed}
        disabled={locked}
        onChange={event => onChange({ textResponse: event.target.value })}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label={`Answer: ${question.prompt}`}
        placeholder="Type your answer"
        className={`h-9 w-full max-w-xs rounded-lg border px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-100 ${tone}`}
      />
      {result &&
        (isCorrect ? (
          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-label="Correct" />
        ) : (
          <X className="h-4 w-4 text-rose-600 dark:text-rose-400" aria-label="Wrong" />
        ))}
    </span>
  );
}
