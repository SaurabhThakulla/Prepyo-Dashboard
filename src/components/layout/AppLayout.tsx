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

  if (isPublicLanding) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
        <PublicNav />
        <main className="flex-1 w-full max-w-[80vw] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <PublicFooter />
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
        
        <main className="flex-1 w-full max-w-[80vw] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>

      {/* Global AI Tutor Drawer */}
      <AITutorDrawer />
    </div>
  );
}
