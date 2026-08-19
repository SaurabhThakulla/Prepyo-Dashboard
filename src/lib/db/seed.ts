import { Question, MockExamBlueprint, LeaderboardUser, SubscriptionPlan, DailyMission } from '../types';

export const SEED_QUESTIONS: Question[] = [
  // ==========================
  // PTE ACADEMIC - SPEAKING
  // ==========================
  {
    id: 'pte-spk-001',
    exam: 'PTE',
    skill: 'speaking',
    typeId: 'read-aloud',
    typeName: 'Read Aloud',
    title: 'Renewable Energy Transition in Developing Economies',
    prompt: 'Look at the text below. In 35 seconds, you must read this text aloud as naturally and clearly as possible. You have 35 seconds to prepare and 40 seconds to record.',
    contextPassage: 'The global transition toward sustainable energy sources represents not only an ecological imperative but also a significant economic opportunity for developing economies. By decentralizing power generation through solar microgrids and localized wind harvesting, rural communities can achieve uninterrupted electricity access while simultaneously reducing greenhouse gas emissions and fossil fuel dependencies.',
    prepTimeSeconds: 35,
    timeLimitSeconds: 40,
    modelAnswer: 'Clear, fluid speech maintaining natural stress on keywords (sustainable energy, ecological imperative, decentralized, solar microgrids, uninterrupted).',
    explanation: 'Focus on oral fluency and pronunciation. Avoid pauses between linked word groups (e.g. "solar microgrids", "uninterrupted electricity access").',
    difficulty: 'medium',
    tags: ['PTE Speaking', 'Read Aloud', 'Fluency', 'Pronunciation'],
    points: 15,
  },
  {
    id: 'pte-spk-002',
    exam: 'PTE',
    skill: 'speaking',
    typeId: 'repeat-sentence',
    typeName: 'Repeat Sentence',
    title: 'University Library Research Access',
    prompt: 'You will hear a sentence. Please repeat the sentence exactly as you hear it. You will hear the sentence only once.',
    audioUrl: '/audio/pte-repeat-sentence-01.mp3',
    audioTranscript: 'Students who wish to access the digital archives must complete the orientation module before the end of this semester.',
    prepTimeSeconds: 3,
    timeLimitSeconds: 15,
    modelAnswer: 'Students who wish to access the digital archives must complete the orientation module before the end of this semester.',
    explanation: 'Content contributes to both Speaking and Listening scores. Maintain consistent rhythm and intonation without false starts.',
    difficulty: 'medium',
    tags: ['PTE Speaking', 'Repeat Sentence', 'Memory', 'Listening Integration'],
    points: 13,
  },
  {
    id: 'pte-spk-003',
    exam: 'PTE',
    skill: 'speaking',
    typeId: 'describe-image',
    typeName: 'Describe Image',
    title: 'Smartphone Market Share Breakdown (2020-2025)',
    prompt: 'Look at the chart below. In 25 seconds, please speak into the microphone and describe in detail what the chart is showing. You will have 40 seconds to give your response.',
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
    contextPassage: 'Bar chart showing Global Smartphone Market Share: Brand A (32%), Brand B (28%), Brand C (18%), Others (22%) with projected growth in 5G adoption over 5 years.',
    prepTimeSeconds: 25,
    timeLimitSeconds: 40,
    modelAnswer: 'The provided bar chart illustrates the global market share of smartphones between 2020 and 2025. According to the data, Brand A dominates the market with 32%, followed closely by Brand B at 28%. In contrast, Brand C holds 18%, while other manufacturers account for the remaining 22%. A notable trend is the rapid increase in 5G compatible devices. In conclusion, the smartphone sector demonstrates competitive dynamics with leading tech firms sustaining high market presence.',
    explanation: 'Include an introduction, highest and lowest values, key trend/contrast, and a conclusive summary within 35-38 seconds.',
    difficulty: 'hard',
    tags: ['PTE Speaking', 'Describe Image', 'Fluency', 'Templates'],
    points: 15,
  },

  // ==========================
  // PTE ACADEMIC - WRITING
  // ==========================
  {
    id: 'pte-wrt-001',
    exam: 'PTE',
    skill: 'writing',
    typeId: 'summarize-written-text',
    typeName: 'Summarize Written Text',
    title: 'Urban Heat Islands and Microclimates',
    prompt: 'Read the passage below and summarize it using ONE single sentence. You have 10 minutes to finish this task. Your response must be between 5 and 75 words.',
    contextPassage: 'Urban heat islands occur when cities replace natural land cover with dense concentrations of pavement, buildings, and other surfaces that absorb and retain heat. This effect increases energy costs for air conditioning, elevates air pollution levels, and contributes to heat-related illnesses among vulnerable populations. Urban planners are now mitigating these thermal impacts by incorporating reflective roofing materials, expanding municipal tree canopies, and installing green vegetative roofs on public buildings.',
    prepTimeSeconds: 0,
    timeLimitSeconds: 600,
    modelAnswer: 'Because dense urban surfaces absorb heat and elevate both energy costs and health risks, municipal planners are implementing reflective materials, green roofs, and expanded tree canopies to mitigate urban heat island effects.',
    explanation: 'Must strictly be a SINGLE sentence ending with a full stop. Word count must be between 5 and 75 words. Include key causes and mitigation strategies.',
    difficulty: 'medium',
    tags: ['PTE Writing', 'Summarize Written Text', 'Grammar', 'Complex Sentences'],
    points: 10,
  },
  {
    id: 'pte-wrt-002',
    exam: 'PTE',
    skill: 'writing',
    typeId: 'write-essay',
    typeName: 'Write Essay',
    title: 'Artificial Intelligence in Education',
    prompt: 'Some people argue that artificial intelligence will eventually replace human teachers, while others believe that the human element in education is irreplaceable. Discuss both views and give your opinion. Write between 200 and 300 words in 20 minutes.',
    prepTimeSeconds: 0,
    timeLimitSeconds: 1200,
    modelAnswer: 'The advent of artificial intelligence (AI) has sparked intense debate regarding its potential to revolutionize modern education. While proponents assert that intelligent tutoring systems can replace human instructors by personalizing curriculum and grading instantaneously, I maintain that empathetic mentorship and interpersonal guidance remain fundamentally irreplaceable.\n\nOn the one hand, AI algorithms excel at data-driven customization. Machine learning platforms can diagnose learner weaknesses in real time, deliver targeted practice, and provide round-the-clock academic feedback. For instance, adaptive language software has enabled millions of remote students to acquire fluency at their own pace.\n\nOn the other hand, pedagogical success relies heavily on emotional intelligence and moral development. Human teachers inspire critical thinking, foster resilience, and tailor psychological support to struggling students—dimensions that computational models cannot replicate. A classroom devoid of human connection risks alienating learners and diminishing collaborative skills.\n\nIn conclusion, while AI serves as an invaluable pedagogical tool, it should augment rather than substitute human educators.',
    explanation: 'Score is evaluated on Content, Form (200-300 words), Grammar, Vocabulary, and Spelling. Aim for a 4-paragraph structure with clear topic sentences.',
    difficulty: 'hard',
    tags: ['PTE Writing', 'Write Essay', 'Coherence', 'Vocabulary'],
    points: 20,
  },

  // ==========================
  // PTE ACADEMIC - READING
  // ==========================
  {
    id: 'pte-rdg-001',
    exam: 'PTE',
    skill: 'reading',
    typeId: 'fill-in-blanks-rw',
    typeName: 'Reading & Writing: Fill in the Blanks',
    title: 'Cognitive Benefits of Bilingualism',
    prompt: 'Below is a text with blanks. Click on each blank and select the most appropriate option from the drop-down menu.',
    contextPassage: 'For decades, early researchers assumed that learning two languages during childhood would create cognitive [[blank1]] and delay linguistic development. However, contemporary neurological research has [[blank2]] this misconception. Modern neuroimaging studies demonstrate that bilingual individuals develop superior executive control, which [[blank3]] their ability to filter irrelevant stimuli and switch between complex analytical tasks with greater [[blank4]].',
    blanks: [
      { id: 'blank1', options: ['confusion', 'harmony', 'velocity', 'equilibrium'], correctAnswer: 'confusion' },
      { id: 'blank2', options: ['debunked', 'reinforced', 'overlooked', 'amplified'], correctAnswer: 'debunked' },
      { id: 'blank3', options: ['enhances', 'jeopardizes', 'complicates', 'depreciates'], correctAnswer: 'enhances' },
      { id: 'blank4', options: ['efficiency', 'reluctance', 'ambiguity', 'hesitation'], correctAnswer: 'efficiency' },
    ],
    timeLimitSeconds: 180,
    explanation: '1. "cognitive confusion" fits context of outdated fears. 2. "debunked" means disproved. 3. "enhances" matches positive tone. 4. "efficiency" fits switching tasks effectively.',
    difficulty: 'medium',
    tags: ['PTE Reading', 'Collocations', 'Vocabulary'],
    points: 12,
  },
  {
    id: 'pte-rdg-002',
    exam: 'PTE',
    skill: 'reading',
    typeId: 'reorder-paragraphs',
    typeName: 'Re-order Paragraphs',
    title: 'The Evolution of Modern Cryptography',
    prompt: 'The text boxes below have been placed in a random order. Restore the original text by selecting the correct sequence.',
    options: [
      { id: 'p1', text: 'Throughout history, military commanders required confidential channels to transmit tactical dispatches without enemy interception.' },
      { id: 'p2', text: 'Early cryptographic methods relied on basic substitution ciphers, such as the Caesar cipher used in ancient Rome.' },
      { id: 'p3', text: 'However, the advent of computerized frequency analysis in the 20th century rendered these monoalphabetic ciphers obsolete.' },
      { id: 'p4', text: 'Consequently, mathematicians developed asymmetric public-key cryptography, which underpins modern internet security today.' },
    ],
    correctAnswers: ['p1', 'p2', 'p3', 'p4'],
    timeLimitSeconds: 240,
    explanation: 'Paragraph 1 introduces the universal theme (military confidentiality). Paragraph 2 provides earliest historical example (Caesar cipher). Paragraph 3 introduces the problem (computerized analysis). Paragraph 4 presents the modern resolution (public-key cryptography).',
    difficulty: 'hard',
    tags: ['PTE Reading', 'Cohesion', 'Logical Ordering'],
    points: 12,
  },

  // ==========================
  // PTE ACADEMIC - LISTENING
  // ==========================
  {
    id: 'pte-lis-001',
    exam: 'PTE',
    skill: 'listening',
    typeId: 'summarize-spoken-text',
    typeName: 'Summarize Spoken Text',
    title: 'Ocean Acidification and Marine Biodiversity',
    prompt: 'You will hear a short academic lecture. Write a 50–70 word summary of what you heard. You have 10 minutes. You will hear the recording once.',
    audioUrl: '/audio/pte-summarize-spoken-01.mp3',
    audioTranscript: 'Industrial emissions have raised atmospheric carbon dioxide to unprecedented concentrations. Approximately thirty percent of this gas is absorbed into world oceans, creating carbonic acid. This process, known as ocean acidification, decreases seawater pH and deprives shell-forming organisms like coral reefs and mollusks of carbonate ions necessary for skeletal integrity, ultimately threatening the base of marine food webs.',
    prepTimeSeconds: 0,
    timeLimitSeconds: 600,
    modelAnswer: 'The lecture explains that oceans absorb thirty percent of industrial carbon dioxide emissions, inducing ocean acidification. This chemical alteration lowers pH levels and depletes carbonate ions, which severely compromises the skeletal formation of corals and mollusks, ultimately disrupting foundational marine food webs.',
    explanation: 'Strict 50-70 words constraint. Must include ocean CO2 absorption, pH decrease, carbonate depletion, and impact on coral/food web.',
    difficulty: 'hard',
    tags: ['PTE Listening', 'Writing Integration', 'Summary'],
    points: 10,
  },
  {
    id: 'pte-lis-002',
    exam: 'PTE',
    skill: 'listening',
    typeId: 'write-from-dictation',
    typeName: 'Write from Dictation',
    title: 'Academic Submission Guidelines',
    prompt: 'You will hear a sentence. Type the sentence in the box below exactly as you hear it. Write as many correct words as possible. You will hear the sentence only once.',
    audioUrl: '/audio/pte-dictation-01.mp3',
    audioTranscript: 'All submitted assignments must contain appropriate academic citations and a comprehensive bibliography.',
    prepTimeSeconds: 0,
    timeLimitSeconds: 45,
    correctAnswers: 'All submitted assignments must contain appropriate academic citations and a comprehensive bibliography.',
    explanation: 'Every correct word earns 1 point. Spelling and exact word forms (plural vs singular) are critical.',
    difficulty: 'medium',
    tags: ['PTE Listening', 'Dictation', 'Spelling'],
    points: 11,
  },

  // ==========================
  // IELTS - WRITING
  // ==========================
  {
    id: 'ielts-wrt-001',
    exam: 'IELTS',
    skill: 'writing',
    typeId: 'ielts-writing-task1',
    typeName: 'Writing Task 1 (Academic Report)',
    title: 'Electricity Production by Source in Three Countries (2010 vs 2020)',
    prompt: 'The chart below shows the proportion of electricity generated from fossil fuels, nuclear power, and renewable energy in three European nations in 2010 and 2020.\n\nSummarize the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words in 20 minutes.',
    imageUrl: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=800&q=80',
    prepTimeSeconds: 0,
    timeLimitSeconds: 1200,
    modelAnswer: 'The bar charts illustrate the distribution of electricity generation across fossil fuels, nuclear energy, and renewable resources in Germany, France, and Sweden between 2010 and 2020.\n\nOverall, renewable energy witnessed significant expansion across all three countries, while reliance on fossil fuels decreased substantially over the decade. Notably, France maintained the highest reliance on nuclear energy throughout the period.\n\nIn 2010, Germany derived the majority of its electricity from fossil fuels at 58%, with renewables contributing merely 16%. However, by 2020, German renewable generation surged to 45%, eclipsing fossil fuels which dropped to 35%. Conversely, France exhibited a nuclear-dominant profile, generating 74% of power via nuclear in 2010 and 67% in 2020, with green energy doubling from 12% to 24%.\n\nFinally, Sweden demonstrated the greenest transition, with renewables escalating from 48% to 68%, making it the leading clean energy producer by 2020.',
    explanation: 'Evaluated on Task Achievement (key trends reported + overview paragraph), Coherence and Cohesion, Lexical Resource, and Grammatical Range and Accuracy.',
    difficulty: 'medium',
    tags: ['IELTS Writing', 'Task 1', 'Overview', 'Data Comparisons'],
    points: 20,
  },
  {
    id: 'ielts-wrt-002',
    exam: 'IELTS',
    skill: 'writing',
    typeId: 'ielts-writing-task2',
    typeName: 'Writing Task 2 (Essay)',
    title: 'Remote Work vs Traditional Office Work',
    prompt: 'In many countries, an increasing number of employees are working from home rather than in traditional office spaces. Do the advantages of this trend outweigh the disadvantages?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words in 40 minutes.',
    prepTimeSeconds: 0,
    timeLimitSeconds: 2400,
    modelAnswer: 'In the contemporary digital era, the widespread adoption of remote telecommuting has transformed workplace dynamics globally. Although remote work presents challenges regarding professional isolation and blurred work-life boundaries, I firmly believe that its benefits—specifically enhanced productivity, cost savings, and reduced environmental strain—greatly outweigh the drawbacks.\n\nThe principal advantage of remote employment lies in personal flexibility and time preservation. Eliminating exhausting daily commutes enables workers to allocate more time to focused task execution and familial responsibilities. For example, recent corporate surveys demonstrate that teleworkers in metropolitan hubs report 20% higher output and reduced stress levels. Furthermore, companies can significantly reduce commercial leasing expenses, reinvesting capital into staff development and digital infrastructure.\n\nConversely, critics highlight potential pitfalls such as diminished collaboration and spontaneous creativity. Without in-person social interactions, team cohesion may weaken, and employees might struggle to disconnect from digital notifications after standard business hours. Nevertheless, these obstacles can be effectively mitigated through hybrid scheduling and structured communication protocols, ensuring organizational alignment without sacrificing autonomy.\n\nIn conclusion, the advantages of telecommuting in terms of efficiency, economic savings, and carbon reduction comfortably surpass its organizational downsides.',
    explanation: 'Must present a clear position throughout (advantages outweigh disadvantages), well-developed main ideas, high-level cohesive devices, and varied grammatical structures.',
    difficulty: 'hard',
    tags: ['IELTS Writing', 'Task 2', 'Band 8.0+', 'Essay Structure'],
    points: 25,
  },

  // ==========================
  // IELTS - READING
  // ==========================
  {
    id: 'ielts-rdg-001',
    exam: 'IELTS',
    skill: 'reading',
    typeId: 'ielts-reading-tfng',
    typeName: 'Reading Passage & True/False/Not Given',
    title: 'The Mystery of the Indus Valley Script',
    prompt: 'Read the text and decide whether the following statements agree with the information given in the passage.\n\nChoose TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, or NOT GIVEN if there is no information on this.',
    contextPassage: 'The Indus Valley Civilization, which flourished from 2600 BCE to 1900 BCE in present-day Pakistan and northwest India, produced thousands of inscribed seals and pottery shards bearing intricate pictographic symbols. Despite nearly a century of epigraphic research, the Indus script remains undeciphered. Most inscriptions are remarkably brief, averaging only five characters in length, which drastically complicates statistical language decipherment. Furthermore, no bilingual inscription—such as the Rosetta Stone that unlocked Egyptian hieroglyphs—has ever been discovered in the Indus basin.',
    options: [
      { id: 'q1', text: '1. The Indus Valley Civilization spanned regions across modern Pakistan and India.' },
      { id: 'q2', text: '2. Epigraphers have successfully deciphered over half of all excavated Indus seals.' },
      { id: 'q3', text: '3. A multilingual stone monument helped researchers translate the longest Indus inscription.' },
      { id: 'q4', text: '4. Most Indus script inscriptions were written primarily on papyrus scrolls.' },
    ],
    correctAnswers: ['TRUE', 'FALSE', 'FALSE', 'NOT GIVEN'],
    timeLimitSeconds: 600,
    explanation: '1. TRUE (Passage: "in present-day Pakistan and northwest India"). 2. FALSE (Passage: "Indus script remains undeciphered"). 3. FALSE (Passage: "no bilingual inscription has ever been discovered"). 4. NOT GIVEN (Passage mentions seals and pottery, but does not discuss papyrus).',
    difficulty: 'medium',
    tags: ['IELTS Reading', 'True False Not Given', 'Academic Reading'],
    points: 15,
  },

  // ==========================
  // IELTS - SPEAKING
  // ==========================
  {
    id: 'ielts-spk-001',
    exam: 'IELTS',
    skill: 'speaking',
    typeId: 'ielts-speaking-part2',
    typeName: 'Speaking Part 2 (Cue Card)',
    title: 'Describe an Important Decision You Made',
    prompt: 'Describe an important decision you made that influenced your life.\n\nYou should say:\n- What the decision was\n- When and why you made it\n- What happened as a result\n\nAnd explain why you feel this was such an important decision.',
    prepTimeSeconds: 60,
    timeLimitSeconds: 120,
    modelAnswer: 'I would like to talk about my decision to switch my major from commerce to computer software engineering during my sophomore year of college. I made this choice approximately three years ago when I realized that my genuine passion lay in technology and problem-solving rather than accounting. Although it required intensive self-study and an extra semester, it allowed me to secure rewarding international internships. This decision fundamentally shaped my career trajectory and taught me the value of calculated risk-taking.',
    explanation: 'Use the 1-minute preparation timer to write bullet notes. Speak fluently for 1.5 to 2 minutes using idiomatic language and natural discourse markers.',
    difficulty: 'hard',
    tags: ['IELTS Speaking', 'Part 2', 'Cue Card', 'Fluency'],
    points: 20,
  },

  // ==========================
  // IELTS - LISTENING
  // ==========================
  {
    id: 'ielts-lis-001',
    exam: 'IELTS',
    skill: 'listening',
    typeId: 'ielts-listening-section1',
    typeName: 'Listening Section 1 (Conversation & Form Completion)',
    title: 'Community Sports Center Membership Registration',
    prompt: 'Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.',
    audioUrl: '/audio/ielts-listening-section1.mp3',
    audioTranscript: 'Good morning, Riverside Community Center. How may I help you? Hi, I would like to inquire about annual fitness membership for my family. Sure! What is your full name? It is David Reynolds. And your contact phone number? It is 0412 889 321. Great. Our standard Gold membership costs 450 dollars annually and gives full access to our swimming pool and indoor tennis courts.',
    contextPassage: 'Membership Registration Form:\n- Member Name: David [[blank1]]\n- Contact Number: [[blank2]]\n- Membership Tier: Gold\n- Annual Fee: $[[blank3]]\n- Facility Access: Swimming pool and indoor [[blank4]] courts.',
    blanks: [
      { id: 'blank1', options: ['Reynolds'], correctAnswer: 'Reynolds' },
      { id: 'blank2', options: ['0412 889 321'], correctAnswer: '0412 889 321' },
      { id: 'blank3', options: ['450'], correctAnswer: '450' },
      { id: 'blank4', options: ['tennis'], correctAnswer: 'tennis' },
    ],
    timeLimitSeconds: 300,
    explanation: 'Extract exact spelled names, numbers, and nouns from the conversation.',
    difficulty: 'easy',
    tags: ['IELTS Listening', 'Form Completion', 'Section 1'],
    points: 10,
  }
];

