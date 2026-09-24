import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { MockPaperItem } from '@/lib/types';

export function useMockPapers(exam: string, section: string, module?: string, enabled = true) {
  const normExam = exam?.toLowerCase() || '';
  const normSection = section?.toLowerCase() || '';
  const normModule = module?.toLowerCase() || '';

  return useQuery({
    queryKey: queryKeys.mockPapers(normExam, normSection, normModule),
    queryFn: async () => {
      const params: Record<string, string> = {
        exam: normExam,
        section: normSection,
      };
      if (normModule) {
        params.module = normModule;
      }
      const data = await api.get<{ papers: MockPaperItem[] }>('/mock-papers', params);
      return data?.papers || [];
    },
    enabled: enabled && Boolean(normExam) && Boolean(normSection),
    staleTime: 15_000,
  });
}

/**
 * Marks every numbered-test list stale. Starting or finishing a test changes
 * the learner's status on it, so the list is refetched rather than shown stale.
 */
export function useRefreshMockPapers() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['mock-papers'] });
  }, [queryClient]);
}
