import { useEffect, useState } from 'react';
import { Playback, speakScript, StoppedError } from '@/lib/scriptPlayer';

/**
 * Speaks short Korean words and phrases for the beginner course with the
 * browser's own Korean voice. Only a Korean voice is used: an English voice
 * reading Hangul says nothing a learner can use, so without one the course
 * shows the text instead of pretending to play it.
 */
export type KoreanVoice = 'checking' | 'ready' | 'none';

export function hasKoreanVoice(): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) return false;
  return window.speechSynthesis.getVoices().some(voice => voice.lang.toLowerCase().replace('_', '-').startsWith('ko'));
}

/** Whether this device can speak Korean, waiting briefly for voices that load late. */
export function useKoreanVoice(): KoreanVoice {
  const [state, setState] = useState<KoreanVoice>(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return 'none';
    return hasKoreanVoice() ? 'ready' : 'checking';
  });
  useEffect(() => {
    if (state !== 'checking' || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    const check = () => {
      if (hasKoreanVoice()) setState('ready');
    };
    synth.addEventListener?.('voiceschanged', check);
    check();
    const timer = setTimeout(() => setState(current => (current === 'checking' ? 'none' : current)), 2000);
    return () => {
      synth.removeEventListener?.('voiceschanged', check);
      clearTimeout(timer);
    };
  }, [state]);
  return state;
}

let current: Playback | null = null;

/** Says the text, stopping anything already being said. Resolves when it ends. */
export async function sayKorean(text: string): Promise<void> {
  current?.stop();
  if (!hasKoreanVoice()) return;
  const playback = speakScript(text);
  current = playback;
  try {
    await playback.done;
  } catch (error) {
    if (!(error instanceof StoppedError)) throw error;
  } finally {
    if (current === playback) current = null;
  }
}

export function stopKorean() {
  current?.stop();
  current = null;
}