export const SEED_MOCKS: MockExamBlueprint[] = [
  {
    id: 'mock-pte-full-01',
    exam: 'PTE',
    title: 'PTE Academic Official Simulation Mock #1',
    description: 'Complete 2-hour simulated PTE Academic examination covering Speaking & Writing, Reading, and Listening with real-time timers and AI score estimation.',
    totalDurationMinutes: 120,
    totalQuestions: 8,
    sections: [
      { id: 'sec-pte-spk-wrt', name: 'Section 1: Speaking & Writing', skill: 'speaking', durationMinutes: 54, questionIds: ['pte-spk-001', 'pte-spk-002', 'pte-spk-003', 'pte-wrt-001', 'pte-wrt-002'] },
      { id: 'sec-pte-rdg', name: 'Section 2: Reading', skill: 'reading', durationMinutes: 30, questionIds: ['pte-rdg-001', 'pte-rdg-002'] },
      { id: 'sec-pte-lis', name: 'Section 3: Listening', skill: 'listening', durationMinutes: 36, questionIds: ['pte-lis-001', 'pte-lis-002'] },
    ],
    isDiagnostic: false,
  },
  {
    id: 'mock-pte-diagnostic',
    exam: 'PTE',
    title: 'PTE Fast Diagnostic Baseline Test (15 Min)',
    description: 'Rapid 15-minute diagnostic test across all 4 communicative skills to calculate your current score estimate and identify weak areas.',
    totalDurationMinutes: 15,
    totalQuestions: 4,
    sections: [
      { id: 'sec-diag-pte', name: 'PTE Diagnostic Multi-Skill', skill: 'speaking', durationMinutes: 15, questionIds: ['pte-spk-001', 'pte-wrt-001', 'pte-rdg-001', 'pte-lis-002'] },
    ],
    isDiagnostic: true,
  },
  {
    id: 'mock-ielts-full-01',
    exam: 'IELTS',
    title: 'IELTS Academic Full Mock Exam #1',
    description: 'Complete IELTS Academic test simulation with Listening, Reading, Writing Task 1 & 2, and Speaking Cue Card evaluation.',
    totalDurationMinutes: 160,
    totalQuestions: 5,
    sections: [
      { id: 'sec-ielts-lis', name: 'Listening (40 min)', skill: 'listening', durationMinutes: 40, questionIds: ['ielts-lis-001'] },
      { id: 'sec-ielts-rdg', name: 'Reading (60 min)', skill: 'reading', durationMinutes: 60, questionIds: ['ielts-rdg-001'] },
      { id: 'sec-ielts-wrt', name: 'Writing (60 min)', skill: 'writing', durationMinutes: 60, questionIds: ['ielts-wrt-001', 'ielts-wrt-002'] },
      { id: 'sec-ielts-spk', name: 'Speaking (15 min)', skill: 'speaking', durationMinutes: 15, questionIds: ['ielts-spk-001'] },
    ],
    isDiagnostic: false,
  },
  {
    id: 'mock-ielts-diagnostic',
    exam: 'IELTS',
    title: 'IELTS Fast Diagnostic Baseline Test (15 Min)',
    description: 'Fast 15-minute IELTS diagnostic assessment to evaluate your current Band score baseline and target band gap.',
    totalDurationMinutes: 15,
    totalQuestions: 3,
    sections: [
      { id: 'sec-diag-ielts', name: 'IELTS Diagnostic', skill: 'writing', durationMinutes: 15, questionIds: ['ielts-rdg-001', 'ielts-wrt-001', 'ielts-spk-001'] },
    ],
    isDiagnostic: true,
  }
];

