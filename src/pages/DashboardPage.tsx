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
import { useMockAttempts, useMocks } from '@/lib/hooks/useResources';
import { daysUntilExam, formatExamDate } from '@/lib/dates';
import { EXAM_LABELS, skillsFor, isCdsSchemaExam } from '@/lib/types';
import { DashboardPageSkeleton } from '@/components/layout/PageSkeleton';
import { BookOpen, Calculator, Globe } from 'lucide-react';
import JLPTLevelSwitch from '@/components/dashboard/JLPTLevelSwitch';
import CdsTrackSwitch from '@/cds/CdsTrackSwitch';
import NccWingSwitch from '@/cds/NccWingSwitch';
import { cdsPapersFor, useCdsMocks, useCdsSets, useCdsTrack, useNccWing, cdsPaperName, cdsSubtask } from '@/cds/cdsShared';

export default function DashboardPage() {
  const { user, activeExam, pteVariant } = useApp();
  const [isExamDateOpen, setIsExamDateOpen] = useState(false);
  const { progress, isLoading } = useDashboardSummary(activeExam);
  const isCds = isCdsSchemaExam(activeExam);
  // CDS and NCC are practised as papers on their own backend: a card per paper, not per skill.
  const cds = useCdsMocks(isCds);
  const cdsTrack = useCdsTrack(activeExam === 'CDS');
  const nccWing = useNccWing(activeExam === 'NCC');
  const { data: cdsSets } = useCdsSets(isCds);
  // CDS and NCC questions answered in practice, by paper: each set's answers are keyed by question id.
  const answeredByPaper = new Map<string, Set<string>>();
  for (const set of cdsSets ?? []) {
    const paper = set.practice.startsWith('paper:') ? set.practice.slice('paper:'.length) : cdsSubtask(set.practice)?.paper;
    if (!paper) continue;
    const ids = answeredByPaper.get(paper) ?? new Set<string>();
    Object.keys(set.answers ?? {}).forEach(id => ids.add(id));
    answeredByPaper.set(paper, ids);
  }
  // The common bank and the cadet's own wing's bank (across all loaded bank papers).
  const nccBankTypes = ['ncc_common', `ncc_${nccWing}`] as const;
  // JLPT and EPS-TOPIK show their mock tests beside the question cards, 0/0 until any exist.
  const mockSkillExam = activeExam === 'JLPT' || activeExam === 'EPS_TOPIK';
  const { data: mocksData } = useMocks(activeExam);
  const { data: mockAttemptsData } = useMockAttempts();
  const mocksFor = (skill: string) => (mockSkillExam ? mocksData?.mocks ?? [] : []).filter(m => !m.isDiagnostic && m.sections?.some(s => s.skill === skill));
  const sat = new Set((mockAttemptsData?.attempts ?? []).map(a => a.mockId));

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
      {/* Greeting hero in the sidebar's blue; CDS and NCC get the tricolour, with navy (chakra blue) text */}
      <div
        className={`relative overflow-hidden rounded-3xl p-5 sm:p-7 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isCds
            ? 'bg-gradient-to-b from-[#FF9933] via-white to-[#138808] dark:from-[#8a4300] dark:via-slate-900 dark:to-[#0b5205] text-[#000080] dark:text-white shadow-[#138808]/20'
            : 'bg-gradient-to-br from-[#2a56cf] via-primary to-[#132e7d] dark:from-blue-900 dark:via-blue-950 dark:to-slate-950 text-white shadow-primary/20'
        }`}
      >
        {isCds ? (
          <span aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border-[14px] border-dotted border-[#000080]/15 dark:border-white/15" />
        ) : (
          <>
            <span aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border-[28px] border-white/10" />
            <span aria-hidden className="pointer-events-none absolute right-1/3 -bottom-24 h-48 w-48 rounded-full bg-sky-300/25 blur-3xl" />
          </>
        )}
        <div className="relative">
          <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight">
            {isCds ? 'Jai Hind' : 'Namaste'}, {userName}
          </h1>
          <p className={`text-sm mt-1.5 font-medium ${isCds ? 'text-[#000080]/80 dark:text-white/75' : 'text-white/75'}`}>
            {user ? planHeadline(user) : `Preparing for ${examDisplayName}`}
          </p>
        </div>

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-3">
          {activeExam === 'JLPT' && <JLPTLevelSwitch />}
          {activeExam === 'CDS' && <CdsTrackSwitch />}
          {activeExam === 'NCC' && <NccWingSwitch />}
          <ExamCountdown
            examDate={examDate}
            daysLeft={daysLeft}
            onEdit={() => setIsExamDateOpen(true)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 2xl:grid-cols-4 gap-3 sm:gap-4">
        {/* NCC: questions answered across each practice bank type, then one card per certificate's mocks. */}
        {activeExam === 'NCC' && nccBankTypes.map(type => {
          const total = cds.papers.filter(p => p.paperType === type).reduce((sum, p) => sum + p.totalQuestions, 0);
          return (
            <SkillQuestionCard
              key={type}
              skill="reading"
              icon={BookOpen}
              label={`${cdsPaperName(type)} Questions`}
              completed={Math.min(answeredByPaper.get(type)?.size ?? 0, total)}
              total={total}
              href={`/practice?skill=reading&paper=${type}`}
            />
          );
        })}
        {activeExam === 'NCC' && (['ncc_b', 'ncc_c'] as const).map(type => {
          const certMocks = cds.mockPapers.filter(p => p.paperType === type);
          return (
            <SkillQuestionCard
              key={type}
              skill="reading"
              icon={BookOpen}
              label={`${cdsPaperName(type)} Mocks`}
              completed={certMocks.filter(p => cds.attempts.some(a => a.paperId === p.id)).length}
              total={certMocks.length}
              href={`/mocks?paper=${type}`}
            />
          );
        })}
        {/* CDS: questions answered in each paper's practice bank, then its papers sat whole. */}
        {activeExam === 'CDS' && cdsPapersFor(cdsTrack).map(paper => {
          const bank = cds.papers.find(p => p.id === `cds_bank_${paper.type}`);
          const total = bank?.totalQuestions ?? 0;
          return (
            <SkillQuestionCard
              key={`${paper.type}-questions`}
              skill="reading"
              icon={paper.type === 'english' ? BookOpen : paper.type === 'gk' ? Globe : Calculator}
              label={`${paper.name} Questions`}
              completed={Math.min(answeredByPaper.get(paper.type)?.size ?? 0, total)}
              total={total}
              href={`/practice?skill=reading&paper=${paper.type}`}
            />
          );
        })}
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
        {mockSkillExam && skillsFor(activeExam).map(skill => {
          const mocks = mocksFor(skill);
          return (
            <SkillQuestionCard
              key={`${skill}-mocks`}
              skill={skill}
              label={`${skill.charAt(0).toUpperCase() + skill.slice(1)} Mock Tests`}
              completed={mocks.filter(m => sat.has(m.id)).length}
              total={mocks.length}
              href="/mocks"
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
        <CurrentPlanCard user={user} aiGraded={!isCds} />
      </div>

      {!isCds && <SkillProfileCard progress={progress} />}

      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm">
        <MistakesPage embedded />
      </div>

      <ExamDateDialog open={isExamDateOpen} onOpenChange={setIsExamDateOpen} />
    </div>
  );
}
