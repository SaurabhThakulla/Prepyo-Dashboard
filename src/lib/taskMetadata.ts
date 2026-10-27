import { ExamType, SkillType } from './types';
import { typeKey, typeLabel } from './syllabus';

export interface TaskMeta {
  code: string;
  name: string;
  skill: SkillType;
  color: string;
  bgLight: string;
  scoreWeight: string;
}

const PTE_TASK_META: Record<string, TaskMeta> = {
  readaloud: {
    code: 'RA',
    name: 'Read Aloud',
    skill: 'speaking',
    color: 'bg-primary text-white',
    bgLight: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
    scoreWeight: 'Score Weight Overall: 4% Speaking: 9%',
  },
  repeatsentence: {
    code: 'RS',
    name: 'Repeat Sentence',
    skill: 'speaking',
    color: 'bg-primary text-white',
    bgLight: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
    scoreWeight: 'Score Weight Overall: 10% Speaking: 15%',
  },
  describeimage: {
    code: 'DI',
    name: 'Describe Image',
    skill: 'speaking',
    color: 'bg-primary text-white',
    bgLight: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
    scoreWeight: 'Score Weight Overall: 5% Speaking: 8%',
  },
  retelllecture: {
    code: 'RL',
    name: 'Re-tell Lecture',
    skill: 'speaking',
    color: 'bg-primary text-white',
    bgLight: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
    scoreWeight: 'Score Weight Overall: 5% Speaking: 8%',
  },
  answershortquestions: {
    code: 'ASQ',
    name: 'Answer Short Questions',
    skill: 'speaking',
    color: 'bg-primary text-white',
    bgLight: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
    scoreWeight: 'Score Weight Overall: 2% Speaking: 3%',
  },
  summarisegroupdiscussion: {
    code: 'SGD',
    name: 'Summarise Group Discussion',
    skill: 'speaking',
    color: 'bg-primary text-white',
    bgLight: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
    scoreWeight: 'Score Weight Overall: 3% Speaking: 5%',
  },
  respondtuasituation: {
    code: 'RTS',
    name: 'Respond to a Situation',
    skill: 'speaking',
    color: 'bg-primary text-white',
    bgLight: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
    scoreWeight: 'Score Weight Overall: 3% Speaking: 5%',
  },
  summarizewrittentext: {
    code: 'SWT',
    name: 'Summarize Written Text',
    skill: 'writing',
    color: 'bg-[#008736] text-white',
    bgLight: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    scoreWeight: 'Score Weight Overall: 5% Writing: 8%',
  },
  writeessay: {
    code: 'WE',
    name: 'Write Essay',
    skill: 'writing',
    color: 'bg-[#008736] text-white',
    bgLight: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    scoreWeight: 'Score Weight Overall: 7% Writing: 12%',
  },
  writeemail: {
    code: 'EMAIL',
    name: 'Write Email',
    skill: 'writing',
    color: 'bg-[#008736] text-white',
    bgLight: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    scoreWeight: 'Score Weight Overall: 7% Writing: 12%',
  },
  repeatedessayquestions: {
    code: 'REQ',
    name: 'Repeated Essay Questions',
    skill: 'writing',
    color: 'bg-[#008736] text-white',
    bgLight: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    scoreWeight: 'Score Weight Overall: 7% Writing: 12%',
  },
  fillinblanksdropdown: {
    code: 'FIB-D',
    name: 'Fill in the Blanks (Dropdown)',
    skill: 'reading',
    color: 'bg-[#ff9900] text-white',
    bgLight: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
    scoreWeight: 'Score Weight Overall: 8% Reading: 13%',
  },
  multipletypemultipleanswer: {
    code: 'MCMA',
    name: 'Multiple Type Multiple Answer',
    skill: 'reading',
    color: 'bg-[#ff9900] text-white',
    bgLight: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
    scoreWeight: 'Score Weight Overall: 3% Reading: 5%',
  },
  reorderparagraph: {
    code: 'RO',
    name: 'Reorder Paragraph',
    skill: 'reading',
    color: 'bg-[#ff9900] text-white',
    bgLight: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
    scoreWeight: 'Score Weight Overall: 4% Reading: 7%',
  },
  readingfillinblanks: {
    code: 'FIB-R',
    name: 'Reading Fill in the Blanks',
    skill: 'reading',
    color: 'bg-[#ff9900] text-white',
    bgLight: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
    scoreWeight: 'Score Weight Overall: 7% Reading: 11%',
  },
  multipletypesingleanswer: {
    code: 'MCSA',
    name: 'Multiple Type Single Answer',
    skill: 'reading',
    color: 'bg-[#ff9900] text-white',
    bgLight: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
    scoreWeight: 'Score Weight Overall: 2% Reading: 4%',
  },
  summarizespokentext: {
    code: 'SST',
    name: 'Summarize Spoken Text',
    skill: 'listening',
    color: 'bg-[#5b6873] text-white',
    bgLight: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    scoreWeight: 'Score Weight Overall: 8% Listening: 12%',
  },
  mcqmultipleanswer: {
    code: 'MCMA',
    name: 'MCQ Multiple Answer',
    skill: 'listening',
    color: 'bg-[#5b6873] text-white',
    bgLight: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    scoreWeight: 'Score Weight Overall: 3% Listening: 5%',
  },
  listeningfillinblanks: {
    code: 'FIB-L',
    name: 'Listening Fill in the Blanks',
    skill: 'listening',
    color: 'bg-[#5b6873] text-white',
    bgLight: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    scoreWeight: 'Score Weight Overall: 7% Listening: 10%',
  },
  highlightcorrectsummary: {
    code: 'HCS',
    name: 'Highlight Correct Summary',
    skill: 'listening',
    color: 'bg-[#5b6873] text-white',
    bgLight: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    scoreWeight: 'Score Weight Overall: 2% Listening: 4%',
  },
  mcqsingleanswer: {
    code: 'MCSA',
    name: 'MCQ Single Answer',
    skill: 'listening',
    color: 'bg-[#5b6873] text-white',
    bgLight: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    scoreWeight: 'Score Weight Overall: 2% Listening: 4%',
  },
  selectmissingword: {
    code: 'SMW',
    name: 'Select Missing Word',
    skill: 'listening',
    color: 'bg-[#5b6873] text-white',
    bgLight: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    scoreWeight: 'Score Weight Overall: 2% Listening: 3%',
  },
  highlightincorrectword: {
    code: 'HIW',
    name: 'Highlight Incorrect Word',
    skill: 'listening',
    color: 'bg-[#5b6873] text-white',
    bgLight: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    scoreWeight: 'Score Weight Overall: 5% Listening: 8%',
  },
  writefromdictation: {
    code: 'WFD',
    name: 'Write from Dictation',
    skill: 'listening',
    color: 'bg-[#5b6873] text-white',
    bgLight: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    scoreWeight: 'Score Weight Overall: 10% Listening: 14%',
  },
};

