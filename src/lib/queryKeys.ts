import { ExamType, SkillType } from '@/lib/types';

/**
 * Every React Query key in the app, in one place.
 *
 * Two rules make the cache work:
 *
 * 1. Two places that want the same data must build the same key. The dashboard
 *    and the leaderboard page both call `leaderboard(exam)`, so they share one
 *    request instead of making two.
 * 2. A key must name everything the request varies by. `questions` includes the
 *    skill, so switching skill fetches, but switching back is instant.
 *
 * Keys are arrays so a prefix can invalidate a group:
 * `queryClient.invalidateQueries({ queryKey: ['mocks'] })` clears every mock
 * query regardless of exam.
 */
export const queryKeys = {
  dashboard: (exam: ExamType) => ['dashboard', exam] as const,
  progress: () => ['progress'] as const,

  leaderboard: (exam: ExamType, region?: string, period?: string) =>
    ['leaderboard', exam, region ?? 'all', period ?? 'all-time'] as const,

  mistakes: (exam: ExamType, skill?: string, unresolvedOnly?: boolean, period?: string) =>
    ['mistakes', exam, skill ?? 'all', unresolvedOnly ?? false, period ?? 'weekly'] as const,

  mistakeAnalytics: (exam: ExamType, period: string) =>
    ['mistakes', 'analytics', exam, period] as const,

  /** Just the unresolved count for the dashboard — a cheap limit=1 request. */
  unresolvedMistakeCount: () => ['mistakes', 'unresolved-count'] as const,

  questions: (exam: ExamType, skill: SkillType) => ['questions', exam, skill] as const,

  mocks: (exam: ExamType) => ['mocks', exam] as const,
  mockAttempts: () => ['mocks', 'attempts'] as const,

  /** The reading task-type menu. Content, so it is the same for everyone. */
  readingTypes: (exam: ExamType) => ['reading', 'types', exam] as const,
  /** The learner's live reading paper, if they have one. */
  readingMockSession: (exam: ExamType) => ['reading', 'mock', exam] as const,

  evaluations: (limit: number) => ['evaluations', limit] as const,

  subscriptionPlans: () => ['subscription-plans'] as const,
} as const;
