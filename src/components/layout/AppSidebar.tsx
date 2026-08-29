'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  Home,
  Zap,
  Mic,
  PenTool,
  BookOpen,
  Headphones,
  Award,
  Sparkles,
  RotateCcw,
  Trophy,
  CreditCard,
  User,
  Bot,
  Flame,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  FileText,
  LogOut,
  Bug,
} from 'lucide-react';
import ReportIssueDialog from '@/components/support/ReportIssueDialog';
import { SYLLABUS, typeKey } from '@/lib/syllabus';
import { SkillType } from '@/lib/types';
import sidebarNavData from '@/data/sidebar-navigation.json';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

export type PrimarySectionId =
  | 'home'
  | 'practice'
  | 'aicoach'
  | 'mock';

interface SecondaryNavItem {
  href?: string;
  onClick?: () => void;
  label: string;
  icon: any;
  sublabel?: string;
  badge?: string;
  count?: number;
  /** Starts a labelled run of items in the panel. Consecutive items sharing a
   *  group sit under one heading; ungrouped items lead the list. */
  group?: string;
  /** Makes the group heading itself a link — used by the skill headings, so
   *  "Reading" still opens reading practice without picking a task type. */
  groupHref?: string;
}

/** The practice skills, in the order they head the secondary panel. */
const PRACTICE_SKILLS: { skill: SkillType; label: string; icon: any; sublabel: string }[] = [
  { skill: 'speaking', label: 'Speaking', icon: Mic, sublabel: 'Recorded answer, scored from the transcript' },
  { skill: 'writing', label: 'Writing', icon: PenTool, sublabel: 'Written answer with rubric feedback' },
  { skill: 'reading', label: 'Reading', icon: BookOpen, sublabel: 'Passage questions, graded on the server' },
  { skill: 'listening', label: 'Listening', icon: Headphones, sublabel: 'Audio questions, graded on the server' },
];

interface PrimarySectionConfig {
  id: PrimarySectionId;
  label: string;
  icon: any;
  title: string;
  description: string;
  items: SecondaryNavItem[];
}

interface AppSidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isSecondaryOpen: boolean;
  setIsSecondaryOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}

