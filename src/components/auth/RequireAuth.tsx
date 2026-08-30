import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import AppPageSkeleton from '@/components/layout/AppPageSkeleton';

/**
 * Blocks app pages until the session check has resolved.
 *
 * This is now the only auth gate. middleware.ts used to sit in front of it and
 * turn away anyone with no session cookie, but a static build has nothing
 * running before the page loads, and that check was never worth much: the
 * cookie is HttpOnly, so middleware could only see that one existed, not
 * whether the backend still honoured it.
 *
 * Losing it also removed a wart. Middleware would see a stale cookie, assume a
 * live session and bounce an expired learner straight back here, so the old
 * code passed `expired=1` to tell it otherwise and had middleware clear the
 * cookie itself — the one place that could, since HttpOnly puts it out of
 * reach of page scripts. There is no second opinion to argue with now: the
 * backend has already rejected the session, and POST /auth/logout is a normal
 * way to ask it to clear the cookie.
 */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useApp();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const dismissed = useRef(false);

  useEffect(() => {
    if (loading || user || dismissed.current) return;
    // Guarded because StrictMode runs effects twice in development, and this
    // one both sends a request and navigates away.
    dismissed.current = true;

    // Drop the dead cookie so the next page load does not open with a doomed
    // session request. The redirect does not wait on it: the learner is signed
    // out either way, and a failed cleanup should not strand them here.
    void logout();
    navigate(`/login?next=${encodeURIComponent(pathname)}`, { replace: true });
  }, [loading, user, logout, navigate, pathname]);

  // Both branches are genuinely transient: either the session check is still
  // running, or it has failed and the redirect above is already on its way.
  if (loading || !user) return <AppPageSkeleton />;

  return <>{children}</>;
}
