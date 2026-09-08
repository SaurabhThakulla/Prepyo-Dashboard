import React from 'react';
import { AnswerProps } from './types';
import OptionList from './OptionList';

/**
 * Multiple Choice, Multiple Answers.
 *
 * The count is shown because the task depends on it: the prompt asks for TWO,
 * partial credit is real, and a learner who has picked one has not finished. The
 * control does not enforce a limit — over-selecting is a wrong answer the grader
 * is entitled to see, not something to prevent.
 */
export default function MCQMultiple(props: AnswerProps) {
  const chosen = props.answer?.selectedOptions?.length ?? 0;

  return (
    <div className="space-y-1.5">
      <OptionList {...props} multiple />
      {!props.result && (
        <p className="text-[11px] text-muted-foreground pl-0.5">
          {chosen === 0 ? 'Select all that apply.' : `${chosen} selected`}
        </p>
      )}
    </div>
  );
}
