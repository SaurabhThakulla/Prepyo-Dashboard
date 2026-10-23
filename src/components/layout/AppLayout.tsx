import React, { useState, lazy, Suspense, useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/toast';
import AppSidebar from './AppSidebar';
import Header from './Header';
import MobileTopBar from './mobile/MobileTopBar';
import MobileTabBar from './mobile/MobileTabBar';
import MobileCoachButton from './mobile/MobileCoachButton';
import { isFocusRoute } from './mobile/mobileNav';
import RequireAuth from '@/components/auth/RequireAuth';
import { shouldShowOnboarding } from '@/components/onboarding/onboarding';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import AppTour from '@/components/tour/AppTour';
import { useClipboardGuard } from '@/lib/hooks/useClipboardGuard';
import { isAdmin } from '@/lib/types';
import { isInstitutionPath } from '@/institution/paths';
import { useExclusivePanel } from './sidePanels';
import DictionaryPopup from '@/components/dictionary/DictionaryPopup';

const AITutorDrawer = lazy(() => import('@/components/ai/AITutorDrawer'));
const GlobalMiniPlayer = lazy(() => import('@/components/tutorials/GlobalMiniPlayer'));

const ONBOARDING_PENDING_KEY = 'prepyo_onboarding_pending';
const WIDE_MIN = 1280;

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/practice',
  '/mocks',
  '/mistakes',
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

  // A link or button that leaves a running task ends it first, with no
  // question asked, then is clicked again for the learner.
  const replayingClick = useRef(false);

  const handleContainerClickCapture = (e: React.MouseEvent) => {
    if (!activeTestSession?.isActive || replayingClick.current) return;

    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Allowed areas: inside the active practice / test workspace, except its
    // controls that leave the task (data-nav)
    if (target.closest('[data-practice-workspace]') && !target.closest('[data-nav]')) {
      return;
    }

    const anchor = target.closest('a');
    if (anchor) {
      const href = anchor.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        e.preventDefault();
        e.stopPropagation();
        void endAndLeave(anchor);
        return;
      }
    }

    const button = target.closest('button');
    // Controls that only change the layout (data-stay, or inside it) never leave the task.
    if (button?.closest('[data-stay]')) return;
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
        void endAndLeave(button);
        return;
      }
    }
  };

  const endAndLeave = async (destination: HTMLElement) => {
    try {
      await activeTestSession?.onStop?.();
    } catch (err) {
      console.error('Failed to end the task:', err);
    } finally {
      setActiveTestSession(null);
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
  // Below 1280px (tablets) the menu panel opens over the page instead of
  // beside it, so the page keeps its width; it starts closed there.
  const [isWide, setIsWide] = useState(() => typeof window === 'undefined' || window.innerWidth >= WIDE_MIN);
  const [isSecondaryOpen, setIsSecondaryOpen] = useState(isWide);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(`(min-width: ${WIDE_MIN}px)`);
    const onChange = (e: MediaQueryListEvent) => {
      setIsWide(e.matches);
      setIsSecondaryOpen(e.matches);
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  useExclusivePanel('left', isSecondaryOpen, () => setIsSecondaryOpen(false));
  const panelPushes = isSecondaryOpen && isWide;
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
        panelOverlays={!isWide}
      />

      {/* On a tablet the open panel covers the page; a tap outside closes it. */}
      {isSecondaryOpen && !isWide && (
        <div
          data-stay
          aria-hidden
          className="fixed inset-0 z-[35] hidden lg:block bg-black/30 backdrop-blur-[1px]"
          onClick={() => setIsSecondaryOpen(false)}
        />
      )}

      <div
        style={{ '--sidebar-offset': panelPushes ? '416px' : '64px' } as React.CSSProperties}
        className={`${panelPushes ? 'lg:pl-[416px]' : 'lg:pl-16'
          } flex w-full min-w-0 flex-col min-h-screen transition-[padding] duration-300 ease-in-out`}
      >
        <MobileTopBar />
        <Header />

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

    {/* Outside the click guard above, so tour buttons never end a running practice. */}
    <AppTour />
    <DictionaryPopup />

    </>
  );
}
