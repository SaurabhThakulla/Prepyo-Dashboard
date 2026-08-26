'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  Menu,
  Sparkles,
  Bell,
  Bot,
  ShieldCheck,
  ChevronRight,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import NotificationDrawer from './NotificationDrawer';

interface HeaderProps {
  onToggleSidebar: () => void;
  isSecondaryOpen?: boolean;
}

export default function Header({ onToggleSidebar, isSecondaryOpen }: HeaderProps) {
  const { user, activeExam, unreadCount, setIsTutorOpen, theme, toggleTheme } = useApp();
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);

  const getPageTitle = (path: string) => {
    if (path === '/') return 'Home';
    if (path === '/dashboard') return 'Learner Hub';
    if (path === '/diagnostic') return '15-Min Diagnostic';
    if (path?.startsWith('/practice')) return 'Practice Studio';
    if (path?.startsWith('/mocks')) return 'Mock Exams';
    if (path?.startsWith('/evaluations')) return 'AI Evaluator';
    if (path === '/mistakes') return 'Mistake Bank';
    if (path === '/leaderboard') return 'Nepal Leaderboard';
    if (path === '/subscription' || path === '/account') return 'Subscriptions (NPR)';
    if (path === '/profile') return 'Profile & Goals';
    if (path === '/admin') return 'Admin Observability';
    return 'Prepyo';
  };

  const title = getPageTitle(pathname || '');
  const planId = user?.subscription?.planId;

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/80 px-4 sm:px-6 backdrop-blur-xl transition-colors">
        
        {/* Left: Sidebar Toggle & Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/70 rounded-xl"
            title={isSecondaryOpen ? "Close sidebar" : "Open sidebar"}
          >
            {isSecondaryOpen ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeftOpen className="w-4 h-4" />
            )}
          </Button>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground hidden sm:inline font-medium">Prepyo</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground hidden sm:inline" />
            <span className="font-bold text-foreground text-sm">{title}</span>
            <Badge variant="indigo" className="hidden md:inline-flex text-[9px] px-1.5 py-0">
              {activeExam} 2026 Engine
            </Badge>
          </div>
        </div>

        {/* Right Action Icons & Badges */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* AI Tutor Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTutorOpen(true)}
            className="hidden sm:flex items-center gap-1.5 border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 font-bold text-xs"
          >
            <Bot className="w-3.5 h-3.5 text-primary" />
            <span>AI Coach</span>
          </Button>

          {/* Theme Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </Button>

          {/* XP Badge */}
          <div className="hidden sm:flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1.5 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-400" title="XP Points">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{user?.xp ?? 0} XP</span>
          </div>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nepal-crimson opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-nepal-crimson"></span>
              </span>
            )}
          </Button>

          {/* Pro / Subscription Button */}
          <Button
            asChild
            variant={planId === 'elite' ? 'nepal' : planId === 'pro' ? 'default' : 'outline'}
            size="sm"
            className="hidden md:inline-flex text-xs font-bold"
          >
            <Link href="/subscription">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              <span>{planId && planId !== 'free' ? planId.toUpperCase() : 'UPGRADE'}</span>
            </Link>
          </Button>
        </div>
      </header>

      {/* Notification Drawer */}
      <NotificationDrawer open={showNotifications} onClose={() => setShowNotifications(false)} />
    </>
  );
}
