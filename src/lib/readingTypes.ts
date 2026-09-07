/**
 * Reading task type ids, and the map from sidebar links to them.
 *
 * These strings are the contract with the server: they are what
 * `reading_question_groups.type_id` holds, what `POST /reading/practice` is
 * asked for, and what decides which answer control a question is given. They
 * live here rather than inline so the practice panel and the renderer cannot
 * drift apart about what a task is called.
 */

export const READING_TYPES = {
  // IELTS
  sentenceCompletion: 'reading-sentence-completion',
  trueFalse: 'reading-true-false',
  findTheWriter: 'reading-find-the-writer',
  arrangePassage: 'reading-arrange-passage',
  yesNoNotGiven: 'reading-yes-no-not-given',
  matchingInformation: 'reading-matching-information',

  // PTE
  fillBlanksRW: 'fill-in-blanks-rw',
  fillBlanksR: 'fill-in-blanks-r',
  mcqSingle: 'reading-mcq-single',
  mcqMultiple: 'reading-mcq-multiple',
  reorderParagraphs: 'reorder-paragraphs',
} as const;

/**
 * Sidebar task names to server task types, keyed by `typeKey` from
 * `@/lib/syllabus` — which is how the sidebar builds its links.
 *
 * The IELTS syllabus lists eight reading tasks against the server's six types.
 * That is not a mismatch to fix: "Complete the sentences" and "Sentence
 * completions" are the same task appearing twice on a passage, as are the two
 * Yes/No/Not Given sets, so both names resolve to the one type.
 */
export const TYPE_BY_SYLLABUS_KEY: Record<string, string> = {
  // IELTS
  completesentences: READING_TYPES.sentenceCompletion,
  sentencecompletions: READING_TYPES.sentenceCompletion,
  truefalse: READING_TYPES.trueFalse,
  findwriter: READING_TYPES.findTheWriter,
  arrangepassage: READING_TYPES.arrangePassage,
  yesnonotgiven: READING_TYPES.yesNoNotGiven,
  matchinginformation: READING_TYPES.matchingInformation,

  // PTE
  readingwritingfillinblanks: READING_TYPES.fillBlanksRW,
  readingfillinblanks: READING_TYPES.fillBlanksR,
  multiplechoicesingleanswer: READING_TYPES.mcqSingle,
  multiplechoicemultipleanswers: READING_TYPES.mcqMultiple,
  reorderparagraphs: READING_TYPES.reorderParagraphs,
};

/** Tasks answered by filling gaps in a text the question carries itself. */
export const isGapFill = (typeId: string): boolean =>
  typeId === READING_TYPES.fillBlanksRW || typeId === READING_TYPES.fillBlanksR;

/** Tasks where more than one option may be selected. */
export const isMultiSelect = (typeId: string): boolean =>
  typeId === READING_TYPES.mcqMultiple;

/** Checks if a reading task (by syllabus typeKey, typeId, or typeName) is a multiple-choice task. */
export function isReadingMultipleChoice(typeKeyOrId?: string | null): boolean {
  if (!typeKeyOrId) return false;
  const normalized = typeKeyOrId.toLowerCase().replace(/[^a-z0-9]/g, '');
  return normalized.includes('multiplechoice') || normalized.includes('mcq');
}
