import { SkillType } from '@/lib/types';

export interface TutorialVideo {
  id: string;
  title: string;
  youtubeId: string;
  exam: 'IELTS' | 'PTE' | 'both';
  skill: SkillType;
  duration: string;
  instructor: string;
  level: string;
  description: string;
  keyTakeaways: string[];
  practiceUrl: string;
  mockUrl: string;
}

export const TUTORIAL_VIDEOS: TutorialVideo[] = [
  // ── IELTS Speaking ──
  {
    id: 'ielts-speaking-band9-strategy',
    title: 'IELTS Speaking: Band 9 Interview Walkthrough & Strategy',
    youtubeId: 'sRFEVPrYn0U',
    exam: 'IELTS',
    skill: 'speaking',
    duration: '18:45',
    instructor: 'IELTS Advantage',
    level: 'Band 7.5 - 9.0',
    description: 'Learn the exact 4 scoring criteria examiners look for: Fluency & Coherence, Lexical Resource, Grammatical Range, and Pronunciation. Includes live interview breakdowns.',
    keyTakeaways: [
      'Extend answers naturally using the "Reason + Example + Contrast" framework.',
      'Avoid memorized templates; focus on authentic idioms and collocations.',
      'Maintain steady pronunciation rhythm without artificial accent modulation.',
      'In Part 2, structure your 1-minute prep using a 4-point bullet outline.',
    ],
    practiceUrl: '/practice?skill=speaking',
    mockUrl: '/practice?skill=speaking&mock=1',
  },
  {
    id: 'ielts-speaking-part2-cue-card',
    title: 'IELTS Speaking Part 2: 2-Minute Cue Card Masterclass',
    youtubeId: '4Z8pGk8Yt7g',
    exam: 'IELTS',
    skill: 'speaking',
    duration: '14:20',
    instructor: 'IELTS Daily',
    level: 'All Levels',
    description: 'Master the 1-minute preparation window and speak confidently for the full 2 minutes without pausing or running out of ideas.',
    keyTakeaways: [
      'Write keywords only during prep time—never write full sentences.',
      'Use the past-present-future timeline technique to expand details effortlessly.',
      'Transition smoothly between bullet points using discourse markers.',
    ],
    practiceUrl: '/practice?skill=speaking',
    mockUrl: '/practice?skill=speaking&mock=1',
  },

  // ── IELTS Writing ──
  {
    id: 'ielts-writing-task2-essay',
    title: 'IELTS Writing Task 2: Step-by-Step Band 9 Essay Guide',
    youtubeId: '1tZpP2v6F6Q',
    exam: 'IELTS',
    skill: 'writing',
    duration: '24:10',
    instructor: 'IELTS Advantage',
    level: 'Band 7.0+',
    description: 'The definitive guide to writing Agree/Disagree, Discuss Both Views, and Problem-Solution essays with clean 4-paragraph structure.',
    keyTakeaways: [
      'Spend 5 minutes planning thesis and main body arguments before writing.',
      'Introduction: Paraphrase prompt (1 sentence) + Clear thesis statement (1 sentence).',
      'Body paragraphs: Topic sentence + Explanation + Concrete supporting evidence.',
      'Conclusion: Restate thesis with synonymous phrasing—no new ideas.',
    ],
    practiceUrl: '/practice?skill=writing',
    mockUrl: '/practice?skill=writing&mock=1',
  },
  {
    id: 'ielts-writing-task1-charts',
    title: 'IELTS Academic Writing Task 1: Complete Graph & Chart Formula',
    youtubeId: 'm0Q2Qx2W7w8',
    exam: 'IELTS',
    skill: 'writing',
    duration: '21:15',
    instructor: 'Fastrack IELTS',
    level: 'Band 6.5 - 9.0',
    description: 'How to write high-scoring overviews, select key trends, group data logically, and avoid data dumps on bar charts, line graphs, and tables.',
    keyTakeaways: [
      'The Overview is mandatory for Band 7+; highlight 2-3 main trends or extremes.',
      'Group data by category or time period instead of describing every single number.',
      'Vary trend vocabulary: peaked at, fluctuated, plateaued, surged, dipped.',
    ],
    practiceUrl: '/practice?skill=writing',
    mockUrl: '/practice?skill=writing&mock=1',
  },

  // ── IELTS Reading ──
  {
    id: 'ielts-reading-true-false-notgiven',
    title: 'IELTS Reading: True / False / Not Given & Yes / No Tricks',
    youtubeId: 'K1p_q_f29eM',
    exam: 'IELTS',
    skill: 'reading',
    duration: '16:30',
    instructor: 'IELTS Advantage',
    level: 'All Levels',
    description: 'Demystifying the hardest question type in IELTS Reading. Learn the exact difference between FALSE and NOT GIVEN with real passage examples.',
    keyTakeaways: [
      'TRUE: Statement agrees 100% with the passage facts.',
      'FALSE: Passage directly contradicts the statement (the opposite is stated).',
      'NOT GIVEN: The text neither confirms nor contradicts the statement.',
      'Questions follow chronological order through the passage text.',
    ],
    practiceUrl: '/practice?skill=reading',
    mockUrl: '/practice?skill=reading&mock=1',
  },
  {
    id: 'ielts-reading-heading-matching',
    title: 'IELTS Reading: Matching Headings & Skimming Strategy',
    youtubeId: 'hXbN9T_1gQw',
    exam: 'IELTS',
    skill: 'reading',
    duration: '18:50',
    instructor: 'Fastrack IELTS',
    level: 'Intermediate - Advanced',
    description: 'Save precious test minutes by learning how to find main paragraph ideas without reading word-for-word.',
    keyTakeaways: [
      'Do Matching Headings first before detailed question types for that passage.',
      'Read the headings list first, underline key distinct features and nouns.',
      'Read the first 2 sentences and concluding sentence of each paragraph for main idea.',
    ],
    practiceUrl: '/practice?skill=reading',
    mockUrl: '/practice?skill=reading&mock=1',
  },

  // ── IELTS Listening ──
  {
    id: 'ielts-listening-top10-traps',
    title: 'IELTS Listening: 10 Common Traps & How to Avoid Them',
    youtubeId: 'N1eM9Y6bZg8',
    exam: 'IELTS',
    skill: 'listening',
    duration: '20:15',
    instructor: 'IELTS Advantage',
    level: 'All Levels',
    description: 'Uncover examiner traps including self-corrections, distractors, plural endings, and date/number formats across Sections 1 to 4.',
    keyTakeaways: [
      'Watch out for the "correction trick": speaker says one detail, then quickly corrects it.',
      'Predict word categories (noun, verb, date, amount) in the 30-second prep window.',
      'Pay strict attention to word limits: "NO MORE THAN TWO WORDS AND/OR A NUMBER".',
      'Transfer answers with 100% spelling precision and plural checking.',
    ],
    practiceUrl: '/practice?skill=listening',
    mockUrl: '/practice?skill=listening&mock=1',
  },
  {
    id: 'ielts-listening-section4-lecture',
    title: 'IELTS Listening Section 4: Academic Monologue Strategy',
    youtubeId: 'yZ3vQ4x9h7E',
    exam: 'IELTS',
    skill: 'listening',
    duration: '15:40',
    instructor: 'Fastrack IELTS',
    level: 'Band 7.0+',
    description: 'How to handle Section 4 where 10 questions run with no mid-section pause. Master fast signposting word recognition.',
    keyTakeaways: [
      'Listen for lecture signposts: "Turning now to...", "Surprisingly...", "The primary factor...".',
      'Keep your eyes on the next 2 questions simultaneously so you never get lost.',
      'Write quick abbreviations on rough paper if spelling isn\'t immediately obvious.',
    ],
    practiceUrl: '/practice?skill=listening',
    mockUrl: '/practice?skill=listening&mock=1',
  },

  // ── PTE Speaking ──
  {
    id: 'pte-speaking-describe-image-readaloud',
    title: 'PTE Speaking: Read Aloud & Describe Image Masterclass',
    youtubeId: 'V0mB-V4-0l8',
    exam: 'PTE',
    skill: 'speaking',
    duration: '19:20',
    instructor: 'E2 PTE Academic',
    level: 'Score 65 - 90',
    description: 'Learn the AI scoring mechanics behind PTE oral fluency and pronunciation. Includes universal Describe Image templates.',
    keyTakeaways: [
      'Oral Fluency is king: maintain constant speed without pauses, stutters, or self-correction.',
      'Read Aloud: Group words into natural thought chunks with rising and falling intonation.',
      'Describe Image: Use the standard Introduction -> High -> Low -> Conclusion template.',
      'Finish speaking within 25-32 seconds and click Next immediately to stop the mic.',
    ],
    practiceUrl: '/practice?skill=speaking',
    mockUrl: '/mocks/pte/speaking',
  },
  {
    id: 'pte-speaking-repeat-sentence-retell',
    title: 'PTE Speaking: Repeat Sentence & Retell Lecture 79+ Secrets',
    youtubeId: '_B7T8xNqvN4',
    exam: 'PTE',
    skill: 'speaking',
    duration: '16:45',
    instructor: 'Skills PTE',
    level: 'Score 79+',
    description: 'How to score maximum marks on Repeat Sentence (50% contributing to Listening) and note-taking templates for Retell Lecture.',
    keyTakeaways: [
      'Focus on the second half of the sentence: capture meaning rather than raw words.',
      'If you miss words, speak what you heard with 100% confidence and rhythm.',
      'For Retell Lecture, write 3-4 clear key phrases and read them into the template.',
    ],
    practiceUrl: '/practice?skill=speaking',
    mockUrl: '/mocks/pte/speaking',
  },

  // ── PTE Writing ──
  {
    id: 'pte-writing-essay-structure',
    title: 'PTE Writing: Write Essay Template for 90 Score',
    youtubeId: 'wN3I2-eFmfg',
    exam: 'PTE',
    skill: 'writing',
    duration: '17:35',
    instructor: 'E2 PTE Academic',
    level: 'All Levels',
    description: 'The proven essay structure that guarantees full marks for Form, Grammar, Vocabulary, and Development with zero risk.',
    keyTakeaways: [
      'Keep word count strictly between 200 and 300 words (220-260 is optimal).',
      'Zero spelling errors: leave 3 minutes to proofread every word and capital letter.',
      'Use complex sentences with connectors: although, furthermore, consequently.',
    ],
    practiceUrl: '/practice?skill=writing',
    mockUrl: '/mocks/pte/writing',
  },
  {
    id: 'pte-writing-summarize-written-text',
    title: 'PTE Summarize Written Text: One Sentence Rule & Tricks',
    youtubeId: '5lF9kXw1jH8',
    exam: 'PTE',
    skill: 'writing',
    duration: '12:50',
    instructor: 'PTE Study',
    level: 'All Levels',
    description: 'Master the single-sentence constraint (5-75 words), semicolon usage, and extracting primary passage themes.',
    keyTakeaways: [
      'Rule 1: Exactly ONE full sentence ending with ONE single period.',
      'Use compound-complex structure with semicolons or coordinators (and, but, although).',
      'Capture the passage main point from paragraph 1 and the concluding takeaway.',
    ],
    practiceUrl: '/practice?skill=writing',
    mockUrl: '/mocks/pte/writing',
  },

  // ── PTE Reading ──
  {
    id: 'pte-reading-fill-in-blanks',
    title: 'PTE Reading: Fill in the Blanks (R&W) Grammar Rules',
    youtubeId: 'J_VjK4f9p0Q',
    exam: 'PTE',
    skill: 'reading',
    duration: '22:10',
    instructor: 'E2 PTE Academic',
    level: 'Score 65 - 90',
    description: 'Collocations, prepositions, and grammatical clues (passive voice, gerunds, infinitive) that reveal correct blank answers in seconds.',
    keyTakeaways: [
      'Check part of speech required in each blank before reading choices.',
      'Identify fixed academic collocations (e.g., "play a crucial role", "conduct research").',
      'Look at words immediately preceding and following the blank for preposition triggers.',
    ],
    practiceUrl: '/practice?skill=reading',
    mockUrl: '/mocks/pte/reading',
  },
  {
    id: 'pte-reading-reorder-paragraphs',
    title: 'PTE Reading: Re-Order Paragraphs 3-Step Strategy',
    youtubeId: '2xLpWv1KkM8',
    exam: 'PTE',
    skill: 'reading',
    duration: '15:20',
    instructor: 'Skills PTE',
    level: 'All Levels',
    description: 'Step-by-step logic to find the independent topic sentence and pair sentences using noun-pronoun links and chronological markers.',
    keyTakeaways: [
      'Step 1: Find the independent topic sentence (no pronouns like "this", "they", "such").',
      'Step 2: Track pronoun and definite article ("the", "these") references back to original nouns.',
      'Step 3: Pair adjacent sentences to maximize pairwise scoring points.',
    ],
    practiceUrl: '/practice?skill=reading',
    mockUrl: '/mocks/pte/reading',
  },

  // ── PTE Listening ──
  {
    id: 'pte-listening-write-from-dictation',
    title: 'PTE Listening: Write From Dictation (WFD) Full Marks Formula',
    youtubeId: '8vT7w_X0lKo',
    exam: 'PTE',
    skill: 'listening',
    duration: '18:40',
    instructor: 'E2 PTE Academic',
    level: 'Score 79+',
    description: 'Write From Dictation carries more points than almost any other item in PTE. Learn first-letter shorthand and grammar proofing.',
    keyTakeaways: [
      'Use the initial letter technique on scratch paper (e.g., "T s r i t l" for "The student read in the library").',
      'Grammar verification: ensure subject-verb agreement and singular/plural accuracy.',
      'Capitalize the first letter and finish with a period.',
    ],
    practiceUrl: '/practice?skill=listening',
    mockUrl: '/mocks/pte/listening',
  },
  {
    id: 'pte-listening-summarize-spoken-text',
    title: 'PTE Summarize Spoken Text: Templates & Audio Notes',
    youtubeId: '3kP7_V9w8hQ',
    exam: 'PTE',
    skill: 'listening',
    duration: '14:30',
    instructor: 'PTE Study',
    level: 'All Levels',
    description: 'The optimal 50-70 word template for Summarize Spoken Text that delivers full marks for Content, Grammar, and Vocabulary.',
    keyTakeaways: [
      'Strictly write between 50 and 70 words (aim for 60-65 words).',
      'Write down 3-4 key noun phrases spoken with speaker emphasis.',
      'Plug captured phrases into the standardized academic connector template.',
    ],
    practiceUrl: '/practice?skill=listening',
    mockUrl: '/mocks/pte/listening',
  },
];
