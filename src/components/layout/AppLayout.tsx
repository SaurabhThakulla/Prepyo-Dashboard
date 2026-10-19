import React, { useState, lazy, Suspense, useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/toast';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import AppSidebar from './AppSidebar';
import Header from './Header';
import MobileTopBar from './mobile/MobileTopBar';
import MobileTabBar from './mobile/MobileTabBar';
import MobileCoachButton from './mobile/MobileCoachButton';
import { isFocusRoute } from './mobile/mobileNav';
import RequireAuth from '@/components/auth/RequireAuth';
import { shouldShowOnboarding } from '@/components/onboarding/onboarding';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import { useClipboardGuard } from '@/lib/hooks/useClipboardGuard';
import { isAdmin } from '@/lib/types';
import { isInstitutionPath } from '@/institution/paths';

const AITutorDrawer = lazy(() => import('@/components/ai/AITutorDrawer'));
const GlobalMiniPlayer = lazy(() => import('@/components/tutorials/GlobalMiniPlayer'));

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
  '/reports',
  '/admin',
  '/me',
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const { user, loading, activeTestSession, setActiveTestSession } = useApp();
  const toast = useToast();

  // A new screen opens at its top, as it does in an app. Going back (POP)
  // leaves the browser to put you where you were.
  useEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0);
  }, [pathname, navigationType]);

  // Signed-out pages (login, sign-up) and institution pages keep paste for emails and passwords.
  useClipboardGuard(!!user && !isAdmin(user) && !isInstitutionPath(pathname), () =>
    toast.info('Pasting is turned off', 'Type your answer yourself, the way you will in the exam.'),
  );

  // The link or button the learner clicked while a task was running. It is
  // clicked again for them once they confirm they want to end the task.
  const [pendingLeave, setPendingLeave] = useState<HTMLElement | null>(null);
  const [ending, setEnding] = useState(false);
  const replayingClick = useRef(false);

  const handleContainerClickCapture = (e: React.MouseEvent) => {
    if (!activeTestSession?.isActive || replayingClick.current) return;

    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Allowed areas: inside the active practice / test workspace, except its
    // controls that leave the task (data-nav), like the question list toggle
    if (target.closest('[data-practice-workspace]') && !target.closest('[data-nav]')) {
      return;
    }

    const anchor = target.closest('a');
    if (anchor) {
      const href = anchor.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        e.preventDefault();
        e.stopPropagation();
        setPendingLeave(anchor);
        return;
      }
    }

    const button = target.closest('button');
    // Controls that only change the layout (data-stay) never leave the task.
    if (button?.hasAttribute('data-stay')) return;
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
        setPendingLeave(button);
        return;
      }
    }
  };

  // "WRITING: Write Essay" reads better as "Writing · Write Essay".
  const taskLabel = activeTestSession?.title?.replace(
    /^([A-Z]+):\s*/,
    (_, skill: string) => `${skill.charAt(0)}${skill.slice(1).toLowerCase()} · `,
  );

  const confirmLeave = async () => {
    const destination = pendingLeave;
    setEnding(true);
    try {
      await activeTestSession?.onStop?.();
    } catch (err) {
      console.error('Failed to end the task:', err);
    } finally {
      setActiveTestSession(null);
      setEnding(false);
      setPendingLeave(null);
    }
    if (destination?.isConnected) {
      replayingClick.current = true;
      try {
        destination.click();
      } finally {
        replayingClick.current = false;
      }
    }
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSecondaryOpen, setIsSecondaryOpen] = useState(true);
  const [onboardingClosedFor, setOnboardingClosedFor] = useState<string | null>(null);

  const isAuthPage =
    pathname === '/' || pathname === '/login' || pathname === '/signup' || isInstitutionPath(pathname);
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

  // On a phone the tab bar steps aside for a running task and for screens
  // that take the whole phone. `--mobile-nav-h` is the room it takes, for the
  // page's bottom padding and anything else pinned to the bottom.
  const showTabBar = !activeTestSession?.isActive && !isFocusRoute(pathname);

  return (
    <>
    <div
      onClickCapture={handleContainerClickCapture}
      className={`${showTabBar ? '[--mobile-nav-h:calc(4rem+env(safe-area-inset-bottom))]' : '[--mobile-nav-h:0px]'} lg:[--mobile-nav-h:0px] min-h-screen app-backdrop text-foreground flex flex-col transition-colors duration-200`}
    >
      <AppSidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isSecondaryOpen={isSecondaryOpen}
        setIsSecondaryOpen={setIsSecondaryOpen}
      />

      <div
        style={{ '--sidebar-offset': isSecondaryOpen ? '416px' : '64px' } as React.CSSProperties}
        className={`${isSecondaryOpen ? 'lg:pl-[416px]' : 'lg:pl-16'
          } flex w-full min-w-0 flex-col min-h-screen transition-[padding] duration-300 ease-in-out`}
      >
        <MobileTopBar />
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

        <main className="flex-1 w-full min-w-0 p-0 pb-[var(--mobile-nav-h)] flex flex-col min-h-0">
          {isProtected ? <RequireAuth>{children}</RequireAuth> : children}
        </main>
      </div>

      {showTabBar && <MobileTabBar />}
      {showTabBar && <MobileCoachButton />}

      <Suspense fallback={null}>
        <AITutorDrawer />
        <GlobalMiniPlayer />
      </Suspense>
    </div>

    <Dialog open={pendingLeave !== null} onOpenChange={open => { if (!open && !ending) setPendingLeave(null); }}>
      <DialogContent centered className="max-w-[420px] gap-0 p-0 sm:p-0 overflow-hidden">
        <div className="flex flex-col items-center gap-4 px-6 pb-5 pt-7 text-center sm:flex-row sm:items-start sm:pt-6 sm:text-left">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 ring-1 ring-rose-200/80 dark:bg-rose-500/10 dark:ring-rose-500/25">
            <LogOut className="h-5 w-5 text-rose-600 dark:text-rose-400" strokeWidth={2.25} />
          </div>
          <div className="min-w-0 flex-1">
            <DialogHeader className="space-y-2 text-center sm:pr-8 sm:text-left">
              <DialogTitle className="text-xl font-bold leading-snug tracking-normal">End this task?</DialogTitle>
              <DialogDescription className="text-[15px] leading-relaxed text-foreground/75">
                If you leave now, this attempt ends and your answer won&rsquo;t be submitted.
              </DialogDescription>
            </DialogHeader>
            {taskLabel && (
              <div title={`${taskLabel} in progress`} className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-muted/60 px-3.5 py-1.5 text-[13px] font-medium text-foreground">
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
                <span className="min-w-0 truncate">{taskLabel}</span>
              </div>
            )}
          </div>
        </div>
        {/* Two equal buttons within thumb reach on a phone, right-aligned on wider screens */}
        <DialogFooter className="grid grid-cols-2 gap-3 border-t border-border bg-muted/40 px-6 py-4 sm:flex sm:flex-row sm:justify-end sm:space-x-0">
          <Button type="button" variant="outline" className="h-11 rounded-xl px-5 text-[15px] font-semibold sm:h-10 sm:text-sm" disabled={ending} onClick={() => setPendingLeave(null)}>
            Keep going
          </Button>
          <Button type="button" variant="destructive" className="h-11 rounded-xl px-5 text-[15px] font-semibold sm:h-10 sm:text-sm" disabled={ending} onClick={confirmLeave}>
            {ending ? 'Ending…' : 'End task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
