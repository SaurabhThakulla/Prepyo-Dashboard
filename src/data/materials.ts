import { ExamType } from '@/lib/types';

/**
 * Official sample questions, as files (PDF, or a ZIP of PDFs) published free
 * by the exam owners.
 *
 * Only question files: no practice platforms, guides or shops. Prepyo only
 * links to them on the publishers' own servers; it never copies or hosts
 * their questions (see AGENTS.md, section 9). Every link and size was checked
 * on 2026-11-04.
 */

export type MaterialProvider = 'ielts-official' | 'british-council' | 'cambridge' | 'pearson';

export type MaterialFormat = 'PDF' | 'ZIP';

export interface Material {
  id: string;
  exam: Extract<ExamType, 'IELTS' | 'PTE'>;
  provider: MaterialProvider;
  title: string;
  /** What is inside, in one line. */
  description: string;
  /** Which part of the test, shown on the cover. */
  skill: string;
  url: string;
  format: MaterialFormat;
  /** As the publisher serves it, e.g. "1.3 MB". */
  size: string;
}

export interface MaterialProviderInfo {
  id: MaterialProvider;
  name: string;
  /** One line on who they are. */
  about: string;
  exam: Material['exam'];
}

export const MATERIAL_PROVIDERS: MaterialProviderInfo[] = [
  { id: 'ielts-official', name: 'IELTS official', about: 'ielts.org, the test owners', exam: 'IELTS' },
  { id: 'british-council', name: 'British Council', about: 'Co-owner of IELTS', exam: 'IELTS' },
  { id: 'cambridge', name: 'Cambridge', about: 'Cambridge University Press & Assessment', exam: 'IELTS' },
  { id: 'pearson', name: 'Pearson PTE', about: 'Makers of PTE Academic', exam: 'PTE' },
];

