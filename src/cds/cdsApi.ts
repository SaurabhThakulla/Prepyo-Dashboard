import { api } from '@/lib/api';

/** CDS papers, and NCC's (000226): practice banks of common and Army Wing subjects, and the B and C mocks. */
export type CdsPaperType = 'english' | 'gk' | 'maths' | 'ncc_common' | 'ncc_army' | 'ncc_navy' | 'ncc_air' | 'ncc_b' | 'ncc_c';

export interface CdsPaper {
  id: string;
  year: number;
  session: number;
  paperType: CdsPaperType;
  title: string;
  durationMinutes: number;
  totalQuestions: number;
  maxMarks: number;
  correctMark: number;
  penaltyMark: number;
  isActive: boolean;
  /** The paper's questions by difficulty: { easy: 4, medium: 5, hard: 1 }. */
  levels?: Record<string, number>;
  createdAt: string;
}

export interface CdsQuestion {
  id: string;
  paperId: string;
  questionNumber: number;
  topic: string;
  stimulus: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption?: string;
  explanation?: string;
  imageUrl?: string | null;
  difficulty?: 'easy' | 'medium' | 'hard';
  createdAt: string;
}

export interface CdsAttempt {
  id: string;
  userId: string;
  paperId: string;
  answers: Record<string, string>;
  status: 'in_progress' | 'completed' | 'abandoned';
  startedAt: string;
  submittedAt?: string;
  timeSpentSeconds: number;
  totalAttempted: number;
  totalCorrect: number;
  totalWrong: number;
  rawScore: number;
  penalty: number;
  netScore: number;
  isQualified: boolean;
  paperTitle?: string;
  paperType?: CdsPaperType;
}

export interface CdsScoreResult {
  paperType: CdsPaperType;
  totalQuestions: number;
  attempted: number;
  correct: number;
  wrong: number;
  unanswered: number;
  rawScore: number;
  penalty: number;
  netScore: number;
  maxMarks: number;
  isQualified: boolean;
  accuracyPct: number;
}

export interface CdsMistake {
  id: string;
  userId: string;
  questionId: string;
  lastSelectedOption: string;
  timesWrong: number;
  isResolved: boolean;
  updatedAt: string;
  question?: CdsQuestion;
}

export interface CdsUserPlan {
  isPremium: boolean;
  freeMocksLimit: number;
  completedMocks: number;
  hasReachedLimit: boolean;
}

export interface SubmitAttemptPayload {
  answers: Record<string, string>;
  timeSpentSeconds: number;
}

/** The papers of one exam in the cds schema, UPSC CDS or NCC, with that exam's plan. */
export async function fetchCdsPapers(exam: 'CDS' | 'NCC' = 'CDS'): Promise<{ papers: CdsPaper[]; plan?: CdsUserPlan }> {
  return api.get<{ papers: CdsPaper[]; plan?: CdsUserPlan }>(`/cds/papers?exam=${exam}`);
}

export async function fetchCdsPaper(id: string): Promise<{ paper: CdsPaper; questions: CdsQuestion[] }> {
  return api.get<{ paper: CdsPaper; questions: CdsQuestion[] }>(`/cds/papers/${id}`);
}

export async function startCdsAttempt(paperId: string): Promise<{ attempt: CdsAttempt; questions: CdsQuestion[] }> {
  return api.post<{ attempt: CdsAttempt; questions: CdsQuestion[] }>(`/cds/papers/${paperId}/attempts`);
}

export async function fetchCdsAttempt(attemptId: string): Promise<{ attempt: CdsAttempt; questions: CdsQuestion[] }> {
  return api.get<{ attempt: CdsAttempt; questions: CdsQuestion[] }>(`/cds/attempts/${attemptId}`);
}

export async function submitCdsAttempt(
  attemptId: string,
  payload: SubmitAttemptPayload
): Promise<{ attempt: CdsAttempt; score: CdsScoreResult }> {
  return api.post<{ attempt: CdsAttempt; score: CdsScoreResult }>(`/cds/attempts/${attemptId}/submit`, payload);
}

export async function fetchCdsAttempts(): Promise<{ attempts: CdsAttempt[] }> {
  return api.get<{ attempts: CdsAttempt[] }>('/cds/attempts');
}

export async function fetchCdsMistakes(
  topic?: string,
  resolved?: boolean
): Promise<{ mistakes: CdsMistake[] }> {
  return api.get<{ mistakes: CdsMistake[] }>('/cds/mistakes', { topic, resolved });
}

export async function resolveCdsMistake(id: string): Promise<{ message: string }> {
  return api.post<{ message: string }>(`/cds/mistakes/${id}/resolve`);
}

/** 'ima': IMA, INA and AFA sit all three papers; 'ota': OTA sits English and GK only. */
export type CdsTrack = 'ima' | 'ota';

/** The learner's NCC certificate, if any. */
export type CdsNcc = 'none' | 'b' | 'c';

/** The NCC wing a cadet belongs to; it decides the specialised subjects. */
export type NccWing = 'army' | 'navy' | 'air';

export async function fetchCdsTrack(): Promise<{ track: CdsTrack; ncc: CdsNcc; wing?: NccWing }> {
  return api.get<{ track: CdsTrack; ncc: CdsNcc; wing?: NccWing }>('/cds/track');
}

/** Saves the route, and the NCC certificate when given (left out, the saved one stays). */
export async function saveCdsTrack(track: CdsTrack, ncc?: CdsNcc): Promise<{ track: CdsTrack; ncc: CdsNcc }> {
  return api.put<{ track: CdsTrack; ncc: CdsNcc }>('/cds/track', ncc ? { track, ncc } : { track });
}

/** Five practice questions submitted together, as the Mistake Bank lists them. */
export interface CdsPracticeSet {
  id: string;
  /** A question type key (spotting-errors) or paper:<type> for a whole paper's practice. */
  practice: string;
  setNumber: number;
  answers: Record<string, string>;
  correct: number;
  total: number;
  createdAt: string;
}

export interface CdsChecked {
  isCorrect: boolean;
  correctOption: string;
  explanation: string;
}

export const cdsApi = {
  getPapers: fetchCdsPapers,
  getPaper: fetchCdsPaper,
  startAttempt: startCdsAttempt,
  getAttempt: fetchCdsAttempt,
  submitAttempt: submitCdsAttempt,
  getAttempts: fetchCdsAttempts,
  getMistakes: fetchCdsMistakes,
  resolveMistake: resolveCdsMistake,
  getTrack: fetchCdsTrack,
  submitSet: (body: { practice: string; setNumber: number; answers: Record<string, string> }) =>
    api.post<{ set: CdsPracticeSet; results: Record<string, CdsChecked> }>('/cds/practice/sets', body),
  getSets: () => api.get<{ sets: CdsPracticeSet[] }>('/cds/practice/sets'),
  getSet: (id: string) => api.get<{ set: CdsPracticeSet; results: Record<string, CdsChecked> }>(`/cds/practice/sets/${id}`),
  setTrack: saveCdsTrack,
  setWing: (wing: NccWing) => api.put<{ wing: NccWing }>('/cds/wing', { wing }),
};
