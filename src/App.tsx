import React, { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LearnerOnly from '@/components/auth/LearnerOnly';

import AppLayout from '@/components/layout/AppLayout';
import AppPageSkeleton from '@/components/layout/AppPageSkeleton';
import AuthScreen from '@/components/auth/AuthScreen';
import RedirectIfAuthenticated from '@/components/auth/RedirectIfAuthenticated';

const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const PracticePage = lazy(() => import('@/pages/PracticePage'));
const PracticeHubPage = lazy(() => import('@/pages/PracticeHubPage'));
const MePage = lazy(() => import('@/pages/MePage'));
const MocksPage = lazy(() => import('@/pages/MocksPage'));
const PteMockPage = lazy(() => import('@/pages/PteMockPage'));
const MistakesPage = lazy(() => import('@/pages/MistakesPage'));
const EvaluationsPage = lazy(() => import('@/pages/EvaluationsPage'));
const LeaderboardPage = lazy(() => import('@/pages/LeaderboardPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const ReferralsPage = lazy(() => import('@/pages/ReferralsPage'));
const SubscriptionPage = lazy(() => import('@/pages/SubscriptionPage'));
const DiagnosticPage = lazy(() => import('@/pages/DiagnosticPage'));
const TutorialsPage = lazy(() => import('@/pages/TutorialsPage'));
const LearnKoreanPage = lazy(() => import('@/pages/LearnKoreanPage'));
const ReviewPage = lazy(() => import('@/pages/ReviewPage'));
const LessonPage = lazy(() => import('@/pages/LessonPage'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));
const AdminReportsPage = lazy(() => import('@/pages/AdminReportsPage'));
const AdminPaymentsPage = lazy(() => import('@/pages/AdminPaymentsPage'));
const TermsPage = lazy(() => import('@/pages/TermsPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const MyReportsPage = lazy(() => import('@/pages/MyReportsPage'));

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

        <Route
          path="/dashboard"
          element={
            <LearnerOnly>
              <Suspense fallback={<AppPageSkeleton />}><DashboardPage /></Suspense>
            </LearnerOnly>
          }
        />
        <Route path="/practice" element={<Suspense fallback={<AppPageSkeleton />}><PracticePage /></Suspense>} />
        <Route path="/practice/tasks" element={<Suspense fallback={<AppPageSkeleton />}><PracticeHubPage /></Suspense>} />
        <Route path="/me" element={<Suspense fallback={<AppPageSkeleton />}><MePage /></Suspense>} />
        <Route path="/mocks" element={<Suspense fallback={<AppPageSkeleton />}><MocksPage /></Suspense>} />
        <Route path="/mocks/pte/report/:sessionId" element={<Suspense fallback={<AppPageSkeleton />}><PteMockPage /></Suspense>} />
        <Route path="/mocks/pte/:kind" element={<Suspense fallback={<AppPageSkeleton />}><PteMockPage /></Suspense>} />
        <Route path="/mistakes" element={<Suspense fallback={<AppPageSkeleton />}><MistakesPage /></Suspense>} />
        <Route path="/evaluations" element={<Suspense fallback={<AppPageSkeleton />}><EvaluationsPage /></Suspense>} />
        <Route path="/leaderboard" element={<Suspense fallback={<AppPageSkeleton />}><LeaderboardPage /></Suspense>} />
        <Route path="/profile" element={<Suspense fallback={<AppPageSkeleton />}><ProfilePage /></Suspense>} />
        <Route path="/referrals" element={<Suspense fallback={<AppPageSkeleton />}><ReferralsPage /></Suspense>} />
        <Route path="/subscription" element={<Suspense fallback={<AppPageSkeleton />}><SubscriptionPage /></Suspense>} />
        <Route path="/diagnostic" element={<Suspense fallback={<AppPageSkeleton />}><DiagnosticPage /></Suspense>} />
        <Route path="/tutorials" element={<Suspense fallback={<AppPageSkeleton />}><TutorialsPage /></Suspense>} />
        <Route path="/videos" element={<Navigate to="/tutorials" replace />} />
        <Route path="/learn" element={<Suspense fallback={<AppPageSkeleton />}><LearnKoreanPage /></Suspense>} />
        <Route path="/learn/review" element={<Suspense fallback={<AppPageSkeleton />}><ReviewPage /></Suspense>} />
        <Route path="/learn/:unitId/:lessonId" element={<Suspense fallback={<AppPageSkeleton />}><LessonPage /></Suspense>} />
        <Route path="/reports" element={<Suspense fallback={<AppPageSkeleton />}><MyReportsPage /></Suspense>} />
        <Route path="/admin" element={<Suspense fallback={<AppPageSkeleton />}><AdminPage /></Suspense>} />
        <Route path="/admin/reports" element={<Suspense fallback={<AppPageSkeleton />}><AdminReportsPage /></Suspense>} />
        <Route path="/admin/payments" element={<Suspense fallback={<AppPageSkeleton />}><AdminPaymentsPage /></Suspense>} />

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