export const SEED_LEADERBOARD: LeaderboardUser[] = [
  { rank: 1, userId: 'usr-001', name: 'Aarav Shrestha', nepalRegion: 'Kathmandu', exam: 'PTE', xp: 4850, level: 14, streakDays: 28, estimatedScore: 84, tier: 'Diamond' },
  { rank: 2, userId: 'usr-002', name: 'Pooja Thapa', nepalRegion: 'Pokhara', exam: 'IELTS', xp: 4420, level: 13, streakDays: 24, estimatedScore: 8.0, tier: 'Diamond' },
  { rank: 3, userId: 'usr-003', name: 'Bikash Adhikari', nepalRegion: 'Chitwan', exam: 'PTE', xp: 3980, level: 12, streakDays: 19, estimatedScore: 79, tier: 'Platinum' },
  { rank: 4, userId: 'usr-004', name: 'Sneha Gurung', nepalRegion: 'Lalitpur', exam: 'IELTS', xp: 3650, level: 11, streakDays: 16, estimatedScore: 7.5, tier: 'Platinum' },
  { rank: 5, userId: 'usr-005', name: 'Rohan Karki', nepalRegion: 'Butwal', exam: 'PTE', xp: 3310, level: 10, streakDays: 14, estimatedScore: 76, tier: 'Gold' },
  { rank: 6, userId: 'usr-006', name: 'Anjali Sharma', nepalRegion: 'Dharan', exam: 'IELTS', xp: 2950, level: 9, streakDays: 11, estimatedScore: 7.0, tier: 'Gold' },
  { rank: 7, userId: 'usr-007', name: 'Sujan Gautam', nepalRegion: 'Kathmandu', exam: 'PTE', xp: 2600, level: 8, streakDays: 9, estimatedScore: 72, tier: 'Silver' },
  { rank: 8, userId: 'usr-008', name: 'Kritika Joshi', nepalRegion: 'Pokhara', exam: 'IELTS', xp: 2240, level: 7, streakDays: 7, estimatedScore: 6.5, tier: 'Silver' },
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free Learner',
    priceNPR: 0,
    durationMonths: 0,
    features: [
      'Access to core practice questions',
      '3 AI Speaking/Writing evaluations per day',
      '1 Full Mock Exam with basic breakdown',
      'Mistake bank tracking (up to 20 items)',
      'Community leaderboard ranking'
    ],
    aiEvaluationsPerDay: 3,
    mockTestsIncluded: 1,
  },
  {
    id: 'pro',
    name: 'Pro Prep (Monthly)',
    priceNPR: 1499,
    durationMonths: 1,
    popular: true,
    features: [
      'Unlimited practice across all PTE & IELTS tasks',
      '30 AI Speaking & Writing evaluations per day',
      'Instant sentence-by-sentence error analysis & rewrites',
      '5 Full-length realistic Mock Exams with detailed rubrics',
      'Unlimited Mistake Bank replay',
      'Target Gap score prediction model',
      'Nepal payment integration (eSewa / Khalti / Fonepay)'
    ],
    aiEvaluationsPerDay: 30,
    mockTestsIncluded: 5,
  },
  {
    id: 'elite',
    name: 'Elite Master (3 Months)',
    priceNPR: 2999,
    durationMonths: 3,
    features: [
      'Everything in Pro Prep for 90 days',
      'Unlimited AI Speaking, Writing & Tutor sessions',
      '15 Full Mock Exams with in-depth performance analytics',
      'Personalized Daily Mission study path',
      'Priority AI evaluation processing queue',
      'Dedicated 79+ / Band 8.0 Master Strategy templates',
      'Streak protection freeze packs'
    ],
    aiEvaluationsPerDay: 100,
    mockTestsIncluded: 15,
  }
];

export const DEFAULT_DAILY_MISSIONS: DailyMission[] = [
  {
    id: 'mis-01',
    title: 'Master PTE Read Aloud / IELTS Speaking',
    description: 'Record 2 speaking practice tasks with clear oral fluency and pronunciation.',
    skill: 'speaking',
    taskType: 'read-aloud',
    targetCount: 2,
    completedCount: 1,
    xpReward: 100,
    completed: false,
  },
  {
    id: 'mis-02',
    title: 'AI Essay Evaluation Challenge',
    description: 'Submit an essay or report draft to the AI writing evaluator and review your rubric feedback.',
    skill: 'writing',
    taskType: 'write-essay',
    targetCount: 1,
    completedCount: 0,
    xpReward: 150,
    completed: false,
  },
  {
    id: 'mis-03',
    title: 'Reading Precision Drill',
    description: 'Complete 3 Reading Blanks or True/False/Not Given questions with at least 80% accuracy.',
    skill: 'reading',
    taskType: 'fill-in-blanks-rw',
    targetCount: 3,
    completedCount: 3,
    xpReward: 120,
    completed: true,
  }
];
