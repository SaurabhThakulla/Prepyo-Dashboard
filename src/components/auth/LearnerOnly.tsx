import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { isAdmin } from '@/lib/types';

/**
 * Keeps admins out of the learner dashboard.
 *
 * The admin account has no practice history, so every panel on that page reads
 * zero — a screen that looks broken rather than empty. Admins have their own
 * dashboard, and this sends them to it however they arrive: the sidebar link,
 * a bookmark, or the /progress redirect.
 *
 * Sits inside RequireAuth, so `user` is already resolved by the time this
 * renders and there is no flash of the wrong page.
 */
export default function LearnerOnly({ children }: { children: React.ReactNode }) {
  const { user } = useApp();

  if (isAdmin(user)) return <Navigate to="/admin" replace />;

  return <>{children}</>;
}
