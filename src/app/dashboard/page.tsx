'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';
import {
  LeaderboardEntry,
  Mistake,
  Pagination,
  ProgressSummary,
  SkillProgress,
  SkillType,
} from '@/lib/types';
import {
  Calendar,
  Clock,
  Edit2
} from 'lucide-react';
import ExamDateDialog from '@/components/dashboard/ExamDateDialog';

export default function DashboardPage() {
  const { user, activeExam, setIsTutorOpen, setTutorContextPrompt } = useApp();
  const [isExamDateOpen, setIsExamDateOpen] = useState(false);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [unresolvedMistakes, setUnresolvedMistakes] = useState<number | null>(null);
  const [rank, setRank] = useState<number | null>(null);

  const isPTE = activeExam === 'PTE';

  useEffect(() => {
    let cancelled = false;

    api
      .get<ProgressSummary>('/progress')
      .then(data => !cancelled && setProgress(data))
      .catch(() => !cancelled && setProgress(null));

    api
      .get<{ pagination: Pagination; mistakes: Mistake[] }>('/mistakes', { unresolved: 'true', limit: 1 })
      .then(data => !cancelled && setUnresolvedMistakes(data.pagination.total))
      .catch(() => !cancelled && setUnresolvedMistakes(null));

    api
      .get<{ leaderboard: LeaderboardEntry[] }>('/leaderboards', { exam: activeExam })
      .then(data => {
        if (cancelled) return;
        setRank(data.leaderboard.find(entry => entry.isYou)?.rank ?? null);
      })
      .catch(() => !cancelled && setRank(null));

    return () => {
      cancelled = true;
    };
  }, [activeExam]);

  const estimate = progress?.estimate ?? user?.estimate ?? null;
  const targetScore = estimate?.targetScore ?? user?.targetScore ?? (isPTE ? 79 : 7.5);
  const estimatedScore = estimate?.value ?? user?.estimate?.value ?? (isPTE ? 68 : 6.5);
  const targetGap = Math.max(0, targetScore - estimatedScore);
  const readiness = estimate?.readiness ?? 72;
  const userXp = user?.xp ?? 1450;
  const userLevel = user?.level ?? 5;
  const userRegion = (user?.nepalRegion || 'Kathmandu').toUpperCase();
  const userName = user?.name ? user.name.split(' ')[0] : 'Bishal';
  const mistakeCount = unresolvedMistakes ?? 3;

  // Format Date (e.g. "15 Oct 2026")
  const formatDisplayDate = (dateStr?: string): string => {
    if (!dateStr) return '15 Oct 2026';
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        const dayFormatted = date.getDate();
        const monthFormatted = date.toLocaleString('en-US', { month: 'short' });
        const yearFormatted = date.getFullYear();
        return `${dayFormatted} ${monthFormatted} ${yearFormatted}`;
      }
      const d = new Date(dateStr);
      return isNaN(d.getTime())
        ? '15 Oct 2026'
        : `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;
    } catch {
      return dateStr || '15 Oct 2026';
    }
  };

  // Calculate Days Left
  const calculateDaysLeft = (dateStr?: string): number => {
    if (!dateStr) return 55;
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);

        const target = new Date(year, month, day, 9, 0, 0);
        const now = new Date();
        const diffMs = target.getTime() - now.getTime();
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return Math.max(0, days);
      }
      const target = new Date(dateStr);
      const now = new Date();
      const diffMs = target.getTime() - now.getTime();
      return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    } catch {
      return 55;
    }
  };

  const daysLeft = calculateDaysLeft(user?.examDate);
  const formattedExamDate = formatDisplayDate(user?.examDate);

  // Skill items config
  const skillList = [
    {
      name: 'Speaking',
      sub: isPTE ? 'Read aloud, describe image' : 'Part 1, 2, 3 questions',
      scoreText: isPTE ? '74/90' : '7.0/9.0',
      percent: 82,
      href: '/practice?skill=speaking',
    },
    {
      name: 'Writing',
      sub: isPTE ? 'Essay, summarise written text' : 'Task 1 & Task 2',
      scoreText: isPTE ? '68/90' : '6.5/9.0',
      percent: 75,
      href: '/practice?skill=writing',
    },
    {
      name: 'Reading',
      sub: isPTE ? 'Fill in the blanks, reading & writing' : 'Passages 1–3',
      scoreText: isPTE ? '79/90' : '7.5/9.0',
      percent: 88,
      href: '/practice?skill=reading',
    },
    {
      name: 'Listening',
      sub: isPTE ? 'Dictation, summarise spoken text' : 'Sections 1–4',
      scoreText: isPTE ? '76/90' : '7.0/9.0',
      percent: 84,
      href: '/practice?skill=listening',
    },
  ];

  const handleAskCoach = () => {
    setTutorContextPrompt(
      `I need a high-scoring strategy for PTE Summarise Written Text. My single-sentence constraint was broken in recent attempts. How do I maintain complex grammar within 75 words and get full points?`
    );
    setIsTutorOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">

      {/* ── TOP HEADER AREA ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Namaste, {userName}
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            {isPTE
              ? 'Aiming for PTE 79+ · Australia, UK, Canada'
              : 'Aiming for IELTS Band 7.5+ · Australia, UK, Canada'}
          </p>
        </div>

        {/* Exam Date & Days Left Widget */}
        <div
          onClick={() => setIsExamDateOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setIsExamDateOpen(true)}
          title="Click to change your exam date and time"
          className="bg-card dark:bg-[#12161c] border border-border dark:border-white/10 hover:border-emerald-500/50 dark:hover:border-[#00e599]/40 rounded-xl px-5 py-2.5 flex items-center divide-x divide-border dark:divide-white/10 gap-5 cursor-pointer transition-all group shadow-sm shrink-0"
        >
          {/* Column 1: EXAM DATE */}
          <div className="space-y-0.5">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <span>EXAM DATE</span>
              <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-emerald-600 dark:text-[#00e599] transition-opacity" />
            </div>
            <div className="text-xs sm:text-sm font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-[#00e599] transition-colors">
              {formattedExamDate}
            </div>
          </div>

          {/* Column 2: DAYS LEFT */}
          <div className="pl-5 space-y-0.5">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              DAYS LEFT
            </div>
            <div className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-[#00e599]">
              {daysLeft}
            </div>
          </div>
        </div>
      </div>

      {/* ── TOP 3 SUMMARY KPI CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Card 1: Current score */}
        <div className="bg-card dark:bg-[#12161c] border border-border dark:border-white/10 rounded-2xl p-5 space-y-3.5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Current score</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-[#00e599] uppercase tracking-wide">
              +{targetGap} TO GOAL
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-foreground tracking-tight">{estimatedScore}</span>
              <span className="text-xs font-medium text-muted-foreground">/ {targetScore}</span>
            </div>

            {/* Mint Green Progress Bar */}
            <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800/90 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-emerald-500 dark:bg-[#00e599] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((estimatedScore / targetScore) * 100))}%` }}
              />
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground font-normal">
            From recent practice and diagnostics
          </div>
        </div>

        {/* Card 2: Readiness */}
        <div className="bg-card dark:bg-[#12161c] border border-border dark:border-white/10 rounded-2xl p-5 space-y-3.5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Readiness</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              IN PROGRESS
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-3xl font-black text-foreground tracking-tight">{readiness}</span>
              <span className="text-base font-bold text-foreground">%</span>
            </div>

            {/* Mint Green Progress Bar */}
            <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800/90 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-emerald-500 dark:bg-[#00e599] rounded-full transition-all duration-500"
                style={{ width: `${readiness}%` }}
              />
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground font-normal">
            One more mock reaches 80%
          </div>
        </div>

        {/* Card 3: Nepal rank */}
        <div className="bg-card dark:bg-[#12161c] border border-border dark:border-white/10 rounded-2xl p-5 space-y-3.5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Nepal rank</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {userRegion}
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-foreground tracking-tight">#{rank ?? 4}</span>
              <span className="text-xs font-normal text-muted-foreground">level {userLevel}</span>
            </div>

            {/* Mint Green Progress Bar */}
            <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800/90 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-emerald-500 dark:bg-[#00e599] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round(((userXp % 400) / 400) * 100))}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground font-normal">{userXp.toLocaleString()} XP earned</span>
            <Link
              href="/leaderboard"
              className="text-xs font-semibold text-emerald-600 dark:text-[#00e599] hover:underline transition-all"
            >
              Leaderboard
            </Link>
          </div>
        </div>

      </div>

      {/* ── MAIN CONTENT (2 COLUMNS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* ── LEFT COLUMN: PRACTICE STUDIO (7 cols) ── */}
        <div className="lg:col-span-7 bg-card dark:bg-[#12161c] border border-border dark:border-white/10 rounded-2xl p-6 space-y-5 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Practice studio</h2>
            <Link
              href="/practice"
              className="text-xs font-semibold text-emerald-600 dark:text-[#00e599] hover:underline transition-all"
            >
              View all tasks
            </Link>
          </div>

          {/* Section: SKILLS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground pb-1">
              <span>SKILLS</span>
              <span className="sm:pr-24">LATEST SCORE</span>
            </div>

            {/* 4 Skill Rows */}
            <div className="space-y-3.5">
              {skillList.map((skill) => (
                <div
                  key={skill.name}
                  className="flex items-center justify-between py-1 group gap-3"
                >
                  {/* Left: Skill title + sub */}
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="text-sm font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-[#00e599] transition-colors">
                      {skill.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-normal truncate">
                      {skill.sub}
                    </div>
                  </div>

                  {/* Right: Progress bar + Score + Practice button */}
                  <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-16 sm:w-24 h-1 bg-slate-100 dark:bg-zinc-800/90 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className="h-full bg-emerald-500 dark:bg-[#00e599] rounded-full"
                          style={{ width: `${skill.percent}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-muted-foreground font-medium w-11 sm:w-12 text-right">
                        {skill.scoreText}
                      </span>
                    </div>

                    <Link
                      href={skill.href}
                      className="text-xs font-medium text-foreground dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-white px-3.5 py-1.5 rounded-lg border border-border dark:border-white/5 hover:border-emerald-500/30 dark:hover:border-white/15 bg-muted/30 dark:bg-transparent hover:bg-muted dark:hover:bg-white/5 transition-all text-center shrink-0 min-w-[70px]"
                    >
                      Practice
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: TESTS & REVIEW */}
          <div className="pt-5 border-t border-border dark:border-white/5 space-y-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              TESTS & REVIEW
            </div>

            {/* Diagnostic test */}
            <div className="flex items-center justify-between py-1 gap-3">
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="text-sm font-bold text-foreground">Diagnostic test</div>
                <div className="text-[11px] text-muted-foreground font-normal truncate">
                  15-minute adaptive check
                </div>
              </div>
              <Link
                href="/diagnostic"
                className="text-xs font-medium text-foreground dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-white px-3.5 py-1.5 rounded-lg border border-border dark:border-transparent hover:bg-muted dark:hover:bg-white/5 transition-colors shrink-0"
              >
                Begin
              </Link>
            </div>

            {/* Full mock exam */}
            <div className="flex items-center justify-between py-1 gap-3">
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="text-sm font-bold text-foreground">Full mock exam</div>
                <div className="text-[11px] text-muted-foreground font-normal truncate">
                  2 hours, scored like the real test
                </div>
              </div>
              <Link
                href="/mocks"
                className="text-xs font-medium text-foreground dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-white px-3.5 py-1.5 rounded-lg border border-border dark:border-transparent hover:bg-muted dark:hover:bg-white/5 transition-colors shrink-0"
              >
                Schedule
              </Link>
            </div>

            {/* Mistake bank */}
            <div className="flex items-center justify-between py-1 gap-3">
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="text-sm font-bold text-foreground">Mistake bank</div>
                <div className="text-[11px] text-muted-foreground font-normal truncate">
                  {mistakeCount} items waiting for review
                </div>
              </div>
              <Link
                href="/mistakes"
                className="text-xs font-semibold text-emerald-600 dark:text-[#00e599] hover:underline px-3.5 py-1.5 transition-colors shrink-0"
              >
                Review
              </Link>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN (5 cols): WEAKEST SKILL & AI EVALUATOR ── */}
        <div className="lg:col-span-5 space-y-5">

          {/* Card 1: Weakest skill */}
          <div className="bg-card dark:bg-[#12161c] border border-border dark:border-white/10 rounded-2xl p-6 space-y-4 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Weakest skill</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                LAST 7 DAYS
              </span>
            </div>

            {/* Red Accent Highlight Box */}
            <div className="border-l-2 border-l-rose-500 dark:border-l-[#ff5c5c] bg-rose-50/50 dark:bg-white/[0.02] pl-3.5 py-2 rounded-r-lg space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  Summarise written text
                </span>
                <span className="text-xs font-bold text-rose-600 dark:text-[#ff5c5c]">
                  68/90
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-normal leading-relaxed">
                Your single-sentence constraint was broken. Keep responses under 75 words with one main clause.
              </p>
            </div>

            {/* Action 1: Solid Mint Green CTA Button */}
            <Link
              href="/practice?skill=writing"
              className="w-full bg-emerald-500 hover:bg-emerald-600 dark:bg-[#00e599] dark:hover:bg-[#00d08a] text-white dark:text-black font-bold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-emerald-500/20 dark:shadow-[#00e599]/15 flex items-center justify-center text-center"
            >
              Practice 2 summaries
            </Link>

            {/* Action 2: Secondary Button for AI Coach */}
            <button
              type="button"
              onClick={handleAskCoach}
              className="w-full bg-muted/50 hover:bg-muted dark:bg-[#181c24] dark:hover:bg-[#222733] border border-border dark:border-white/10 text-foreground dark:text-white font-medium text-xs py-2.5 rounded-xl transition-colors flex items-center justify-center text-center"
            >
              Ask AI Coach for a strategy
            </button>
          </div>

          {/* Card 2: AI Evaluator Lab */}
          <div className="bg-card dark:bg-[#12161c] border border-border dark:border-white/10 rounded-2xl p-6 space-y-3 shadow-sm">
            <h3 className="text-sm font-bold text-foreground">AI Evaluator Lab</h3>
            <p className="text-[11px] text-muted-foreground font-normal leading-relaxed">
              Submit a writing or speaking response and get sentence-level feedback in seconds.
            </p>
            <div className="pt-1">
              <Link
                href="/evaluations"
                className="bg-muted/50 hover:bg-muted dark:bg-[#181c24] dark:hover:bg-[#222733] border border-border dark:border-white/10 text-foreground dark:text-white text-xs font-medium px-4 py-2 rounded-xl transition-colors inline-block"
              >
                Open evaluator
              </Link>
            </div>
          </div>

        </div>

      </div>

      {/* ── INTERACTIVE EXAM DATE & TIME MODAL ── */}
      <ExamDateDialog
        open={isExamDateOpen}
        onOpenChange={setIsExamDateOpen}
      />

    </div>
  );
}
