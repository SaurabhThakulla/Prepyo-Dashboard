import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** One recording in a Listening part's practice list. */
export interface ListeningPracticePart {
  id: string;
  testTitle: string;
  partNo: number;
  setting: string;
  practisedAt?: string;
}

/** The recordings a learner can practise as IELTS Listening Part `part`. */
export function useListeningPracticeParts(part: number | undefined, enabled = true) {
  return useQuery({
    queryKey: ['listening', 'practice-parts', part ?? 0],
    queryFn: () => api.get<{ parts: ListeningPracticePart[] }>(`/listening/practice/parts?part=${part}`),
    enabled: enabled && Boolean(part),
  });
}
