'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import AppSidebar from './AppSidebar';
import Header from './Header';
import AITutorDrawer from '@/components/ai/AITutorDrawer';
import RequireAuth from '@/components/auth/RequireAuth';

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
  const pathname = usePathname();
  const { user } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSecondaryOpen, setIsSecondaryOpen] = useState(true);

  // The sign-in screen is its own full-page layout, so these routes get the
  // bare shell rather than the sidebar and header.
  const isAuthPage = pathname === '/' || pathname === '/login' || pathname === '/signup';
  const isProtected = PROTECTED_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  // If on auth page, or signed out on an unprotected/404 route, render bare shell
  if (isAuthPage || (!user && !isProtected)) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
      {/* 2-Level Sidebar (App pages only) */}
      <AppSidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isSecondaryOpen={isSecondaryOpen}
        setIsSecondaryOpen={setIsSecondaryOpen}
      />

      {/* Main Content Area */}
      <div
        className={`${
          isSecondaryOpen ? 'lg:pl-[384px]' : 'lg:pl-16'
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
        
        {/* 80vw is a comfortable reading width on a laptop but wastes a third
            of a phone screen, so it only kicks in from lg up. */}
        <main className="flex-1 w-full lg:max-w-[80vw] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {isProtected ? <RequireAuth>{children}</RequireAuth> : children}
        </main>
      </div>

      {/* Global AI Tutor Drawer */}
      <AITutorDrawer />
    </div>
  );
}
