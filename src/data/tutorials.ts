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
    title: 'IELTS Speaking: Band 5 vs. Band 9 Answer Comparison & Strategy',
    youtubeId: 'dlRr-9ZGbqE',
    exam: 'IELTS',
    skill: 'speaking',
    duration: '18:45',
    instructor: 'IELTS Advantage (Chris Pell)',
    level: 'Band 7.0 - 9.0',
    description: 'Learn the exact 4 scoring criteria examiners look for: Fluency & Coherence, Lexical Resource, Grammatical Range, and Pronunciation. Includes live interview breakdowns and examiner commentary.',
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
    title: 'IELTS Speaking Part 2: Extend Your Answers Masterclass',
    youtubeId: 'afg_k8ASV0E',
    exam: 'IELTS',
    skill: 'speaking',
    duration: '14:20',
    instructor: 'Fastrack IELTS (Asiya)',
    level: 'All Levels',
    description: 'Master the 1-minute preparation window and speak confidently for the full 2 minutes without awkward pauses or running out of ideas.',
    keyTakeaways: [
      'Write keywords only during prep time—never write full sentences.',
      'Use the past-present-future timeline technique to expand details effortlessly.',
      'Transition smoothly between bullet points using natural discourse markers.',
    ],
    practiceUrl: '/practice?skill=speaking',
    mockUrl: '/practice?skill=speaking&mock=1',
  },

  // ── IELTS Writing ──
  {
    id: 'ielts-writing-task2-essay',
    title: 'The ONLY IELTS Writing Task 2 Strategy You Need',
    youtubeId: 'ROmQsqmeUB8',
    exam: 'IELTS',
    skill: 'writing',
    duration: '24:10',
    instructor: 'IELTS Advantage (Chris Pell)',
    level: 'Band 7.0+',
    description: 'The definitive guide to writing Agree/Disagree, Discuss Both Views, and Problem-Solution essays with a clean 4-paragraph academic structure.',
    keyTakeaways: [
      'Spend 5 minutes planning thesis and main body arguments before writing.',
      'Introduction: Paraphrase prompt (1 sentence) + Clear thesis statement (1 sentence).',
      'Body paragraphs: Topic sentence + In-depth explanation + Concrete supporting evidence.',
      'Conclusion: Restate thesis with synonymous phrasing—never introduce new ideas.',
    ],
    practiceUrl: '/practice?skill=writing',
    mockUrl: '/practice?skill=writing&mock=1',
  },
  {
    id: 'ielts-writing-task1-charts',
    title: 'Complete Guide to IELTS Academic Writing Task 1',
    youtubeId: 'A6_0QjlNJqk',
    exam: 'IELTS',
    skill: 'writing',
    duration: '21:15',
    instructor: 'Fastrack IELTS (Asiya)',
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
    title: 'IELTS Reading: True / False / Not Given Strategy & Practice',
    youtubeId: 'JkWwZt8UwA4',
    exam: 'IELTS',
    skill: 'reading',
    duration: '16:30',
    instructor: 'Fastrack IELTS (Asiya)',
    level: 'All Levels',
    description: 'Demystifying the hardest question types in IELTS Reading. Learn the exact difference between True, False, and Not Given with real passage examples.',
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
    title: 'IELTS Reading Matching Headings | Best Tips + Practice Tasks',
    youtubeId: 'SXdMpskBDmA',
    exam: 'IELTS',
    skill: 'reading',
    duration: '18:50',
    instructor: 'Fastrack IELTS (Asiya)',
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
    id: 'ielts-listening-guide-strategies',
    title: 'Get BAND 9 After Using These Listening Tips',
    youtubeId: 'S_TVcsCFpTM',
    exam: 'IELTS',
    skill: 'listening',
    duration: '19:40',
    instructor: 'IELTS Advantage (Chris Pell)',
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
    title: 'The Ultimate Guide to IELTS Listening',
    youtubeId: '5-v-lDgQw80',
    exam: 'IELTS',
    skill: 'listening',
    duration: '22:15',
    instructor: 'Fastrack IELTS (Asiya)',
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
    id: 'pte-speaking-read-aloud-method',
    title: 'PTE Speaking: Read Aloud | SUPER METHOD!',
    youtubeId: 'EWqyLY12dMc',
    exam: 'PTE',
    skill: 'speaking',
    duration: '15:10',
    instructor: 'E2 PTE Academic (Jay)',
    level: 'Score 65 - 90',
    description: 'Learn the exact AI scoring mechanics behind PTE oral fluency and pronunciation. Master chunking and rhythm to score 90 on Read Aloud.',
    keyTakeaways: [
      'Oral Fluency is king: maintain constant speed without pauses, stutters, or self-correction.',
      'Read Aloud: Group words into natural thought chunks with rising and falling intonation.',
      'Do not stress every syllable; stress content words (nouns, verbs, adjectives).',
      'Click "Next" immediately within 1-2 seconds of completing the passage.',
    ],
    practiceUrl: '/practice?skill=speaking',
    mockUrl: '/mocks/pte/speaking',
  },
  {
    id: 'pte-speaking-repeat-sentence-retell',
    title: 'PTE Speaking: Repeat Sentence | SUPER STRATEGY with Jay!',
    youtubeId: 'MYtqHGfyKy8',
    exam: 'PTE',
    skill: 'speaking',
    duration: '16:45',
    instructor: 'E2 PTE Academic (Jay)',
    level: 'Score 79+',
    description: 'How to score maximum marks on Repeat Sentence (which contributes heavily to both Speaking and Listening scores) with memory and phrasing tricks.',
    keyTakeaways: [
      'Focus on the second half of the sentence: capture meaning rather than raw words.',
      'If you miss words, speak what you heard with 100% confidence and continuous rhythm.',
      'Never hesitate or pause for more than 1 second; fluency outweighs minor omissions.',
    ],
    practiceUrl: '/practice?skill=speaking',
    mockUrl: '/mocks/pte/speaking',
  },

  // ── PTE Writing ──
  {
    id: 'pte-writing-essay-structure',
    title: 'PTE Writing: Write Essay | SUPER METHOD!',
    youtubeId: 'Rnb2M5Zjlwc',
    exam: 'PTE',
    skill: 'writing',
    duration: '17:35',
    instructor: 'E2 PTE Academic (Jay)',
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
    title: 'PTE Writing: Summarize Written Text | SUPER METHOD!',
    youtubeId: 'c4XPKaWJjd8',
    exam: 'PTE',
    skill: 'writing',
    duration: '12:50',
    instructor: 'E2 PTE Academic (Jay)',
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
    title: 'E2 PTE Reading | Fill in the Blanks | Extended Method with Jay!',
    youtubeId: 'McdolQDciIc',
    exam: 'PTE',
    skill: 'reading',
    duration: '22:10',
    instructor: 'E2 PTE Academic (Jay)',
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
    title: 'PTE Reading: Reorder Paragraph | SUPER METHOD!',
    youtubeId: 'B9BHVg2JEPo',
    exam: 'PTE',
    skill: 'reading',
    duration: '15:20',
    instructor: 'E2 PTE Academic (Jay)',
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
    title: 'PTE Listening: Write from Dictation | Tips & Strategy for 90/90',
    youtubeId: 'c95gaZhnLnQ',
    exam: 'PTE',
    skill: 'listening',
    duration: '18:40',
    instructor: 'E2 PTE Academic (Jay)',
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
    title: 'PTE Listening: Summarize Spoken Text | SUPER METHOD!',
    youtubeId: '3Rig_Q5ofD4',
    exam: 'PTE',
    skill: 'listening',
    duration: '14:30',
    instructor: 'E2 PTE Academic (Jay)',
    level: 'All Levels',
    description: 'The optimal 50-70 word method for Summarize Spoken Text that delivers full marks for Content, Grammar, and Vocabulary.',
    keyTakeaways: [
      'Strictly write between 50 and 70 words (aim for 60-65 words).',
      'Write down 3-4 key noun phrases spoken with speaker emphasis.',
      'Plug captured phrases into the standardized academic connector template.',
    ],
    practiceUrl: '/practice?skill=listening',
    mockUrl: '/mocks/pte/listening',
  },
];
