import React, { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, useParams } from 'react-router-dom';
import { InstitutionAccountProvider } from './account';
import { dashboardPath, LOGIN_PATH, SIGNUP_PATH } from './paths';

import LoginPage from './LoginPage';
import DashboardPage from './DashboardPage';

// Shares the signed-in admin between the pages below.
function InstitutionShell() {
  return (
    <InstitutionAccountProvider>
      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
    </InstitutionAccountProvider>
  );
}

// /institution/<name> was the address before; it now lives at /<name>.
function OldAddress() {
  const { code = '' } = useParams<{ code: string }>();
  return <Navigate to={dashboardPath(code)} replace />;
}

/**
 * Every institution address, placed inside <Routes> in App.tsx.
 * /<name> is the institution's own page: the dashboard for its admin, the sign-in for its students.
 */
export const institutionRoutes = (
  <Route element={<InstitutionShell />}>
    <Route path="/institution" element={<Navigate to={LOGIN_PATH} replace />} />
    <Route path="/institution/login" element={<LoginPage />} />
    <Route path={SIGNUP_PATH} element={<Navigate to={LOGIN_PATH} replace />} />
    <Route path="/institution/:code" element={<OldAddress />} />
    <Route path="/:code" element={<DashboardPage />} />
    <Route path="/:code/:section" element={<DashboardPage />} />
  </Route>
);
