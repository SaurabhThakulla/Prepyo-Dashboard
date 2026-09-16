import { ExamType } from '@/lib/types';

/**
 * What the reading admin screens share: the tasks that can be authored, the
 * shape a set is drafted in, and the payload the server is sent.
 *
 * One catalogue rather than one per screen — the passage form and the passage
 * detail both add sets, and a task offered by one and not the other is how the
 * two drift apart.
 */

/**
 * How a task's answer is chosen, which decides the editor a question gets.
 * Mirrors the server's own grouping in internal/admin/reading.go — the server
 * validates all of this again, because a form cannot be trusted with an answer
 * key.
 */
export type AnswerStyle = 'choice' | 'multi' | 'verdict' | 'paragraph' | 'text' | 'blanks' | 'reorder' | 'boxes';

export interface TaskType {
  id: string;
  name: string;
  style: AnswerStyle;
  exam: ExamType | 'both';
  /** Fixed answers for verdict tasks, which the author picks between. */
  verdicts?: string[];
  /** Gaps answered from one list shared by the set, rather than their own choices. */
  wordBank?: boolean;
  /** The set may carry a list, the way a summary is completed from words A-H. */
  optionalWordBank?: boolean;
  hint?: string;
  /** The instruction line as the real paper words it, shown as a placeholder. */
  instructionsHint?: string;
  mockOnly?: boolean;
}

export const examsFor = (type: TaskType): ExamType[] =>
  type.exam === 'both' ? ['PTE', 'IELTS'] : [type.exam];

/**
 * The tasks that can be authored, named exactly as the learner's dashboard
 * names them.
 *
 * The two lists are the same list: a heading a learner can practise but nobody
 * can author is a dead end in the menu, and a task authored under a name the
 * dashboard never shows is content nobody will find. readingTasks.test.ts holds
 * them to it.
 *
 * Multiple Choice is one task here as it is there. Whether a question takes one
 * answer or several is a property of the question — groupPayload picks the
 * server type from the answer key rather than making the author choose twice.
 */
export const TASK_TYPES: TaskType[] = [
  {
    id: 'reading-mcq-single',
    name: 'Multiple Choice',
    style: 'multi',
    exam: 'both',
    hint: 'Tick every correct option. A question with one ticked is a single-answer question; with several, a multiple-answer one.',
    instructionsHint: 'Choose the correct letter, A, B, C or D.',
  },
  {
    id: 'reading-true-false',
    name: 'True / False / Not Given',
    style: 'verdict',
    exam: 'IELTS',
    verdicts: ['True', 'False', 'Not Given'],
    instructionsHint: 'Do the following statements agree with the information given in the passage?',
  },
  {
    id: 'reading-yes-no-not-given',
    name: 'Yes / No / Not Given',
    style: 'verdict',
    exam: 'IELTS',
    verdicts: ['Yes', 'No', 'Not Given'],
    instructionsHint: 'Do the following statements agree with the views of the writer?',
  },
  {
    id: 'reading-find-the-paragraph',
    name: 'Find the paragraph',
    style: 'paragraph',
    exam: 'IELTS',
    instructionsHint: 'The passage has seven paragraphs, A-G. Which paragraph contains the following information?',
  },
  {
    id: 'reading-sentence-completion',
    name: 'Fill in the Blanks',
    style: 'text',
    exam: 'IELTS',
    optionalWordBank: true,
    hint: 'Write the sentence with ______ where the gap goes. Leave the list empty for typed answers; fill it in and every gap is completed from it, the way a summary is completed from words A-H.',
    instructionsHint: 'Complete the summary below. Write ONE WORD ONLY from the passage in each gap.',
  },
  {
    id: 'fill-in-blanks-rw',
    name: 'Reading & Writing: Fill in the Blanks',
    style: 'blanks',
    exam: 'PTE',
    hint: 'Rewrite a part of the passage with gaps, each written [[b1]], [[b2]] … Every gap gets its own dropdown choices.',
    instructionsHint: 'Below is a text with blanks. Select the appropriate answer choice for each blank.',
  },
  {
    id: 'fill-in-blanks-r',
    name: 'Reading: Fill in the Blanks',
    style: 'blanks',
    exam: 'PTE',
    wordBank: true,
    hint: 'Gaps are filled by dragging from one word list. List more words than gaps — the extras are the distractors.',
    instructionsHint: 'Drag words from the box below to the appropriate place in the text.',
  },
  {
    id: 'reading-arrange-passage',
    name: 'Match the Heading',
    style: 'boxes',
    exam: 'IELTS',
    mockOnly: true,
    hint: 'Write each box as its own line. The questions name the positions in order, and each one is answered with the box that belongs there.',
    instructionsHint: 'The boxes below summarise stages in the passage but are printed out of order.',
  },
  {
    // Not a set on a passage: an item carries its own boxes, so this opens the
    // re-order form instead of the set editor.
    id: 'reorder-paragraphs',
    name: 'Re-order Paragraphs',
    style: 'reorder',
    exam: 'PTE',
  },
];

