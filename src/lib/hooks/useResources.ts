'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import {
  Evaluation,
  ExamType,
  Mistake,
  Mock,
  MockAttempt,
  Pagination,
  Question,
  SkillType,
  SubscriptionPlan,
} from '@/lib/types';
import {
  fixtureEvaluations,
  fixtureMistakes,
  fixtureMocks,
  fixtureWritingQuestions,
  USE_FIXTURES,
} from '@/lib/fixtures';

/**
 * One hook per API resource.
 *
 * Each is a thin `useQuery` wrapper, so any two components asking for the same
 * resource share a request and a cache entry. Add a resource here rather than
 * calling `api.get` from a component.
 *
 * `placeholderData` supplies fixture data for the first render when
 * NEXT_PUBLIC_USE_FIXTURES is on. It is a placeholder, not cached data, so the
 * real request still runs and still reports its errors.
 */

export function useMocks(exam: ExamType) {
  return useQuery({
    queryKey: queryKeys.mocks(exam),
    queryFn: () => api.get<{ mocks: Mock[] }>('/mocks', { exam }),
    placeholderData: USE_FIXTURES ? { mocks: fixtureMocks(exam) } : undefined,
  });
}

export function useMockAttempts() {
  return useQuery({
    queryKey: queryKeys.mockAttempts(),
    queryFn: () => api.get<{ attempts: MockAttempt[] }>('/mocks/attempts'),
  });
}

export function useMistakes(exam: ExamType, skill: string, unresolvedOnly: boolean) {
  return useQuery({
    queryKey: queryKeys.mistakes(exam, skill, unresolvedOnly),
    queryFn: () =>
      api.get<{ mistakes: Mistake[]; pagination: Pagination }>('/mistakes', {
        exam,
        skill: skill === 'all' ? undefined : skill,
        unresolved: unresolvedOnly ? 'true' : undefined,
      }),
    placeholderData: USE_FIXTURES
      ? { mistakes: fixtureMistakes(), pagination: { total: 4, limit: 20, offset: 0, hasMore: false } }
      : undefined,
  });
}

export function useQuestions(exam: ExamType, skill: SkillType) {
  return useQuery({
    queryKey: queryKeys.questions(exam, skill),
    queryFn: () => api.get<{ questions: Question[] }>('/questions', { exam, skill }),
    placeholderData:
      USE_FIXTURES && skill === 'writing' ? { questions: fixtureWritingQuestions(exam) } : undefined,
  });
}

export function useEvaluationHistory(limit = 5) {
  return useQuery({
    queryKey: queryKeys.evaluations(limit),
    queryFn: () => api.get<{ evaluations: Evaluation[] }>('/evaluations', { limit }),
    placeholderData: USE_FIXTURES ? { evaluations: fixtureEvaluations() } : undefined,
  });
}

/**
 * Plans have no fixture on purpose: whatever this shows must match what
 * checkout charges. See src/app/subscription/page.tsx.
 */
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: queryKeys.subscriptionPlans(),
    queryFn: () => api.get<{ plans: SubscriptionPlan[] }>('/subscriptions/plans'),
    // Prices change rarely and are the same for everyone.
    staleTime: 10 * 60_000,
  });
}
