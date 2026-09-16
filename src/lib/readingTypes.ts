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
  findTheParagraph: 'reading-find-the-paragraph',
  arrangePassage: 'reading-arrange-passage',
  matchHeading: 'reading-arrange-passage',
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
 * Several keys resolve to the same type. A task appears on a passage under
 * more than one heading, and a heading that has been renamed keeps its old key
 * so links already in the wild still land on the right task.
 */
export const TYPE_BY_SYLLABUS_KEY: Record<string, string | string[]> = {
  // Multiple choice is one task on the dashboard. Whether a question takes one
  // answer or several is a property of the question, not a separate practice
  // menu, so the entry covers both server types.
  multiplechoice: [READING_TYPES.mcqSingle, READING_TYPES.mcqMultiple],
  multiplechoicesingleanswer: READING_TYPES.mcqSingle,
  multiplechoicemultipleanswers: READING_TYPES.mcqMultiple,

  // Both paragraph-locating tasks ask the learner the same thing, so they are
  // one heading. Match The Heading is the task behind it; Matching Information
  // is only reached when that one has nothing to deal.
  findparagraph: [READING_TYPES.findTheParagraph, READING_TYPES.matchingInformation],
  whichparagraphcontainsfollowinginformation: [
    READING_TYPES.findTheParagraph,
    READING_TYPES.matchingInformation,
  ],
  matchheading: [READING_TYPES.findTheParagraph, READING_TYPES.matchingInformation],
  matchtheheading: [READING_TYPES.findTheParagraph, READING_TYPES.matchingInformation],
  matchheadings: [READING_TYPES.findTheParagraph, READING_TYPES.matchingInformation],
  matchingheadings: [READING_TYPES.findTheParagraph, READING_TYPES.matchingInformation],
  matchingheading: [READING_TYPES.findTheParagraph, READING_TYPES.matchingInformation],
  matchinginformation: READING_TYPES.matchingInformation,

  truefalse: READING_TYPES.trueFalse,
  truefalsenotgiven: READING_TYPES.trueFalse,
  yesnonotgiven: READING_TYPES.yesNoNotGiven,

  fillinblanks: READING_TYPES.sentenceCompletion,
  completesentences: READING_TYPES.sentenceCompletion,
  sentencecompletions: READING_TYPES.sentenceCompletion,
  arrangepassage: READING_TYPES.arrangePassage,


  // PTE Reading tasks
  fillblanksreadingwriting: READING_TYPES.fillBlanksRW,
  fillinblanksreadingwriting: READING_TYPES.fillBlanksRW,
  readingwritingfillinblanks: READING_TYPES.fillBlanksRW,
  multipletypemultipleanswer: READING_TYPES.mcqMultiple,
  reorderparagraph: READING_TYPES.reorderParagraphs,
  reorderparagraphs: READING_TYPES.reorderParagraphs,
  readingfillblanks: READING_TYPES.fillBlanksR,
  readingfillinblanks: READING_TYPES.fillBlanksR,
  multipletypesingleanswer: READING_TYPES.mcqSingle,
};


/**
 * The server task types a dashboard entry covers, widest first.
 *
 * One heading can stand for more than one server type — multiple choice is one
 * task to a learner and two to the question bank — so callers ask for the list
 * and take the first type the server actually has questions behind.
 */
export function typeIdsFor(syllabusKey?: string | null): string[] {
  if (!syllabusKey) return [];
  const mapped = TYPE_BY_SYLLABUS_KEY[syllabusKey];
  if (!mapped) return [];
  return Array.isArray(mapped) ? mapped : [mapped];
}

/**
 * The task types that share one dashboard heading.
 *
 * Practice deals a whole family at once: a learner who picks Multiple Choice
 * wants every multiple-choice question the passage carries, not whichever of
 * the two server types happened to be dealt. A mock is the other way round and
 * asks for one type at a time, which is why this lives here and not in the
 * request itself.
 */
const FAMILIES: string[][] = [
  [READING_TYPES.mcqSingle, READING_TYPES.mcqMultiple],
  [READING_TYPES.findTheParagraph, READING_TYPES.matchingInformation],
];

/** Every type sitting behind the same heading as this one, including itself. */
export function familyOf(typeId: string): string[] {
  return FAMILIES.find(family => family.includes(typeId)) ?? [typeId];
}

/** Tasks answered by filling gaps in a text the question carries itself. */
export const isGapFill = (typeId: string): boolean =>
  typeId === READING_TYPES.fillBlanksRW || typeId === READING_TYPES.fillBlanksR;

/**
 * Tasks answered by naming a paragraph, which only works if the passage is
 * printed with its [A]-[J] labels showing.
 */
export const needsParagraphLabels = (typeId: string): boolean =>
  typeId === READING_TYPES.matchingInformation || typeId === READING_TYPES.findTheParagraph;

/** Tasks where more than one option may be selected. */
export const isMultiSelect = (typeId: string): boolean =>
  typeId === READING_TYPES.mcqMultiple;

/** Checks if a reading task (by syllabus typeKey, typeId, or typeName) is a multiple-choice task. */
export function isReadingMultipleChoice(typeKeyOrId?: string | null): boolean {
  if (!typeKeyOrId) return false;
  const normalized = typeKeyOrId.toLowerCase().replace(/[^a-z0-9]/g, '');
  return normalized.includes('multiplechoice') || normalized.includes('mcq');
}
