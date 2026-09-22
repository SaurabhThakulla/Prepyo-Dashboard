import React, { useState, lazy, Suspense, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/toast';
import AppSidebar from './AppSidebar';
import Header from './Header';
import RequireAuth from '@/components/auth/RequireAuth';
import { shouldShowOnboarding } from '@/components/onboarding/onboarding';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import { useClipboardGuard } from '@/lib/hooks/useClipboardGuard';
import { isAdmin } from '@/lib/types';

const AITutorDrawer = lazy(() => import('@/components/ai/AITutorDrawer'));

const ONBOARDING_PENDING_KEY = 'prepyo_onboarding_pending';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/practice',
  '/mocks',
  '/mistakes',
  '/evaluations',
  '/leaderboard',
  '/profile',
  '/referrals',
  '/subscription',
  '/diagnostic',
  '/admin',
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { user, loading, activeTestSession } = useApp();
  const toast = useToast();

  useClipboardGuard(!isAdmin(user), () =>
    toast.info('Pasting is turned off', 'Type your answer yourself, the way you will in the exam.'),
  );

  const handleContainerClickCapture = (e: React.MouseEvent) => {
    if (!activeTestSession?.isActive) return;

    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Allowed areas: inside the active practice / test workspace
    if (target.closest('[data-practice-workspace]')) {
      return;
    }

    const anchor = target.closest('a');
    if (anchor) {
      const href = anchor.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        e.preventDefault();
        e.stopPropagation();
        toast.error('Finish the exercise first', 'Please complete or submit your current exercise before navigating away.');
        return;
      }
    }

    const button = target.closest('button');
    if (button) {
      if (
        button.closest('aside') ||
        button.closest('nav') ||
        button.closest('header') ||
        button.closest('[data-sidebar]') !== null ||
        button.getAttribute('data-nav') !== null
      ) {
        e.preventDefault();
        e.stopPropagation();
        toast.error('Finish the exercise first', 'Please complete or submit your current exercise before navigating away.');
        return;
      }
    }
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSecondaryOpen, setIsSecondaryOpen] = useState(true);
  const [onboardingClosedFor, setOnboardingClosedFor] = useState<string | null>(null);

  const isAuthPage = pathname === '/' || pathname === '/login' || pathname === '/signup';
  const isLegalPage =
    pathname === '/terms' ||
    pathname === '/privacy' ||
    pathname === '/terms-and-conditions' ||
    pathname === '/privacy-policy';
  const isProtected = PROTECTED_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  // Synchronize onboarding pending hint in localStorage
  useEffect(() => {
    if (user && shouldShowOnboarding(user) && onboardingClosedFor !== user.id) {
      try {
        localStorage.setItem(ONBOARDING_PENDING_KEY, '1');
      } catch {}
    } else if (user && (!shouldShowOnboarding(user) || onboardingClosedFor === user.id)) {
      try {
        localStorage.removeItem(ONBOARDING_PENDING_KEY);
      } catch {}
    }
  }, [user, onboardingClosedFor]);

  if (isAuthPage || isLegalPage || (!user && !isProtected)) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
        {children}
      </div>
    );
  }

  // Check if onboarding is needed for the current user
  const showOnboarding =
    isProtected && user !== null && onboardingClosedFor !== user.id && shouldShowOnboarding(user);

  // Check if onboarding was pending in localStorage while initial auth check is loading
  const onboardingCached =
    isProtected &&
    loading &&
    typeof window !== 'undefined' &&
    localStorage.getItem(ONBOARDING_PENDING_KEY) === '1';

  // If onboarding is cached as pending, immediately render the clean onboarding backdrop
  // instead of flashing the main sidebar, header, and dashboard skeleton!
  if (onboardingCached) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#fbfcff] text-slate-900" />
    );
  }

  // If user requires onboarding, render OnboardingFlow directly without mounting
  // the main sidebar, header, or dashboard in the background.
  if (showOnboarding && user) {
    return (
      <OnboardingFlow
        user={user}
        onDone={() => {
          setOnboardingClosedFor(user.id);
          try {
            localStorage.removeItem(ONBOARDING_PENDING_KEY);
          } catch {}
        }}
      />
    );
  }

  return (
    <div onClickCapture={handleContainerClickCapture} className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
      <AppSidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isSecondaryOpen={isSecondaryOpen}
        setIsSecondaryOpen={setIsSecondaryOpen}
      />

      <div
        style={{ '--sidebar-offset': isSecondaryOpen ? '384px' : '64px' } as React.CSSProperties}
        className={`${isSecondaryOpen ? 'lg:pl-[384px]' : 'lg:pl-16'
          } flex w-full min-w-0 flex-col min-h-screen transition-[padding] duration-300 ease-in-out`}
      >
        <Header
          isSecondaryOpen={isSecondaryOpen}
          onToggleSidebar={() => {
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
              setIsSidebarOpen(prev => !prev);
              setIsSecondaryOpen(true);
            } else {
              setIsSecondaryOpen(prev => !prev);
            }
          }}
        />

        <main className="flex-1 w-full min-w-0 p-0 flex flex-col min-h-0">
          {isProtected ? <RequireAuth>{children}</RequireAuth> : children}
        </main>
      </div>

      <Suspense fallback={null}>
        <AITutorDrawer />
      </Suspense>
    </div>
  );
}
