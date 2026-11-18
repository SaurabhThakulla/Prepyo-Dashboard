import { ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * A question's instructions: one line on a phone, two on a tablet, in full from lg.
 * Below lg a More button opens the rest when the text is cut off.
 */
export default function ClampedPrompt({ text, children }: { text: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [cut, setCut] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setCut(el.scrollHeight > el.clientHeight + 1);
    check();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    // More sits at the end of the clamped line, not on a line of its own.
    <div className="flex items-baseline gap-2">
      {/* Only the question's own text opens the dictionary (and says the word aloud). */}
      <div
        ref={ref}
        data-dictionary
        title={text}
        className={cn('min-w-0 flex-1 space-y-1', !open && 'line-clamp-1 sm:line-clamp-2 lg:line-clamp-none')}
      >
        {children}
      </div>
      {(cut || open) && (
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          className="shrink-0 text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded lg:hidden"
        >
          {open ? 'Less' : 'More'}
        </button>
      )}
    </div>
  );
}
