import React, { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { wordDiff } from '@/lib/wordDiff';
import { BookOpen, Headphones, Mic, PenLine, type LucideIcon } from 'lucide-react';
import type { Evaluation, SkillType } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EnablingSkills from './EnablingSkills';
import { pteSkillScores, SKILL_STYLE } from './PteSkillScores';
import { SCALE, ScoreRing, toneFor } from './ResultParts';

interface Props {
  evaluation: Evaluation;
  xpAwarded: number;
  /** A PTE question's type id, for the per-skill scores in the header. */
  taskType?: string;
  notes?: string[];
  /** The learner's answer, marked; shown in the first tab. */
  answer?: ReactNode;
  answerTitle?: string;
  answerLegend?: ReactNode;
}

/** A rated answer on one card: score and summary, the enabling skills, and the answer with its fixes in tabs. */
export default function EvaluationCard({ evaluation, xpAwarded, taskType, notes = [], answer, answerTitle = 'Your answer', answerLegend }: Props) {
  const scale = SCALE[evaluation.exam] ?? SCALE.PTE;
  const score = evaluation.estimatedScore;
  const fraction = score === null ? null : (score - scale.min) / (scale.max - scale.min);
  const tone = toneFor(fraction);
  // The server encodes an empty list as null, so none of these can be assumed.
  const criteria = evaluation.criteria ?? [];
  const fixes = evaluation.sentenceFeedback ?? [];
  const skills = taskType ? pteSkillScores(taskType, { evaluation, xpAwarded }) : undefined;

  // The answer and its fixes share one tab, fixes underneath, so both read together.
  const tabs = [
    answer || fixes.length > 0 ? { id: 'answer', label: answer ? answerTitle : `Fixes (${fixes.length})` } : null,
    evaluation.modelRewrite ? { id: 'rewrite', label: 'Stronger version' } : null,
  ].filter((t): t is { id: string; label: string } => t !== null);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card" data-testid="score-card">
      {/* Each skill this task counts towards on top, then the traits, then the overall score. */}
      {(skills || notes.length > 0) && (
        <header className="flex flex-col gap-4 bg-gradient-to-br from-teal-50 via-card to-sky-50 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5 dark:from-teal-950/40 dark:via-card dark:to-sky-950/30">
          {skills && (
            <ul className="flex shrink-0 flex-wrap gap-3" title="Your score for each skill this task counts towards">
              {skills.map(({ skill, score: s }) => <SkillCard key={skill} skill={skill} score={s} />)}
            </ul>
          )}
          {notes.length > 0 && <p className="min-w-0 flex-1 text-[11px] leading-snug text-muted-foreground">{notes.join(' ')}</p>}
        </header>
      )}

      {/* The overall score, then the traits beside it. */}
      <div className="flex flex-col gap-4 border-t border-border p-4 first:border-t-0 sm:flex-row sm:items-center sm:gap-6 sm:px-5">
        <div className={cn('flex shrink-0 flex-col items-center gap-1', criteria.length > 0 && 'sm:border-r sm:border-border sm:pr-6')} title="A practice estimate, not an official result.">
          <ScoreRing fraction={fraction ?? 0} tone={tone} className="h-20 w-20">
            <span className="font-display text-2xl font-bold leading-none text-foreground">{score ?? '—'}</span>
            <span className="mt-0.5 text-[11px] text-muted-foreground">of {scale.max}</span>
          </ScoreRing>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{score === null ? 'Not rated' : 'Overall'}</span>
        </div>
        {criteria.length > 0 && (
          <div className="min-w-0 flex-1">
            <EnablingSkills criteria={criteria} exam={evaluation.exam} />
          </div>
        )}
      </div>

      {tabs.length > 0 && (
        <Tabs defaultValue={tabs[0].id} className="border-t border-border p-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList className="min-h-0 justify-start">
              {tabs.map(t => <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>)}
            </TabsList>
            {answerLegend}
          </div>
          {/* data-dictionary: any word in the answer, its fixes or the rewrite can be looked up. */}
          <TabsContent value="answer" data-dictionary className={cn(PANEL, 'max-h-80 space-y-4')}>
            {answer}
            {fixes.length > 0 && (
              <div className={cn('space-y-2', answer && 'border-t border-border pt-3')}>
                {answer && <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fixes ({fixes.length})</h4>}
                <ul className="space-y-2">
                  {fixes.map((fix, i) => (
                    <li key={i} className="space-y-1 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                      <CorrectedSentence original={fix.original} correction={fix.correction} />
                      {fix.explanation && <p className="text-xs leading-relaxed text-muted-foreground">{fix.explanation}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>
          {evaluation.modelRewrite && (
            <TabsContent value="rewrite" data-dictionary className={PANEL}>
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{evaluation.modelRewrite}</p>
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}

const SKILL_ICON: Record<SkillType, LucideIcon> = { speaking: Mic, writing: PenLine, reading: BookOpen, listening: Headphones };

/** One skill's score out of 90: its name and icon on a coloured band, then a ring in the skill's colour. */
function SkillCard({ skill, score }: { skill: SkillType; score: number }) {
  const style = SKILL_STYLE[skill];
  const Icon = SKILL_ICON[skill];
  const radius = 30;
  const length = 2 * Math.PI * radius;
  const filled = (Math.min(90, Math.max(10, score)) - 10) / 80 * length;
  return (
    <li className="w-32 overflow-hidden rounded-2xl border border-border bg-card shadow-sm" data-testid={`skill-score-${skill}`}>
      <p className={cn('flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold uppercase tracking-wide text-white', style.head)}>
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {style.label}
      </p>
      <div className="relative mx-auto my-3 h-20 w-20">
        <svg viewBox="0 0 72 72" className="h-20 w-20 -rotate-90" aria-hidden>
          <circle cx="36" cy="36" r={radius} fill="none" strokeWidth="7" className="stroke-muted" />
          <circle cx="36" cy="36" r={radius} fill="none" strokeWidth="7" strokeLinecap="round" className={cn(style.ring, 'transition-[stroke-dasharray] duration-700 ease-out')} strokeDasharray={`${filled} ${length}`} />
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-display text-2xl font-bold leading-none tabular-nums', style.text)}>{score}</span>
          <span className="mt-0.5 text-[10px] text-muted-foreground">of 90</span>
        </span>
      </div>
    </li>
  );
}

// One fixed height for every tab, so switching never moves the dialog.
const PANEL = 'mt-3 max-h-44 overflow-y-auto rounded-xl border border-border px-4 py-3';

/** The learner's sentence with only the changed words marked: the wrong ones struck through, the correction after them. */
function CorrectedSentence({ original, correction }: { original: string; correction: string }) {
  const parts = wordDiff(original, correction);
  return (
    <p className="leading-relaxed text-foreground">
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 && ' '}
          {part.kind === 'same' && part.text}
          {part.kind === 'removed' && (
            <del className="text-rose-600 decoration-rose-500/70 dark:text-rose-400">
              <span className="sr-only">remove </span>
              {part.text}
            </del>
          )}
          {part.kind === 'added' && (
            <ins className="rounded bg-emerald-500/10 px-1 text-emerald-700 no-underline dark:text-emerald-300">
              <span className="sr-only">add </span>
              {part.text}
            </ins>
          )}
        </React.Fragment>
      ))}
    </p>
  );
}
