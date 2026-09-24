import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { AnswerSubmission } from '@/lib/types';
import { PteAnswer, PteSession } from '@/lib/pteMock/types';

/**
 * Everything about taking a PTE paper that is not drawing it: the session the
 * server last sent, sending answers and drafts, and the countdown.
 *
 * The server decides what is on screen and how long is left. The countdown
 * here is only a display of the server's number: it is re-read from every
 * response, measured against this device's own monotonic clock so a wrong
 * system time cannot shorten or lengthen it.
 */
export function usePteTestRunner(initial: PteSession) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<PteSession>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(initial.clock?.secondsRemaining ?? null);
  const deadlineRef = useRef<number | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  // Re-anchor the countdown whenever the server reports the clock.
  const adopt = useCallback((next: PteSession) => {
    setSession(next);
    if (next.clock) {
      deadlineRef.current = performance.now() + next.clock.secondsRemaining * 1000;
      setSecondsLeft(next.clock.secondsRemaining);
    } else {
      deadlineRef.current = null;
      setSecondsLeft(null);
    }
  }, []);

  useEffect(() => {
    adopt(initial);
  }, [initial, adopt]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (deadlineRef.current == null) return;
      const left = Math.max(0, Math.ceil((deadlineRef.current - performance.now()) / 1000));
      setSecondsLeft(prev => (prev === left ? prev : left));
    }, 250);
    return () => clearInterval(timer);
  }, []);

  /** Reads the paper again, when the browser and server disagree about where it is. */
  const resync = useCallback(async () => {
    const data = await api.get<{ session: PteSession }>(`/pte/mocks/${sessionRef.current.id}`);
    adopt(data.session);
    return data.session;
  }, [adopt]);

  /** Sends the answer to the item on screen; the server replies with the next. */
  const submit = useCallback(
    async (answer: PteAnswer): Promise<PteSession | null> => {
      const current = sessionRef.current;
      if (!current.item) return current;
      setSubmitting(true);
      setError(null);
      try {
        const data = await api.post<{ session: PteSession }>(
          `/pte/mocks/${current.id}/items/${current.item.position}`,
          answer,
        );
        adopt(data.session);
        if (data.session.status !== 'in_progress') {
          void queryClient.invalidateQueries({ queryKey: ['pte-mocks'] });
        }
        return data.session;
      } catch (err) {
        // The item is no longer on screen (its time ran out, or another tab
        // moved on): show whatever the server says is there now.
        if (err instanceof ApiError && err.status === 409) {
          return await resync().catch(() => null);
        }
        setError(err instanceof Error ? err.message : 'Your answer could not be sent.');
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [adopt, queryClient, resync],
  );

  /** Keeps the answer so far, which is what is marked if time runs out. */
  const saveDraft = useCallback(async (response: AnswerSubmission) => {
    const current = sessionRef.current;
    if (!current.item || current.status !== 'in_progress') return;
    try {
      await api.put(`/pte/mocks/${current.id}/items/${current.item.position}/draft`, { response });
    } catch {
      // A missed draft is not worth interrupting the test for: the next one,
      // or the answer itself, carries the same words.
    }
  }, []);

  const finish = useCallback(async () => {
    setSubmitting(true);
    try {
      const data = await api.post<{ session: PteSession }>(`/pte/mocks/${sessionRef.current.id}/finish`);
      adopt(data.session);
      void queryClient.invalidateQueries({ queryKey: ['pte-mocks'] });
      return data.session;
    } finally {
      setSubmitting(false);
    }
  }, [adopt, queryClient]);

  return { session, submitting, error, secondsLeft, submit, saveDraft, finish, resync };
}
