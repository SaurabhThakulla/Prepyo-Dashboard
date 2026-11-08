/**
 * One sound at a time: when the learner starts speaking into the microphone,
 * any question audio still playing (or about to) stops, so the two never run
 * together and the recording does not pick up the prompt. The other way round,
 * playing the question's audio stops a recording in progress.
 */
const RECORDING_STARTED = 'prepyo:recording-started';
const PROMPT_PLAYING = 'prepyo:prompt-playing';

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

/** Tells a recording in progress that the question's audio has started. */
export function announcePromptPlaying(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PROMPT_PLAYING));
}

/** Calls `stop` whenever the question's audio starts; returns the unsubscribe. */
export function onPromptPlaying(stop: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(PROMPT_PLAYING, stop);
  return () => window.removeEventListener(PROMPT_PLAYING, stop);
}
