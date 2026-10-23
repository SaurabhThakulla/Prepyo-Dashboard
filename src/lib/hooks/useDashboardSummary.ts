import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { Mistake, Pagination, ProgressSummary, ExamType } from '@/lib/types';

export function useDashboardSummary(_activeExam: ExamType) {
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

  return {
    progress: progress.data ?? null,
    unresolvedMistakes: unresolved.data?.pagination.total ?? null,
    isLoading: progress.isPending,
    error: progress.error,
  };
}
