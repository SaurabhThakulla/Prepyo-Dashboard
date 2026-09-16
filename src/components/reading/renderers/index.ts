import { ComponentType } from 'react';
import { READING_TYPES } from '@/lib/readingTypes';
import { AnswerProps } from './types';

import VerdictTriad from './VerdictTriad';
import ParagraphMatcher from './ParagraphMatcher';
import MCQSingle from './MCQSingle';
import MCQMultiple from './MCQMultiple';
import SentenceCompletion from './SentenceCompletion';
import OrderedChoice from './OrderedChoice';
import PTEFillBlanksDropdown from './PTEFillBlanksDropdown';
import PTEFillBlanksDrag from './PTEFillBlanksDrag';
import ReorderParagraph from './ReorderParagraph';
import UnsupportedType from './UnsupportedType';

/**
 * Task type to answer control. This is the only place the decision is made.
 *
 * It is keyed on `typeId` and nothing else. The previous version dispatched on
 * two types and then fell through to `if (question.options?.length)`, which
 * meant True/False, Yes/No/Not Given, Matching Information, Match The Heading,
 * Match the Heading and both multiple choices all rendered as the same
 * two-column grid of cards — six different tasks wearing one interface, because
 * they happen to arrive with an options array.
 *
 * A type that is not in here gets UnsupportedType, not a guess.
 */
export const RENDERERS: Record<string, ComponentType<AnswerProps>> = {
  // IELTS
  [READING_TYPES.trueFalse]: VerdictTriad,
  [READING_TYPES.yesNoNotGiven]: VerdictTriad,
  [READING_TYPES.matchingInformation]: ParagraphMatcher,
  [READING_TYPES.findTheParagraph]: ParagraphMatcher,
  [READING_TYPES.sentenceCompletion]: SentenceCompletion,
  [READING_TYPES.arrangePassage]: OrderedChoice,

  // Set by both exams
  [READING_TYPES.mcqSingle]: MCQSingle,
  [READING_TYPES.mcqMultiple]: MCQMultiple,

  // PTE
  [READING_TYPES.fillBlanksRW]: PTEFillBlanksDropdown,
  [READING_TYPES.fillBlanksR]: PTEFillBlanksDrag,
  [READING_TYPES.reorderParagraphs]: ReorderParagraph,
};

/** The control for a task type, or the one that says there isn't one. */
export const rendererFor = (typeId: string): ComponentType<AnswerProps> =>
  RENDERERS[typeId] ?? UnsupportedType;

export type { AnswerProps } from './types';
