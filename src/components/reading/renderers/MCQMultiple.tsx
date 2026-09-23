import React from 'react';
import { AnswerProps } from './types';
import OptionList from './OptionList';

const COUNT_WORDS = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'];

/**
 * Multiple Choice, Multiple Answers.
 *
 * The count is shown because the task depends on it: the prompt asks for TWO,
 * and a learner who has picked one has not finished. Where the exam states the
 * number (IELTS sends it as selectCount), the control holds the learner to it,
 * as the answer sheet does; where it does not (PTE), over-selecting is a wrong
 * answer the grader is entitled to see, not something to prevent.
 */
export default function MCQMultiple(props: AnswerProps) {
  const chosen = props.answer?.selectedOptions?.length ?? 0;
  const limit = props.question.selectCount;

  let hint = chosen === 0 ? 'Select all that apply.' : `${chosen} selected`;
  if (limit) {
    const word = COUNT_WORDS[limit] ?? String(limit);
    hint = chosen >= limit
      ? `${chosen} of ${limit} chosen. Unselect one to change your answer.`
      : `Choose ${word} letters. ${chosen} of ${limit} chosen.`;
  }

  return (
    <div className="space-y-1.5">
      <OptionList {...props} multiple limit={limit} />
      {!props.result && (
        <p className="text-[11px] text-muted-foreground pl-0.5">{hint}</p>
      )}
    </div>
  );
}
