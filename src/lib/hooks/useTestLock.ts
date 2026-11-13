import { useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';

/**
 * Holds the learner in a running mock test, sectional or full: while the
 * runner is on screen the app hides its sidebar, header and other ways out,
 * and refuses to navigate. The test's own Save and Exit, End test, or
 * finishing it are the only ways out, as in the exam room.
 *
 * `onLeave` is read through a ref, so a parent may pass a new function on
 * every render without re-registering the test (which re-renders the parent).
 */
export function useTestLock(title: string, onLeave: () => void) {
  const { setActiveTestSession } = useApp();
  const leave = useRef(onLeave);
  leave.current = onLeave;

  useEffect(() => {
    const mine = { isActive: true, locked: true, title, onStop: () => leave.current() };
    setActiveTestSession?.(mine);
    // Release only our own lock: the next screen of the test may already hold one.
    return () => setActiveTestSession?.(current => (current === mine ? null : current));
  }, [title, setActiveTestSession]);
}

/** useTestLock for a screen that is only sometimes part of a test: render it while the test runs. */
export function TestLock({ title, onLeave }: { title: string; onLeave: () => void }) {
  useTestLock(title, onLeave);
  return null;
}
