import React from 'react';
import UnifiedAuth, { AuthMode } from '@/components/auth/UnifiedAuth';

/**
 * The sign-in screen.
 *
 * Three routes render it. "/" is the app's front door now that the marketing
 * site is a separate project, and /login and /signup stay because the landing
 * site links to them by name and RequireAuth sends `?next=` redirects there.
 *
 * This used to wrap UnifiedAuth in Suspense, which Next required of any client
 * component reading search params. React Router's useSearchParams reads them
 * synchronously and never suspends, so the boundary went with the framework.
 */
export default function AuthScreen({ mode }: { mode: AuthMode }) {
  return <UnifiedAuth initialMode={mode} />;
}
