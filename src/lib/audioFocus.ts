/**
 * One sound at a time: when the learner starts speaking into the microphone,
 * any question audio still playing stops, so the two never run together and
 * the recording does not pick up the prompt.
 */
const RECORDING_STARTED = 'prepyo:recording-started';

/** Tells every playing prompt that a recording has started. */
export function announceRecording(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(RECORDING_STARTED));
}

/** Calls `stop` whenever a recording starts; returns the unsubscribe. */
export function onRecordingStarted(stop: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(RECORDING_STARTED, stop);
  return () => window.removeEventListener(RECORDING_STARTED, stop);
}
