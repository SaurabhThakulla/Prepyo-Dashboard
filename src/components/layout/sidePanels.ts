import { useEffect, useRef } from 'react';

// Only one side panel is open at a time: opening the left menu closes the
// right list, and opening the right list closes the left menu.
type Side = 'left' | 'right';
const closers: Record<Side, Set<() => void>> = { left: new Set(), right: new Set() };
const openNow: Record<Side, boolean> = { left: false, right: false };

/**
 * Ties one side's open state to the shared rule; `close` hides that side.
 * The left menu's default open state yields to a right list that is already
 * open; a right list that opens with its page closes the menu.
 */
export function useExclusivePanel(side: Side, isOpen: boolean, close: () => void) {
  const other: Side = side === 'left' ? 'right' : 'left';
  const closeRef = useRef(close);
  closeRef.current = close;
  const wasOpen = useRef(side === 'left' ? isOpen : false);

  useEffect(() => {
    const fn = () => closeRef.current();
    closers[side].add(fn);
    if (side === 'left' && openNow.right) fn();
    return () => {
      closers[side].delete(fn);
      openNow[side] = false;
    };
  }, [side]);

  useEffect(() => {
    openNow[side] = isOpen;
    if (isOpen && !wasOpen.current) closers[other].forEach(fn => fn());
    wasOpen.current = isOpen;
  }, [side, other, isOpen]);
}
