import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import ExamDateDialog from '@/components/dashboard/ExamDateDialog';
import ExamCountdown from '@/components/dashboard/ExamCountdown';
import SkillQuestionCard from '@/components/dashboard/SkillQuestionCard';
import PracticeStudioPanel, { SkillRow } from '@/components/dashboard/PracticeStudioPanel';
import FocusPanel from '@/components/dashboard/FocusPanel';
import { planHeadline, skillLabel } from '@/components/onboarding/onboarding';
import { useDashboardSummary } from '@/lib/hooks/useDashboardSummary';
import { daysUntilExam, formatExamDate } from '@/lib/dates';
import { ExamType, ProgressSummary, SkillType } from '@/lib/types';
import { DashboardPageSkeleton } from '@/components/layout/PageSkeleton';

function buildSkillRows(exam: ExamType, progress: ProgressSummary | null): SkillRow[] {
  const isPTE = exam === 'PTE';
  const bySkill = new Map((progress?.skills ?? []).map(row => [row.skill, row]));

  const subtitles: Record<SkillType, string> = {
    speaking: isPTE ? 'Read aloud, describe image' : 'Part 1, 2, 3 questions',
    writing: isPTE ? 'Essay, summarise written text' : 'Task 1 & Task 2',
    reading: isPTE ? 'Fill in the blanks, multiple choice' : 'Passages 1–3',
    listening: isPTE ? 'Dictation, summarise spoken text' : 'Sections 1–4',
  };

  return (['speaking', 'writing', 'reading', 'listening'] as SkillType[]).map(skill => {
    const row = bySkill.get(skill);
    const max = isPTE ? 90 : 9;
    const band = (value: number) => (isPTE ? String(Math.round(value)) : value.toFixed(1));
    const hasScore = row != null && row.estimate != null;

    return {
      name: skill.charAt(0).toUpperCase() + skill.slice(1),
      sub: subtitles[skill],
      scoreText: hasScore ? `${band(row!.estimate!)}/${band(max)}` : '',
      percent: hasScore ? Math.round((row!.estimate! / max) * 100) : 0,
      href: `/practice?skill=${skill}`,
    };
  });
}

export default function DashboardPage() {
  const { user, activeExam, setIsTutorOpen, setTutorContextPrompt } = useApp();
  const [isExamDateOpen, setIsExamDateOpen] = useState(false);
  const { progress, unresolvedMistakes, isLoading } = useDashboardSummary(activeExam);

  if (isLoading && !progress) {
    return <DashboardPageSkeleton />;
  }

  const userName = user?.name?.split(' ')[0] ?? 'there';
  const mistakeCount = unresolvedMistakes ?? 0;

  const examDate = user?.examDate ? formatExamDate(user.examDate) : null;
  const daysLeft = user?.examDate ? daysUntilExam(user.examDate) : null;

  const handleAskCoach = () => {
    const attempted = (progress?.skills ?? []).filter(row => row.attempts > 0);
    const weakest = attempted.length
      ? attempted.reduce((worst, row) => (row.accuracy < worst.accuracy ? row : worst))
      : null;
    const focus = skillLabel(user?.focusSkill)?.toLowerCase();

    setTutorContextPrompt(
      weakest
        ? `I am preparing for ${activeExam}. My weakest skill is ${weakest.skill} — ${weakest.accuracy}% accuracy across ${weakest.attempts} recent attempts. What should I work on to improve it?`
        : focus
          ? `I am preparing for ${activeExam} and have not practised yet. I find ${focus} the hardest. Where should I start?`
          : `I am preparing for ${activeExam} and have not practised yet. Where should I start?`,
    );
    setIsTutorOpen(true);
  };

  const skillProgress = new Map((progress?.skills ?? []).map(row => [row.skill, row]));

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Namaste, {userName}
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            {user ? planHeadline(user) : `Preparing for ${activeExam}`}
          </p>
        </div>

        <ExamCountdown
          examDate={examDate}
          daysLeft={daysLeft}
          onEdit={() => setIsExamDateOpen(true)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(['speaking', 'writing', 'reading', 'listening'] as SkillType[]).map(skill => {
          const row = skillProgress.get(skill);
          return (
            <SkillQuestionCard
              key={skill}
              skill={skill}
              label={`${skill.charAt(0).toUpperCase() + skill.slice(1)} Questions`}
              completed={row?.completed ?? 0}
              total={row?.available ?? 0}
              href={`/practice?skill=${skill}`}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <PracticeStudioPanel
          skills={buildSkillRows(activeExam, progress)}
          mistakeCount={mistakeCount}
        />
        <FocusPanel
          onAskCoach={handleAskCoach}
          user={user}
        />
      </div>

      <ExamDateDialog open={isExamDateOpen} onOpenChange={setIsExamDateOpen} />
    </div>
  );
}