const IELTS_TASK_META: Record<string, TaskMeta> = {
  introduction: {
    code: 'S-P1',
    name: 'Introduction (Part 1)',
    skill: 'speaking',
    color: 'bg-primary text-white',
    bgLight: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
    scoreWeight: 'Weight: 30% of Speaking Score',
  },
  speakingpart2cuecard: {
    code: 'S-P2',
    name: 'Speaking Part 2 (Cue Card)',
    skill: 'speaking',
    color: 'bg-primary text-white',
    bgLight: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
    scoreWeight: 'Weight: 40% of Speaking Score',
  },
  speakingpart3discussion: {
    code: 'S-P3',
    name: 'Speaking Part 3 (Discussion)',
    skill: 'speaking',
    color: 'bg-primary text-white',
    bgLight: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
    scoreWeight: 'Weight: 30% of Speaking Score',
  },
  describefigure: {
    code: 'W-T1',
    name: 'Describe the Figure (Task 1)',
    skill: 'writing',
    color: 'bg-emerald-600 text-white',
    bgLight: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    scoreWeight: 'Weight: 33% of Writing Band',
  },
  // The key as the sidebar links it: "or" is dropped like "and" and "the".
  opinionagreedisagree: {
    code: 'W-T2',
    name: 'Opinion / Agree or Disagree (Task 2)',
    skill: 'writing',
    color: 'bg-emerald-600 text-white',
    bgLight: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    scoreWeight: 'Weight: 67% of Writing Band',
  },
  // The other Task 2 essay types. The test sets one of them, so each carries
  // the same Task 2 weight.
  discussbothviews: {
    code: 'W-T2',
    name: 'Discuss Both Views (Task 2)',
    skill: 'writing',
    color: 'bg-emerald-600 text-white',
    bgLight: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    scoreWeight: 'Weight: 67% of Writing Band',
  },
  advantagesdisadvantages: {
    code: 'W-T2',
    name: 'Advantages / Disadvantages (Task 2)',
    skill: 'writing',
    color: 'bg-emerald-600 text-white',
    bgLight: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    scoreWeight: 'Weight: 67% of Writing Band',
  },
  problemsolution: {
    code: 'W-T2',
    name: 'Problem / Solution (Task 2)',
    skill: 'writing',
    color: 'bg-emerald-600 text-white',
    bgLight: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    scoreWeight: 'Weight: 67% of Writing Band',
  },
  causeeffect: {
    code: 'W-T2',
    name: 'Cause / Effect (Task 2)',
    skill: 'writing',
    color: 'bg-emerald-600 text-white',
    bgLight: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    scoreWeight: 'Weight: 67% of Writing Band',
  },
  twopartquestion: {
    code: 'W-T2',
    name: 'Two-Part Question (Task 2)',
    skill: 'writing',
    color: 'bg-emerald-600 text-white',
    bgLight: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    scoreWeight: 'Weight: 67% of Writing Band',
  },
};

