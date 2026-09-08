import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { isAdmin } from '@/lib/types';

/**
 * Keeps signed-in learners off the sign-in screen.
 *
 * middleware.ts used to do this by looking for the session cookie before
 * anything rendered. Nothing runs before render in a static build, so the check
 * moved here — and it is a better check: middleware could only see that a
 * cookie existed, while this waits for the session response and knows whether
 * the backend actually accepted it.
 *
 * The cost is a skeleton on first paint instead of a server-side redirect. That
 * only shows for the length of the session request, and only for someone who is
 * already signed in and asked for the login page anyway.
 */
export default function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const { user, loading } = useApp();
  const location = useLocation();

  if (loading) return null;

  if (user) {
    // Honour `?next=` so a learner who was bounced to /login, then signed in on
    // another tab, still lands where they were originally headed.
    const next = new URLSearchParams(location.search).get('next');
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      return <Navigate to={next} replace />;
    }
    // The admin account exists to read the admin area, so send it straight
    // there rather than to a learner dashboard it has no data on.
    return <Navigate to={isAdmin(user) ? '/admin' : '/dashboard'} replace />;
  }

  return <>{children}</>;
}
