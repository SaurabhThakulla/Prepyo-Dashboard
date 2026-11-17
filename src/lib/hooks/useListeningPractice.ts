import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** One recording in a Listening part's practice list. */
export interface ListeningPracticePart {
  id: string;
  testTitle: string;
  partNo: number;
  /** A short name for the list ("Public libraries project"); older parts may have none. */
  title?: string;
  setting: string;
  /** The hardest level among its questions. */
  difficulty?: string;
  /** Its question groups' task types, in order (ielts-listening-mcq ...). */
  typeIds?: string[];
  practisedAt?: string;
}

/** A recording's name from its setting: "You will hear part of a lecture about X." -> "A lecture about X". */
export function listeningPartName(setting: string) {
  const name = setting.replace(/^you will hear (part of )?/i, '').replace(/\.$/, '');
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** The recordings a learner can practise as IELTS Listening Part `part`. */
export function useListeningPracticeParts(part: number | undefined, enabled = true) {
  return useQuery({
    queryKey: ['listening', 'practice-parts', part ?? 0],
    queryFn: () => api.get<{ parts: ListeningPracticePart[] }>(`/listening/practice/parts?part=${part}`),
    enabled: enabled && Boolean(part),
  });
}
