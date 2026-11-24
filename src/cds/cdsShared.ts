import { useQuery } from '@tanstack/react-query';
import { useApp } from '@/context/AppContext';
import { Mock, MockAttempt, MockPaperItem, Question } from '@/lib/types';
import { CdsAttempt, CdsPaper, CdsPaperType, CdsQuestion, CdsTrack, NccWing, cdsApi } from './cdsApi';
import { NCC_SUBTASKS } from './nccSubtasks';

/**
 * CDS keeps its own backend (/api/v1/cds); these turn its papers, questions,
 * attempts and mistakes into the shapes the shared screens use, so a CDS paper
 * is sat in the same mock runner and shows in the same lists as every exam.
 */

type CdsOnlyPaper = 'english' | 'gk' | 'maths';

/** CDS's three papers; each is out of 100 marks (UPSC CDS notice). */
export const CDS_PAPERS: { type: CdsOnlyPaper; name: string; detail: string; marks: number }[] = [
  { type: 'english', name: 'English', detail: '120 questions in 2 hours', marks: 100 },
  { type: 'gk', name: 'General Knowledge', detail: '120 questions in 2 hours', marks: 100 },
  { type: 'maths', name: 'Elementary Mathematics', detail: '100 questions in 2 hours', marks: 100 },
];

/** NCC's three wings: the common subjects are the same; the wing decides the specialised ones. */
export const NCC_WINGS: { id: NccWing; label: string; detail: string }[] = [
  { id: 'army', label: 'Army Wing', detail: 'Map reading, field craft, military history' },
  { id: 'navy', label: 'Naval Wing', detail: 'Seamanship, naval communication, navigation' },
  { id: 'air', label: 'Air Wing', detail: 'Principles of flight, air campaigns, aero modelling' },
];

/** NCC's papers: the two practice banks and the full B and C certificate mocks. */
export const NCC_PAPERS: { type: CdsPaperType; name: string; detail: string }[] = [
  { type: 'ncc_common', name: 'Common Subjects', detail: '120 questions in a full paper' },
  { type: 'ncc_army', name: 'Army Wing Subjects', detail: '55 questions in a full paper' },
  { type: 'ncc_navy', name: 'Naval Wing Subjects', detail: '55 questions in a full paper' },
  { type: 'ncc_air', name: 'Air Wing Subjects', detail: '55 questions in a full paper' },
  { type: 'ncc_b', name: "'B' Certificate", detail: '175 questions in 3 hours' },
  { type: 'ncc_c', name: "'C' Certificate", detail: '175 questions in 3 hours' },
];

/** The exam a paper type belongs to: NCC for the ncc_ papers, UPSC CDS otherwise. */
export const cdsExamOf = (type?: string | null): 'CDS' | 'NCC' => (type?.startsWith('ncc_') ? 'NCC' : 'CDS');

/** The two routes through CDS, as the switch on Home and the onboarding offer them. */
export const CDS_TRACKS: { id: CdsTrack; label: string; detail: string }[] = [
  { id: 'ima', label: 'IMA · INA · AFA', detail: '3 papers' },
  { id: 'ota', label: 'OTA', detail: '2 papers, no Maths' },
];

/** A set's level: its most common question level, the harder one on a tie. */
export function setLevel(levels: string[]): 'easy' | 'medium' | 'hard' | undefined {
  const order = ['hard', 'medium', 'easy'] as const;
  const count = (level: string) => levels.filter(l => l === level).length;
  return order.reduce<(typeof order)[number] | undefined>((best, level) => (count(level) > (best ? count(best) : 0) ? level : best), undefined);
}

/** A name for a set from what it is about: its passage or first question, in one short line. */
export function setName(text: string): string {
  const line = cdsText(text)
    .replace(/__/g, '')
    .replace(/\s*\([a-d]\)\s*\/?/g, ' ') // spotting-errors part markers
    .replace(/^(S\d|[PQRS]):\s*/, '') // a sentence-ordering label
    .split('\n')[0]
    .split(/(?<=[.?!])\s/)[0]
    .replace(/\s+/g, ' ')
    .trim();
  return line.length > 72 ? `${line.slice(0, 71).trimEnd()}…` : line;
}

/** The papers a track sits: OTA has no Elementary Mathematics. */
export const cdsPapersFor = (track: CdsTrack) =>
  track === 'ota' ? CDS_PAPERS.filter(paper => paper.type !== 'maths') : CDS_PAPERS;

