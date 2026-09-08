import React from 'react';
import { AnswerProps } from './types';
import OptionList from './OptionList';

/**
 * Multiple Choice, Single Answer. One answer is correct, and choosing another
 * replaces it.
 */
export default function MCQSingle(props: AnswerProps) {
  return <OptionList {...props} multiple={false} />;
}
