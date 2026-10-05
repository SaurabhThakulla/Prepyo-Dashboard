import React from 'react';
import { Link } from 'react-router-dom';
import { Bug, User, CreditCard, LogOut, MessageSquare } from 'lucide-react';
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
  return (
    <aside className="w-16 shrink-0 border-r border-border bg-card flex flex-col overflow-y-auto overscroll-contain justify-between items-center py-4 px-2.5 z-20 select-none">
      <div className="flex flex-col items-center w-full pb-3 mb-2 border-b border-border/50">
        <Link
          to="/dashboard"
          onClick={onLogoClick}
          className="flex h-10 w-10 items-center justify-center hover:scale-105 transition-transform"
          title="Prepyo — AI Exam Prep"
        >
          <AnimatedLogo size={40} />
        </Link>
      </div>

      <TooltipProvider delayDuration={100}>
        <nav className="flex flex-col items-center gap-3.5 mt-2 mb-auto w-full">
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
                    className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 ${
                      isIndicatorActive
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-105'
                        : isSelected
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground hover:scale-105'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {isIndicatorActive && (
                      <span className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-1 h-5.5 bg-primary rounded-r-full shadow-sm" />
                    )}
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

      <div className="flex flex-col items-center gap-3 mt-auto pt-3 border-t border-border/60 w-full">
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onReportIssue}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-muted/70 hover:text-amber-600 dark:hover:text-amber-400 hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary outline-none"
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              title="Account & Profile"
              className="flex h-9 w-9 items-center justify-center rounded-xl transition-all outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
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