function AppSidebarContent({
  isOpen,
  setIsOpen,
  isSecondaryOpen,
  setIsSecondaryOpen,
}: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, activeExam, setActiveExam, setIsTutorOpen, logout } = useApp();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await logout();
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setIsOpen(false);
      setIsSecondaryOpen(false);
      router.push('/login');
      setIsSigningOut(false);
    }
  };

  const isPTE = activeExam === 'PTE';
  const currentSkill = searchParams.get('skill') || (pathname === '/practice' ? 'speaking' : null);


  // Helper to determine active section from current route
  const getSectionFromPathname = (path: string): PrimarySectionId => {
    if (path.startsWith('/practice')) return 'practice';
    if (path.startsWith('/mocks') || path.startsWith('/diagnostic')) return 'mock';
    if (path.startsWith('/evaluations')) return 'aicoach';
    return 'home';
  };

  const [activeSection, setActiveSection] = React.useState<PrimarySectionId>(() =>
    getSectionFromPathname(pathname)
  );

  // Sync active section when path changes
  useEffect(() => {
    setActiveSection(getSectionFromPathname(pathname));
  }, [pathname]);

  const handlePrimaryClick = (sectionId: PrimarySectionId) => {
    if (activeSection === sectionId) {
      // Toggle secondary sidebar if clicking the already selected icon
      setIsSecondaryOpen(prev => !prev);
    } else {
      // Switch section and ensure secondary sidebar is open
      setActiveSection(sectionId);
      setIsSecondaryOpen(true);
    }
  };


  const sections: PrimarySectionConfig[] = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      title: 'Learner Hub',
      description: 'Progress, study resources & recent activity',
      items: [
        {
          href: '/dashboard',
          label: 'Home Overview',
          icon: Home,
          sublabel: 'Target gaps & score breakdown',
        },
        {
          href: '/mistakes',
          label: 'Mistake Bank',
          icon: RotateCcw,
          sublabel: 'Retry saved weak questions',
          group: 'Study Resources',
        },
        {
          href: '/leaderboard',
          label: 'Nepal Study Challenge',
          icon: Trophy,
          sublabel: 'Compete with peers in Nepal',
          group: 'Study Resources',
        },
      ],
    },
    {
      id: 'practice',
      label: 'Practice',
      icon: PenTool,
      title: `${activeExam} Practice Studio`,
      description: 'Official test modules & AI rubric',
      // One heading per skill, one item per task type underneath — the exam's
      // own shape, straight from the syllabus, so PTE and IELTS each list their
      // own tasks and a change there needs no edit here.
      items: PRACTICE_SKILLS.flatMap(({ skill, label, icon, sublabel }) =>
        (SYLLABUS[activeExam][skill] ?? []).map(name => ({
          href: `/practice?skill=${skill}&type=${typeKey(name)}`,
          label: name,
          icon,
          sublabel,
          group: label,
          groupHref: `/practice?skill=${skill}`,
        })),
      ),
    },
    {
      id: 'aicoach',
      label: 'AI Coach',
      icon: Bot,
      title: 'Prepyo AI Tutor',
      description: '24/7 intelligent tutoring & coaching',
      items: [
        {
          onClick: () => setIsTutorOpen(true),
          label: 'AI Chat Coach',
          icon: Bot,
          sublabel: 'Open live tutoring assistant',
          badge: 'Live',
        },
        {
          href: '/evaluations',
          label: 'AI Evaluator Lab',
          icon: Sparkles,
          sublabel: 'Detailed rubric feedback',
        },
        {
          onClick: () => setIsTutorOpen(true),
          label: 'Practice Help',
          icon: HelpCircle,
          sublabel: 'In-context question guidance',
        },
      ],
    },
    {
      id: 'mock',
      label: 'Mock Exam',
      icon: Award,
      title: 'Mock Exam Simulator',
      description: 'Timed full exams with scorecards',
      items: [
        {
          href: '/mocks',
          label: 'Full Mock Simulator',
          icon: Award,
          sublabel: isPTE ? '2-Hour scored PTE simulation' : 'Full band IELTS simulation',
          badge: '2h Full',
        },
        {
          href: '/diagnostic',
          label: 'Diagnostic Test',
          icon: Zap,
          sublabel: 'Short initial baseline test',
          badge: '15 Min',
        },
        {
          href: '/mocks?tab=reports',
          label: 'Mock Score Reports',
          icon: FileText,
          sublabel: 'Review previous exam scores',
        },
      ],
    },
  ];

  const currentSectionConfig = sections.find(s => s.id === activeSection) || sections[0];
  const [open, isopen] = useState(true);
  const isItemActive = (item: SecondaryNavItem) => {
    if (!item.href) return false;

    if (item.href.includes('skill=')) {
      const itemSkill = item.href.split('skill=')[1]?.split('&')[0];
      // Every task type under a skill shares that skill, so the task type has
      // to match too — otherwise the whole group lights up at once.
      const itemType = item.href.split('type=')[1]?.split('&')[0] ?? null;
      return pathname === '/practice' && currentSkill === itemSkill && itemType === searchParams.get('type');
    }

    if (item.href.includes('tab=')) {
      const itemTab = item.href.split('tab=')[1]?.split('&')[0];
      const currentTab = searchParams.get('tab') || 'catalog';
      return pathname === item.href.split('?')[0] && currentTab === itemTab;
    }

    if (item.href === '/mocks') {
      const currentTab = searchParams.get('tab') || 'catalog';
      return pathname === '/mocks' && currentTab === 'catalog';
    }

    if (item.href === '/home' || item.href === '/dashboard') {
      return pathname === '/home' || pathname === '/dashboard';
    }

    if (item.href === '/subscription' || item.href === '/account') {
      return pathname === '/subscription' || pathname === '/account';
    }

    if (item.href === '/profile') {
      return pathname === '/profile';
    }

    return pathname === item.href;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => {
            setIsOpen(false);
            setIsSecondaryOpen(false);
          }}
        />
      )}

      {/* Two-Level Sidebar Wrapper */}
      <div
        className={`fixed top-0 bottom-0 left-0 z-40 flex transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
      >
        {/* ── LEVEL 1: Primary Icon Sidebar (w-16 / 64px) ── */}
        <aside className="w-16 shrink-0 border-r border-border bg-card flex flex-col justify-between items-center py-4 px-2.5 z-20 select-none">
          {/* Top Logo */}
          <div className="flex flex-col items-center w-full pb-3 mb-2 border-b border-border/50">
            <Link
              href="/dashboard"
              onClick={() => {
                setActiveSection('home');
                setIsSecondaryOpen(true);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-indigo-600 to-violet-700 text-white shadow-md shadow-primary/25 font-black text-base hover:scale-105 transition-transform"
              title="Prepyo — AI Exam Prep"
            >
              P
            </Link>
          </div>

          {/* Primary Navigation Icons */}
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
                        onClick={() => handlePrimaryClick(section.id)}
                        className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 ${isIndicatorActive
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-105'
                          : isSelected
                            ? 'bg-muted text-foreground'
                            : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground hover:scale-105'
                          }`}
                      >
                        <Icon className="w-5 h-5" />

                        {/* Active Indicator Bar */}
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

          {/* Bottom Actions: Report Issue, Profile Trigger & Dropdown Menu */}
          <div className="flex flex-col items-center gap-3 mt-auto pt-3 border-t border-border/60 w-full">
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      setIsReportOpen(true);
                      setIsOpen(false);
                    }}
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
                      <p className="text-xs font-bold leading-none text-foreground truncate">{user?.name || 'Learner'}</p>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 uppercase shrink-0 font-semibold">
                        {user?.subscription?.planId || 'Free'}
                      </Badge>
                    </div>
                    <p className="text-[11px] leading-none text-muted-foreground truncate">{user?.email || 'learner@prepyo.com'}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    href="/profile"
                    onClick={() => setIsOpen(false)}
                    className="cursor-pointer flex items-center gap-2.5 py-2 px-2.5 rounded-xl text-xs font-medium hover:bg-muted/70 transition-colors"
                  >
                    <User className="w-4 h-4 text-primary shrink-0" />
                    <span className="flex-1">Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/subscription"
                    onClick={() => setIsOpen(false)}
                    className="cursor-pointer flex items-center gap-2.5 py-2 px-2.5 rounded-xl text-xs font-medium hover:bg-muted/70 transition-colors"
                  >
                    <CreditCard className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="flex-1">Subscription</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
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

        {/* ── LEVEL 2: Secondary Navigation Panel (Collapsible / w-80 / 320px) ── */}
        <aside
          className={`shrink-0 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col justify-between transition-all duration-300 ease-in-out overflow-hidden ${isSecondaryOpen
            ? 'w-80 opacity-100 pointer-events-auto shadow-xl lg:shadow-none'
            : 'w-0 opacity-0 pointer-events-none border-none'
            }`}
        >
          <div className="w-80 flex flex-col justify-between h-full">
            {/* Panel Header */}
            <div className="p-4 space-y-3 border-b border-border/80 bg-sidebar/50">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-foreground truncate">
                    {currentSectionConfig.title}
                  </h3>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                  {currentSectionConfig.description}
                </p>
              </div>

              {/* Exam Switcher Pills */}
              <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border">
                <button
                  onClick={() => setActiveExam('PTE')}
                  className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-bold transition-all ${activeExam === 'PTE'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <span>PTE</span>
                  <span className="text-[9px] opacity-75 font-mono">79+</span>
                </button>
                <button
                  onClick={() => setActiveExam('IELTS')}
                  className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-bold transition-all ${activeExam === 'IELTS'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <span>IELTS</span>
                  <span className="text-[9px] opacity-75 font-mono">8.0</span>
                </button>
              </div>
            </div>

            {/* Secondary Submenu Items */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
              {!currentSectionConfig.items[0]?.group && (
                <div className="px-2.5 py-1.5 rounded-lg bg-muted/80 dark:bg-muted/50 border border-border/50">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                    {currentSectionConfig.label} Options
                  </h4>
                  <ChevronUp />
                </div>
              )}

              <TooltipProvider delayDuration={120}>
                <div className="space-y-1 pt-1">
                  {currentSectionConfig.items.map((item, idx) => {
                    const Icon = item.icon;
                    const active = isItemActive(item);

                    // One heading per run, so "Study Resources" and "Recent
                    // Activity" stay legible now that they share this panel.
                    const previousGroup = idx > 0 ? currentSectionConfig.items[idx - 1].group : undefined;
                    const startsGroup = Boolean(item.group) && item.group !== previousGroup;

                    const isSignOut = item.label.toLowerCase().includes('sign out') || item.label.toLowerCase().includes('signing out');

                    const itemContent = (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1">
                          <Icon className={`w-4 h-4 shrink-0 transition-colors ${isSignOut
                            ? 'text-muted-foreground group-hover:text-destructive'
                            : active
                              ? 'text-primary'
                              : 'text-muted-foreground group-hover:text-foreground'
                            }`} />
                          <span className={`truncate font-medium text-xs ${isSignOut ? 'text-foreground/90 group-hover:text-destructive' : 'text-foreground/90'}`}>
                            {item.label}
                          </span>
                        </div>

                        {item.badge && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border text-muted-foreground shrink-0 ml-1.5 font-semibold">
                            {item.badge}
                          </Badge>
                        )}
                        {item.count !== undefined && (
                          <span className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-300 font-bold px-1.5 py-0.2 rounded-full border border-amber-500/30 shrink-0 ml-1.5">
                            {item.count}
                          </span>
                        )}

                      </>
                    );

                    const className = `group flex items-center justify-between w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${isSignOut
                      ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-[0.99] cursor-pointer'
                      : active
                        ? 'bg-accent text-accent-foreground font-semibold shadow-xs ring-1 ring-primary/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 active:scale-[0.99]'
                      }`;

                    const itemElement = item.href ? (
                      <Link
                        href={item.href}
                        onClick={() => {
                          setIsOpen(false);
                        }}
                        className={className}
                      >
                        {itemContent}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (item.onClick) item.onClick();
                          setIsOpen(false);
                        }}
                        className={className}
                      >
                        {itemContent}
                      </button>
                    );

                    return (
                      <React.Fragment key={idx}>
                        {startsGroup && (
                          <div className="mt-3.5 mb-1.5 first:mt-0 px-2.5 py-1.5 rounded-lg bg-muted/80 dark:bg-muted/50 border border-border/50">
                            <h5 className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                              {item.groupHref ? (
                                <Link
                                  href={item.groupHref}
                                  onClick={() => setIsOpen(false)}
                                  className="hover:text-primary transition-colors block"
                                >
                                  {item.group}
                                </Link>
                              ) : (
                                <span>{item.group}</span>
                              )}
                            </h5>
                          </div>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {itemElement}
                          </TooltipTrigger>
                          <TooltipContent
                            side="right"
                            align="center"
                            sideOffset={8}
                            className="p-2.5 space-y-0.5 rounded-xl border border-border/90 bg-popover/95 backdrop-blur-xl shadow-2xl"
                          >
                            <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                              <span>{item.label}</span>
                              {item.badge && (
                                <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0 rounded font-semibold uppercase">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            {item.sublabel && (
                              <p className="text-[11px] text-muted-foreground font-normal leading-tight max-w-[220px]">
                                {item.sublabel}
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </React.Fragment>
                    );
                  })}
                </div>
              </TooltipProvider>
            </div>

            <Separator className="bg-border" />

            {/* Panel Footer: Quick AI Coach & Learner Profile Card */}
            <div className="p-3 space-y-2 bg-sidebar-background">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsTutorOpen(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center gap-1.5 border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary font-bold text-xs"
              >
                <Bot className="w-4 h-4 text-primary" />
                <span>Ask AI Coach</span>
              </Button>

              <Link
                href="/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between p-2 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-muted text-foreground text-xs font-bold">
                      {user?.name?.charAt(0) || 'L'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-foreground truncate">{user?.name || 'Learner'}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span>{user?.streakDays ?? 0}d</span>
                      <span>•</span>
                      <span>{user?.xp ?? 0} XP</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </Link>
            </div>
          </div>
        </aside>
      </div>

      <ReportIssueDialog open={isReportOpen} onOpenChange={setIsReportOpen} />
    </>
  );
}

export default function AppSidebar(props: AppSidebarProps) {
  return (
    <React.Suspense fallback={<aside className="w-16 shrink-0 border-r border-border bg-card" />}>
      <AppSidebarContent {...props} />
    </React.Suspense>
  );
}

