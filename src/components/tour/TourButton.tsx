import React, { useEffect } from 'react';
import { Compass } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { startTour, tourSeen } from './tourStore';

/** Replays the app tour; with `autoStart` it also opens once for a learner who has not practised yet. */
export default function TourButton({ autoStart }: { autoStart: boolean }) {
  const { user } = useApp();
  const userId = user?.id;

  useEffect(() => {
    if (autoStart && userId && !tourSeen(userId)) startTour(userId);
  }, [autoStart, userId]);

  if (!userId) return null;
  return (
    <button
      type="button"
      onClick={() => startTour(userId)}
      className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-bold text-white ring-1 ring-white/25 transition-colors hover:bg-white/25"
    >
      <Compass className="h-3.5 w-3.5" />
      Take the tour
    </button>
  );
}
