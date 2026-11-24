import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Bell,
  Bug,
  Building2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Crown,
  Home,
  LogOut,
  MessageSquare,
  MessageSquareWarning,
  Moon,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useApp } from '@/context/AppContext';
import ReportIssueDialog from '@/components/support/ReportIssueDialog';
import { signedOutPath } from '@/lib/signOutPath';
import { accountLines } from '@/lib/account';
import { EXAM_LABELS, isAdmin, isInstitutionStudent, isPremiumUser, UserProfile } from '@/lib/types';
import AnimatedLogo from './AnimatedLogo';
import BrandMark from '@/institution/BrandMark';
import NotificationDrawer from './NotificationDrawer';
import { ExamSwitcher, PteVariantSwitcher } from './ExamSwitchers';
import JLPTLevelSwitch from '@/components/dashboard/JLPTLevelSwitch';
import SecondaryNavList from './sidebar/SecondaryNavList';
import { useNavSections } from './sidebar/useNavSections';
import { getSectionFromPathname, isNavItemActive, PrimarySectionId, SecondaryNavItem } from './sidebar/navigation';

const ICON_BUTTON =
  'flex h-9 w-9 items-center justify-center rounded-full bg-white/10 ring-1 ring-inset ring-white/15 text-white/85 transition-colors hover:bg-white/20 hover:text-white outline-none focus-visible:ring-2 focus-visible:ring-white';

const MENU_ITEM =
  'group flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 text-sm text-foreground outline-none transition-colors hover:bg-muted focus:bg-muted';

type MenuLink = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

/** The account menu's links, in order; 'separator' draws a line. */
function menuLinks(user: UserProfile | null): (MenuLink | 'separator')[] {
  if (isAdmin(user)) {
    return [
      { to: '/admin', label: 'Admin dashboard', icon: ShieldCheck },
      { to: '/admin/payments', label: 'Plan management', icon: CreditCard },
      { to: '/admin/reports', label: 'Issue reports', icon: MessageSquareWarning },
      { to: '/admin/consultancies', label: 'Consultancies', icon: Building2 },
      'separator',
      { to: '/reports', label: 'My reports', icon: MessageSquare },
    ];
  }
  return [
    { to: '/dashboard', label: 'Home', icon: Home },
    ...(isInstitutionStudent(user) ? [] : [{ to: '/subscription', label: 'Subscription', icon: CreditCard }]),
    { to: '/reports', label: 'My reports', icon: MessageSquare },
  ];
}

/**
 * The desktop menu: one bar across the top. Each section is a tab that opens
 * its links in a panel under the bar. What goes in the menu lives in
 * `sidebar/navigation.ts`; phones use the mobile top and tab bars instead.
 */
