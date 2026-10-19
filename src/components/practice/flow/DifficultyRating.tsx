import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type Rating = 'easy' | 'medium' | 'difficult';
const RATINGS: { value: Rating; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'difficult', label: 'Difficult' },
];
const KEY = 'prepyo:question-difficulty';

// Kept on this device only, as the learner's own note; storage can be missing or blocked.
function load(): Record<string, Rating> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

/** "How difficult was this question?" with Easy / Medium / Difficult chips, remembered per question. */
export default function DifficultyRating({ itemId }: { itemId: string }) {
  const [rating, setRating] = useState<Rating | undefined>(() => load()[itemId]);
  useEffect(() => setRating(load()[itemId]), [itemId]);

  const pick = (value: Rating) => {
    const next = rating === value ? undefined : value;
    setRating(next);
    try {
      const all = load();
      if (next) all[itemId] = next;
      else delete all[itemId];
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch {
      // the chip still shows the choice for this visit
    }
  };

  return (
    <div role="group" aria-labelledby={`difficulty-${itemId}`} className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span id={`difficulty-${itemId}`} className="text-sm font-semibold text-foreground">How difficult was this question?</span>
      <div className="flex gap-2">
        {RATINGS.map(r => (
          <button
            key={r.value}
            type="button"
            aria-pressed={rating === r.value}
            onClick={() => pick(r.value)}
            className={cn(
              'rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors',
              rating === r.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
