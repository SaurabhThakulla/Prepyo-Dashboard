import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import ExamDateDialog from '@/components/dashboard/ExamDateDialog';
import ExamCountdown from '@/components/dashboard/ExamCountdown';
import SkillQuestionCard from '@/components/dashboard/SkillQuestionCard';
import PracticeStudioPanel, { SkillRow } from '@/components/dashboard/PracticeStudioPanel';
import FocusPanel from '@/components/dashboard/FocusPanel';
import { useDashboardSummary } from '@/lib/hooks/useDashboardSummary';
import { daysUntilExam, formatExamDate } from '@/lib/dates';
import { ExamType, SkillQuestionStat, SkillType } from '@/lib/types';

/**
 * The learner's home screen.
 *
 * Renders the question bank metrics per skill, countdown to the scheduled exam,
 * dual-panel studio with tests/mistakes shortcuts, dynamic study plan calendar,
 * and weakest skill coaching focus.
 */

/** Per-skill rows for PracticeStudioPanel. */
function buildSkillRows(
  exam: ExamType,
  stats?: Record<SkillType, SkillQuestionStat>,
): SkillRow[] {
  const isPTE = exam === 'PTE';

  return [
    {
      name: 'Speaking',
      sub: stats?.speaking?.sub ?? (isPTE ? 'Read aloud, describe image' : 'Part 1, 2, 3 questions'),
      scoreText: stats?.speaking?.latestScore ?? (isPTE ? '74/90' : '7.0/9.0'),
      percent: stats?.speaking?.readinessPercent ?? 82,
      href: '/practice?skill=speaking',
    },
    {
      name: 'Writing',
      sub: stats?.writing?.sub ?? (isPTE ? 'Essay, summarise written text' : 'Task 1 & Task 2'),
      scoreText: stats?.writing?.latestScore ?? (isPTE ? '68/90' : '6.5/9.0'),
      percent: stats?.writing?.readinessPercent ?? 75,
      href: '/practice?skill=writing',
    },
    {
      name: 'Reading',
      sub: stats?.reading?.sub ?? (isPTE ? 'Fill in the blanks, reading & writing' : 'Passages 1–3'),
      scoreText: stats?.reading?.latestScore ?? (isPTE ? '79/90' : '7.5/9.0'),
      percent: stats?.reading?.readinessPercent ?? 88,
      href: '/practice?skill=reading',
    },
    {
      name: 'Listening',
      sub: stats?.listening?.sub ?? (isPTE ? 'Dictation, summarise spoken text' : 'Sections 1–4'),
      scoreText: stats?.listening?.latestScore ?? (isPTE ? '76/90' : '7.0/9.0'),
      percent: stats?.listening?.readinessPercent ?? 84,
      href: '/practice?skill=listening',
    },
  ];
}

export default function DashboardPage() {
  const { user, activeExam, setIsTutorOpen, setTutorContextPrompt } = useApp();
  const [isExamDateOpen, setIsExamDateOpen] = useState(false);
  const { dashboard, unresolvedMistakes } = useDashboardSummary(activeExam);

  const isPTE = activeExam === 'PTE';
  const userName = user?.name ? user.name.split(' ')[0] : dashboard.user.name.split(' ')[0];
  const mistakeCount = unresolvedMistakes ?? dashboard.unresolvedMistakesCount ?? 3;

  const examDate = formatExamDate(user?.examDate ?? dashboard.user.examDate, '15 Oct 2026');
  const daysLeft = daysUntilExam(user?.examDate ?? dashboard.user.examDate, 55);

  const handleAskCoach = () => {
    const prompt =
      dashboard.weakestSkill?.analysis
        ? `I need a high-scoring strategy for ${activeExam} ${dashboard.weakestSkill.taskTypeName}. Context: ${dashboard.weakestSkill.analysis} How do I improve my score and get full points?`
        : 'I need a high-scoring strategy for PTE Summarise Written Text. My single-sentence constraint was broken in recent attempts. How do I maintain complex grammar within 75 words and get full points?';

    setTutorContextPrompt(prompt);
    setIsTutorOpen(true);
  };

  const skillStats = dashboard.skillStats;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* ── TOP HEADER & EXAM COUNTDOWN ── */}
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

      {/* ── 4 SKILL QUESTION STAT CARDS (Image 1) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkillQuestionCard
          skill="speaking"
          label={skillStats.speaking?.label || 'Speaking Questions'}
          completed={skillStats.speaking?.completedQuestions ?? 0}
          total={skillStats.speaking?.totalQuestions ?? 5833}
          trend={skillStats.speaking?.trend ?? '+0.0%'}
          href={skillStats.speaking?.actionHref ?? '/practice?skill=speaking'}
        />

        <SkillQuestionCard
          skill="writing"
          label={skillStats.writing?.label || 'Writing Questions'}
          completed={skillStats.writing?.completedQuestions ?? 0}
          total={skillStats.writing?.totalQuestions ?? 2096}
          trend={skillStats.writing?.trend ?? '+0.0%'}
          href={skillStats.writing?.actionHref ?? '/practice?skill=writing'}
        />

        <SkillQuestionCard
          skill="reading"
          label={skillStats.reading?.label || 'Reading Questions'}
          completed={skillStats.reading?.completedQuestions ?? 0}
          total={skillStats.reading?.totalQuestions ?? 4929}
          trend={skillStats.reading?.trend ?? '+0.0%'}
          href={skillStats.reading?.actionHref ?? '/practice?skill=reading'}
        />

        <SkillQuestionCard
          skill="listening"
          label={skillStats.listening?.label || 'Listening Questions'}
          completed={skillStats.listening?.completedQuestions ?? 0}
          total={skillStats.listening?.totalQuestions ?? 8175}
          trend={skillStats.listening?.trend ?? '+0.0%'}
          href={skillStats.listening?.actionHref ?? '/practice?skill=listening'}
        />
      </div>

      {/* ── MAIN STUDIO & STUDY PLAN / FOCUS COLUMNS (Image 2) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <PracticeStudioPanel
          skills={buildSkillRows(activeExam, skillStats)}
          mistakeCount={mistakeCount}
        />
        <FocusPanel
          onAskCoach={handleAskCoach}
          weakestSkill={dashboard.weakestSkill}
          studyPlan={dashboard.studyPlan}
        />
      </div>

      {/* ── INTERACTIVE EXAM DATE & TIME MODAL ── */}
      <ExamDateDialog open={isExamDateOpen} onOpenChange={setIsExamDateOpen} />
    </div>
  );
}

