'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import AppSidebar from './AppSidebar';
import Header from './Header';
import PublicNav from './PublicNav';
import PublicFooter from './PublicFooter';
import AITutorDrawer from '@/components/ai/AITutorDrawer';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isPublicLanding = pathname === '/';
  const isAuthPage = pathname === '/login' || pathname === '/signup';

  if (isPublicLanding) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
        <PublicNav />
        {/* 80vw is a comfortable reading width on a laptop but wastes a third
            of a phone screen, so it only kicks in from lg up. */}
        <main className="flex-1 w-full lg:max-w-[80vw] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
      {/* Shadcn Sidebar (App pages only) */}
      <AppSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header onToggleSidebar={() => setIsSidebarOpen(true)} />
        
        {/* 80vw is a comfortable reading width on a laptop but wastes a third
            of a phone screen, so it only kicks in from lg up. */}
        <main className="flex-1 w-full lg:max-w-[80vw] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>

      {/* Global AI Tutor Drawer */}
      <AITutorDrawer />
    </div>
  );
}