export interface DraftBlank {
  id: string;
  options: string[];
  correctAnswer: string;
}

export interface DraftQuestion {
  prompt: string;
  options: string[];
  correctAnswers: string[];
  explanation: string;
  contextPassage: string;
  blanks: DraftBlank[];
}

export interface DraftGroup {
  typeId: string;
  instructions: string;
  boxTitle: string;
  questions: DraftQuestion[];
  wordBank: string[];
  exams: ExamType[];
  boxes: string[];
}

/** Mirrors reading_passages_word_count_floor: below this a passage cannot
 *  carry three task types, and the database refuses it. */
export const MIN_WORDS = 700;

export const emptyQuestion = (): DraftQuestion => ({
  prompt: '',
  options: ['', ''],
  correctAnswers: [],
  explanation: '',
  contextPassage: '',
  blanks: [],
});

export const emptyGroup = (typeId: string, exams: ExamType[] = []): DraftGroup => {
  const type = TASK_TYPES.find(entry => entry.id === typeId);
  const allowed = type ? examsFor(type) : [];
  const wanted = exams.filter(exam => allowed.includes(exam));
  return {
    typeId,
    instructions: '',
    boxTitle: '',
    questions: [emptyQuestion()],
    wordBank: [],
    exams: wanted.length > 0 ? wanted : allowed,
    boxes: ['', ''],
  };
};

/** The gaps a gapped text declares, in the order they are read. */
export const gapsIn = (text: string): string[] => {
  const ids: string[] = [];
  for (const match of text.matchAll(/\[\[(b\d+)\]\]/g)) {
    if (!ids.includes(match[1])) ids.push(match[1]);
  }
  return ids;
};

/** A, B, C … the labels the server will assign, shown live so the author can
 *  see which paragraph a matching answer refers to before saving. */
export const labelFor = (index: number) =>
  index < 26 ? String.fromCharCode(65 + index) : String.fromCharCode(64 + Math.floor(index / 26)) + String.fromCharCode(65 + (index % 26));


/**
 * One drafted set as the server takes it.
 *
 * Multiple choice is offered as one task and stored as two: a set where any
 * question has more than one correct answer is a multiple-answer set, which is
 * what the grader and the practice menu both key off.
 */
export const groupPayload = (group: DraftGroup) => ({
  typeId:
    group.typeId === 'reading-mcq-single' &&
    group.questions.some(question => question.correctAnswers.filter(Boolean).length > 1)
      ? 'reading-mcq-multiple'
      : group.typeId,
  instructions: group.instructions,
  boxTitle: group.boxTitle,
  exams: group.exams,
  boxes: group.boxes.map(box => box.trim()).filter(Boolean),
  wordBank: group.wordBank.map(word => word.trim()).filter(Boolean),
  questions: group.questions.map(question => {
    const gaps = gapsIn(question.contextPassage);
    return {
      prompt: question.prompt,
      options: question.options.map(option => option.trim()).filter(Boolean),
      correctAnswers: question.correctAnswers.filter(Boolean),
      explanation: question.explanation,
      contextPassage: question.contextPassage,
      // A key for a gap that has since been deleted from the text is rejected
      // by the server, and rightly: it grades nothing.
      blanks: question.blanks
        .filter(blank => gaps.includes(blank.id))
        .map(blank => ({
          id: blank.id,
          options: blank.options.map(option => option.trim()).filter(Boolean),
          correctAnswer: blank.correctAnswer.trim(),
        })),
    };
  }),
});
