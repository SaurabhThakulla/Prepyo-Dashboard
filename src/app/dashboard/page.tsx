'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import ExamDateDialog from '@/components/dashboard/ExamDateDialog';
import ExamCountdown from '@/components/dashboard/ExamCountdown';
import StatCard from '@/components/dashboard/StatCard';
import PracticeStudioPanel, { SkillRow } from '@/components/dashboard/PracticeStudioPanel';
import FocusPanel from '@/components/dashboard/FocusPanel';
import { useDashboardSummary } from '@/lib/hooks/useDashboardSummary';
import { daysUntilExam, formatExamDate } from '@/lib/dates';
import { ExamType } from '@/lib/types';

/**
 * The learner's home screen.
 *
 * NOTE — placeholder data. Several figures below still fall back to invented
 * values when the API has nothing: the skill scores in `buildSkillRows` are
 * entirely hardcoded, as are readiness, the "Weakest skill" card in
 * FocusPanel, and the `??` defaults for xp, level, name and rank. They came
 * from the original design mock. Wire them to /progress before launch — a
 * learner cannot tell these apart from their real scores.
 */

/** Per-skill rows. The scores here are placeholders, not real progress. */
function buildSkillRows(exam: ExamType): SkillRow[] {
  const isPTE = exam === 'PTE';

  return [
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
}

export default function DashboardPage() {
  const { user, activeExam, setIsTutorOpen, setTutorContextPrompt } = useApp();
  const [isExamDateOpen, setIsExamDateOpen] = useState(false);
  const { progress, unresolvedMistakes, rank } = useDashboardSummary(activeExam);

  const isPTE = activeExam === 'PTE';

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

  const examDate = formatExamDate(user?.examDate, '15 Oct 2026');
  const daysLeft = daysUntilExam(user?.examDate, 55);

  const handleAskCoach = () => {
    setTutorContextPrompt(
      'I need a high-scoring strategy for PTE Summarise Written Text. My single-sentence constraint was broken in recent attempts. How do I maintain complex grammar within 75 words and get full points?',
    );
    setIsTutorOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
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

        <ExamCountdown
          examDate={examDate}
          daysLeft={daysLeft}
          onEdit={() => setIsExamDateOpen(true)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Current score"
          note={
            <span className="text-xs font-bold text-emerald-600 dark:text-[#00e599] uppercase tracking-wide">
              +{targetGap} TO GOAL
            </span>
          }
          value={estimatedScore}
          valueSuffix={<span className="text-xs font-medium text-muted-foreground">/ {targetScore}</span>}
          percent={Math.round((estimatedScore / targetScore) * 100)}
          footer="From recent practice and diagnostics"
        />

        <StatCard
          label="Readiness"
          note={
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              IN PROGRESS
            </span>
          }
          value={
            <>
              {readiness}
              <span className="text-base font-bold text-foreground">%</span>
            </>
          }
          percent={readiness}
          footer="One more mock reaches 80%"
        />

        <StatCard
          label="Nepal rank"
          note={
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {userRegion}
            </span>
          }
          value={`#${rank ?? 4}`}
          valueSuffix={<span className="text-xs font-normal text-muted-foreground">level {userLevel}</span>}
          percent={Math.round(((userXp % 400) / 400) * 100)}
          footer={
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-normal">{userXp.toLocaleString()} XP earned</span>
              <Link
                href="/leaderboard"
                className="text-xs font-semibold text-emerald-600 dark:text-[#00e599] hover:underline transition-all"
              >
                Leaderboard
              </Link>
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <PracticeStudioPanel skills={buildSkillRows(activeExam)} mistakeCount={mistakeCount} />
        <FocusPanel onAskCoach={handleAskCoach} />
      </div>

      <ExamDateDialog open={isExamDateOpen} onOpenChange={setIsExamDateOpen} />
    </div>
  );
}
