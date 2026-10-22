import { useEffect, useState } from 'react';

/** What the learner reads while a recording is scored, by seconds since submitting. */
const STEPS: { at: number; text: string }[] = [
  { at: 0, text: 'Uploading your recording…' },
  { at: 2, text: 'Listening to every word…' },
  { at: 5, text: 'Checking pronunciation and fluency…' },
  { at: 9, text: 'Marking the sounds in each word…' },
  { at: 15, text: 'Almost done, this one is taking a little longer…' },
];

/**
 * Timed progress while a spoken answer is scored. Scoring usually takes 7-9 s and
 * occasionally up to 30 s; the bar fills fast at first and slows near the end, so it
 * never looks finished while the answer is still being marked.
 */
export default function ScoringProgress() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => setSeconds((Date.now() - started) / 1000), 250);
    return () => window.clearInterval(timer);
  }, []);

  const step = [...STEPS].reverse().find(s => seconds >= s.at) ?? STEPS[0];
  const percent = Math.round(95 * (1 - Math.exp(-seconds / 6)));

  return (
    <div role="status" aria-live="polite" className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
      <p className="text-sm font-semibold text-foreground">{step.text}</p>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-primary/15"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Scoring progress"
      >
        <div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
