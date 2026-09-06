import React from 'react';
import UnifiedAuth, { AuthMode } from '@/components/auth/UnifiedAuth';

export default function AuthScreen({ mode }: { mode: AuthMode }) {
  return <UnifiedAuth initialMode={mode} />;
}
