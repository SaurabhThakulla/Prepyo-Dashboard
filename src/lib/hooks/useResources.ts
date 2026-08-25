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

/**
 * One hook per API resource.
 *
 * Each is a thin `useQuery` wrapper, so any two components asking for the same
 * resource share a request and a cache entry. Add a resource here rather than
 * calling `api.get` from a component.
 *
 * Nothing here seeds a first render with invented content. A hook that has not
 * loaded reports pending, and one that failed reports its error — which is what
 * lets a page say so instead of showing numbers nobody earned.
 */

export function useMocks(exam: ExamType) {
  return useQuery({
    queryKey: queryKeys.mocks(exam),
    queryFn: () => api.get<{ mocks: Mock[] }>('/mocks', { exam }),
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
  });
}

const QUESTION_PAGE_SIZE = 200;

export function useQuestions(exam: ExamType, skill: SkillType) {
  return useQuery({
    queryKey: queryKeys.questions(exam, skill),
    queryFn: () =>
      api.get<{ questions: Question[] }>('/questions', { exam, skill, limit: QUESTION_PAGE_SIZE }),
  });
}

export function useEvaluationHistory(limit = 5) {
  return useQuery({
    queryKey: queryKeys.evaluations(limit),
    queryFn: () => api.get<{ evaluations: Evaluation[] }>('/evaluations', { limit }),
  });
}

/**
 * Prices must match what checkout charges, so this one never had a fixture even
 * when the others did. See src/pages/SubscriptionPage.tsx.
 */
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: queryKeys.subscriptionPlans(),
    queryFn: () => api.get<{ plans: SubscriptionPlan[] }>('/subscriptions/plans'),
    // Prices change rarely and are the same for everyone.
    staleTime: 10 * 60_000,
  });
}
