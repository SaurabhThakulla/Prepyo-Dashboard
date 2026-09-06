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
      <Suspense fallback={<AppPageSkeleton />}>
        <Routes>
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

          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms-and-conditions" element={<Navigate to="/terms" replace />} />
          <Route path="/privacy-policy" element={<Navigate to="/privacy" replace />} />

          <Route path="/account" element={<Navigate to="/subscription" replace />} />
          <Route path="/progress" element={<Navigate to="/dashboard" replace />} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}
