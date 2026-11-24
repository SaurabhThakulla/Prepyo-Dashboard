import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import ExamDateDialog from '@/components/dashboard/ExamDateDialog';
import ExamCountdown from '@/components/dashboard/ExamCountdown';
import SkillQuestionCard from '@/components/dashboard/SkillQuestionCard';
import CurrentPlanCard from '@/components/dashboard/CurrentPlanCard';
import DashboardQuickTests from '@/components/dashboard/DashboardQuickTests';
import SkillProfileCard from '@/components/dashboard/SkillProfileCard';
import MistakesPage from '@/pages/MistakesPage';
import { planHeadline } from '@/components/onboarding/onboarding';
import { useDashboardSummary } from '@/lib/hooks/useDashboardSummary';
import { daysUntilExam, formatExamDate } from '@/lib/dates';
import { EXAM_LABELS, skillsFor, isCdsSchemaExam } from '@/lib/types';
import { DashboardPageSkeleton } from '@/components/layout/PageSkeleton';
import { BookOpen, Calculator, Globe } from 'lucide-react';
import JLPTLevelSwitch from '@/components/dashboard/JLPTLevelSwitch';
import CdsTrackSwitch from '@/cds/CdsTrackSwitch';
import { cdsPapersFor, useCdsMocks, useCdsTrack, cdsPaperName } from '@/cds/cdsShared';

export default function DashboardPage() {
  const { user, activeExam, pteVariant } = useApp();
  const [isExamDateOpen, setIsExamDateOpen] = useState(false);
  const { progress, isLoading } = useDashboardSummary(activeExam);
  const isCds = isCdsSchemaExam(activeExam);
  // CDS and NCC are practised as papers on their own backend: a card per paper, not per skill.
  const cds = useCdsMocks(isCds);
  const cdsTrack = useCdsTrack(activeExam === 'CDS');

  if (isLoading) {
    return <DashboardPageSkeleton />;
  }

  const userName = user?.name?.split(' ')[0] ?? 'there';

  const examDate = user?.examDate ? formatExamDate(user.examDate) : null;
  const daysLeft = user?.examDate ? daysUntilExam(user.examDate) : null;

  const skillProgress = new Map((progress?.skills ?? []).map(row => [row.skill, row]));

  const examDisplayName =
    activeExam === 'PTE'
      ? pteVariant === 'core'
        ? 'PTE Core'
        : 'PTE Academic'
      : EXAM_LABELS[activeExam];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      {/* Greeting hero in the sidebar's blue */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2a56cf] via-primary to-[#132e7d] dark:from-blue-900 dark:via-blue-950 dark:to-slate-950 p-5 sm:p-7 text-white shadow-xl shadow-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border-[28px] border-white/10" />
        <span aria-hidden className="pointer-events-none absolute right-1/3 -bottom-24 h-48 w-48 rounded-full bg-sky-300/25 blur-3xl" />
        <div className="relative">
          <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight">
            Namaste, {userName}
          </h1>
          <p className="text-sm text-white/75 mt-1.5 font-medium">
            {user ? planHeadline(user) : `Preparing for ${examDisplayName}`}
          </p>
        </div>

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-3">
          {activeExam === 'JLPT' && <JLPTLevelSwitch />}
          {activeExam === 'CDS' && <CdsTrackSwitch />}
          <ExamCountdown
            examDate={examDate}
            daysLeft={daysLeft}
            onEdit={() => setIsExamDateOpen(true)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 2xl:grid-cols-4 gap-3 sm:gap-4">
        {/* NCC: a card for each certificate's mock test. */}
        {activeExam === 'NCC' && cds.mockPapers.map(paper => (
          <SkillQuestionCard
            key={paper.id}
            skill="reading"
            icon={BookOpen}
            label={`${cdsPaperName(paper.paperType)} Mock`}
            completed={cds.attempts.some(a => a.paperId === paper.id) ? 1 : 0}
            total={1}
            href="/mocks"
          />
        ))}
        {activeExam === 'CDS' && cdsPapersFor(cdsTrack).map(paper => {
          const papers = cds.papers.filter(p => p.paperType === paper.type);
          return (
            <SkillQuestionCard
              key={paper.type}
              skill="reading"
              icon={paper.type === 'english' ? BookOpen : paper.type === 'gk' ? Globe : Calculator}
              label={`${paper.name} Papers`}
              completed={papers.filter(p => cds.attempts.some(a => a.paperId === p.id)).length}
              total={papers.length}
              href={`/mocks?paper=${paper.type}`}
            />
          );
        })}
        {!isCds && skillsFor(activeExam).map(skill => {
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

      {/* Quick Tests: Speech Test & Listening Test */}
      {activeExam === 'PTE' && (
        <DashboardQuickTests />
      )}

      {/* Full-width Current Plan Banner */}
      <div>
        <CurrentPlanCard user={user} />
      </div>

      {!isCds && <SkillProfileCard progress={progress} />}

      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm">
        <MistakesPage embedded />
      </div>

      <ExamDateDialog open={isExamDateOpen} onOpenChange={setIsExamDateOpen} />
    </div>
  );
}
