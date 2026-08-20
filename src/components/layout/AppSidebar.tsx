'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  Sun,
  Moon,
  Gift
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface NavItem {
  href: string;
  label: string;
  icon: any;
  sublabel?: string;
  badge?: string;
  count?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface AppSidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function AppSidebar({ isOpen, setIsOpen }: AppSidebarProps) {
  const pathname = usePathname();
  const { user, activeExam, setActiveExam, setIsTutorOpen, theme, toggleTheme } = useApp();

  const isPTE = activeExam === 'PTE';

  const navGroups: NavGroup[] = [
    {
      label: 'Core Learning',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/diagnostic', label: 'Diagnostic Test', icon: Zap, badge: '15 Min' },
      ],
    },
    {
      label: 'Practice Studio',
      items: [
        { href: '/practice?skill=speaking', label: 'Speaking', icon: Mic, sublabel: isPTE ? 'Read Aloud / DI' : 'Part 1-3' },
        { href: '/practice?skill=writing', label: 'Writing Lab', icon: PenTool, sublabel: isPTE ? 'Essay / Summary' : 'Task 1 & 2' },
        { href: '/practice?skill=reading', label: 'Reading Precision', icon: BookOpen, sublabel: isPTE ? 'FIB R&W / Reorder' : 'Passages & TFNG' },
        { href: '/practice?skill=listening', label: 'Listening Engine', icon: Headphones, sublabel: isPTE ? 'Dictation / SST' : 'Section 1-4' },
      ],
    },
    {
      label: 'Assessment & AI',
      items: [
        { href: '/mocks', label: 'Mock Exam Simulator', icon: Award, badge: '2h Full' },
        { href: '/evaluations', label: 'AI Evaluator Lab', icon: Sparkles },
      ],
    },
    {
      label: 'Study Habits',
      items: [
        { href: '/mistakes', label: 'Mistake Bank', icon: RotateCcw, count: 3 },
        { href: '/leaderboard', label: 'Nepal Leaderboard', icon: Trophy },
      ],
    },
    {
      label: 'Account & Plan',
      items: [
        { href: '/referrals', label: 'Refer & Earn Rewards', icon: Gift, badge: '+200 XP' },
        { href: '/subscription', label: 'Subscriptions (NPR)', icon: CreditCard, badge: user?.subscriptionTier === 'elite' ? 'ELITE' : user?.subscriptionTier === 'pro' ? 'PRO' : user?.subscriptionTier === 'weekly' ? 'WEEKLY' : 'FREE' },
        { href: '/profile', label: 'Profile & Target Score', icon: User },
        { href: '/admin', label: 'Admin CMS', icon: ShieldCheck },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Branding & Exam Switcher */}
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/25 font-black text-sm">
                P
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-lg font-extrabold tracking-tight text-foreground">
                    prep<span className="text-primary">yo</span>
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-1 py-0.2 rounded border border-emerald-500/20">NP</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">AI Exam Prep</span>
              </div>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
            </Button>
          </div>

          {/* Exam Switcher Pills */}
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border">
            <button
              onClick={() => setActiveExam('PTE')}
              className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-bold transition-all ${
                activeExam === 'PTE'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>PTE</span>
              <span className="text-[9px] opacity-75 font-mono">79+</span>
            </button>
            <button
              onClick={() => setActiveExam('IELTS')}
              className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-bold transition-all ${
                activeExam === 'IELTS'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>IELTS</span>
              <span className="text-[9px] opacity-75 font-mono">8.0</span>
            </button>
          </div>
        </div>

        <Separator className="bg-border" />

        {/* Scrollable Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {navGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <h4 className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </h4>
              <div className="space-y-0.5 pt-0.5">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href.includes('?') && pathname === item.href.split('?')[0]);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-accent text-accent-foreground font-semibold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="truncate">
                          <span className="block truncate">{item.label}</span>
                          {item.sublabel && (
                            <span className="block text-[10px] text-muted-foreground font-normal truncate">
                              {item.sublabel}
                            </span>
                          )}
                        </div>
                      </div>

                      {item.badge && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border text-muted-foreground">
                          {item.badge}
                        </Badge>
                      )}
                      {item.count !== undefined && (
                        <span className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-300 font-bold px-1.5 py-0.2 rounded-full border border-amber-500/30">
                          {item.count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <Separator className="bg-border" />

        {/* Footer: User & Quick AI Coach Trigger */}
        <div className="p-3 space-y-2 bg-sidebar-background">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTutorOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary font-bold text-xs"
          >
            <Bot className="w-4 h-4 text-primary" />
            <span>Prepyo AI Coach</span>
          </Button>

          <Link
            href="/profile"
            className="flex items-center justify-between p-2 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{user?.name?.charAt(0) || 'B'}</AvatarFallback>
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
      </aside>
    </>
  );
}
