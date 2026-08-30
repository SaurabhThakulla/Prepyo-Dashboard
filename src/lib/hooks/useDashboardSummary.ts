'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { ExamType, Mistake, Pagination, ProgressSummary } from '@/lib/types';
import { useMyRank } from '@/lib/hooks/useLeaderboard';

/**
 * The three independent figures on the dashboard header.
 *
 * Each query stands on its own: one failing leaves that value null and the
 * other two still render, because a missing rank is no reason to hide the
 * score estimate.
 */
export function useDashboardSummary(activeExam: ExamType) {
  const progress = useQuery({
    queryKey: queryKeys.progress(),
    queryFn: () => api.get<ProgressSummary>('/progress'),
  });

  // limit=1 because only `pagination.total` is used — the row itself is thrown
  // away. The server still has to count, but it does not have to serialise a
  // page of mistakes the dashboard will never show.
  const unresolved = useQuery({
    queryKey: queryKeys.unresolvedMistakeCount(),
    queryFn: () =>
      api.get<{ pagination: Pagination; mistakes: Mistake[] }>('/mistakes', {
        unresolved: 'true',
        limit: 1,
      }),
  });

  const { rank } = useMyRank(activeExam);

  return {
    progress: progress.data ?? null,
    unresolvedMistakes: unresolved.data?.pagination.total ?? null,
    rank,
  };
}
