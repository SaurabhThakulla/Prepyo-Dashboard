import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import ExamDateDialog from '@/components/dashboard/ExamDateDialog';
import ExamCountdown from '@/components/dashboard/ExamCountdown';
import SkillQuestionCard from '@/components/dashboard/SkillQuestionCard';
import PracticeStudioPanel, { SkillRow } from '@/components/dashboard/PracticeStudioPanel';
import FocusPanel from '@/components/dashboard/FocusPanel';
import { useDashboardSummary } from '@/lib/hooks/useDashboardSummary';
import { daysUntilExam, formatExamDate } from '@/lib/dates';
import { ExamType, ProgressSummary, SkillType } from '@/lib/types';

/**
 * The learner's home screen.
 *
 * Renders the question bank metrics per skill, countdown to the scheduled exam,
 * dual-panel studio with tests/mistakes shortcuts, dynamic study plan calendar,
 * and weakest skill coaching focus.
 */

/** Per-skill rows for PracticeStudioPanel, built from real progress. */
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
    // PTE is a whole-number scale out of 90; IELTS is bands to one decimal, and
    // "0/9" for a band score reads as a fraction rather than a band.
    const band = (value: number) => (isPTE ? String(Math.round(value)) : value.toFixed(1));

    // No attempts means no score. Inventing one here would put a number in
    // front of the learner that nothing in their history supports — the same
    // reason progress.Estimate returns null rather than a default.
    const hasScore = row != null && row.estimate != null;

    return {
      name: skill.charAt(0).toUpperCase() + skill.slice(1),
      sub: subtitles[skill],
      scoreText: hasScore ? `${band(row!.estimate!)}/${band(max)}` : 'Not enough data yet',
      percent: hasScore ? Math.round((row!.estimate! / max) * 100) : 0,
      href: `/practice?skill=${skill}`,
    };
  });
}

export default function DashboardPage() {
  const { user, activeExam, setIsTutorOpen, setTutorContextPrompt } = useApp();
  const [isExamDateOpen, setIsExamDateOpen] = useState(false);
  const { progress, unresolvedMistakes } = useDashboardSummary(activeExam);

  const isPTE = activeExam === 'PTE';
  const userName = user?.name?.split(' ')[0] ?? 'there';
  const mistakeCount = unresolvedMistakes ?? 0;

  // No invented exam date. Until the learner sets one the countdown says so,
  // which is also the prompt to set it.
  const examDate = user?.examDate ? formatExamDate(user.examDate) : null;
  const daysLeft = user?.examDate ? daysUntilExam(user.examDate) : null;

  const handleAskCoach = () => {
    const attempted = (progress?.skills ?? []).filter(row => row.attempts > 0);
    const weakest = attempted.length
      ? attempted.reduce((worst, row) => (row.accuracy < worst.accuracy ? row : worst))
      : null;

    setTutorContextPrompt(
      weakest
        ? `I am preparing for ${activeExam}. My weakest skill is ${weakest.skill} — ${weakest.accuracy}% accuracy across ${weakest.attempts} recent attempts. What should I work on to improve it?`
        : `I am preparing for ${activeExam} and have not practised yet. Where should I start?`,
    );
    setIsTutorOpen(true);
  };

  // Question counts and accuracy come from /progress, which reads the real
  // bank and the learner's real attempts. The dashboard fixture used to supply
  // these and claimed a bank of 21,033 questions against an actual 139.
  const skillProgress = new Map((progress?.skills ?? []).map(row => [row.skill, row]));

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

      {/* ── 4 SKILL QUESTION STAT CARDS ── */}
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
              accuracy={row && row.attempts > 0 ? row.accuracy : null}
              href={`/practice?skill=${skill}`}
            />
          );
        })}
      </div>

      {/* ── MAIN STUDIO & STUDY PLAN / FOCUS COLUMNS (Image 2) ── */}
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

      {/* ── INTERACTIVE EXAM DATE & TIME MODAL ── */}
      <ExamDateDialog open={isExamDateOpen} onOpenChange={setIsExamDateOpen} />
    </div>
  );
}

