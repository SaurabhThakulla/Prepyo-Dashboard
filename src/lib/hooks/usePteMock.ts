import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { PteCatalogResponse, PteHistoryEntry, PteReport } from '@/lib/pteMock/types';

/** Every kind of PTE mock, with what the bank can deal and the learner's open papers. */
export function usePteMockCatalog(enabled = true) {
  return useQuery({
    queryKey: queryKeys.pteMockCatalog(),
    queryFn: () => api.get<PteCatalogResponse>('/pte/mocks/catalog'),
    enabled,
    staleTime: 30_000,
  });
}

/** The learner's PTE mocks, newest first. */
export function usePteMockHistory(enabled = true) {
  return useQuery({
    queryKey: queryKeys.pteMockHistory(),
    queryFn: () => api.get<{ sessions: PteHistoryEntry[] }>('/pte/mocks/sessions', { limit: 50 }),
    enabled,
  });
}

/**
 * A paper's score report. Scoring runs on the server after the last item, so
 * while it runs the report is polled; it stops once the paper is complete.
 */
export function usePteMockReport(sessionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.pteMockReport(sessionId ?? ''),
    queryFn: () => api.get<{ report: PteReport }>(`/pte/mocks/${sessionId}/report`),
    enabled: Boolean(sessionId),
    refetchInterval: query => (query.state.data?.report.status === 'scoring' ? 3000 : false),
  });
}
