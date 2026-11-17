import React, { useEffect, useState } from 'react';
import { Maximize, Minimize } from 'lucide-react';

// A labelled pill that stands out, so learners notice they can take the test full screen.
const TONES = {
  light: 'bg-primary/10 text-primary ring-1 ring-primary/25 hover:bg-primary/15',
  // A fixed blue: inside .test-bar the theme's "primary" is white, which hid the label.
  onPrimary: 'bg-white text-[hsl(224_76%_30%)] shadow-md hover:bg-white/90',
};

/**
 * Puts the whole page in full screen (no browser tabs or address bar), and
 * back; Esc also leaves. Browsers without the Fullscreen API (iPhone Safari)
 * get no button.
 */
export default function FullscreenButton({ tone = 'light' }: { tone?: keyof typeof TONES }) {
  const [on, setOn] = useState(() => typeof document !== 'undefined' && !!document.fullscreenElement);
  useEffect(() => {
    const sync = () => setOn(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  if (typeof document === 'undefined' || !document.fullscreenEnabled) return null;

  const label = on ? 'Exit full screen' : 'Full screen';
  const Icon = on ? Minimize : Maximize;
  return (
    <button
      type="button"
      data-stay
      onClick={() => void (on ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {})}
      aria-label={label}
      title={label}
      className={`inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3.5 ${TONES[tone]}`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
