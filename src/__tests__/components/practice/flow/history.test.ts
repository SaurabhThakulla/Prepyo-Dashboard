import { describe, expect, it } from 'vitest';
import { pastTries } from '@/components/practice/flow/history';
import type { Evaluation, PracticeAttempt } from '@/lib/types';

const attempt = (id: string, questionId: string, at: string): PracticeAttempt => ({
  id, questionId, examVersionId: 'v', isCorrect: true, score: 1, maxScore: 1,
  accuracyPercentage: 100, feedback: '', timeSpentSeconds: 1, createdAt: at,
});

describe('pastTries', () => {
  it('lists attempts and evaluations newest first', () => {
    const tries = pastTries({
      attempts: [attempt('a1', 'q', '2026-10-01T10:00:00Z')],
      evaluations: [{ id: 'e1', createdAt: '2026-10-02T10:00:00Z' } as Evaluation],
    }, false);
    expect(tries.map(t => t.id)).toEqual(['e1', 'a1']);
  });

  it('groups a passage checked in one go into one sitting', () => {
    const tries = pastTries({
      attempts: [
        attempt('a1', 'q1', '2026-10-01T10:00:00Z'),
        attempt('a2', 'q2', '2026-10-01T10:00:02Z'),
        attempt('b1', 'q1', '2026-10-03T09:00:00Z'),
      ],
    }, true);
    expect(tries.map(t => (t.kind === 'sitting' ? t.attempts.length : 0))).toEqual([1, 2]);
  });

  it('copes with a response without lists', () => {
    expect(pastTries({ attempts: null, evaluations: null }, true)).toEqual([]);
    expect(pastTries(undefined, false)).toEqual([]);
  });
});
