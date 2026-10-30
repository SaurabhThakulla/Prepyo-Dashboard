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
  Gift,
  Home,
  ShieldCheck,
  MessageSquareWarning,
  Building2,
  Sparkles,
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
import { isAdmin, UserProfile } from '@/lib/types';
import { accountLines } from '@/lib/account';
import { useApp } from '@/context/AppContext';

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
        <nav data-tour="nav" className="flex flex-col items-center gap-2 mb-auto w-full">
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
                      className={`w-full line-clamp-2 break-words text-center text-xs leading-tight transition-colors ${
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
            className="w-72 p-2 shadow-2xl rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0f1422] backdrop-blur-2xl ring-1 ring-black/5 dark:ring-white/5 space-y-0.5 animate-in fade-in-50 zoom-in-95 duration-150"
          >
            <DropdownMenuLabel className="font-normal p-0 pb-1">
              <div className="p-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/60 dark:from-white/[0.04] dark:to-white/[0.01] border border-slate-100 dark:border-white/5 flex items-center gap-3">
                <Avatar className="h-10 w-10 ring-2 ring-primary/20 dark:ring-primary/40 shadow-xs shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-300 text-sm font-bold">
                    {user?.name?.charAt(0) || 'P'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <p className="text-xs font-bold leading-tight text-slate-900 dark:text-white truncate">
                      {user?.name || 'Learner'}
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/15 to-yellow-500/20 text-amber-700 dark:text-amber-300 border border-amber-400/30 shadow-2xs shrink-0">
                      <Sparkles className="w-2.5 h-2.5 fill-amber-500/40 text-amber-500" />
                      {user?.subscription?.planId || 'Free'}
                    </span>
                  </div>
                  {accountLines(user).map(line => (
                    <p key={line} className="text-[11px] leading-tight text-slate-500 dark:text-slate-400 truncate">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1.5 bg-slate-100 dark:bg-white/5" />

            {/* Hub links implemented from Home */}
            {isAdmin(user) ? (
              <>
                <DropdownMenuItem asChild>
                  <Link
                    to="/admin"
                    onClick={onCloseMobile}
                    className="group cursor-pointer flex items-center gap-3 py-2 px-2.5 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-white/[0.06] focus:bg-slate-100/90 dark:focus:bg-white/[0.06] transition-all"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <span className="flex-1">Admin Dashboard</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to="/admin/payments"
                    onClick={onCloseMobile}
                    className="group cursor-pointer flex items-center gap-3 py-2 px-2.5 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-white/[0.06] focus:bg-slate-100/90 dark:focus:bg-white/[0.06] transition-all"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <span className="flex-1">Plan Management</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to="/admin/reports"
                    onClick={onCloseMobile}
                    className="group cursor-pointer flex items-center gap-3 py-2 px-2.5 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-white/[0.06] focus:bg-slate-100/90 dark:focus:bg-white/[0.06] transition-all"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                      <MessageSquareWarning className="w-4 h-4" />
                    </div>
                    <span className="flex-1">Issue reports</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to="/admin/consultancies"
                    onClick={onCloseMobile}
                    className="group cursor-pointer flex items-center gap-3 py-2 px-2.5 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-white/[0.06] focus:bg-slate-100/90 dark:focus:bg-white/[0.06] transition-all"
                  >
                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <span className="flex-1">Consultancies</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1.5 bg-slate-100 dark:bg-white/5" />
              </>
            ) : (
              <>
                <DropdownMenuItem asChild>
                  <Link
                    to="/dashboard"
                    onClick={onCloseMobile}
                    className="group cursor-pointer flex items-center gap-3 py-2 px-2.5 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-white/[0.06] focus:bg-slate-100/90 dark:focus:bg-white/[0.06] transition-all"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                      <Home className="w-4 h-4" />
                    </div>
                    <span className="flex-1">Home Overview</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1.5 bg-slate-100 dark:bg-white/5" />
              </>
            )}

            <DropdownMenuItem asChild>
              <Link
                to="/profile"
                onClick={onCloseMobile}
                className="group cursor-pointer flex items-center gap-3 py-2 px-2.5 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-white/[0.06] focus:bg-slate-100/90 dark:focus:bg-white/[0.06] transition-all"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                  <User className="w-4 h-4" />
                </div>
                <span className="flex-1">Profile</span>
              </Link>
            </DropdownMenuItem>
            {!isAdmin(user) && (
              <DropdownMenuItem asChild>
                <Link
                  to="/subscription"
                  onClick={onCloseMobile}
                  className="group cursor-pointer flex items-center gap-3 py-2 px-2.5 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-white/[0.06] focus:bg-slate-100/90 dark:focus:bg-white/[0.06] transition-all"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <span className="flex-1">Subscription</span>
                  {user?.subscription?.isActive && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active
                    </span>
                  )}
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link
                to="/reports"
                onClick={onCloseMobile}
                className="group cursor-pointer flex items-center gap-3 py-2 px-2.5 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-white/[0.06] focus:bg-slate-100/90 dark:focus:bg-white/[0.06] transition-all"
              >
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span className="flex-1">My reports</span>
              </Link>
            </DropdownMenuItem>
            {!isAdmin(user) && (
              <DropdownMenuItem asChild>
                <Link
                  to="/referrals"
                  onClick={onCloseMobile}
                  className="group cursor-pointer flex items-center gap-3 py-2 px-2.5 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-white/[0.06] focus:bg-slate-100/90 dark:focus:bg-white/[0.06] transition-all"
                >
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                    <Gift className="w-4 h-4" />
                  </div>
                  <span className="flex-1">Earn rewards</span>
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="my-1.5 bg-slate-100 dark:bg-white/5" />
            <DropdownMenuItem
              onClick={onSignOut}
              disabled={isSigningOut}
              className="group cursor-pointer flex items-center gap-3 py-2 px-2.5 rounded-xl text-xs sm:text-[13px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 focus:bg-rose-50 dark:focus:bg-rose-950/30 transition-all"
            >
              <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                <LogOut className="w-4 h-4" />
              </div>
              <span>{isSigningOut ? 'Signing out…' : 'Sign out'}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
