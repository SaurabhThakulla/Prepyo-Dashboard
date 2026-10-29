import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Bell, ChevronRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NotificationDrawer from './NotificationDrawer';

export default function Header() {
  const { user, unreadCount, activeTestSession } = useApp();
  const { pathname } = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);

  const getPageTitle = (path: string) => {
    if (path === '/' || path === '/home' || path === '/dashboard') return 'Home';
    if (path === '/diagnostic') return 'Level check';
    if (path?.startsWith('/practice')) return 'Practice';
    if (path?.startsWith('/mocks')) return 'Mock tests';
    if (path?.startsWith('/institute-mock')) return 'Institute Mock';
    if (path === '/mistakes' || path === '/history') return 'Practice history';
    if (path === '/subscription' || path === '/account') return 'Your plan';
    if (path === '/referrals') return 'Earn Rewards';
    if (path === '/profile') return 'Profile & Goals';
    if (path === '/admin') return 'Admin Observability';
    return 'Prepyo';
  };

  const title = getPageTitle(pathname || '');

  return (
    <>
      <header className="sticky top-0 z-30 hidden lg:flex h-16 w-full min-w-0 items-center justify-between gap-2 border-b border-border bg-card/80 px-2 sm:px-6 backdrop-blur-xl transition-colors">

        {/* Left: breadcrumb (the menu toggle sits on the sidebar's edge) */}
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <div className="flex min-w-0 items-center gap-2 text-xs">
            <span className="text-muted-foreground hidden sm:inline font-medium">Prepyo</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground hidden sm:inline" />
            <span className="truncate font-bold text-foreground text-sm" title={title}>{title}</span>
          </div>
        </div>

        {/* Right: the running test, if any, XP and notifications; theme, plan and rewards live in the sidebar */}
        <div className="flex shrink-0 min-w-0 items-center gap-3">
          {/* Active Test Session Indicator */}
          {activeTestSession?.isActive && (
            <div role="status" title={activeTestSession.title || 'Test in Progress'} className="flex shrink-0 min-w-0 xl:max-w-xs items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span className="sr-only xl:not-sr-only xl:truncate">{activeTestSession.title ? `Testing: ${activeTestSession.title}` : 'Test in Progress'}</span>
            </div>
          )}

          {/* XP earned, with a bolt */}
          <div
            title="XP Points"
            className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-card pl-1 pr-3 shadow-sm"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 shadow-sm shadow-orange-500/30">
              <Zap className="h-3.5 w-3.5 fill-white text-white" />
            </span>
            <span className="text-xs font-bold text-foreground tabular-nums">{user?.xp ?? 0} XP</span>
          </div>

          {/* Notifications: data-stay so opening them does not end a running practice. */}
          <Button
            data-stay
            variant="ghost"
            size="icon"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            className="relative h-9 w-9 rounded-full border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/40 shadow-sm"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span
                aria-hidden
                className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-nepal-crimson px-1 text-xs font-medium leading-none text-white ring-2 ring-background"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
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
