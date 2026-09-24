import { AnswerSubmission, Question, ReadingParagraph, ReadingPassage, SkillType } from '@/lib/types';
import { Delivery } from '@/lib/delivery';

/**
 * The PTE mock test API (/pte/mocks), as the Go package ptemock serves it.
 *
 * The server owns everything about a paper: what it is made of, the order of
 * the items, every clock, and the score. The browser shows the item it is
 * given and sends back the answer. Nothing here is a second copy of the
 * blueprint — timings, instructions and item counts all arrive with the data.
 */

export type PteMockKind = 'full' | 'speaking' | 'writing' | 'reading' | 'listening';
export type PtePart = 'speaking_writing' | 'reading' | 'listening';
export type PteClock = 'response' | 'item' | 'section';
export type PteSessionStatus = 'in_progress' | 'scoring' | 'completed' | 'abandoned';
export type PteItemStatus = 'pending' | 'answered' | 'skipped' | 'timed_out';

/** One PTE task type as the test runs it (ptemock.Task). */
export interface PteTask {
  code: string;
  name: string;
  skill: SkillType;
  part: PtePart;
  clock: PteClock;
  prepSeconds?: number;
  responseSeconds?: number;
  /** The "Beginning in N seconds" before a recording plays. */
  audioDelaySeconds?: number;
  /** An item clock's own time, or its share of the part clock. */
  seconds?: number;
  instructions: string;
  weights: Partial<Record<SkillType, number>>;
  minWords?: number;
  maxWords?: number;
}

export interface PtePartView {
  part: PtePart;
  label: string;
  first: number;
  last: number;
  items: number;
}

export interface PteClockView {
  key: string;
  scope: 'item' | 'part';
  totalSeconds: number;
  secondsRemaining: number;
  deadline: string;
}

export interface PteItemView {
  position: number;
  task: PteTask;
  part: PtePart;
  question: Question;
  passage?: ReadingPassage;
  resources?: ReadingParagraph[];
  draft?: AnswerSubmission;
  partPosition: number;
  partItems: number;
}

export interface PteTaskResult {
  code: string;
  name: string;
  part: PtePart;
  items: number;
  scored: number;
  percent: number;
  weights: Partial<Record<SkillType, number>>;
}

export interface PteResult {
  overall: number | null;
  skills: Partial<Record<SkillType, number>>;
  tasks: PteTaskResult[];
  unscored: number;
  answered: number;
  items: number;
}

export interface PteSession {
  id: string;
  kind: PteMockKind;
  title: string;
  status: PteSessionStatus;
  current: number;
  totalItems: number;
  answered: number;
  parts: PtePartView[];
  item?: PteItemView;
  clock?: PteClockView;
  missing: string[];
  createdAt: string;
  completedAt?: string;
  scored: number;
  result?: PteResult;
}

export interface PteReviewItem {
  position: number;
  task: string;
  taskName: string;
  part: PtePart;
  status: PteItemStatus;
  question: Question;
  explanation?: string;
  modelAnswer?: string;
  response?: AnswerSubmission;
  transcript?: string;
  /** Who transcribed a spoken answer: the server (Whisper), or the browser. */
  transcriptSource?: 'browser' | 'server';
  scored: boolean;
  percent: number | null;
  score: number | null;
  maxScore: number | null;
  unscoredReason?: string;
  feedback?: string;
  correctDisplay?: string;
  userDisplay?: string;
  evaluationId?: string;
}

export interface PteReport extends PteSession {
  skills: SkillType[];
  review: PteReviewItem[];
}

export interface PteSlotView {
  code: string;
  name: string;
  skill: SkillType;
  part: PtePart;
  count: number;
  available: number;
}

export interface PteCatalogEntry {
  kind: PteMockKind;
  mockId: string;
  title: string;
  description: string;
  skills: SkillType[];
  fullAllowance: boolean;
  parts: PtePartView[];
  tasks: PteSlotView[];
  itemCount: number;
  availableItems: number;
  estimatedMinutes: number;
  missing: string[];
  available: boolean;
  cost: { kind: 'full_mock' | 'sub_tests'; credits: number };
  live?: { id: string; current: number; totalItems: number; createdAt: string };
  latest?: PteHistoryEntry;
}

export interface PteHistoryEntry {
  id: string;
  kind: PteMockKind;
  title: string;
  status: PteSessionStatus;
  headline: number | null;
  result?: PteResult;
  totalItems: number;
  createdAt: string;
  completedAt?: string;
}

/** What is sent for the item on screen. */
export interface PteAnswer {
  response?: AnswerSubmission;
  transcript?: string;
  durationSeconds?: number;
  delivery?: Delivery;
  /**
   * A spoken answer's recording (base64, in `format`), sent with every spoken
   * answer as the IELTS speaking mock sends it. The server transcribes it with
   * Whisper; `transcript` is the browser's, kept if the server cannot.
   */
  audio?: string;
  format?: 'mp3' | 'wav';
}

/** GET /pte/mocks/catalog. */
export interface PteCatalogResponse {
  mocks: PteCatalogEntry[];
  tasks: PteTask[];
  /** Whether the server transcribes spoken answers (Whisper). */
  serverTranscription: boolean;
}
