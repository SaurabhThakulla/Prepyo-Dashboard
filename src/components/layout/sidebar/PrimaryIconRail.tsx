import React from 'react';
import { Link } from 'react-router-dom';
import { Bug, User, CreditCard, LogOut, MessageSquare, Sun, Moon, Gift } from 'lucide-react';
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
import { UserProfile } from '@/lib/types';
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
          to="/dashboard"
          onClick={onLogoClick}
          className="flex h-10 w-10 items-center justify-center rounded-2xl ring-2 ring-white/25 hover:ring-white/60 hover:scale-105 transition-all"
          title="Prepyo — AI Exam Prep"
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
                      className={`w-full line-clamp-2 break-words text-center text-[10px] leading-tight transition-colors ${
                        isSelected ? 'font-bold text-white' : 'font-medium text-white/65 group-hover:text-white'
                      }`}
                    >
                      {section.label}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12} className="px-3 py-1.5 font-bold">
                  <div className="text-xs font-bold text-foreground">{section.label}</div>
                  <div className="text-[10px] text-muted-foreground font-normal">{section.description}</div>
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
              <div className="text-[10px] text-muted-foreground font-normal">
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
            sideOffset={12}
            className="w-56 p-1.5 shadow-2xl rounded-2xl border border-border bg-card/95 backdrop-blur-xl"
          >
            <DropdownMenuLabel className="font-normal p-2 pb-1.5">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold leading-none text-foreground truncate">
                    {user?.name || 'Learner'}
                  </p>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 uppercase shrink-0 font-semibold">
                    {user?.subscription?.planId || 'Free'}
                  </Badge>
                </div>
                <p className="text-[11px] leading-none text-muted-foreground truncate">
                  {user?.email || 'learner@prepyo.com'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                to="/profile"
                onClick={onCloseMobile}
                className="cursor-pointer flex items-center gap-2.5 py-2 px-2.5 rounded-xl text-xs font-medium hover:bg-muted/70 transition-colors"
              >
                <User className="w-4 h-4 text-primary shrink-0" />
                <span className="flex-1">Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                to="/subscription"
                onClick={onCloseMobile}
                className="cursor-pointer flex items-center gap-2.5 py-2 px-2.5 rounded-xl text-xs font-medium hover:bg-muted/70 transition-colors"
              >
                <CreditCard className="w-4 h-4 text-primary shrink-0" />
                <span className="flex-1">Subscription</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                to="/reports"
                onClick={onCloseMobile}
                className="cursor-pointer flex items-center gap-2.5 py-2 px-2.5 rounded-xl text-xs font-medium hover:bg-muted/70 transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-primary shrink-0" />
                <span className="flex-1">My reports</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                to="/referrals"
                onClick={onCloseMobile}
                className="cursor-pointer flex items-center gap-2.5 py-2 px-2.5 rounded-xl text-xs font-medium hover:bg-muted/70 transition-colors"
              >
                <Gift className="w-4 h-4 text-primary shrink-0" />
                <span className="flex-1">Earn rewards</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onSignOut}
              disabled={isSigningOut}
              className="cursor-pointer flex items-center gap-2.5 py-2 px-2.5 rounded-xl text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive transition-colors"
            >
              <LogOut className="w-4 h-4 text-destructive shrink-0" />
              <span>{isSigningOut ? 'Signing out…' : 'Sign out'}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
