import React from 'react';
import { Link } from 'react-router-dom';
import {
  Bug,
  User,
  CreditCard,
  LogOut,
  MessageSquare,
  Sun,
  Moon,
  Home,
  ShieldCheck,
  MessageSquareWarning,
  Building2,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import AnimatedLogo from '../AnimatedLogo';
import { PrimarySectionConfig, PrimarySectionId } from './navigation';
import { isAdmin, isInstitutionStudent, UserProfile } from '@/lib/types';
import { accountLines } from '@/lib/account';
import { useApp } from '@/context/AppContext';

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
      { to: '/profile', label: 'Profile', icon: User },
      { to: '/reports', label: 'My reports', icon: MessageSquare },
    ];
  }
  return [
    { to: '/dashboard', label: 'Home', icon: Home },
    { to: '/profile', label: 'Profile', icon: User },
    ...(isInstitutionStudent(user) ? [] : [{ to: '/subscription', label: 'Subscription', icon: CreditCard }]),
    { to: '/reports', label: 'My reports', icon: MessageSquare },
  ];
}

interface PrimaryIconRailProps {
  sections: PrimarySectionConfig[];
  activeSection: PrimarySectionId;
  isSecondaryOpen: boolean;
  user: UserProfile | null;
  isSigningOut: boolean;
  onSectionClick: (id: PrimarySectionId) => void;
  onLogoClick: () => void;
  onReportIssue: () => void;
  onCloseMobile: () => void;
  onSignOut: () => void;
}

/** Level 1: the narrow icon rail down the left edge. */
export default function PrimaryIconRail({
  sections,
  activeSection,
  isSecondaryOpen,
  user,
  isSigningOut,
  onSectionClick,
  onLogoClick,
  onReportIssue,
  onCloseMobile,
  onSignOut,
}: PrimaryIconRailProps) {
  const { theme, setTheme } = useApp();

  return (
    <aside className="w-16 shrink-0 border-r border-white/15 bg-black/15 flex flex-col overflow-y-auto overscroll-contain no-scrollbar justify-between items-center py-4 px-1.5 z-20 select-none">
      <div className="flex flex-col items-center w-full pb-4">
        <Link
          to={isAdmin(user) ? '/admin' : '/dashboard'}
          onClick={onLogoClick}
          className="flex h-10 w-10 items-center justify-center rounded-2xl ring-2 ring-white/25 hover:ring-white/60 hover:scale-105 transition-all"
          title="Home"
        >
          <AnimatedLogo size={40} />
        </Link>
      </div>

      <TooltipProvider delayDuration={100}>
        <nav className="flex flex-col items-center gap-2 mb-auto w-full">
          {sections.map(section => {
            const Icon = section.icon;
            const isSelected = activeSection === section.id;
            const isIndicatorActive = isSelected && isSecondaryOpen;

            return (
              <Tooltip key={section.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onSectionClick(section.id)}
                    aria-label={section.label}
                    aria-current={isSelected ? 'page' : undefined}
                    className="group flex w-full flex-col items-center gap-1 py-1 outline-none"
                  >
                    {/* Icon in a pill, label under it */}
                    <span
                      className={`flex h-8 w-11 items-center justify-center rounded-full transition-all duration-200 group-focus-visible:ring-2 group-focus-visible:ring-white ${
                        isIndicatorActive
                          ? 'bg-white text-primary dark:text-blue-950 shadow-lg shadow-black/20'
                          : isSelected
                            ? 'bg-white/25 text-white'
                            : 'text-white/75 group-hover:bg-white/15 group-hover:text-white'
                      }`}
                    >
                      <Icon className="w-[18px] h-[18px]" />
                    </span>
                    <span
                      className={`w-full line-clamp-2 break-normal text-center text-xs leading-tight tracking-tight transition-colors ${
                        isSelected ? 'font-bold text-white' : 'font-medium text-white/65 group-hover:text-white'
                      }`}
                    >
                      {section.label}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12} className="px-3 py-1.5 font-bold">
                  <div className="text-xs font-bold text-foreground">{section.label}</div>
                  <div className="text-xs text-muted-foreground font-normal">{section.description}</div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </TooltipProvider>

      <div className="flex flex-col items-center gap-3 mt-auto w-full">
        <span className="h-px w-8 bg-white/30 mb-1" />
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onReportIssue}
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-all hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white outline-none"
              >
                <Bug className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10} className="px-3 py-1.5 font-bold">
              <div className="text-xs font-bold text-foreground">Report an issue</div>
              <div className="text-xs text-muted-foreground font-normal">
                Send a bug or problem to the team
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Light / dark switch, the selected one filled */}
        <div className="flex flex-col items-center gap-1 p-1 rounded-full bg-black/15 border border-white/20">
          {(['light', 'dark'] as const).map(mode => {
            const ModeIcon = mode === 'light' ? Sun : Moon;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setTheme(mode)}
                aria-label={mode === 'light' ? 'Light mode' : 'Dark mode'}
                aria-pressed={theme === mode}
                className={`flex h-7 w-7 items-center justify-center rounded-full transition-all outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  theme === mode
                    ? 'bg-white text-amber-500 dark:text-blue-950 shadow-md'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <ModeIcon className="w-4 h-4" />
              </button>
            );
          })}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              title="Account & Profile"
              className="flex h-10 w-10 items-center justify-center rounded-full transition-all outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white"
            >
              <Avatar className="h-10 w-10 ring-2 ring-white/80 ring-offset-2 ring-offset-transparent">
                <AvatarFallback className="bg-white text-primary text-sm font-bold">
                  {user?.name?.charAt(0) || 'P'}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="end"
            sideOffset={14}
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
                      <p key={line} className="truncate text-xs leading-snug text-white/75">
                        {line}
                      </p>
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
                        <Link
                          to="/subscription"
                          onClick={onCloseMobile}
                          className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-primary transition hover:bg-white/90"
                        >
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
                    <Link to={item.to} onClick={onCloseMobile} className={MENU_ITEM}>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] text-primary transition group-hover:bg-primary group-hover:text-primary-foreground dark:bg-white/[0.06] dark:text-blue-300">
                        <item.icon className="h-4 w-4" />
                      </span>
                      <span className="flex-1 font-medium">{item.label}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition group-hover:translate-x-0.5 group-hover:text-primary" />
                    </Link>
                  </DropdownMenuItem>
                ),
              )}
            </div>

            <div className="border-t border-border bg-muted/40 p-2">
              <DropdownMenuItem
                onClick={onSignOut}
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
    </aside>
  );
}
