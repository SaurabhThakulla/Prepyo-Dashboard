// Speech recognition in the browser, for scoring speaking answers on a
// provider that has no audio models.
//
// The recorder still captures audio — the learner listens back to that — but
// the words sent for marking come from the device's own recogniser. It costs
// nothing, needs no key, and runs while MediaRecorder is recording.
//
// What it cannot do is pronunciation. A transcript is words, not delivery, so
// nothing downstream may claim to have judged how the learner sounded. The
// backend prompt forbids it and the UI says so.
//
// Chrome, Edge and Android Chrome implement this. Firefox and iOS Safari do
// not, and there the answer is recording practice without a score rather than
// a guess — see speechRecognitionSupported.

type RecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<
    ArrayLike<{ transcript: string }> & { isFinal: boolean }
  >;
}

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechRecognitionSupported(): boolean {
  return recognitionCtor() !== null;
}

export interface TranscriptSession {
  /** Everything recognised so far, final results only. */
  transcript(): string;
  /** Stops listening and returns the final transcript. */
  stop(): Promise<string>;
}

/**
 * Starts listening and keeps the recognised text.
 *
 * `continuous` matters: without it the recogniser stops at the first pause,
 * which for a Part 2 answer means losing everything after the learner's first
 * breath. Interim results are requested but not kept — only final ones go into
 * the transcript, so a half-recognised word never reaches the examiner prompt.
 *
 * Recognition dying mid-answer is not an error worth interrupting a learner
 * for: whatever was captured before it stopped is still returned, and an empty
 * result is handled by the caller as "no transcript".
 */
export function startTranscribing(lang = 'en-US'): TranscriptSession | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;

  let finalText = '';
  let ended = false;
  let onEnded: (() => void) | null = null;

  const recognition = new Ctor();
  recognition.lang = lang;
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = event => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (!result?.isFinal) continue;
      const said = result[0]?.transcript ?? '';
      if (said) finalText += (finalText ? ' ' : '') + said.trim();
    }
  };

  recognition.onerror = () => {
    // 'no-speech' and 'aborted' are ordinary outcomes here, and a real failure
    // leaves us with whatever was already recognised. Either way the learner
    // hears about it from the submit, not from a toast mid-answer.
  };

  recognition.onend = () => {
    ended = true;
    onEnded?.();
  };

  try {
    recognition.start();
  } catch {
    return null;
  }

  return {
    transcript: () => finalText.trim(),
    stop: () =>
      new Promise<string>(resolve => {
        if (ended) {
          resolve(finalText.trim());
          return;
        }
        // Recognition flushes its last final result on the way out, so the
        // transcript is read after onend rather than immediately.
        onEnded = () => resolve(finalText.trim());
        try {
          recognition.stop();
        } catch {
          resolve(finalText.trim());
        }
        // A recogniser that never fires onend must not hang the submit button.
        setTimeout(() => resolve(finalText.trim()), 1500);
      }),
  };
}
