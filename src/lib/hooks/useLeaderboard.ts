import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { ExamType, LeaderboardEntry } from '@/lib/types';
import { fixtureLeaderboard, fixtureLeaderboardRegions, USE_FIXTURES } from '@/lib/fixtures';

export type LeaderboardPeriod = 'weekly' | 'monthly' | 'all-time';

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  regions: string[];
}

/**
 * The leaderboard for an exam, optionally filtered.
 *
 * The dashboard and the leaderboard page both call this with the same default
 * arguments, so they share one cached request rather than fetching twice.
 */
export function useLeaderboard(
  exam: ExamType,
  region = 'all',
  period: LeaderboardPeriod = 'all-time',
) {
  return useQuery({
    queryKey: queryKeys.leaderboard(exam, region, period),
    queryFn: () =>
      api.get<LeaderboardResponse>('/leaderboards', {
        exam,
        region: region === 'all' ? undefined : region,
        period,
      }),
    placeholderData: USE_FIXTURES
      ? { leaderboard: fixtureLeaderboard(exam), regions: fixtureLeaderboardRegions() }
      : undefined,
  });
}

/**
 * The signed-in learner's rank, for the dashboard card.
 *
 * TODO(backend): this reads one integer out of the whole leaderboard, because
 * there is nowhere else to get it. At 12k+ learners that is a large payload for
 * a single number. Add `rank` to GET /progress (or add GET /leaderboards/me)
 * and this hook becomes a field read instead of a list scan.
 *
 * Until then it at least shares the leaderboard page's cache, so the dashboard
 * costs no extra request when the two are visited in the same session.
 */
export function useMyRank(exam: ExamType) {
  const { data, isLoading } = useLeaderboard(exam);
  return {
    rank: data?.leaderboard.find(entry => entry.isYou)?.rank ?? null,
    isLoading,
  };
}
