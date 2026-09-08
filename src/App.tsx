import React, { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from '@/components/layout/AppLayout';
import AppPageSkeleton from '@/components/layout/AppPageSkeleton';
import AuthScreen from '@/components/auth/AuthScreen';
import RedirectIfAuthenticated from '@/components/auth/RedirectIfAuthenticated';

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
const TermsPage = lazy(() => import('@/pages/TermsPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route
          path="/"
          element={
            <RedirectIfAuthenticated>
              <AuthScreen />
            </RedirectIfAuthenticated>
          }
        />
        <Route
          path="/login"
          element={
            <RedirectIfAuthenticated>
              <AuthScreen />
            </RedirectIfAuthenticated>
          }
        />
        <Route
          path="/signup"
          element={
            <RedirectIfAuthenticated>
              <AuthScreen />
            </RedirectIfAuthenticated>
          }
        />

        <Route path="/dashboard" element={<Suspense fallback={<AppPageSkeleton />}><DashboardPage /></Suspense>} />
        <Route path="/practice" element={<Suspense fallback={<AppPageSkeleton />}><PracticePage /></Suspense>} />
        <Route path="/mocks" element={<Suspense fallback={<AppPageSkeleton />}><MocksPage /></Suspense>} />
        <Route path="/mistakes" element={<Suspense fallback={<AppPageSkeleton />}><MistakesPage /></Suspense>} />
        <Route path="/evaluations" element={<Suspense fallback={<AppPageSkeleton />}><EvaluationsPage /></Suspense>} />
        <Route path="/leaderboard" element={<Suspense fallback={<AppPageSkeleton />}><LeaderboardPage /></Suspense>} />
        <Route path="/profile" element={<Suspense fallback={<AppPageSkeleton />}><ProfilePage /></Suspense>} />
        <Route path="/referrals" element={<Suspense fallback={<AppPageSkeleton />}><ReferralsPage /></Suspense>} />
        <Route path="/subscription" element={<Suspense fallback={<AppPageSkeleton />}><SubscriptionPage /></Suspense>} />
        <Route path="/diagnostic" element={<Suspense fallback={<AppPageSkeleton />}><DiagnosticPage /></Suspense>} />
        <Route path="/admin" element={<Suspense fallback={<AppPageSkeleton />}><AdminPage /></Suspense>} />

        <Route path="/terms" element={<Suspense fallback={null}><TermsPage /></Suspense>} />
        <Route path="/privacy" element={<Suspense fallback={null}><PrivacyPage /></Suspense>} />
        <Route path="/terms-and-conditions" element={<Navigate to="/terms" replace />} />
        <Route path="/privacy-policy" element={<Navigate to="/privacy" replace />} />

        <Route path="/account" element={<Navigate to="/subscription" replace />} />
        <Route path="/progress" element={<Navigate to="/dashboard" replace />} />

        <Route path="*" element={<Suspense fallback={null}><NotFoundPage /></Suspense>} />
      </Routes>
    </AppLayout>
  );
}
