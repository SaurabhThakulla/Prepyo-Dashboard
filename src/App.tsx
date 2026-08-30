import React, { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from '@/components/layout/AppLayout';
import AppPageSkeleton from '@/components/layout/AppPageSkeleton';
import AuthScreen from '@/components/auth/AuthScreen';
import RedirectIfAuthenticated from '@/components/auth/RedirectIfAuthenticated';

// Lazy so each page is its own chunk. Next split routes automatically and a
// single bundle would have been a real regression: nobody signing in needs the
// mock exam runner in their first download. AuthScreen stays eager because it
// is what a signed-out visitor lands on, so splitting it would only add a
// round trip to the most common first paint.
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const PracticePage = lazy(() => import('@/pages/PracticePage'));
const MocksPage = lazy(() => import('@/pages/MocksPage'));
const MistakesPage = lazy(() => import('@/pages/MistakesPage'));
const EvaluationsPage = lazy(() => import('@/pages/EvaluationsPage'));
const LeaderboardPage = lazy(() => import('@/pages/LeaderboardPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const ReferralsPage = lazy(() => import('@/pages/ReferralsPage'));
const SubscriptionPage = lazy(() => import('@/pages/SubscriptionPage'));
const DiagnosticPage = lazy(() => import('@/pages/DiagnosticPage'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

/**
 * Every URL the app answers to.
 *
 * This replaces the app/ folder convention: a route used to be a directory with
 * a page.tsx in it, and is now a line here. The trade is that adding a page
 * takes two steps instead of one, and in exchange the whole URL surface is
 * readable in one screen.
 *
 * AppLayout wraps the table rather than sitting inside it because it decides
 * which shell a route gets (bare for the auth screens, sidebar + header for the
 * app) and applies RequireAuth to the protected ones.
 */
export default function App() {
  return (
    <AppLayout>
      {/* Covers the gap while a lazy page chunk downloads. It sits inside
          AppLayout so the sidebar and header stay put during the swap. */}
      <Suspense fallback={<AppPageSkeleton />}>
        <Routes>
          {/* "/" is the sign-in screen: this app only serves the signed-in
              product, and the marketing site is a separate Astro project.
              /login and /signup stay because the landing site links to them by
              name and RequireAuth sends `?next=` redirects to /login. */}
          <Route
            path="/"
            element={
              <RedirectIfAuthenticated>
                <AuthScreen mode="login" />
              </RedirectIfAuthenticated>
            }
          />
          <Route
            path="/login"
            element={
              <RedirectIfAuthenticated>
                <AuthScreen mode="login" />
              </RedirectIfAuthenticated>
            }
          />
          <Route
            path="/signup"
            element={
              <RedirectIfAuthenticated>
                <AuthScreen mode="signup" />
              </RedirectIfAuthenticated>
            }
          />

          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/mocks" element={<MocksPage />} />
          <Route path="/mistakes" element={<MistakesPage />} />
          <Route path="/evaluations" element={<EvaluationsPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/referrals" element={<ReferralsPage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/diagnostic" element={<DiagnosticPage />} />
          <Route path="/admin" element={<AdminPage />} />

          {/* Both of these were redirects before: /account in a page.tsx, and
              /progress in next.config.js. Neither has ever had a page. */}
          <Route path="/account" element={<Navigate to="/subscription" replace />} />
          <Route path="/progress" element={<Navigate to="/dashboard" replace />} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}
