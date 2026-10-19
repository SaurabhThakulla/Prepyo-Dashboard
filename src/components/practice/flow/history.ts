import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Evaluation, PracticeAttempt } from '@/lib/types';

/** One past try shown in My Score: a marked answer, an AI evaluation, or a whole passage sitting. */
export type PastTry =
  | { kind: 'attempt'; id: string; at: string; attempt: PracticeAttempt }
  | { kind: 'evaluation'; id: string; at: string; evaluation: Evaluation }
  | { kind: 'sitting'; id: string; at: string; attempts: PracticeAttempt[] };

interface HistoryResponse {
  attempts?: PracticeAttempt[] | null;
  evaluations?: Evaluation[] | null;
}

export const historyKey = (questionIds: string[]) => ['practice-history', ...questionIds] as const;

/** The learner's own earlier attempts at these questions, from GET /practice/history. */
export function usePracticeHistory(questionIds: string[], enabled = true) {
  return useQuery({
    queryKey: historyKey(questionIds),
    queryFn: () =>
      api.get<HistoryResponse>(`/practice/history?${questionIds.map(id => `questionId=${encodeURIComponent(id)}`).join('&')}`),
    enabled: enabled && questionIds.length > 0,
    staleTime: 0,
  });
}

/** Newest first; a passage's answers, checked together, become one sitting. */
export function pastTries(data: HistoryResponse | undefined, bySitting: boolean): PastTry[] {
  const attempts = data?.attempts ?? [];
  const evaluations = data?.evaluations ?? [];
  const tries: PastTry[] = [
    ...evaluations.map(e => ({ kind: 'evaluation' as const, id: e.id, at: e.createdAt, evaluation: e })),
    ...(bySitting
      ? sittings(attempts)
      : attempts.map(a => ({ kind: 'attempt' as const, id: a.id, at: a.createdAt, attempt: a }))),
  ];
  return tries.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

// A passage is checked in one go, so its answers land within moments of each other.
const SITTING_GAP_MS = 10 * 60_000;

function sittings(attempts: PracticeAttempt[]): PastTry[] {
  const oldestFirst = [...attempts].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const groups: PracticeAttempt[][] = [];
  for (const a of oldestFirst) {
    const last = groups[groups.length - 1];
    const prev = last?.[last.length - 1];
    const sameSitting = prev
      && Date.parse(a.createdAt) - Date.parse(prev.createdAt) < SITTING_GAP_MS
      && !last.some(x => x.questionId === a.questionId);
    if (sameSitting) last.push(a);
    else groups.push([a]);
  }
  return groups.map(g => ({ kind: 'sitting' as const, id: g[0].id, at: g[g.length - 1].createdAt, attempts: g }));
}
