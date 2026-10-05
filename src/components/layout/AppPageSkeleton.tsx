import React from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import PageSkeleton, { PageSkeletonVariant } from '@/components/layout/PageSkeleton';
import { useApp } from '@/context/AppContext';
import { isAdmin } from '@/lib/types';

/**
 * Stand-in for an app page while its code and session check are still in flight.
 *
 * It reads the route it is standing in for rather than showing one shape for
 * everything. A single dashboard-shaped fallback meant every page loaded in two
 * visibly different steps — stat cards, then the page's own skeleton, then the
 * page — and reading, whose own skeleton is a two-pane split, showed the jump
 * most.
 */
const VARIANT_BY_PATH: Record<string, PageSkeletonVariant> = {
  '/mocks': 'mocks',
  '/mistakes': 'mistakes',
  '/evaluations': 'evaluations',
  '/leaderboard': 'leaderboard',
  '/profile': 'profile',
  '/referrals': 'referrals',
  '/subscription': 'subscription',
  '/diagnostic': 'diagnostic',
  '/admin': 'admin',
  '/me': 'profile',
  '/practice/tasks': 'mocks',
};

export default function AppPageSkeleton() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useApp();

  // Reading is its own layout, and which skill practice is showing is in the
  // query string rather than the path.
  if (pathname.startsWith('/practice') && !VARIANT_BY_PATH[pathname]) {
    if (isAdmin(user ?? null)) return <PageSkeleton variant="admin" />;
    if (searchParams.get('skill') === 'reading') return <PageSkeleton variant="reading" />;
    return <PageSkeleton variant="practice" />;
  }

  return <PageSkeleton variant={VARIANT_BY_PATH[pathname] ?? 'dashboard'} />;
}
