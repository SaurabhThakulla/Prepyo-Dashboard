import { useSyncExternalStore } from 'react';

// The running step (null when no tour is showing) and the steps the learner really did, saved per learner.
const KEY = 'prepyo_app_tour:';
const DONE = 'done';

export interface TourState {
  step: number | null;
  did: string[];
}

let userId: string | null = null;
let state: TourState = { step: null, did: [] };
const listeners = new Set<() => void>();

function read(id: string): string | null {
  try {
    return localStorage.getItem(KEY + id);
  } catch {
    return null;
  }
}

function write(value: string) {
  if (!userId) return;
  try {
    localStorage.setItem(KEY + userId, value);
  } catch {}
}

function set(next: TourState) {
  state = next;
  if (next.step !== null) write(JSON.stringify(next));
  listeners.forEach(listener => listener());
}

/** Older saves held just the step number. */
function parse(saved: string | null): TourState {
  if (!saved || saved === DONE) return { step: null, did: [] };
  try {
    const value = JSON.parse(saved);
    if (typeof value === 'number') return { step: value, did: [] };
    if (Number.isInteger(value?.step) && value.step >= 0) {
      return { step: value.step, did: Array.isArray(value.did) ? value.did : [] };
    }
  } catch {}
  return { step: null, did: [] };
}

/** Loads the signed-in learner's saved tour; a different learner never sees another's. */
export function bindTourUser(id: string | null) {
  if (id === userId) return;
  userId = id;
  state = parse(id ? read(id) : null);
  listeners.forEach(listener => listener());
}

/** True once this learner has finished or skipped the tour, or has one running. */
export function tourSeen(id: string): boolean {
  return read(id) !== null;
}

export function startTour(id: string) {
  userId = id;
  set({ step: 0, did: [] });
}

/** Moves to a step; `didId` records the step just left as done by the learner (not skipped). */
export function goToStep(index: number, didId?: string) {
  set({ step: index, did: didId && !state.did.includes(didId) ? [...state.did, didId] : state.did });
}

export function endTour() {
  write(DONE);
  state = { step: null, did: [] };
  listeners.forEach(listener => listener());
}

export function useTour(): TourState {
  return useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}
