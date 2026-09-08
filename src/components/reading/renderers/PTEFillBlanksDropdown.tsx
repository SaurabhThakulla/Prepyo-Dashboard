import React from 'react';
import { AnswerProps } from './types';
import PTEFillBlanks from './PTEFillBlanks';

/**
 * Reading & Writing: Fill in the Blanks. Every gap carries its own four choices,
 * so each one is a dropdown.
 */
export default function PTEFillBlanksDropdown(props: AnswerProps) {
  return <PTEFillBlanks {...props} fromWordBank={false} />;
}