export interface CdsSubtask {
  key: string;
  name: string;
  /** What the learner does, as the practice hub card says it. */
  detail: string;
  /** How many questions of it a paper usually has. */
  weight: string;
  /** The topic names stored on CDS questions that belong to it. */
  topics: string[];
  /** The heading it is listed under when that is not its paper: an NCC subject. */
  group?: string;
  /** What that heading is worth, shown beside it: an NCC subject's B and C marks. */
  groupNote?: string;
}

/**
 * Each paper's question types, as the UPSC papers set them, with their usual
 * share of the paper. Practice offers them one type at a time, as PTE's tasks.
 */
export const CDS_SUBTASKS: Record<CdsOnlyPaper, CdsSubtask[]> = {
  english: [
    { key: 'spotting-errors', name: 'Spotting Errors', weight: '10–15 Qs', topics: ['Spotting Errors'],
      detail: 'A sentence in parts (a), (b), (c) and (d) No error: find the part with the grammatical error.' },
    { key: 'ordering-words', name: 'Ordering of Words (PQRS)', weight: '10 Qs', topics: ['Ordering of Sentences'],
      detail: 'Words or phrases of a sentence jumbled as P, Q, R, S: put them in order.' },
    { key: 'ordering-sentences', name: 'Ordering of Sentences (S1 & S6)', weight: '10 Qs', topics: [],
      detail: 'S1 and S6 are fixed: arrange the four sentences between them into a coherent paragraph.' },
    { key: 'comprehension', name: 'Reading Comprehension', weight: '10–15 Qs', topics: ['Reading Comprehension'],
      detail: 'Short passages with questions on main idea, inference, tone and vocabulary.' },
    { key: 'cloze', name: 'Cloze Composition', weight: '10–15 Qs', topics: ['Cloze Test', 'Cloze Composition'],
      detail: 'A passage with numbered gaps: pick the best word for each from four options.' },
    { key: 'idioms', name: 'Idioms and Phrases', weight: '10 Qs', topics: ['Idioms and Phrases'],
      detail: 'Pick the meaning of an idiom, or its correct use in a sentence.' },
    { key: 'synonyms-antonyms', name: 'Synonyms & Antonyms', weight: '10–20 Qs', topics: ['Synonyms', 'Antonyms'],
      detail: 'A word is underlined in a sentence: pick the nearest or most opposite meaning.' },
    { key: 'parts-of-speech', name: 'Parts of Speech', weight: '10 Qs', topics: ['Parts of Speech'],
      detail: 'Name the part of speech of the underlined word: gerund, participle, adverb and so on.' },
    { key: 'fill-blanks', name: 'Fill in the Blanks / Prepositions', weight: '10 Qs', topics: ['Prepositions & Determiners', 'Vocabulary & Usage'],
      detail: 'Sentences missing a preposition, phrasal verb, conjunction or word.' },
    { key: 'paired-words', name: 'Usage of Paired Words', weight: '5–10 Qs', topics: ['Paired Words'],
      detail: 'Easily confused pairs: stationary or stationery, affect or effect, compliment or complement.' },
  ],
  gk: [
    { key: 'science', name: 'General Science', weight: '28–32 Qs',
      topics: ['General Science - Physics', 'General Science - Chemistry', 'General Science - Biology'],
      detail: 'Physics, chemistry and biology at class 9–12 level: optics, circuits, acids, cells, diseases.' },
    { key: 'polity', name: 'Indian Polity & Constitution', weight: '18–22 Qs', topics: ['Indian Polity'],
      detail: 'Fundamental rights and duties, Parliament, courts, the Election Commission, key amendments.' },
    { key: 'history', name: 'Indian History', weight: '18–20 Qs', topics: ['Modern Indian History', 'Ancient History', 'Medieval History'],
      detail: 'Modern history most: 1857, the freedom struggle; then ancient and medieval India.' },
    { key: 'geography', name: 'Geography', weight: '18–22 Qs', topics: ['Physical Geography', 'Indian Geography'],
      detail: 'Physical and Indian geography: winds, currents, rivers, monsoons, passes, maps.' },
    { key: 'defence', name: 'Defence & Military Affairs', weight: '8–12 Qs', topics: ['Defence Awareness'],
      detail: 'Joint exercises, missiles, aircraft and ships, ranks, gallantry awards, commands.' },
    { key: 'economy', name: 'Economy & Current Affairs', weight: '15–20 Qs', topics: ['Economy', 'Current Affairs'],
      detail: 'Repo rate, inflation, the budget, summits, sports and awards of the last months.' },
  ],
  maths: [
    { key: 'arithmetic', name: 'Number System & Arithmetic', weight: '25–30 Qs',
      topics: ['Number Theory', 'Arithmetic - Profit & Loss', 'Time, Speed & Distance'],
      detail: 'Divisibility, remainders, LCM and HCF, percentages, profit and loss, ratio, work, speed.' },
    { key: 'geometry', name: 'Geometry', weight: '18–22 Qs', topics: ['Geometry - Circles', 'Coordinate Geometry'],
      detail: 'Lines and angles, triangles and their centres, circles, chords and tangents.' },
    { key: 'algebra', name: 'Algebra', weight: '15–20 Qs', topics: ['Algebra', 'Linear Equations'],
      detail: 'Factorising, linear and quadratic equations, the standard identities.' },
    { key: 'trigonometry', name: 'Trigonometry', weight: '12–15 Qs', topics: ['Trigonometry'],
      detail: 'Ratios and standard values, identities, heights and distances.' },
    { key: 'mensuration', name: 'Mensuration (2D & 3D)', weight: '12–15 Qs', topics: ['Mensuration'],
      detail: 'Areas and perimeters; surface areas and volumes of solids.' },
    { key: 'statistics', name: 'Statistics', weight: '6–8 Qs', topics: ['Statistics'],
      detail: 'Mean, median and mode; frequency polygons, histograms and charts.' },
  ],
};

