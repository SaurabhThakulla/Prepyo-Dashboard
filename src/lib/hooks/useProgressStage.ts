import { useEffect, useState } from 'react';

export interface ProgressStage {
  /** Seconds into the wait at which this wording takes over. */
  afterSeconds: number;
  label: string;
}

/**
 * The wording shown while something slow is happening.
 *
 * Marking an answer takes around half a minute on a reasoning model, and a
 * spinner that says nothing for that long reads as a hung page — which is
 * exactly what a learner reports as "it broke". Naming the step that is
 * actually running costs nothing and makes the wait legible.
 *
 * Stages describe real work in order, so the wording stays true even when a
 * step runs long: the last one holds rather than advancing to a claim that the
 * answer is nearly ready.
 */
export function useProgressStage(active: boolean, stages: ProgressStage[]): string {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    const startedAt = Date.now();
    const timer = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 500);
    return () => clearInterval(timer);
  }, [active]);

  if (stages.length === 0) return '';

  let current = stages[0];
  for (const stage of stages) {
    if (elapsed >= stage.afterSeconds) current = stage;
  }
  return current.label;
}
