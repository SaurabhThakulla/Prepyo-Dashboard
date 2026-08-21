'use client';

import React, { Suspense } from 'react';
import UnifiedAuth, { AuthMode } from '@/components/auth/UnifiedAuth';

/**
 * The sign-in screen, with the Suspense boundary UnifiedAuth needs because it
 * reads search params (`?mode=`, `?next=`).
 *
 * Three routes render it. "/" is the app's front door now that the marketing
 * site is a separate project, and /login and /signup stay because the landing
 * site links to them by name and middleware sends `?next=` redirects there.
 */
export default function AuthScreen({ mode }: { mode: AuthMode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-background text-muted-foreground text-sm font-medium">
          Loading Prepyo...
        </div>
      }
    >
      <UnifiedAuth initialMode={mode} />
    </Suspense>
  );
}