export default function TopNav() {
  const { pathname, search } = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, activeExam, setActiveExam, logout, theme, setTheme, unreadCount, activeTestSession, pteVariant, setPteVariant } = useApp();

  const sections = useNavSections();
  const currentSection = getSectionFromPathname(pathname, searchParams);
  const [openId, setOpenId] = useState<PrimarySectionId | null>(null);
  const openSection = sections.find(section => section.id === openId);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Arriving anywhere closes the menu.
  useEffect(() => setOpenId(null), [pathname, search]);

  useEffect(() => {
    if (!openId) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenId(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [openId]);

  const handleSignOut = async () => {
    // Read before logout clears the user: a consultancy's student goes back to its page.
    const home = signedOutPath(user);
    try {
      setIsSigningOut(true);
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      navigate(home);
      setIsSigningOut(false);
    }
  };

  const isItemActive = (item: SecondaryNavItem) => isNavItemActive(item, pathname, searchParams);
  const showUpgrade = !isAdmin(user) && !isPremiumUser(user) && !isInstitutionStudent(user);

  const examLabel = activeExam === 'PTE' ? (pteVariant === 'core' ? 'PTE Core' : 'PTE Academic') : EXAM_LABELS[activeExam];
  const firstName = user?.name?.split(' ')[0] || 'Learner';

  const tabClass = (isCurrent: boolean, isOpen: boolean) =>
    `flex h-9 shrink-0 items-center gap-1.5 xl:gap-2 rounded-full px-3 xl:px-4 text-[13px] xl:text-[13.5px] font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-white ${
      isCurrent
        ? 'bg-white text-primary shadow-md shadow-black/15 dark:text-blue-950'
        : isOpen
          ? 'bg-white/15 text-white'
          : 'text-white/75 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <>
      {openSection && (
        <div data-stay aria-hidden className="fixed inset-0 z-30 hidden lg:block bg-slate-950/40 backdrop-blur-[2px] animate-in fade-in-0 duration-150" onClick={() => setOpenId(null)} />
      )}

      <header className="sticky top-0 z-40 hidden lg:flex h-16 w-full min-w-0 items-center justify-between gap-3 xl:gap-6 px-4 sm:px-6 xl:px-8 text-white bg-gradient-to-r from-[#2a56cf] via-primary to-[#1a3a9c] dark:from-slate-950 dark:via-blue-950 dark:to-slate-950 shadow-[0_1px_0_rgba(255,255,255,0.08),0_10px_30px_-15px_rgba(15,23,42,0.6)] select-none">
        {/* Brand, and the exam being studied */}
        <Link
          to={isAdmin(user) ? '/admin' : '/dashboard'}
          title={user?.institution ? `${user.institution.name} Home` : 'Home'}
          className="group flex shrink-0 items-center gap-2.5 xl:gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white max-w-[180px] xl:max-w-[260px] min-w-0"
        >
          {user?.institution ? (
            <BrandMark
              name={user.institution.name}
              logoUrl={user.institution.logoUrl || `/api/v1/institution/logo/${user.institution.code}`}
              color={user.institution.brandColor}
              className="h-10 w-10 rounded-xl bg-white shadow-xs"
            />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/30 transition group-hover:ring-white/60">
              <AnimatedLogo size={36} />
            </span>
          )}
          <span className="hidden xl:flex flex-col leading-none min-w-0">
            <span className="font-display text-base xl:text-lg font-bold tracking-tight truncate" title={user?.institution?.name || 'Prepyo'}>
              {user?.institution ? user.institution.name : 'Prepyo'}
            </span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">{examLabel}</span>
          </span>
        </Link>

        <nav aria-label="Sections" className="flex min-w-0 items-center gap-3 xl:gap-5 shrink">
          {sections.map(section => {
            const Icon = section.icon;
            const isOpen = openId === section.id;
            const isCurrent = currentSection === section.id;
            // Learn's lessons are too many for a menu: the tab goes straight to the path.
            if (section.id === 'learn') {
              return (
                <Link key={section.id} to="/learn" aria-current={isCurrent ? 'page' : undefined} title={section.description} className={tabClass(isCurrent, false)}>
                  <Icon className="h-4 w-4" />
                  <span>{section.label}</span>
                </Link>
              );
            }
            return (
              <button
                key={section.id}
                type="button"
                // Opening a menu changes nothing yet, so it does not end a running task.
                data-stay
                onClick={() => setOpenId(isOpen ? null : section.id)}
                aria-expanded={isOpen}
                aria-controls="top-nav-panel"
                aria-current={isCurrent ? 'page' : undefined}
                title={section.description}
                className={tabClass(isCurrent, isOpen)}
              >
                <Icon className="h-4 w-4" />
                <span>{section.label}</span>
                <ChevronDown className={`h-3.5 w-3.5 opacity-60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </button>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2 xl:gap-3">
          {activeTestSession?.isActive && (
            <div
              role="status"
              title={activeTestSession.title ? `Testing: ${activeTestSession.title}` : 'Test in Progress'}
              className="flex shrink items-center gap-1.5 px-2.5 py-1 xl:px-3 xl:py-1.5 rounded-full bg-rose-500/20 ring-1 ring-inset ring-rose-300/40 text-rose-100 text-xs font-bold max-w-[130px] sm:max-w-[180px] xl:max-w-xs min-w-0"
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span className="truncate min-w-0">{activeTestSession.title || 'In progress'}</span>
            </div>
          )}

          {showUpgrade && (
            <Link
              to="/subscription"
              title="Go Premium"
              className="flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-300 to-amber-400 px-3 xl:px-3.5 text-xs font-bold text-amber-950 shadow-md shadow-black/20 transition hover:brightness-105"
            >
              <Crown className="h-4 w-4" />
              <span className="hidden xl:inline">Go Premium</span>
            </Link>
          )}

          {/* Notifications; reporting an issue and the theme are in the profile menu. */}
          <div className="flex items-center gap-1.5 xl:gap-2">
            {/* Notifications: data-stay so opening them does not end a running practice. */}
            <button
              type="button"
              data-stay
              onClick={() => setShowNotifications(!showNotifications)}
              title="Notifications"
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
              className={`relative ${ICON_BUTTON}`}
            >
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 && (
                <span aria-hidden className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-nepal-crimson px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[#2449bf] dark:ring-blue-950">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                title="Account & Profile"
                className="flex items-center gap-1.5 xl:gap-2 rounded-full p-0.5 xl:pr-2.5 transition-colors outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white data-[state=open]:bg-white/10"
              >
                <Avatar className="h-9 w-9 ring-2 ring-white/70">
                  <AvatarFallback className="bg-white text-primary text-sm font-bold">{user?.name?.charAt(0)?.toUpperCase() || 'P'}</AvatarFallback>
                </Avatar>
                <span className="hidden xl:block max-w-[6.5rem] 2xl:max-w-[8rem] truncate text-sm font-semibold">{firstName}</span>
                <ChevronDown className="hidden xl:block h-3.5 w-3.5 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="bottom"
              align="end"
              sideOffset={12}
              className="w-72 overflow-hidden rounded-2xl border border-border bg-popover p-0 text-popover-foreground shadow-xl animate-in fade-in-50 zoom-in-95 duration-150"
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="relative overflow-hidden bg-gradient-to-br from-[#2a56cf] via-primary to-[#132e7d] px-4 pb-4 pt-4 text-white dark:from-blue-900 dark:via-blue-950 dark:to-slate-950">
                  <span className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/10" aria-hidden />
                  <span className="pointer-events-none absolute -bottom-12 right-10 h-20 w-20 rounded-full bg-white/5" aria-hidden />
                  <div className="relative flex items-center gap-3">
                    <Avatar className="h-11 w-11 shrink-0 ring-2 ring-white/40">
                      <AvatarFallback className="bg-white text-base font-bold text-primary">
                        {user?.name?.charAt(0)?.toUpperCase() || 'P'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold leading-tight">{user?.name || 'Learner'}</p>
                      {accountLines(user).map(line => (
                        <p key={line} className="truncate text-xs leading-snug text-white/75">{line}</p>
                      ))}
                    </div>
                  </div>
                  {!isAdmin(user) && (
                    <div className="relative mt-3 flex items-center justify-between rounded-xl bg-white/15 px-3 py-2 ring-1 ring-white/15 backdrop-blur-sm">
                      <div className="leading-tight">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-white/60">Your plan</p>
                        <p className="text-sm font-bold capitalize">{user?.subscription?.planId || 'Free'}</p>
                      </div>
                      {user?.subscription?.isActive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Active
                        </span>
                      ) : (
                        !isInstitutionStudent(user) && (
                          <Link to="/subscription" className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-primary transition hover:bg-white/90">
                            Upgrade
                          </Link>
                        )
                      )}
                    </div>
                  )}
                </div>
              </DropdownMenuLabel>

              <div className="p-1.5">
                {menuLinks(user).map((item, i) =>
                  item === 'separator' ? (
                    <DropdownMenuSeparator key={`sep-${i}`} className="mx-2 my-1" />
                  ) : (
                    <DropdownMenuItem key={item.to} asChild>
                      <Link to={item.to} className={MENU_ITEM}>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] text-primary transition group-hover:bg-primary group-hover:text-primary-foreground dark:bg-white/[0.06] dark:text-blue-300">
                          <item.icon className="h-4 w-4" />
                        </span>
                        <span className="flex-1 font-medium">{item.label}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition group-hover:translate-x-0.5 group-hover:text-primary" />
                      </Link>
                    </DropdownMenuItem>
                  ),
                )}
                <DropdownMenuSeparator className="mx-2 my-1" />
                {/* data-stay: neither ends a running practice. */}
                <DropdownMenuItem data-stay onSelect={() => setIsReportOpen(true)} className={MENU_ITEM}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] text-primary transition group-hover:bg-primary group-hover:text-primary-foreground dark:bg-white/[0.06] dark:text-blue-300">
                    <Bug className="h-4 w-4" />
                  </span>
                  <span className="flex-1 font-medium">Report an issue</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-stay
                  role="menuitemcheckbox"
                  aria-checked={theme === 'dark'}
                  // The menu stays open so the switch is seen to flip.
                  onSelect={event => {
                    event.preventDefault();
                    setTheme(theme === 'dark' ? 'light' : 'dark');
                  }}
                  className={MENU_ITEM}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] text-primary transition group-hover:bg-primary group-hover:text-primary-foreground dark:bg-white/[0.06] dark:text-blue-300">
                    {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  </span>
                  <span className="flex-1 font-medium">Dark mode</span>
                  <span aria-hidden className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${theme === 'dark' ? 'left-[18px]' : 'left-0.5'}`} />
                  </span>
                </DropdownMenuItem>
              </div>

              <div className="border-t border-border bg-muted/40 p-2">
                <DropdownMenuItem
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground outline-none transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 focus:border-rose-300 focus:bg-rose-50 focus:text-rose-600 dark:hover:border-rose-500/40 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 dark:focus:bg-rose-500/10 dark:focus:text-rose-400"
                >
                  <LogOut className="h-4 w-4" />
                  {isSigningOut ? 'Signing out…' : 'Sign out'}
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {openSection && (
          // A floating card under the bar; clicks beside it fall through to the backdrop.
          <div className="pointer-events-none absolute inset-x-0 top-full flex justify-center px-4 pt-2">
            {/* data-stay: its group toggles only fold the list; its links still end a running task. */}
            <div
              id="top-nav-panel"
              data-stay
              className="pointer-events-auto flex max-h-[calc(100dvh-6rem)] w-fit max-w-7xl flex-col overflow-hidden rounded-2xl text-white bg-gradient-to-b from-[#2a56cf] via-primary to-[#132e7d] dark:from-slate-900 dark:via-blue-950 dark:to-slate-950 ring-1 ring-white/15 shadow-2xl shadow-slate-950/40 animate-in fade-in-0 slide-in-from-top-2 duration-200"
            >
              <div className="shrink-0 space-y-3.5 border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-primary dark:text-blue-950 shadow-md shadow-black/15">
                    <openSection.icon className="w-5 h-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="flex items-center gap-2 font-display text-lg font-bold leading-tight">
                      <span className="truncate">{openSection.title}</span>
                      {openSection.id === 'home' && isAdmin(user) && (
                        <span className="shrink-0 rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ring-white/25">Admin</span>
                      )}
                    </h3>
                    <p className="text-[13px] text-white/70 leading-snug truncate mt-0.5">{openSection.description}</p>
                  </div>
                </div>
                {/* Only panels whose content follows the exam; the Admin Hub does not. */}
                {openSection.id !== 'home' && (isAdmin(user) || activeExam === 'PTE' || activeExam === 'JLPT') && (
                  // The exam controls get their own row, so every exam and its target fits.
                  <div className="flex flex-wrap items-center gap-2">
                    {isAdmin(user) && <ExamSwitcher activeExam={activeExam} onChange={setActiveExam} onBlue />}
                    {activeExam === 'PTE' && <PteVariantSwitcher pteVariant={pteVariant} onChange={setPteVariant} onBlue />}
                    {activeExam === 'JLPT' && <JLPTLevelSwitch panel />}
                  </div>
                )}
              </div>
              <div className="flex min-h-0 flex-1 flex-col px-2 pt-4 pb-3">
                <SecondaryNavList
                  columns
                  items={openSection.items}
                  fallbackHeading={openSection.label}
                  fallbackIcon={openSection.icon}
                  isItemActive={isItemActive}
                  onNavigate={() => setOpenId(null)}
                />
              </div>
            </div>
          </div>
        )}
      </header>

      <NotificationDrawer open={showNotifications} onClose={() => setShowNotifications(false)} />
      <ReportIssueDialog open={isReportOpen} onOpenChange={setIsReportOpen} />
    </>
  );
}
