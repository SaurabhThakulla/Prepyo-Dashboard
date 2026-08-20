'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  LayoutDashboard,
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
  ShieldCheck,
  Bot,
  Flame,
  ChevronRight,
  ChevronLeft,
  Sun,
  Moon,
  History,
  GraduationCap,
  HelpCircle,
  FileText
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export type PrimarySectionId =
  | 'dashboard'
  | 'practice'
  | 'aicoach'
  | 'mock'
  | 'history'
  | 'study'
  | 'account';

interface SecondaryNavItem {
  href?: string;
  onClick?: () => void;
  label: string;
  icon: any;
  sublabel?: string;
  badge?: string;
  count?: number;
}

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

interface HistoryItem {
  id: string;
  label: string;
  href: string;
  iconName: string;
  sublabel?: string;
  badge?: string;
  timestamp: number;
}

const getHistoryIcon = (name: string) => {
  switch (name) {
    case 'Mic': return Mic;
    case 'PenTool': return PenTool;
    case 'BookOpen': return BookOpen;
    case 'Headphones': return Headphones;
    case 'Sparkles': return Sparkles;
    case 'Award': return Award;
    case 'Zap': return Zap;
    case 'RotateCcw': return RotateCcw;
    case 'Trophy': return Trophy;
    case 'FileText': return FileText;
    case 'LayoutDashboard': return LayoutDashboard;
    case 'CreditCard': return CreditCard;
    case 'User': return User;
    case 'ShieldCheck': return ShieldCheck;
    default: return History;
  }
};

const formatRelativeTime = (ts: number, now: number): string => {
  const diffSec = Math.max(0, Math.floor((now - ts) / 1000));
  if (diffSec < 30) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
};

