import { useEffect, useState } from 'react';
import { LEARN_AUDIO } from '@/data/learnKorean/audio';
import { Playback, speakScript, StoppedError } from '@/lib/scriptPlayer';

/**
 * Speaks short Korean words and phrases for the beginner course.
 *
 * Every word in the course has a recording stored with the question assets
 * (made by prepyo-voicegen, mapped in data/learnKorean/audio.ts), so it plays
 * the same on every device, including the many with no Korean voice. Text with
 * no recording falls back to the browser's Korean voice; an English voice
 * reading Hangul says nothing a learner can use, so without one the course
 * shows the text instead of pretending to play it.
 */
export type KoreanVoice = 'checking' | 'ready' | 'none';

/** The stored recording of a course text, if it has one. */
export function storedAudioUrl(text: string): string | undefined {
  const id = LEARN_AUDIO[text.trim()];
  return id ? `/api/v1/questions/assets/${id}` : undefined;
}

const hasStoredAudio = Object.keys(LEARN_AUDIO).length > 0;

export function hasKoreanVoice(): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) return false;
  return window.speechSynthesis.getVoices().some(voice => voice.lang.toLowerCase().replace('_', '-').startsWith('ko'));
}

/**
 * Whether the course can be heard on this device. With stored recordings it
 * always can; otherwise it waits briefly for browser voices that load late.
 */
export function useKoreanVoice(): KoreanVoice {
  const [state, setState] = useState<KoreanVoice>(() => {
    if (hasStoredAudio) return 'ready';
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

/** Plays a stored recording once; `done` rejects with StoppedError if stopped. */
function playStored(url: string): Playback {
  const audio = new Audio(url);
  let reject: (reason: unknown) => void = () => {};
  const done = new Promise<void>((resolve, fail) => {
    reject = fail;
    audio.onended = () => resolve();
    audio.onerror = () => fail(new Error('audio failed to load'));
    audio.play().catch(fail);
  });
  return {
    done,
    stop: () => {
      audio.pause();
      reject(new StoppedError());
    },
  };
}

let current: Playback | null = null;

/** Says the text, stopping anything already being said. Resolves when it ends. */
export async function sayKorean(text: string): Promise<void> {
  current?.stop();
  const url = storedAudioUrl(text);
  if (!url && !hasKoreanVoice()) return;
  const playback = url ? playStored(url) : speakScript(text);
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