/** The paper and question type behind a practice link's ?type= key. */
const ALL_SUBTASKS: Partial<Record<CdsPaperType, CdsSubtask[]>> = { ...CDS_SUBTASKS, ...NCC_SUBTASKS };

export function cdsSubtask(key: string | null): { paper: CdsPaperType; subtask: CdsSubtask } | null {
  for (const paper of Object.keys(ALL_SUBTASKS) as CdsPaperType[]) {
    const subtask = ALL_SUBTASKS[paper]?.find(s => s.key === key);
    if (subtask) return { paper, subtask };
  }
  return null;
}

export const cdsPaperName = (type?: string) =>
  [...CDS_PAPERS, ...NCC_PAPERS].find(p => p.type === type)?.name ?? (cdsExamOf(type) === 'NCC' ? 'NCC' : 'CDS');

/** The most a paper can score: a full mark for every question. */
export const cdsMaxMarks = (paper?: CdsPaper) =>
  paper ? Math.round(paper.totalQuestions * paper.correctMark * 100) / 100 : 0;

const SUPERSCRIPT: Record<string, string> = {
  0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '-': '⁻', n: 'ⁿ',
};
const SUBSCRIPT: Record<string, string> = {
  0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉',
};
const script = (text: string, map: Record<string, string>, mark: string) =>
  [...text].every(c => map[c]) ? [...text].map(c => map[c]).join('') : `${mark}(${text})`;

const SYMBOLS: [RegExp, string][] = [
  [/\\(?:times)/g, '×'], [/\\cdot/g, '·'], [/\\equiv/g, '≡'], [/\\implies/g, '⇒'], [/\^?\\circ/g, '°'],
  [/\\pi/g, 'π'], [/\\theta/g, 'θ'], [/\\pm/g, '±'], [/\\neq/g, '≠'], [/\\leq?/g, '≤'], [/\\geq?/g, '≥'],
  [/\\(sin|cos|tan|cot|sec|cosec|log)/g, '$1 '], [/\\(?:quad|,|;|!)/g, ' '], [/\\left|\\right/g, ''],
];

/** One $…$ run as readable text: x^{3} → x³, \frac{1}{2} → 1/2, \theta → θ. */
function mathToText(expr: string): string {
  let s = expr
    .replace(/\\text\{([^{}]*)\}/g, '$1')
    .replace(/\\pmod\{?\s*([0-9a-zA-Z]+)\}?/g, ' (mod $1)')
    .replace(/\\sqrt\{([^{}]*)\}/g, (_, x: string) => (/^\w+$/.test(x) ? `√${x}` : `√(${x})`));
  for (const [pattern, out] of SYMBOLS) s = s.replace(pattern, out);
  // Powers before fractions, so 1/x³ needs no brackets.
  s = s
    .replace(/\^\{([^{}]*)\}|\^(\w)/g, (_, a?: string, b?: string) => script(a ?? b ?? '', SUPERSCRIPT, '^'))
    .replace(/_\{([^{}]*)\}|_(\w)/g, (_, a?: string, b?: string) => script(a ?? b ?? '', SUBSCRIPT, '_'));
  // Innermost fractions first, so \frac{1}{\frac{a}{b}} unwinds.
  const plain = /^[\w√.θπ⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ⁿ₀₁₂₃₄₅₆₇₈₉]+$/;
  for (let i = 0; i < 3; i++) {
    s = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, (_, a: string, b: string) => {
      const wrap = (x: string) => (plain.test(x.trim()) ? x.trim() : `(${x.trim()})`);
      return `${wrap(a)}/${wrap(b)}`;
    });
  }
  return s.replace(/[{}]/g, '').replace(/\\/g, '').replace(/ {2,}/g, ' ').trim();
}

