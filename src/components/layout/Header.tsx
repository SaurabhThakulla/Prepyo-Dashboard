import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  Sparkles,
  Bell,
  Gift,
  ShieldCheck,
  ChevronRight,
  Sun,
  Moon,
  PanelLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import NotificationDrawer from './NotificationDrawer';

interface HeaderProps {
  onToggleSidebar: () => void;
  isSecondaryOpen?: boolean;
}

export default function Header({ onToggleSidebar, isSecondaryOpen }: HeaderProps) {
  const { user, unreadCount, setIsTutorOpen, theme, toggleTheme, activeTestSession } = useApp();
  const { pathname } = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);

  const getPageTitle = (path: string) => {
    if (path === '/' || path === '/home' || path === '/dashboard') return 'Home';
    if (path === '/diagnostic') return '15-Min Diagnostic';
    if (path?.startsWith('/practice')) return 'Practice Studio';
    if (path?.startsWith('/mocks')) return 'Mock Exams';
    if (path?.startsWith('/evaluations')) return 'AI Evaluator';
    if (path === '/mistakes') return 'Mistake Bank';
    if (path === '/leaderboard') return 'Nepal Leaderboard';
    if (path === '/subscription' || path === '/account') return 'Subscriptions (NPR)';
    if (path === '/referrals') return 'Earn Rewards';
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
            className={`h-8 w-8 rounded-lg border transition-all duration-150 active:scale-95 flex items-center justify-center ${
              isSecondaryOpen
                ? 'border-border/80 bg-muted/70 text-foreground shadow-2xs'
                : 'border-border/50 bg-background/50 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            }`}
            title={isSecondaryOpen ? "Collapse sidebar" : "Expand sidebar"}
            aria-label={isSecondaryOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <PanelLeft className="w-4 h-4" strokeWidth={1.8} />
          </Button>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground hidden sm:inline font-medium">Prepyo</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground hidden sm:inline" />
            <span className="font-bold text-foreground text-sm">{title}</span>
          </div>
        </div>

        
        {/* Active Test Session Indicator */}
        {activeTestSession?.isActive && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span>{activeTestSession.title ? `Testing: ${activeTestSession.title}` : 'Test in Progress'}</span>
          </div>
        )}

        {/* Right Action Icons & Badges */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button asChild size="sm" className="text-xs font-bold gap-1 px-2 sm:px-3">
            <Link to="/referrals"><Gift className="w-4 h-4" /><span>Earn Rewards</span></Link>
          </Button>
          {/* XP Badge */}
          <div className="hidden sm:flex items-center gap-1 bg-primary/10 border border-primary/30 px-2.5 py-1.5 rounded-xl text-xs font-bold text-primary" title="XP Points">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>{user?.xp ?? 0} XP</span>
          </div>

          {      /* Pro / Subscription Button */}
          <Button
            asChild
            variant={planId === 'elite' ? 'nepal' : planId === 'pro' ? 'default' : 'outline'}
            size="sm"
            className="hidden md:inline-flex text-xs font-bold"
          >
            <Link to="/subscription">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              <span>{planId && planId !== 'free' ? planId.toUpperCase() : 'UPGRADE'}</span>
            </Link>
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
        </div>
      </header>

      {/* Notification Drawer */}
      <NotificationDrawer open={showNotifications} onClose={() => setShowNotifications(false)} />
    </>
  );
}
