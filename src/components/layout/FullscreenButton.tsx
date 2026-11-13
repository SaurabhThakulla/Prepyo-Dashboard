import React, { useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

const TONES = {
  light: 'border border-border bg-background text-foreground hover:bg-muted',
  onPrimary: 'bg-white/15 text-white hover:bg-white/25',
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
  const Icon = on ? Minimize2 : Maximize2;
  return (
    <button
      type="button"
      data-stay
      onClick={() => void (on ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {})}
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${TONES[tone]}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
