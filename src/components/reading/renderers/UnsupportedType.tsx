import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { AnswerProps } from './types';

/**
 * A task type with no renderer.
 *
 * It says so rather than falling back to a generic option grid. A grid would
 * render a matching task, an ordering task and a multiple choice identically and
 * look like it had worked, which is how five different tasks came to share one
 * control in the first place. The server takes the same line: scoring.Grade
 * refuses an unknown type rather than awarding marks nobody can justify.
 */
export default function UnsupportedType({ question }: AnswerProps) {
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs">
      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-px" />
      <p className="text-amber-800 dark:text-amber-200 leading-snug">
        This task type cannot be answered here yet.
        <span className="block text-[11px] opacity-80 font-mono mt-0.5">{question.typeId}</span>
      </p>
    </div>
  );
}
