import React, { useState, lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import AppSidebar from './AppSidebar';
import Header from './Header';
import RequireAuth from '@/components/auth/RequireAuth';

const AITutorDrawer = lazy(() => import('@/components/ai/AITutorDrawer'));

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
  const { user } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSecondaryOpen, setIsSecondaryOpen] = useState(true);

  const isAuthPage = pathname === '/' || pathname === '/login' || pathname === '/signup';
  const isLegalPage =
    pathname === '/terms' ||
    pathname === '/privacy' ||
    pathname === '/terms-and-conditions' ||
    pathname === '/privacy-policy';
  const isProtected = PROTECTED_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isAuthPage || isLegalPage || (!user && !isProtected)) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
      <AppSidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isSecondaryOpen={isSecondaryOpen}
        setIsSecondaryOpen={setIsSecondaryOpen}
      />

      <div
        className={`${isSecondaryOpen ? 'lg:pl-[384px]' : 'lg:pl-16'
          } flex flex-col min-h-screen transition-[padding] duration-300 ease-in-out`}
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

        <main className="flex-1 w-full p-0">
          {isProtected ? <RequireAuth>{children}</RequireAuth> : children}
        </main>
      </div>

      <Suspense fallback={null}>
        <AITutorDrawer />
      </Suspense>
    </div>
  );
}
