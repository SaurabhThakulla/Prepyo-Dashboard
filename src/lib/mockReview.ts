import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Evaluation, MockAttempt, QuestionOption } from '@/lib/types';

/** The four IELTS skills, in the order of the test. */
export const IELTS_SKILLS = ['listening', 'reading', 'writing', 'speaking'] as const;
export type IeltsSkill = (typeof IELTS_SKILLS)[number];

/** One listening or reading question with what the learner answered. Mirrors mockreview.Item. */
export interface ReviewItem {
  /** The paper's question numbers: one for most items, more for a multi-gap item. */
  from: number;
  to: number;
  /** Listening part or reading passage, from 1. */
  part: number;
  typeId: string;
  question: string;
  options?: QuestionOption[];
  /** Empty when the learner left it blank. */
  response: string;
  correct: string;
  marks: number;
  outOf: number;
  explanation?: string;
}

export interface ReviewTask {
  key: 'task1' | 'task2';
  title: string;
  prompt: string;
  imageUrl?: string;
  answer: string;
  words: number;
  evaluation?: Evaluation;
}

export interface ReviewTurn {
  key: string;
  part: number;
  question: string;
  transcript: string;
  seconds: number;
  hasRecording: boolean;
  /** This answer rated on its own, from the same AI reply as the test; absent on older tests. */
  evaluation?: Evaluation;
}

export interface ReviewSection {
  skill: IeltsSkill;
  band: number | null;
  /** The numbered test sat ("Test 3"), when it was one. */
  paperNumber?: number;
  paperTitle?: string;
  correct?: number;
  total?: number;
  items?: ReviewItem[];
  scripts?: string[];
  tasks?: ReviewTask[];
  turns?: ReviewTurn[];
  evaluation?: Evaluation;
}

export interface MockReview {
  attempt: MockAttempt;
  module?: 'academic' | 'general_training';
  sections: ReviewSection[];
}

export const mockReviewKey = (attemptId: string) => ['mocks', 'review', attemptId] as const;

/** A handed-in IELTS attempt, question by question. */
export function useMockReview(attemptId: string | undefined) {
  return useQuery({
    queryKey: mockReviewKey(attemptId ?? ''),
    queryFn: async () => (await api.get<{ review: MockReview }>(`/mock-reviews/${encodeURIComponent(attemptId!)}`)).review,
    enabled: Boolean(attemptId),
    staleTime: 60_000,
  });
}

/** Where a spoken answer's recording is played from (the session cookie signs it). */
export function recordingUrl(attemptId: string, key: string): string {
  return `/api/v1/mock-reviews/${encodeURIComponent(attemptId)}/recordings/${encodeURIComponent(key)}`;
}

/** An item is right, partly right, wrong or left blank. */
export type ItemStatus = 'correct' | 'partial' | 'wrong' | 'blank';

export function itemStatus(item: ReviewItem): ItemStatus {
  if (item.marks >= item.outOf) return 'correct';
  if (!item.response.trim()) return 'blank';
  return item.marks > 0 ? 'partial' : 'wrong';
}

/**
 * The IELTS 9-band scale's name for a band, as the test report states it
 * (ielts.org, "How IELTS is scored").
 */
export function bandDescriptor(band: number): string {
  const names = ['Did not attempt the test', 'Non user', 'Intermittent user', 'Extremely limited user', 'Limited user',
    'Modest user', 'Competent user', 'Good user', 'Very good user', 'Expert user'];
  return names[Math.max(0, Math.min(9, Math.floor(band)))];
}

/** The CEFR level IELTS maps an overall band to (ielts.org, "IELTS and the CEFR"). */
export function cefrLevel(band: number): string {
  if (band >= 8.5) return 'C2';
  if (band >= 7) return 'C1';
  if (band >= 5.5) return 'B2';
  if (band >= 4) return 'B1';
  return 'Below B1';
}

/** An IELTS band rounded as IELTS does: under .25 down, under .75 to the half, else up (scoring.RoundIELTSBand). */
export function roundIeltsBand(raw: number): number {
  const value = Math.max(0, Math.min(9, raw));
  const floor = Math.floor(value);
  const fraction = value - floor;
  return Math.min(9, fraction < 0.25 ? floor : fraction < 0.75 ? floor + 0.5 : floor + 1);
}

/** The Writing band from its two tasks: Task 2 counts twice (writingmock.Band). */
export const ieltsWritingBand = (task1: number, task2: number) => roundIeltsBand((task1 + 2 * task2) / 3);

/** The overall band: the mean of all four sections, rounded; null until all four have one. */
export function ieltsOverallBand(bands: Partial<Record<IeltsSkill, number | null>>): number | null {
  const values = IELTS_SKILLS.map(skill => bands[skill]);
  if (values.some(v => v == null)) return null;
  return roundIeltsBand((values as number[]).reduce((sum, v) => sum + v, 0) / 4);
}
