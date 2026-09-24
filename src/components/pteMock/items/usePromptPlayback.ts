import { useCallback, useEffect, useRef, useState } from 'react';
import { Question } from '@/lib/types';
import { Playback, StoppedError } from '@/lib/scriptPlayer';
import { hasPromptAudio, playPrompt } from '@/lib/pteMock/audio';

export type PlaybackPhase = 'none' | 'waiting' | 'playing' | 'done' | 'failed';

/**
 * Recordings already heard, so that leaving a test and coming back does not
 * play one twice: the test plays each recording once, whatever happens. Kept
 * in the browser because it only needs to outlast a reload; a learner on
 * another device hears it again, which is a smaller harm than not at all.
 */
const heard = {
  has(key: string): boolean {
    try {
      return window.localStorage.getItem(`pte-heard:${key}`) === '1';
    } catch {
      return false;
    }
  },
  mark(key: string): void {
    try {
      window.localStorage.setItem(`pte-heard:${key}`, '1');
    } catch {
      // Storage is off (private mode): the recording may play again on reload.
    }
  },
};

/**
 * An item's recording, played once as the test plays it: a short countdown
 * ("Beginning in 3 seconds"), then the recording start to finish with no
 * controls. `onDone` runs when it has played, failed, or there was none.
 */
export function usePromptPlayback(question: Question, delaySeconds: number, onDone?: () => void, heardKey?: string) {
  const present = hasPromptAudio(question);
  const alreadyHeard = present && Boolean(heardKey && heard.has(heardKey));
  const [phase, setPhase] = useState<PlaybackPhase>(present ? (alreadyHeard ? 'done' : 'waiting') : 'none');
  const [countdown, setCountdown] = useState(delaySeconds);
  const [progress, setProgress] = useState(0);
  const playback = useRef<Playback | null>(null);
  const run = useRef(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const token = ++run.current;
    if (!present || alreadyHeard) {
      if (alreadyHeard) setProgress(1);
      onDoneRef.current?.();
      return;
    }
    setPhase('waiting');
    setCountdown(delaySeconds);
    setProgress(0);

    let left = delaySeconds;
    const tick = setInterval(async () => {
      if (token !== run.current) return;
      left -= 1;
      setCountdown(Math.max(0, left));
      if (left > 0) return;
      clearInterval(tick);
      setPhase('playing');
      // Heard from the moment it starts: a recording cut short is not replayed.
      if (heardKey) heard.mark(heardKey);
      try {
        const p = await playPrompt(question, fraction => token === run.current && setProgress(fraction));
        if (token !== run.current) {
          p.stop();
          return;
        }
        playback.current = p;
        await p.done;
        if (token !== run.current) return;
        setProgress(1);
        setPhase('done');
      } catch (err) {
        if (err instanceof StoppedError || token !== run.current) return;
        setPhase('failed');
      }
      if (token === run.current) onDoneRef.current?.();
    }, 1000);

    return () => {
      clearInterval(tick);
      run.current += 1;
      playback.current?.stop();
      playback.current = null;
    };
    // One playback per item: the question id is the item.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  /** Stops the recording where it is, as leaving the item does. */
  const stop = useCallback(() => {
    run.current += 1;
    playback.current?.stop();
    playback.current = null;
  }, []);

  return { present, phase, countdown, progress, stop };
}
