'use client';

import React, { Suspense } from 'react';
import UnifiedAuth from '@/components/auth/UnifiedAuth';

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-background text-muted-foreground text-sm font-medium">
          Loading Prepyo...
        </div>
      }
    >
      <UnifiedAuth initialMode="signup" />
    </Suspense>
  );
}
