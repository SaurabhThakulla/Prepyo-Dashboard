import React from 'react';
import BlankedText from '@/components/reading/BlankedText';
import { AnswerProps, correctByBlank } from './types';

interface PTEFillBlanksProps extends AnswerProps {
  /**
   * Whether the words come from a pool shared across the gaps (Reading) or from
   * a list of their own per gap (Reading & Writing).
   */
  fromWordBank: boolean;
}

/**
 * Both PTE gap-fills, over the gapped text the question carries itself.
 *
 * The passage is not on screen for either of them, and that is not a layout
 * decision: the text here is a rewrite of the passage with words taken out, so
 * printing the clean original beside it would hand over every gap. The group is
 * marked `passageDisplay: 'hidden'` for exactly that reason.
 */
export default function PTEFillBlanks({
  question,
  answer,
  result,
  locked,
  resources,
  fromWordBank,
  onChange,
}: PTEFillBlanksProps) {
  if (!question.contextPassage) {
    return (
      <p className="text-xs text-muted-foreground italic">
        This gap-fill has no text to fill in.
      </p>
    );
  }

  return (
    <BlankedText
      text={question.contextPassage}
      blanks={question.blanks ?? []}
      value={answer?.blankResponses ?? {}}
      disabled={locked}
      wordBank={fromWordBank ? resources : undefined}
      correct={correctByBlank(result)}
      onChange={responses => onChange({ blankResponses: responses })}
    />
  );
}