/**
 * Stored CDS text as plain text the shared screens show as is: "\n" escapes as
 * line breaks, LaTeX ($…$) as symbols, and **word** as __word__, which they
 * underline (the "underlined word" a synonym question points at).
 */
export function cdsText(raw?: string | null): string {
  if (!raw) return '';
  return raw
    // Windows line breaks (the bank's migration was written with them) as plain ones.
    .replace(/\r\n?/g, '\n')
    .replace(/\\\\/g, '\u0000')
    .replace(/\\n/g, '\n')
    .replace(/\u0000/g, '\\')
    .replace(/\$([^$]+)\$/g, (_, expr: string) => mathToText(expr))
    // A blank (______) as full-width lines: underscores would read as an underline mark.
    .replace(/_{3,}/g, '＿＿＿＿')
    .replace(/\*\*([^*]+)\*\*/g, '__$1__');
}

/** The question and the text it is about, split where the paper leaves a blank line. */
function splitStimulus(stimulus: string): { prompt: string; passage?: string } {
  const text = cdsText(stimulus);
  const gap = text.indexOf('\n\n');
  if (gap < 0) return { prompt: text };
  return { prompt: text.slice(0, gap).trim(), passage: text.slice(gap + 2).trim() };
}

export function cdsQuestion(q: CdsQuestion, paperType?: CdsPaperType): Question {
  const { prompt, passage } = splitStimulus(q.stimulus);
  return {
    id: q.id,
    examVersionId: '',
    exam: cdsExamOf(paperType),
    skill: 'reading',
    typeId: `cds-${q.topic}`,
    typeName: q.topic,
    title: `Question ${q.questionNumber}`,
    prompt,
    contextPassage: passage,
    imageUrl: q.imageUrl ?? undefined,
    // The paper's pace: 120 questions in 2 hours, Maths 100.
    timeLimitSeconds: paperType === 'maths' ? 72 : 60,
    options: (['A', 'B', 'C', 'D'] as const).map(id => ({ id, text: cdsText(q[`option${id}`]) })),
    difficulty: q.difficulty ?? 'medium',
    tags: [q.topic],
    points: 1,
    correctAnswers: q.correctOption ? [q.correctOption] : undefined,
    explanation: q.explanation ? cdsText(q.explanation) : undefined,
  };
}

export function cdsMock(paper: CdsPaper): Mock {
  const name = cdsPaperName(paper.paperType);
  const exam = cdsExamOf(paper.paperType);
  return {
    id: paper.id,
    examVersionId: '',
    exam,
    title: paper.title,
    description:
      exam === 'NCC'
        ? `${paper.totalQuestions} questions in ${paper.durationMinutes} minutes, the written paper only. 2 marks for a right answer, half a mark off for a wrong one; a skipped question costs nothing.`
        : `${paper.totalQuestions} ${name} questions in ${paper.durationMinutes} minutes. A wrong answer costs a third of a right one; a skipped question costs nothing.`,
    totalDurationMinutes: paper.durationMinutes,
    totalQuestions: paper.totalQuestions,
    isDiagnostic: false,
    isGenerated: false,
    sections: [{ id: paper.id, name, skill: 'reading', durationMinutes: paper.durationMinutes, questionIds: [] }],
  };
}

/** A finished attempt as a mock result: the score is the net marks, after the penalty. */
export function cdsMockAttempt(attempt: CdsAttempt, paper?: CdsPaper): MockAttempt {
  return {
    id: attempt.id,
    mockId: attempt.paperId,
    examVersionId: '',
    exam: cdsExamOf(paper?.paperType ?? attempt.paperType),
    userScore: attempt.netScore,
    skillScores: {},
    totalCorrect: attempt.totalCorrect,
    totalQuestions: paper?.totalQuestions ?? attempt.totalAttempted,
    durationSeconds: attempt.timeSpentSeconds,
    completedAt: attempt.submittedAt ?? attempt.startedAt,
  };
}

