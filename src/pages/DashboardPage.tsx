import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import ExamDateDialog from '@/components/dashboard/ExamDateDialog';
import ExamCountdown from '@/components/dashboard/ExamCountdown';
import SkillQuestionCard from '@/components/dashboard/SkillQuestionCard';
import PracticeStudioPanel, { SkillRow } from '@/components/dashboard/PracticeStudioPanel';
import CurrentPlanCard from '@/components/dashboard/CurrentPlanCard';
import { formatScore, planHeadline } from '@/components/onboarding/onboarding';
import { useDashboardSummary } from '@/lib/hooks/useDashboardSummary';
import { daysUntilExam, formatExamDate } from '@/lib/dates';
import { EXAM_LABELS, EXAM_MAX_SCORE, ExamType, ProgressSummary, SkillType, skillsFor } from '@/lib/types';
import { DashboardPageSkeleton } from '@/components/layout/PageSkeleton';

const SKILL_SUBTITLES: Record<ExamType, Partial<Record<SkillType, string>>> = {
  PTE: {
    speaking: 'Read aloud, describe image',
    writing: 'Essay, summarise written text',
    reading: 'Fill in the blanks, multiple choice',
    listening: 'Dictation, summarise spoken text',
  },
  IELTS: {
    speaking: 'Part 1, 2, 3 questions',
    writing: 'Task 1 & Task 2',
    reading: 'Passages 1–3',
    listening: 'Sections 1–4',
  },
  EPS_TOPIK: {
    reading: 'Pictures, signs, notices & short texts',
    listening: 'Words, replies & workplace dialogues',
  },
};

function buildSkillRows(exam: ExamType, progress: ProgressSummary | null): SkillRow[] {
  const bySkill = new Map((progress?.skills ?? []).map(row => [row.skill, row]));

  // Only the skills the exam has: EPS-TOPIK shows Reading and Listening alone.
  return skillsFor(exam).map(skill => {
    const row = bySkill.get(skill);
    const max = EXAM_MAX_SCORE[exam];
    const band = (value: number) => formatScore(exam, value);
    const hasScore = row != null && row.estimate != null;

    return {
      name: skill.charAt(0).toUpperCase() + skill.slice(1),
      sub: SKILL_SUBTITLES[exam][skill] ?? '',
      scoreText: hasScore ? `${band(row!.estimate!)}/${band(max)}` : '',
      percent: hasScore ? Math.round((row!.estimate! / max) * 100) : 0,
      href: `/practice?skill=${skill}`,
    };
  });
}

export default function DashboardPage() {
  const { user, activeExam } = useApp();
  const [isExamDateOpen, setIsExamDateOpen] = useState(false);
  const { progress, unresolvedMistakes, isLoading } = useDashboardSummary(activeExam);

  if (isLoading) {
    return <DashboardPageSkeleton />;
  }

  const userName = user?.name?.split(' ')[0] ?? 'there';
  const mistakeCount = unresolvedMistakes ?? 0;

  const examDate = user?.examDate ? formatExamDate(user.examDate) : null;
  const daysLeft = user?.examDate ? daysUntilExam(user.examDate) : null;

  const skillProgress = new Map((progress?.skills ?? []).map(row => [row.skill, row]));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Namaste, {userName}
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            {user ? planHeadline(user) : `Preparing for ${EXAM_LABELS[activeExam]}`}
          </p>
        </div>

        <ExamCountdown
          examDate={examDate}
          daysLeft={daysLeft}
          onEdit={() => setIsExamDateOpen(true)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4">
        {skillsFor(activeExam).map(skill => {
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

      {/* Full-width Current Plan Banner */}
      <CurrentPlanCard user={user} />

      {/* Full-width Practice Studio below Current Plan */}
      <PracticeStudioPanel
        skills={buildSkillRows(activeExam, progress)}
        mistakeCount={mistakeCount}
      />

      <ExamDateDialog open={isExamDateOpen} onOpenChange={setIsExamDateOpen} />
    </div>
  );
}