export default function AppSidebar({
  isOpen,
  setIsOpen,
  isSecondaryOpen,
  setIsSecondaryOpen,
}: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, activeExam, setActiveExam, setIsTutorOpen, theme, toggleTheme } = useApp();

  const isPTE = activeExam === 'PTE';
  const currentSkill = searchParams.get('skill') || (pathname === '/practice' ? 'speaking' : null);

  const [userHistory, setUserHistory] = React.useState<HistoryItem[]>([]);
  const [nowTime, setNowTime] = React.useState<number>(Date.now());

  // Real-time ticking interval for relative time strings
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Load real user history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('prepyo_realtime_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setUserHistory(parsed);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Real-time tracker: immediately records every active section/module visited
  useEffect(() => {
    let newItem: HistoryItem | null = null;
    const now = Date.now();

    if (pathname.startsWith('/practice')) {
      const skill = searchParams.get('skill') || 'speaking';
      const skillMeta: Record<string, { label: string; icon: string; badge: string }> = {
        speaking: { label: `${activeExam} Speaking Practice`, icon: 'Mic', badge: 'SPEAKING' },
        writing: { label: `${activeExam} Writing Lab`, icon: 'PenTool', badge: 'WRITING' },
        reading: { label: `${activeExam} Reading Precision`, icon: 'BookOpen', badge: 'READING' },
        listening: { label: `${activeExam} Listening Engine`, icon: 'Headphones', badge: 'LISTENING' },
      };
      const meta = skillMeta[skill] || skillMeta.speaking;
      newItem = {
        id: `practice-${skill}`,
        label: meta.label,
        href: `/practice?skill=${skill}`,
        iconName: meta.icon,
        badge: meta.badge,
        timestamp: now,
      };
    } else if (pathname === '/evaluations') {
      newItem = {
        id: 'evaluations',
        label: 'AI Evaluator Lab',
        href: '/evaluations',
        iconName: 'Sparkles',
        badge: 'AI LAB',
        timestamp: now,
      };
    } else if (pathname === '/mocks') {
      newItem = {
        id: 'mocks',
        label: `${activeExam} Mock Exam Simulator`,
        href: '/mocks',
        iconName: 'Award',
        badge: '2h FULL',
        timestamp: now,
      };
    } else if (pathname === '/diagnostic') {
      newItem = {
        id: 'diagnostic',
        label: 'Diagnostic Test',
        href: '/diagnostic',
        iconName: 'Zap',
        badge: '15 MIN',
        timestamp: now,
      };
    } else if (pathname === '/mistakes') {
      newItem = {
        id: 'mistakes',
        label: 'Mistake Bank Review',
        href: '/mistakes',
        iconName: 'RotateCcw',
        badge: 'STUDY',
        timestamp: now,
      };
    } else if (pathname === '/leaderboard') {
      newItem = {
        id: 'leaderboard',
        label: 'Nepal Leaderboard',
        href: '/leaderboard',
        iconName: 'Trophy',
        badge: 'RANKING',
        timestamp: now,
      };
    } else if (pathname === '/dashboard') {
      newItem = {
        id: 'dashboard',
        label: 'Learner Hub Dashboard',
        href: '/dashboard',
        iconName: 'LayoutDashboard',
        badge: 'OVERVIEW',
        timestamp: now,
      };
    } else if (pathname === '/subscription') {
      newItem = {
        id: 'subscription',
        label: 'Subscriptions (NPR)',
        href: '/subscription',
        iconName: 'CreditCard',
        badge: 'PRICING',
        timestamp: now,
      };
    } else if (pathname === '/profile') {
      newItem = {
        id: 'profile',
        label: 'Profile & Targets',
        href: '/profile',
        iconName: 'User',
        badge: 'PROFILE',
        timestamp: now,
      };
    } else if (pathname === '/admin') {
      newItem = {
        id: 'admin',
        label: 'Admin CMS',
        href: '/admin',
        iconName: 'ShieldCheck',
        badge: 'ADMIN',
        timestamp: now,
      };
    }

    if (newItem) {
      setUserHistory(prev => {
        const filtered = prev.filter(item => item.href !== newItem!.href);
        const updated = [newItem!, ...filtered].slice(0, 8);
        try {
          localStorage.setItem('prepyo_realtime_history', JSON.stringify(updated));
        } catch (e) { }
        return updated;
      });
    }
  }, [pathname, searchParams, activeExam]);

  // Helper to determine active section from current route
  const getSectionFromPathname = (path: string): PrimarySectionId => {
    if (path.startsWith('/practice')) return 'practice';
    if (path.startsWith('/mocks') || path.startsWith('/diagnostic')) return 'mock';
    if (path.startsWith('/evaluations')) return 'aicoach';
    if (path === '/mistakes' || path === '/leaderboard') return 'study';
    if (
      path === '/profile' ||
      path === '/subscription' ||
      path === '/referrals' ||
      path === '/admin'
    ) return 'account';
    return 'dashboard';
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

  const clearRealtimeHistory = () => {
    setUserHistory([]);
    try {
      localStorage.removeItem('prepyo_realtime_history');
    } catch (e) { }
  };

  const historySecondaryItems: SecondaryNavItem[] =
    userHistory.length > 0
      ? userHistory.map(h => ({
          href: h.href,
          label: h.label,
          icon: getHistoryIcon(h.iconName),
          sublabel: `Last used • ${formatRelativeTime(h.timestamp, nowTime)}`,
          badge: h.badge,
        }))
      : [
          {
            href: '/practice?skill=speaking',
            label: 'Start Speaking Practice',
            icon: Mic,
            sublabel: 'Practice to track real-time history',
            badge: 'PTE',
          },
          {
            href: '/mocks',
            label: 'Start Mock Simulator',
            icon: Award,
            sublabel: 'Timed full assessment',
            badge: 'MOCK',
          },
          {
            href: '/evaluations',
            label: 'AI Evaluator Lab',
            icon: Sparkles,
            sublabel: 'Instant rubric scoring',
            badge: 'AI',
          },
        ];

  const sections: PrimarySectionConfig[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      title: 'Learner Hub',
      description: 'Progress & performance metrics',
      items: [
        {
          href: '/dashboard',
          label: 'Dashboard Overview',
          icon: LayoutDashboard,
          sublabel: 'Target gaps & score breakdown',
        },
      ],
    },
    {
      id: 'practice',
      label: 'Practice',
      icon: PenTool,
      title: `${activeExam} Practice Studio`,
      description: 'Official test modules & AI rubric',
      items: [
        {
          href: '/practice?skill=speaking',
          label: 'Speaking',
          icon: Mic,
          sublabel: isPTE ? 'Read Aloud / DI / Retell' : 'Speaking Part 1–3',
        },
        {
          href: '/practice?skill=writing',
          label: 'Writing Lab',
          icon: PenTool,
          sublabel: isPTE ? 'Essay / Summary' : 'Task 1 & Task 2',
        },
        {
          href: '/practice?skill=reading',
          label: 'Reading Precision',
          icon: BookOpen,
          sublabel: isPTE ? 'FIB R&W / Reorder' : 'Passages & TFNG',
        },
        {
          href: '/practice?skill=listening',
          label: 'Listening Engine',
          icon: Headphones,
          sublabel: isPTE ? 'Dictation / SST / FIB' : 'Sections 1–4',
        },
      ],
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
    {
      id: 'history',
      label: 'History',
      icon: History,
      title: 'Recent Activity',
      description: userHistory.length > 0 ? 'Real-time last used sections' : 'No recent activities yet',
      items: historySecondaryItems,
    },
    {
      id: 'study',
      label: 'Study',
      icon: GraduationCap,
      title: 'Study Resources',
      description: 'Targeted revision & mistake tracking',
      items: [
        {
          href: '/mistakes',
          label: 'Mistake Bank',
          icon: RotateCcw,
          sublabel: 'Retry saved weak questions',
          count: 3,
        },
        {
          href: '/leaderboard',
          label: 'Nepal Study Challenge',
          icon: Trophy,
          sublabel: 'Compete with peers in Nepal',
        },
      ],
    },
    {
      id: 'account',
      label: 'Account',
      icon: User,
      title: 'Account & Plan',
      description: 'Profile goals, billing & CMS',
      items: [
        {
          href: '/profile',
          label: 'Profile & Target Score',
          icon: User,
          sublabel: `${user?.targetExam || 'PTE'} target: ${user?.targetScore || 79}`,
        },
        {
          href: '/subscription',
          label: 'Subscriptions (NPR)',
          icon: CreditCard,
          sublabel: 'eSewa, Khalti & ConnectIPS',
          badge: user?.subscriptionTier === 'elite' ? 'ELITE' : user?.subscriptionTier === 'pro' ? 'PRO' : user?.subscriptionTier === 'weekly' ? 'WEEKLY' : 'FREE',
        },
        {
          href: '/referrals',
          label: 'Refer & Earn Rewards',
          icon: Award,
          sublabel: 'Invite friends for XP & Free Mocks',
          badge: '+200 XP',
        },
        {
          href: '/admin',
          label: 'Admin CMS',
          icon: ShieldCheck,
          sublabel: 'Question bank & observability',
        },
      ],
    },
  ];

  const currentSectionConfig = sections.find(s => s.id === activeSection) || sections[0];

  const isItemActive = (item: SecondaryNavItem) => {
    if (!item.href) return false;

    if (item.href.includes('skill=')) {
      const itemSkill = item.href.split('skill=')[1]?.split('&')[0];
      return pathname === '/practice' && currentSkill === itemSkill;
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
        <aside className="w-16 shrink-0 border-r border-border bg-card flex flex-col justify-between items-center py-3 px-2 z-20 select-none">
          {/* Top Logo & Toggle */}
          <div className="flex flex-col items-center gap-1.5 w-full">
            <Link
              href="/dashboard"
              onClick={() => {
                setActiveSection('dashboard');
                setIsSecondaryOpen(true);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-indigo-600 to-violet-700 text-white shadow-md shadow-primary/25 font-black text-base hover:scale-105 transition-transform"
              title="Prepyo — AI Exam Prep"
            >
              P
            </Link>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSecondaryOpen(prev => !prev)}
              className="h-6 w-6 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70"
              title={isSecondaryOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {isSecondaryOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </Button>
          </div>

          {/* Primary Navigation Icons (Clean top alignment without big gap) */}
          <nav className="flex flex-col items-center gap-2 mt-2 mb-auto w-full">
            {sections.map(section => {
              const Icon = section.icon;
              const isSelected = activeSection === section.id;
              const isIndicatorActive = isSelected && isSecondaryOpen;
              return (
                <button
                  key={section.id}
                  onClick={() => handlePrimaryClick(section.id)}
                  title={section.label}
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
                    <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
                  )}

                  {/* Tooltip on Hover */}
                  <span className="absolute left-14 z-50 hidden rounded-lg bg-popover px-2.5 py-1 text-xs font-semibold text-popover-foreground shadow-lg border border-border group-hover:block whitespace-nowrap">
                    {section.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Bottom Actions: Theme & Profile Trigger */}
          <div className="flex flex-col items-center gap-2 mt-auto pt-3 border-t border-border/60 w-full">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </Button>

            <button
              onClick={() => handlePrimaryClick('account')}
              title="Account & Profile"
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${activeSection === 'account' && isSecondaryOpen
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                  : 'hover:opacity-80'
                }`}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {user?.name?.charAt(0) || 'P'}
                </AvatarFallback>
              </Avatar>
            </button>
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
                  <div className="flex items-center gap-1.5">
                    {activeSection === 'history' && userHistory.length > 0 && (
                      <button
                        type="button"
                        onClick={clearRealtimeHistory}
                        className="text-[10px] text-muted-foreground hover:text-destructive font-semibold px-1.5 py-0.5 rounded hover:bg-destructive/10 transition-colors"
                        title="Clear history"
                      >
                        Clear
                      </button>
                    )}
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-1 py-0.2 rounded border border-emerald-500/20">
                      NP
                    </span>
                    <button
                      onClick={() => setIsSecondaryOpen(false)}
                      className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-md transition-colors"
                      title="Collapse secondary sidebar"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
              <h4 className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {currentSectionConfig.label} Options
              </h4>

              <div className="space-y-1 pt-1">
                {currentSectionConfig.items.map((item, idx) => {
                  const Icon = item.icon;
                  const active = isItemActive(item);

                  const itemContent = (
                    <>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                        <span className="truncate font-medium">{item.label}</span>
                      </div>

                      {item.badge && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border text-muted-foreground shrink-0 ml-2">
                          {item.badge}
                        </Badge>
                      )}
                      {item.count !== undefined && (
                        <span className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-300 font-bold px-1.5 py-0.2 rounded-full border border-amber-500/30 shrink-0 ml-2">
                          {item.count}
                        </span>
                      )}
                    </>
                  );

                  const tooltipTitle = item.sublabel ? `${item.label} (${item.sublabel})` : item.label;

                  const className = `group flex items-center justify-between w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${active
                      ? 'bg-accent text-accent-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    }`;

                  if (item.href) {
                    return (
                      <Link
                        key={idx}
                        href={item.href}
                        title={tooltipTitle}
                        onClick={() => {
                          setIsOpen(false);
                        }}
                        className={className}
                      >
                        {itemContent}
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      title={tooltipTitle}
                      onClick={() => {
                        if (item.onClick) item.onClick();
                        setIsOpen(false);
                      }}
                      className={className}
                    >
                      {itemContent}
                    </button>
                  );
                })}
              </div>
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
                      <span>{user?.streakDays || 6}d</span>
                      <span>•</span>
                      <span>{user?.xp || 1450} XP</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

