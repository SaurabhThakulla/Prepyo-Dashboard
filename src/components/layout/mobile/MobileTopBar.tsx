import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Bell, ChevronLeft } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import NotificationDrawer from '../NotificationDrawer';
import AnimatedLogo from '../AnimatedLogo';
import { buildMobileTabs, getMobileTab, isTabRoot, ME_HREF, mobileTitle } from './mobileNav';

/**
 * The phone's top bar. A tab's own screen shows the logo and its title; a
 * screen opened from it shows a back arrow instead. Notifications and the
 * account screen sit on the right, where the desktop header had a row of
 * buttons that did not fit.
 */
export default function MobileTopBar() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, activeExam, unreadCount, activeTestSession, theme } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);

  // The phone's status bar takes this colour, so it runs on from the top bar
  // in the app's theme rather than the system's.
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#04091a' : '#ffffff');
  }, [theme]);

  const root = isTabRoot(pathname, searchParams);
  const title = mobileTitle(pathname, searchParams, activeExam);
  const tab = buildMobileTabs(activeExam, user).find(t => t.id === getMobileTab(pathname, searchParams));

  const goBack = () => {
    // React Router counts the entries it pushed. Opened from a link in a new
    // tab there is nothing to go back to, so go to the top of the tab instead.
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(tab?.href ?? '/dashboard');
  };

  return (
    <>
      <header className="lg:hidden sticky top-0 z-30 flex h-14 w-full min-w-0 items-center gap-1 border-b border-border/70 bg-card/85 px-2 backdrop-blur-xl">
        {root ? (
          <Link to="/dashboard" aria-label="Prepyo home" className="ml-1 flex h-10 w-10 shrink-0 items-center justify-center">
            <AnimatedLogo size={38} />
          </Link>
        ) : (
          <button
            type="button"
            onClick={goBack}
            aria-label="Back"
            data-nav
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground active:bg-muted [-webkit-tap-highlight-color:transparent]"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2} />
          </button>
        )}

        <p className={`min-w-0 flex-1 truncate font-display text-foreground ${root ? 'pl-2 text-lg font-bold' : 'text-base font-semibold'}`}>
          {title}
        </p>

        {activeTestSession?.isActive && (
          <span role="status" aria-label={activeTestSession.title || 'Test in progress'} className="relative mr-1 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
          </span>
        )}

        <button
          type="button"
          data-stay
          onClick={() => setShowNotifications(open => !open)}
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-muted [-webkit-tap-highlight-color:transparent]"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              aria-hidden
              className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-nepal-crimson px-1 text-[10px] font-medium leading-none text-white ring-2 ring-card"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {pathname !== ME_HREF && (
          <Link to={ME_HREF} aria-label="Your account" className="mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full active:bg-muted">
            <Avatar className="h-8 w-8 ring-2 ring-primary/15">
              <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                {user?.name?.charAt(0)?.toUpperCase() || 'L'}
              </AvatarFallback>
            </Avatar>
          </Link>
        )}
      </header>

      <NotificationDrawer open={showNotifications} onClose={() => setShowNotifications(false)} />
    </>
  );
}
