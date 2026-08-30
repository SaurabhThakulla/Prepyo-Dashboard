import React from 'react';
import { Link } from 'react-router-dom';
import { StudyPlanData, WeakestSkillFocus } from '@/lib/types';
import StudyPlanCalendar from '@/components/dashboard/StudyPlanCalendar';

interface FocusPanelProps {
  onAskCoach: () => void;
  weakestSkill?: WeakestSkillFocus;
  studyPlan?: StudyPlanData;
}

/**
 * Right column: Study plan calendar, weakest skill focus, and evaluator lab shortcut.
 */
export default function FocusPanel({ onAskCoach, weakestSkill, studyPlan }: FocusPanelProps) {
  const taskTitle = weakestSkill?.taskTypeName ?? 'Summarise written text';
  const scoreText = weakestSkill?.latestScore ?? '68/90';
  const analysisText =
    weakestSkill?.analysis ??
    'Your single-sentence constraint was broken. Keep responses under 75 words with one main clause.';
  const actionText = weakestSkill?.actionText ?? 'Practice 2 summaries';
  const actionHref = weakestSkill?.actionHref ?? '/practice?skill=writing';
  const period = weakestSkill?.period ?? 'LAST 7 DAYS';

  return (
    <div className="lg:col-span-5 space-y-5">
      {/* 1. Study Plan Calendar Widget */}
      <StudyPlanCalendar studyPlan={studyPlan} />

      {/* 2. Weakest skill card */}
      <div className="bg-card dark:bg-[#12161c] border border-border dark:border-white/10 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Weakest skill</h3>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {period}
          </span>
        </div>

        <div className="border-l-2 border-l-rose-500 dark:border-l-[#ff5c5c] bg-rose-50/50 dark:bg-white/[0.02] pl-3.5 py-2 rounded-r-lg space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">{taskTitle}</span>
            <span className="text-xs font-bold text-rose-600 dark:text-[#ff5c5c]">{scoreText}</span>
          </div>
          <p className="text-[11px] text-muted-foreground font-normal leading-relaxed">
            {analysisText}
          </p>
        </div>

        <Link
          to={actionHref}
          className="w-full bg-emerald-500 hover:bg-emerald-600 dark:bg-[#00e599] dark:hover:bg-[#00d08a] text-white dark:text-black font-bold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-emerald-500/20 dark:shadow-[#00e599]/15 flex items-center justify-center text-center"
        >
          {actionText}
        </Link>

        <button
          type="button"
          onClick={onAskCoach}
          className="w-full bg-muted/50 hover:bg-muted dark:bg-[#181c24] dark:hover:bg-[#222733] border border-border dark:border-white/10 text-foreground dark:text-white font-medium text-xs py-2.5 rounded-xl transition-colors flex items-center justify-center text-center"
        >
          Ask AI Coach for a strategy
        </button>
      </div>

      {/* 3. AI Evaluator Lab shortcut */}
      <div className="bg-card dark:bg-[#12161c] border border-border dark:border-white/10 rounded-2xl p-6 space-y-3 shadow-sm">
        <h3 className="text-sm font-bold text-foreground">AI Evaluator Lab</h3>
        <p className="text-[11px] text-muted-foreground font-normal leading-relaxed">
          Submit a writing or speaking response and get sentence-level feedback in seconds.
        </p>
        <div className="pt-1">
          <Link
            to="/evaluations"
            className="bg-muted/50 hover:bg-muted dark:bg-[#181c24] dark:hover:bg-[#222733] border border-border dark:border-white/10 text-foreground dark:text-white text-xs font-medium px-4 py-2 rounded-xl transition-colors inline-block"
          >
            Open evaluator
          </Link>
        </div>
      </div>
    </div>
  );
}