const EPS_READING = {
  color: 'bg-amber-500 text-white',
  bgLight: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
};
const EPS_LISTENING = {
  color: 'bg-sky-600 text-white',
  bgLight: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
};

/**
 * EPS-TOPIK's sixteen tasks, keyed the way the sidebar links to them. Where a
 * task sits in the test follows HRD Korea's 2025 sample paper; Description to
 * Picture is in the published standard but not that paper, so its share varies.
 */
const EPS_TASK_META: Record<string, TaskMeta> = Object.fromEntries(
  (
    [
      ['R1', 'Picture to Word or Sentence', 'reading', 'Test questions 1–4 · 4 of 40'],
      ['R2', 'Correct Underlined Grammar', 'reading', 'Test questions 5–6 · 2 of 40'],
      ['R3', 'Signs, Notices and Charts', 'reading', 'Test questions 7 & 10 · 2 of 40'],
      ['R4', 'Related Word', 'reading', 'Test questions 8–9 · 2 of 40'],
      ['R5', 'Fill in the Blank', 'reading', 'Test questions 11–16 · 6 of 40'],
      ['R6', 'Word from Description', 'reading', 'Test question 17 · 1 of 40'],
      ['R7', 'Passage Topic', 'reading', 'Test question 18 · 1 of 40'],
      ['R8', 'Matching Statement', 'reading', 'Test questions 19–20 · 2 of 40'],
      ['R9', 'Description to Picture', 'reading', 'In the official standard · count varies'],
      ['L1', 'Choose What You Heard', 'listening', 'Test questions 21–22 · 2 of 40'],
      ['L2', 'Listen and Choose Picture', 'listening', 'Test questions 23–28 · 6 of 40'],
      ['L3', 'Choose the Right Reply', 'listening', 'Test questions 29–32 · 4 of 40'],
      ['L4', 'What Comes Next', 'listening', 'Test question 33 · 1 of 40'],
      ['L5', 'Numbers, Dates and Prices', 'listening', 'Test questions 34–36 · 3 of 40'],
      ['L6', 'Picture Question', 'listening', 'Test question 37 · 1 of 40'],
      ['L7', 'Dialogue Comprehension', 'listening', 'Test questions 38–40 · 3 of 40'],
    ] as const
  ).map(([code, name, skill, scoreWeight]) => [
    typeKey(name),
    { code, name, skill, scoreWeight, ...(skill === 'reading' ? EPS_READING : EPS_LISTENING) },
  ]),
);

const JLPT_VOCABULARY = {
  color: 'bg-violet-600 text-white',
  bgLight: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
};

