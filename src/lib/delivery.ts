// Pace and hesitation, measured while the learner speaks.
//
// The recorder already samples the microphone every animation frame to draw its
// level meter. Timing the gaps between speech in that same loop costs nothing
// and turns fluency feedback from something a model guesses at into something
// measured: how long the answer ran, how much of it had voice in it, how often
// the learner stopped, and for how long at the worst point.
//
// This is not pronunciation. It is pace and hesitation — the part of delivery a
// waveform can actually show.

export interface Delivery {
  durationSeconds: number;
  /** Silences longer than PAUSE_THRESHOLD_SECONDS, ignoring the lead-in. */
  pauseCount: number;
  longestPauseSeconds: number;
  /** Share of the answer with voice in it, 0 to 1. */
  speakingRatio: number;
}

export interface DeliveryMeter {
  /** Feed one level reading, 0 to 1, from the recorder's meter. */
  sample(level: number): void;
  /** Stop measuring and return what was measured. */
  finish(): Delivery;
}

/**
 * Level above which a frame counts as speech.
 *
 * The meter scales RMS so ordinary speech fills most of the bar; room tone on a
 * laptop microphone sits near 0.02 and a spoken syllable clears 0.1 comfortably.
 * Set too low this counts breathing as talking, and every learner looks fluent.
 */
const VOICE_LEVEL = 0.06;

/** The gap at which a breath becomes a hesitation. Mirrors the backend. */
const PAUSE_THRESHOLD_SECONDS = 0.6;

/**
 * A silence before the first word is the learner gathering themselves, not a
 * hesitation in their answer, so pause counting starts once they begin.
 */
export function createDeliveryMeter(now: () => number = () => performance.now()): DeliveryMeter {
  let lastAt = now();
  // Time actually observed, not wall-clock span: a frame dropped below is time
  // nobody measured, and counting it would stretch the answer's length and
  // deflate the speech rate derived from it.
  let measuredMs = 0;
  let voicedMs = 0;
  let silenceRunMs = 0;
  let started = false;
  // Silence before the first word, left out of the answer's length.
  let leadInMs = 0;
  let pauseCount = 0;
  let longestPauseMs = 0;

  const closeSilenceRun = () => {
    if (started && silenceRunMs >= PAUSE_THRESHOLD_SECONDS * 1000) {
      pauseCount += 1;
      longestPauseMs = Math.max(longestPauseMs, silenceRunMs);
    }
    silenceRunMs = 0;
  };

  return {
    sample(level: number) {
      const at = now();
      // Frames can arrive late — a backgrounded tab stops painting entirely —
      // and counting a whole hidden minute as one silence would be a lie. A
      // gap longer than a second of wall clock is dropped rather than scored.
      const elapsed = at - lastAt;
      lastAt = at;
      if (elapsed <= 0 || elapsed > 1000) return;
      measuredMs += elapsed;

      if (level >= VOICE_LEVEL) {
        if (!started) leadInMs = silenceRunMs;
        closeSilenceRun();
        started = true;
        voicedMs += elapsed;
        return;
      }
      silenceRunMs += elapsed;
    },

    finish(): Delivery {
      // Silence before the first word and after the last is not part of the
      // answer: counted in, it makes a finished reading look slow.
      const durationMs = started ? measuredMs - leadInMs - silenceRunMs : measuredMs;
      const longest = Math.max(longestPauseMs, 0);

      return {
        durationSeconds: Math.round(durationMs / 1000),
        pauseCount,
        longestPauseSeconds: Math.round((longest / 1000) * 10) / 10,
        speakingRatio: durationMs > 0 ? Math.min(1, voicedMs / durationMs) : 0,
      };
    },
  };
}
