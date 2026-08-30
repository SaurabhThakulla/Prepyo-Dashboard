import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { DashboardData, ExamType, Mistake, Pagination, ProgressSummary } from '@/lib/types';
import { useMyRank } from '@/lib/hooks/useLeaderboard';
import { fixtureDashboard, USE_FIXTURES } from '@/lib/fixtures';

/**
 * The dashboard data hook.
 *
 * Fetches the unified dashboard payload (`/dashboard`), with resilient fallbacks
 * to granular progress and mistake counts.
 */
export function useDashboardSummary(activeExam: ExamType) {
  const dashboardQuery = useQuery({
    queryKey: queryKeys.dashboard(activeExam),
    queryFn: () => api.get<DashboardData>('/dashboard', { exam: activeExam }),
    placeholderData: USE_FIXTURES ? fixtureDashboard(activeExam) : undefined,
  });

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

  const fallback = fixtureDashboard(activeExam);
  const dashboard = dashboardQuery.data ?? fallback;

  return {
    dashboard,
    progress: progress.data ?? null,
    unresolvedMistakes: unresolved.data?.pagination.total ?? dashboard.unresolvedMistakesCount ?? 3,
    rank: rank ?? dashboard.user.rank ?? 4,
    isLoading: dashboardQuery.isPending,
    error: dashboardQuery.error,
  };
}

