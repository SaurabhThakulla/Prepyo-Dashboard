import React, { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import AppPageSkeleton from '@/components/layout/AppPageSkeleton';
import { isAdmin, UserProfile } from '@/lib/types';

const OnboardingFlow = lazy(() => import('@/components/onboarding/OnboardingFlow'));

const FALLBACK_PREVIEW_USER: UserProfile = {
  id: 'preview-user',
  email: 'admin@prepyo.local',
  name: 'Student Preview',
  role: 'suru',
  planId: 'free',
  planStartedAt: new Date().toISOString(),
  paidPlanActive: false,
  daysRemaining: 0,
  targetExam: 'PTE',
  targetModule: 'academic',
  jlptLevel: 'N5',
  targetScore: null,
  nepalRegion: 'Kathmandu',
  xp: 0,
  streakDays: 0,
  timezone: 'Asia/Kathmandu',
  bonusMockTests: 0,
  createdAt: new Date().toISOString(),
  level: 1,
  xpToNextLevel: 100,
};

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useApp();

  return (
    <Suspense fallback={<AppPageSkeleton />}>
      <OnboardingFlow
        user={user || FALLBACK_PREVIEW_USER}
        preview={true}
        onDone={() => navigate(isAdmin(user) ? '/admin' : '/dashboard')}
      />
    </Suspense>
  );
}