/** Papers as the shared paper list shows them, numbered in their own order. */
export function cdsPaperItems(papers: CdsPaper[], attempts: CdsAttempt[]): MockPaperItem[] {
  return papers.map((paper, index) => {
    const done = attempts.filter(a => a.paperId === paper.id && a.status === 'completed');
    const last = done[0];
    return {
      id: paper.id,
      exam: cdsExamOf(paper.paperType),
      section: paper.paperType,
      module: '',
      number: index + 1,
      revision: 1,
      title: paper.title,
      status: last ? 'completed' : 'not_started',
      attemptId: last?.id,
      score: last ? last.netScore : null,
      lastAttemptAt: last?.submittedAt,
      attemptCount: done.length,
      isUpdated: false,
      levels: paper.levels,
    };
  });
}

export const cdsKeys = {
  papers: (exam: 'CDS' | 'NCC') => ['cds', 'papers', exam] as const,
  attempts: ['cds', 'attempts'] as const,
  attempt: (id: string) => ['cds', 'attempt', id] as const,
  mistakes: ['cds', 'mistakes'] as const,
  track: ['cds', 'track'] as const,
  sets: ['cds', 'sets'] as const,
};

/** The cadet's NCC wing; the Army Wing's until they choose another. */
export function useNccWing(enabled: boolean): NccWing {
  const { data } = useQuery({ queryKey: cdsKeys.track, queryFn: cdsApi.getTrack, enabled });
  return data?.wing ?? 'army';
}

/** The learner's CDS track; IMA, INA and AFA's until they choose OTA. */
export function useCdsTrack(enabled: boolean): CdsTrack {
  const { data } = useQuery({ queryKey: cdsKeys.track, queryFn: cdsApi.getTrack, enabled });
  return data?.track ?? 'ima';
}

/** The exam in the cds schema being studied: NCC when it is the active exam, UPSC CDS otherwise. */
export function useCdsExam(): 'CDS' | 'NCC' {
  return useApp().activeExam === 'NCC' ? 'NCC' : 'CDS';
}

/**
 * The active exam's papers (CDS or NCC) and finished attempts, in the shared shapes;
 * nothing is fetched unless enabled. NCC's mocks are its B and C papers only: its
 * practice banks are practised by type, not sat whole.
 */
export function useCdsMocks(enabled: boolean) {
  const exam = useCdsExam();
  const papers = useQuery({ queryKey: cdsKeys.papers(exam), queryFn: () => cdsApi.getPapers(exam), enabled });
  const attempts = useQuery({ queryKey: cdsKeys.attempts, queryFn: cdsApi.getAttempts, enabled });
  const ofExam = new Set((papers.data?.papers ?? []).map(p => p.id));
  const finished = (attempts.data?.attempts ?? []).filter(a => a.status === 'completed' && ofExam.has(a.paperId));
  const wing = useNccWing(enabled && exam === 'NCC');
  // An NCC mock's wing is its id's suffix (ncc_b_mock_1_navy); none is the Army Wing's.
  const wingOf = (id: string) => (id.endsWith('_navy') ? 'navy' : id.endsWith('_air') ? 'air' : 'army');
  const mockPapers = (papers.data?.papers ?? []).filter(p =>
    exam === 'CDS' || ((p.paperType === 'ncc_b' || p.paperType === 'ncc_c') && wingOf(p.id) === wing));
  return {
    papers: papers.data?.papers ?? [],
    mockPapers,
    plan: papers.data?.plan,
    attempts: finished,
    mocks: mockPapers.map(cdsMock),
    mockAttempts: finished.map(a => cdsMockAttempt(a, papers.data?.papers.find(p => p.id === a.paperId))),
    isPending: enabled && (papers.isPending || attempts.isPending),
    error: papers.error ?? attempts.error,
  };
}

/** The exam a practice set belongs to, from its question type or paper:<type>. */
const setExam = (practice: string) =>
  cdsExamOf(practice.startsWith('paper:') ? practice.slice('paper:'.length) : cdsSubtask(practice)?.paper);

/** The learner's submitted practice sets of the active exam (CDS or NCC), newest first. */
export function useCdsSets(enabled: boolean) {
  const exam = useCdsExam();
  return useQuery({
    queryKey: cdsKeys.sets,
    queryFn: cdsApi.getSets,
    enabled,
    select: data => (data.sets ?? []).filter(set => setExam(set.practice) === exam),
  });
}

/** What a set practised, and the link that reopens it marked. */
export function cdsSetLink(practice: string, setNumber: number, id: string): { name: string; href: string } {
  const paper = practice.startsWith('paper:') ? practice.slice('paper:'.length) : null;
  const source = paper ? `paper=${paper}` : `type=${practice}`;
  return {
    name: paper ? `${cdsPaperName(paper)}: all types` : cdsSubtask(practice)?.subtask.name ?? practice,
    href: `/practice?skill=reading&${source}&set=${setNumber}&review=${id}`,
  };
}


