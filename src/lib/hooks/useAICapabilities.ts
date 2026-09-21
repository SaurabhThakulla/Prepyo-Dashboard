import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface AICapabilities {
  writing: boolean;
  /** A recording can be sent to a provider that listens to it. */
  speaking: boolean;
  /**
   * The words can be marked instead: the browser transcribes the answer and a
   * text model judges content, vocabulary and grammar. Pronunciation is not
   * assessed in this mode and nothing may claim otherwise.
   */
  speakingTranscript: boolean;
  tutor: boolean;
}

// One answer per page load is plenty: this changes when the server is
// redeployed, not while a learner is practising.
let cached: AICapabilities | null = null;

/**
 * What the backend can actually grade right now.
 *
 * Speaking needs a provider that accepts audio, and that is separate from the
 * one that scores writing. When it is missing the recorder still earns its
 * place — record, listen back — but nothing grades the answer, so the screen
 * has to say so rather than offering a Submit the server will refuse.
 *
 * Null until the answer arrives, and callers must treat that as "not yet
 * known": guessing either way puts wrong copy on the screen for a moment, and
 * the wrong guess here is the one that withdraws a Submit a learner is already
 * reaching for.
 *
 * `enabled` keeps the request to the screens that need it; most practice never
 * touches speaking.
 */
export function useAICapabilities(enabled = true): AICapabilities | null {
  const [capabilities, setCapabilities] = useState<AICapabilities | null>(cached);

  useEffect(() => {
    if (!enabled || cached !== null) return;

    let active = true;
    api
      .get<AICapabilities>('/ai/capabilities')
      .then(data => {
        if (typeof data?.speaking !== 'boolean') return;
        cached = data;
        if (active) setCapabilities(data);
      })
      .catch(() => {
        // Not worth a toast: the learner finds out from the submit itself,
        // which now answers in one round trip instead of a minute of waiting.
      });

    return () => {
      active = false;
    };
  }, [enabled]);

  return capabilities;
}
