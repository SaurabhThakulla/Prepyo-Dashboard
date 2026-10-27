import React, { useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { useLearnCourse } from '@/lib/learn/course';
import { LearnVoice, sayText } from '@/lib/learn/speech';

interface SpeakButtonProps {
  text: string;
  voice: LearnVoice;
  size?: 'sm' | 'lg';
  /** Say it once as soon as it appears, as a new word or listening question does. */
  autoPlay?: boolean;
  label?: string;
}

/** A round play button that says course text aloud, in the course language. */
export default function SpeakButton({ text, voice, size = 'sm', autoPlay = false, label }: SpeakButtonProps) {
  const course = useLearnCourse();
  const [playing, setPlaying] = useState(false);
  const mounted = useRef(true);

  const play = () => {
    if (voice !== 'ready') return;
    setPlaying(true);
    sayText(text, course)
      .catch(() => {})
      .finally(() => mounted.current && setPlaying(false));
  };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    // Browsers may refuse speech that no tap started; the button still works.
    if (autoPlay && voice === 'ready') play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, voice, autoPlay]);

  const big = size === 'lg';
  return (
    <button
      type="button"
      onClick={play}
      disabled={voice !== 'ready'}
      aria-label={label ?? `Play "${text}"`}
      title={voice === 'none' ? `This device has no ${course.language} voice` : 'Play'}
      className={`relative inline-flex shrink-0 items-center justify-center rounded-2xl border-b-4 text-white transition-all active:translate-y-0.5 active:border-b-2 disabled:cursor-not-allowed disabled:opacity-40 ${
        big ? 'h-20 w-20' : 'h-11 w-11'
      } ${playing ? 'bg-sky-400 border-sky-600' : 'bg-sky-500 border-sky-700 hover:bg-sky-400'}`}
    >
      {playing && <span aria-hidden className="absolute inset-0 rounded-2xl bg-sky-300/50 motion-safe:animate-ping" />}
      <Volume2 className={big ? 'h-9 w-9' : 'h-5 w-5'} />
    </button>
  );
}
