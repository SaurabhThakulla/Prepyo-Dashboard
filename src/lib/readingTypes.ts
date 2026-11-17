import { typeKey } from '@/lib/syllabus';

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
  yesNoNotGiven: 'reading-yes-no-not-given',
  matchingInformation: 'reading-matching-information',
  matchingHeadings: 'reading-matching-headings',
  matchingFeatures: 'reading-matching-features',
  sentenceEndings: 'reading-sentence-endings',
  summaryCompletion: 'reading-summary-completion',
  diagramLabel: 'reading-diagram-label',
  shortAnswer: 'reading-short-answer',

  // PTE
  fillBlanksRW: 'fill-in-blanks-rw',
  fillBlanksR: 'fill-in-blanks-r',
  mcqSingle: 'reading-mcq-single',
  mcqMultiple: 'reading-mcq-multiple',
  reorderParagraphs: 'reorder-paragraphs',
} as const;

/** Every IELTS reading type: an IELTS Reading part deals any of them. */
const IELTS_READING_TYPES = [
  READING_TYPES.trueFalse, READING_TYPES.yesNoNotGiven, READING_TYPES.matchingInformation,
  READING_TYPES.mcqSingle, READING_TYPES.mcqMultiple,
  READING_TYPES.sentenceCompletion, READING_TYPES.matchingHeadings, READING_TYPES.matchingFeatures,
  READING_TYPES.sentenceEndings, READING_TYPES.summaryCompletion, READING_TYPES.diagramLabel,
  READING_TYPES.shortAnswer,
];

/** The IELTS Reading part (1-3) a `?type=` key names, as the sidebar links "Part 1". */
export function readingPartOf(syllabusKey?: string | null): number | undefined {
  const match = /^part([123])$/.exec(syllabusKey ?? '');
  return match ? Number(match[1]) : undefined;
}

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

  // Old paragraph-location links are matching information, not headings.
  findparagraph: READING_TYPES.matchingInformation,
  whichparagraphcontainsfollowinginformation: READING_TYPES.matchingInformation,
  // Headings only: never information or sequencing questions, whose names
  // are similar.
  matchheading: READING_TYPES.matchingHeadings,
  matchtheheading: READING_TYPES.matchingHeadings,
  matchheadings: READING_TYPES.matchingHeadings,
  matchingheadings: READING_TYPES.matchingHeadings,
  matchingheading: READING_TYPES.matchingHeadings,
  matchingfeatures: READING_TYPES.matchingFeatures,
  matchingsentenceendings: READING_TYPES.sentenceEndings,
  sentenceendings: READING_TYPES.sentenceEndings,
  summarynotetableflowchartcompletion: READING_TYPES.summaryCompletion,
  summarycompletion: READING_TYPES.summaryCompletion,
  diagramlabelcompletion: READING_TYPES.diagramLabel,
  shortanswerquestions: READING_TYPES.shortAnswer,
  matchinginformation: READING_TYPES.matchingInformation,

  truefalse: READING_TYPES.trueFalse,
  truefalsenotgiven: READING_TYPES.trueFalse,
  yesnonotgiven: READING_TYPES.yesNoNotGiven,

  fillinblanks: READING_TYPES.sentenceCompletion,
  completesentences: READING_TYPES.sentenceCompletion,
  sentencecompletions: READING_TYPES.sentenceCompletion,
  part1: IELTS_READING_TYPES,
  part2: IELTS_READING_TYPES,
  part3: IELTS_READING_TYPES,


  // PTE Reading tasks. The Reading & Writing keys stay so old links and
  // saved mistakes still resolve after the rename to Pearson's current name.
  fillinblanksdropdown: READING_TYPES.fillBlanksRW,
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


/** The sidebar task names behind server type ids, in syllabus order: the reading list's type filter. */
export function readingTypeNames(names: string[], typeIds: string[] = []): string[] {
  return names.filter(name => typeIdsFor(typeKey(name)).some(id => typeIds.includes(id)));
}

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

/** Tasks answered by filling gaps in a text the question carries itself. */
export const isGapFill = (typeId: string): boolean =>
  typeId === READING_TYPES.fillBlanksRW || typeId === READING_TYPES.fillBlanksR;

/**
 * Tasks answered by naming a paragraph, which only works if the passage is
 * printed with its [A]-[J] labels showing.
 */
export const needsParagraphLabels = (typeId: string): boolean =>
  typeId === READING_TYPES.matchingInformation ||
  typeId === READING_TYPES.matchingHeadings;

/**
 * Tasks answered by dragging an entry from a list the set prints once (the
 * headings, the people, the sentence endings) onto each question. On the
 * computer-delivered test these are drag and drop.
 */
export const isListMatching = (typeId: string): boolean =>
  typeId === READING_TYPES.matchingHeadings ||
  typeId === READING_TYPES.matchingFeatures ||
  typeId === READING_TYPES.sentenceEndings;

/**
 * Whether one list entry may answer more than one question. Only matching
 * features allows it ("You may use any option more than once", ielts.org).
 */
export const listAllowsReuse = (typeId: string): boolean => typeId === READING_TYPES.matchingFeatures;

/** Tasks where more than one option may be selected. */
export const isMultiSelect = (typeId: string): boolean =>
  typeId === READING_TYPES.mcqMultiple;

/** Checks if a reading task (by syllabus typeKey, typeId, or typeName) is a multiple-choice task. */
export function isReadingMultipleChoice(typeKeyOrId?: string | null): boolean {
  if (!typeKeyOrId) return false;
  const normalized = typeKeyOrId.toLowerCase().replace(/[^a-z0-9]/g, '');
  return normalized.includes('multiplechoice') || normalized.includes('mcq');
}