export const MATERIALS: Material[] = [
  {
    id: 'ielts-speaking-tasks',
    exam: 'IELTS',
    provider: 'ielts-official',
    title: 'IELTS Speaking sample tasks',
    description: 'Sample questions for Speaking Parts 1, 2 and 3.',
    skill: 'Speaking',
    url: 'https://ielts.org/cdn/ielts-downloadable-assets/ielts-sample-tests/ielts-speaking-sample-tasks-2023.pdf',
    format: 'PDF',
    size: '1.3 MB',
  },
  {
    id: 'ielts-academic-writing',
    exam: 'IELTS',
    provider: 'ielts-official',
    title: 'Academic Writing sample answers',
    description: 'Tasks 1 and 2 with example answers, band scores and examiner comments.',
    skill: 'Writing',
    url: 'https://ielts.org/cdn/computer-delivered-sample-tests-academic-writing/ielts-academic-writing-example-responses-to-parts-1-and-2-with-band-scores-and-examiner-comments.pdf',
    format: 'PDF',
    size: '0.5 MB',
  },
  {
    id: 'ielts-gt-writing',
    exam: 'IELTS',
    provider: 'ielts-official',
    title: 'General Training Writing sample answers',
    description: 'Tasks 1 and 2 with example answers, band scores and examiner comments.',
    skill: 'Writing',
    url: 'https://ielts.org/cdn/computer-delivered-sample-tests-general-training-writing/ielts-general-training-writing-example-responses-to-parts-1-and-2-with-band-scores-and-examiner-comments.pdf',
    format: 'PDF',
    size: '0.3 MB',
  },
  {
    id: 'bc-listening-tasks',
    exam: 'IELTS',
    provider: 'british-council',
    title: 'IELTS Listening sample tasks',
    description: 'Official questions for each Listening task type.',
    skill: 'Listening',
    url: 'https://takeielts.britishcouncil.org/sites/default/files/%5Bdownloads%5D/ielts-listening-sample-tasks-2023.pdf',
    format: 'PDF',
    size: '0.5 MB',
  },
  {
    id: 'bc-academic-reading-tasks',
    exam: 'IELTS',
    provider: 'british-council',
    title: 'Academic Reading sample tasks',
    description: 'Official passages and questions for each Academic Reading task type.',
    skill: 'Reading',
    url: 'https://takeielts.britishcouncil.org/sites/default/files/%5Bdownloads%5D/ielts-academic-reading-sample-tasks-2023.pdf',
    format: 'PDF',
    size: '0.9 MB',
  },
  {
    id: 'bc-gt-reading-tasks',
    exam: 'IELTS',
    provider: 'british-council',
    title: 'General Training Reading sample tasks',
    description: 'Official texts and questions for each General Training Reading task type.',
    skill: 'Reading',
    url: 'https://takeielts.britishcouncil.org/sites/default/files/%5Bdownloads%5D/ielts-general-reading-sample-tasks-2023.pdf',
    format: 'PDF',
    size: '0.9 MB',
  },
  {
    id: 'bc-academic-writing-tasks',
    exam: 'IELTS',
    provider: 'british-council',
    title: 'Academic Writing sample tasks',
    description: 'Official Task 1 and Task 2 questions for Academic Writing.',
    skill: 'Writing',
    url: 'https://takeielts.britishcouncil.org/sites/default/files/%5Bdownloads%5D/ielts-academic-writing-sample-tasks-2023.pdf',
    format: 'PDF',
    size: '1.4 MB',
  },
  {
    id: 'bc-gt-writing-tasks',
    exam: 'IELTS',
    provider: 'british-council',
    title: 'General Training Writing sample tasks',
    description: 'Official Task 1 and Task 2 questions for General Training Writing.',
    skill: 'Writing',
    url: 'https://takeielts.britishcouncil.org/sites/default/files/%5Bdownloads%5D/ielts-general-training-writing-sample-tasks-2023.pdf',
    format: 'PDF',
    size: '1.4 MB',
  },
  {
    id: 'bc-listening-answer-sheet',
    exam: 'IELTS',
    provider: 'british-council',
    title: 'Listening answer sheet',
    description: 'The official answer sheet, to practise on paper.',
    skill: 'Listening',
    url: 'https://takeielts.britishcouncil.org/sites/default/files/%5Bdownloads%5D/ielts-listening-answer-sheet-sample.pdf',
    format: 'PDF',
    size: '0.7 MB',
  },
  {
    id: 'bc-reading-answer-sheet',
    exam: 'IELTS',
    provider: 'british-council',
    title: 'Reading answer sheet',
    description: 'The official answer sheet, to practise on paper.',
    skill: 'Reading',
    url: 'https://takeielts.britishcouncil.org/sites/default/files/%5Bdownloads%5D/ielts-reading-answer-sheet-sample.pdf',
    format: 'PDF',
    size: '0.7 MB',
  },
  {
    id: 'cambridge-sample-papers',
    exam: 'IELTS',
    provider: 'cambridge',
    title: 'IELTS sample papers',
    description: '35 PDF sample tasks for Listening, Reading, Writing and Speaking, Academic and General Training, with audio.',
    skill: 'All skills',
    url: 'https://www.cambridgeenglish.org/Images/23435-ielts-sample-papers.zip',
    format: 'ZIP',
    size: '7.8 MB',
  },
  {
    id: 'pte-example-speaking',
    exam: 'PTE',
    provider: 'pearson',
    title: 'Example speaking questions',
    description: '30 questions of each of the two new speaking question types, with audio.',
    skill: 'Speaking',
    url: 'https://www.pearsonpte.com/content/dam/ELL/pte/pearsonpte/pdfs/pte-academic-pdfs/example-speaking-questions.zip',
    format: 'ZIP',
    size: '88.7 MB',
  },
  {
    id: 'pte-sample-answers',
    exam: 'PTE',
    provider: 'pearson',
    title: 'Speaking sample answers',
    description: 'Sample answers to the two new speaking question types, with examiner explanations.',
    skill: 'Speaking',
    url: 'https://www.pearsonpte.com/content/dam/ELL/pte/pearsonpte/pdfs/pte-academic-pdfs/sample-answers.zip',
    format: 'ZIP',
    size: '44 MB',
  },
  {
    id: 'pte-test-tips',
    exam: 'PTE',
    provider: 'pearson',
    title: 'PTE Academic test tips',
    description: 'Tips for all 20 question types, in the order they appear in the test.',
    skill: 'All skills',
    url: 'https://www.pearsonpte.com/ctf-assets/yqwtwibiobs4/593bRRQClFViOBb4NVYUgz/0b904c4360b5a801798529d456cdc041/23UKPTE50_PTE_Academic_Test_Tips.pdf',
    format: 'PDF',
    size: '2.9 MB',
  },
  {
    id: 'pte-speaking-tips',
    exam: 'PTE',
    provider: 'pearson',
    title: 'The two new speaking question types',
    description: 'How the two new speaking questions work, with examples, from Pearson.',
    skill: 'Speaking',
    url: 'https://www.pearsonpte.com/content/dam/ELL/pte/pearsonpte/pdfs/pte-academic-pdfs/test-tips-new-speaking-questions.pdf',
    format: 'PDF',
    size: '1.5 MB',
  },
];

/** Whether an exam has a Materials section at all. */
export function hasMaterials(exam: ExamType): boolean {
  return MATERIALS.some(material => material.exam === exam);
}

export function providersFor(exam: ExamType): MaterialProviderInfo[] {
  return MATERIAL_PROVIDERS.filter(provider => provider.exam === exam);
}

/** The materials for an exam, optionally from one provider only. */
export function materialsFor(exam: ExamType, provider?: string | null): Material[] {
  return MATERIALS.filter(material => material.exam === exam && (!provider || material.provider === provider));
}
