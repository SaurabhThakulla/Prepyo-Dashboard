'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import AppPageSkeleton from '@/components/layout/AppPageSkeleton';

/**
 * Blocks app pages until the session check has resolved.
 *
 * middleware.ts already turns away visitors with no cookie at all. This catches
 * the case it cannot: a cookie that exists but whose session the backend has
 * expired or revoked.
 */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || user) return;
    // expired=1 tells middleware the backend has already rejected this cookie.
    // Without it middleware sees the cookie still sitting there, assumes a live
    // session and bounces us straight back here — the two redirects then loop
    // forever behind a loading state that never ends.
    router.replace(`/login?next=${encodeURIComponent(pathname)}&expired=1`);
  }, [loading, user, router, pathname]);

  // Both branches are genuinely transient: either the session check is still
  // running, or it has failed and the redirect above is already on its way.
  if (loading || !user) return <AppPageSkeleton />;

  return <>{children}</>;
}
