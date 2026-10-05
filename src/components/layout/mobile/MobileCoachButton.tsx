import React from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { PRACTICE_HUB_HREF } from './mobileNav';

/** Screens where the coach is offered as a floating button on a phone. */
const COACH_SCREENS = ['/dashboard', '/home', PRACTICE_HUB_HREF];

/**
 * The AI coach, one tap away on the phone's Home and Practice screens. It has
 * no tab of its own: it is a drawer that opens over whatever you are doing.
 * Danfe, the mascot, stands in for it, so the coach is someone to ask rather
 * than a button.
 */
export default function MobileCoachButton() {
  const { pathname } = useLocation();
  const { user, isTutorOpen, setIsTutorOpen } = useApp();

  if (!user || isTutorOpen || !COACH_SCREENS.includes(pathname)) return null;

  return (
    <button
      type="button"
      onClick={() => setIsTutorOpen(true)}
      aria-label="Ask Danfe, your AI coach"
      className="lg:hidden fixed right-3 z-30 flex h-[72px] w-[52px] items-end justify-center transition-transform active:scale-90 [-webkit-tap-highlight-color:transparent] bottom-[calc(var(--mobile-nav-h,0px)+0.75rem)]"
    >
      <img
        src="/danfe.svg"
        alt=""
        width={52}
        height={72}
        className="h-[72px] w-[52px] object-contain drop-shadow-[0_6px_10px_rgba(15,23,42,0.28)]"
      />
    </button>
  );
}
