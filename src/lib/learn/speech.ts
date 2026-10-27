import { useEffect, useState } from 'react';
import type { LearnCourse } from '@/data/learnCourses';
import { Playback, speakScript, StoppedError } from '@/lib/scriptPlayer';

/**
 * Speaks short words and phrases for a Learn course.
 *
 * Course text with a recording stored with the question assets (made by
 * prepyo-voicegen, mapped in each course's audio.ts) plays the same on every
 * device, including the many with no voice for the language. Text with no
 * recording falls back to the browser's voice for the course language; an
 * English voice reading Hangul or kana says nothing a learner can use, so
 * without one the course shows the text instead of pretending to play it.
 */
export type LearnVoice = 'checking' | 'ready' | 'none';

type Speakable = Pick<LearnCourse, 'lang' | 'audio'>;

/** The stored recording of a course text, if it has one. */
export function storedAudioUrl(text: string, course: Speakable): string | undefined {
  const id = course.audio[text.trim()];
  return id ? `/api/v1/questions/assets/${id}` : undefined;
}

export function hasBrowserVoice(lang: string): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) return false;
  return window.speechSynthesis.getVoices().some(voice => voice.lang.toLowerCase().replace('_', '-').startsWith(lang));
}

/**
 * Whether the course can be heard on this device. With stored recordings it
 * always can; otherwise it waits briefly for browser voices that load late.
 */
export function useLearnVoice(course: Speakable): LearnVoice {
  const hasStoredAudio = Object.keys(course.audio).length > 0;
  const [state, setState] = useState<LearnVoice>(() => {
    if (hasStoredAudio) return 'ready';
    if (typeof window === 'undefined' || !window.speechSynthesis) return 'none';
    return hasBrowserVoice(course.lang) ? 'ready' : 'checking';
  });
  useEffect(() => {
    if (state !== 'checking' || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    const check = () => {
      if (hasBrowserVoice(course.lang)) setState('ready');
    };
    synth.addEventListener?.('voiceschanged', check);
    check();
    const timer = setTimeout(() => setState(current => (current === 'checking' ? 'none' : current)), 2000);
    return () => {
      synth.removeEventListener?.('voiceschanged', check);
      clearTimeout(timer);
    };
  }, [state, course.lang]);
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
export async function sayText(text: string, course: Speakable): Promise<void> {
  current?.stop();
  const url = storedAudioUrl(text, course);
  if (!url && !hasBrowserVoice(course.lang)) return;
  const playback = url ? playStored(url) : speakScript(text, undefined, 1, course.lang);
  current = playback;
  try {
    await playback.done;
  } catch (error) {
    if (!(error instanceof StoppedError)) throw error;
  } finally {
    if (current === playback) current = null;
  }
}

export function stopSpeech() {
  current?.stop();
  current = null;
}