/**
 * JLPT N5's fourteen problem sets, coded by section: V vocabulary, G grammar,
 * R reading, L listening. The counts are the approximate ones in the Japan
 * Foundation and JEES test guidelines (jlpt.jp/e/guideline/testsections.html).
 */
const JLPT_TASK_META: Record<string, TaskMeta> = Object.fromEntries(
  (
    [
      ['V1', 'Kanji Reading', 'reading', 'Vocabulary · about 7 of 21'],
      ['V2', 'Word Writing', 'reading', 'Vocabulary · about 5 of 21'],
      ['V3', 'Word in Context', 'reading', 'Vocabulary · about 6 of 21'],
      ['V4', 'Same Meaning', 'reading', 'Vocabulary · about 3 of 21'],
      ['G1', 'Grammar Form', 'reading', 'Grammar · about 9 of 17'],
      ['G2', 'Sentence Order', 'reading', 'Grammar · about 4 of 17'],
      ['G3', 'Text Grammar', 'reading', 'Grammar · about 4 of 17'],
      ['R1', 'Short Passage', 'reading', 'Reading · about 2 of 5'],
      ['R2', 'Longer Passage', 'reading', 'Reading · about 2 of 5'],
      ['R3', 'Information Search', 'reading', 'Reading · about 1 of 5'],
      ['L1', 'Task Listening', 'listening', 'Listening · about 7 of 24'],
      ['L2', 'Key Point Listening', 'listening', 'Listening · about 6 of 24'],
      ['L3', 'What Do You Say', 'listening', 'Listening · about 5 of 24'],
      ['L4', 'Quick Response', 'listening', 'Listening · about 6 of 24'],
    ] as const
  ).map(([code, name, skill, scoreWeight]) => [
    typeKey(name),
    {
      code,
      name,
      skill,
      scoreWeight,
      ...(skill === 'listening' ? EPS_LISTENING : code.startsWith('R') ? EPS_READING : JLPT_VOCABULARY),
    },
  ]),
);

const TASK_META: Record<ExamType, Record<string, TaskMeta>> = {
  PTE: PTE_TASK_META,
  IELTS: IELTS_TASK_META,
  EPS_TOPIK: EPS_TASK_META,
  JLPT: JLPT_TASK_META,
};

export function getTaskMetadata(
  exam: ExamType,
  skill: SkillType,
  typeKey?: string | null,
  isMock?: boolean,
): TaskMeta {
  if (isMock) {
    return {
      code: 'MOCK',
      name: `${skill.toUpperCase()} Mock Exam`,
      skill,
      color: 'bg-blue-600 text-white',
      bgLight: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
      scoreWeight: `${exam} ${skill.charAt(0).toUpperCase() + skill.slice(1)} Mock Test`,
    };
  }

  const cleanKey = (typeKey ?? '')
    .toLowerCase()
    .replace(/\b(and|or|the)\b/g, '')
    .replace(/[^a-z0-9]/g, '');

  const map = TASK_META[exam] ?? IELTS_TASK_META;
  if (map[cleanKey]) {
    return map[cleanKey];
  }

  // Fallback by skill
  const skillColors: Record<SkillType, { color: string; bgLight: string }> = {
    speaking: { color: 'bg-rose-500 text-white', bgLight: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' },
    writing: { color: 'bg-emerald-600 text-white', bgLight: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' },
    reading: { color: 'bg-amber-500 text-white', bgLight: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' },
    listening: { color: 'bg-slate-600 text-white', bgLight: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  };

  const skillInfo = skillColors[skill] || skillColors.reading;
  const initial = cleanKey ? cleanKey.slice(0, 3).toUpperCase() : skill.slice(0, 2).toUpperCase();

  return {
    code: initial,
    // The syllabus name ("True / False / Not Given"), not the squashed link key.
    name: typeKey
      ? typeLabel(exam, skill, typeKey) ?? typeKey.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      : `${exam} ${skill} Practice`,
    skill,
    color: skillInfo.color,
    bgLight: skillInfo.bgLight,
    scoreWeight: `Official ${exam} ${skill.charAt(0).toUpperCase() + skill.slice(1)} Practice`,
  };
}
