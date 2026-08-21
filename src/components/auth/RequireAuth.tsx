'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';

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
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, router, pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs font-medium">Checking your session…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
