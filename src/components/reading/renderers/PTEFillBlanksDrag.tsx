import React from 'react';
import { AnswerProps } from './types';
import PTEFillBlanks from './PTEFillBlanks';

/**
 * Reading: Fill in the Blanks. One pool of words is shared across the gaps, with
 * more words in it than there are gaps, and they are dragged in.
 */
export default function PTEFillBlanksDrag(props: AnswerProps) {
  return <PTEFillBlanks {...props} fromWordBank />;
}
