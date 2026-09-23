import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Lightbulb,
  Quote,
  Sparkles,
  ThumbsUp,
  Target,
  XCircle,
  Zap,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { wordDiff } from '@/lib/wordDiff';
import type { PracticeResult } from '@/lib/hooks/usePracticeSession';
import type { Evaluation, ExamType, PracticeAttempt, Question } from '@/lib/types';

/**
 * What came back from grading. Two shapes, because the two paths differ:
 * reading and listening return a right/wrong attempt, writing and speaking
 * return a rubric from the AI evaluator.
 */
export default function PracticeResultCard({ result }: { result: PracticeResult }) {
  if (result.attempt) return <DeterministicResult attempt={result.attempt} review={result.review} xpAwarded={result.xpAwarded} />;
  if (result.evaluation) return <EvaluationResult evaluation={result.evaluation} xpAwarded={result.xpAwarded} />;
  return null;
}

type Tone = 'good' | 'fair' | 'poor' | 'none';

const TONE = {
  good: { ring: 'text-emerald-500', soft: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', bar: 'bg-emerald-500', edge: 'border-emerald-500/30' },
  fair: { ring: 'text-amber-500', soft: 'bg-amber-500/10 text-amber-700 dark:text-amber-300', bar: 'bg-amber-500', edge: 'border-amber-500/30' },
  poor: { ring: 'text-rose-500', soft: 'bg-rose-500/10 text-rose-700 dark:text-rose-300', bar: 'bg-rose-500', edge: 'border-rose-500/30' },
  none: { ring: 'text-muted-foreground', soft: 'bg-muted text-muted-foreground', bar: 'bg-muted-foreground', edge: 'border-border' },
} as const;

function toneFor(fraction: number | null): Tone {
  if (fraction === null) return 'none';
  if (fraction >= 0.75) return 'good';
  if (fraction >= 0.45) return 'fair';
  return 'poor';
}

/** The exam's own reporting scale, so an estimate is drawn against the range it lives in. */
const SCALE: Record<ExamType, { min: number; max: number; label: string }> = {
  PTE: { min: 10, max: 90, label: 'PTE score' },
  IELTS: { min: 0, max: 9, label: 'IELTS band' },
};

/** A progress ring with the headline number in the middle. */
function ScoreRing({ fraction, tone, children }: { fraction: number; tone: Tone; children: React.ReactNode }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, fraction));
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="7" className="stroke-muted" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          stroke="currentColor"
          className={cn(TONE[tone].ring, 'transition-[stroke-dasharray] duration-700 ease-out')}
          strokeDasharray={`${clamped * circumference} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

function XpChip({ xpAwarded }: { xpAwarded: number }) {
  if (xpAwarded <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
      <Zap className="h-3.5 w-3.5" aria-hidden /> +{xpAwarded} XP
    </span>
  );
}

function SectionLabel({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <Icon className="h-3.5 w-3.5" aria-hidden /> {children}
    </p>
  );
}

/** Reading and listening: graded on the server, right or wrong. */
function DeterministicResult({ attempt, review, xpAwarded }: { attempt: PracticeAttempt; review?: Question; xpAwarded: number }) {
  const fraction = attempt.maxScore > 0 ? attempt.score / attempt.maxScore : attempt.isCorrect ? 1 : 0;
  const tone: Tone = attempt.isCorrect ? 'good' : attempt.score > 0 ? 'fair' : 'poor';
  const verdict = attempt.isCorrect ? 'Correct' : attempt.score > 0 ? 'Partly right' : 'Not quite';
  const VerdictIcon = attempt.isCorrect ? CheckCircle2 : attempt.score > 0 ? CircleAlert : XCircle;

  return (
    <Card className={cn('overflow-hidden p-0 animate-in fade-in slide-in-from-bottom-2 duration-300', TONE[tone].edge)}>
      <div className="flex flex-col items-center gap-5 p-6 sm:flex-row sm:items-center">
        <ScoreRing fraction={fraction} tone={tone}>
          <span className="font-display text-3xl font-semibold leading-none text-foreground">{attempt.score}</span>
          <span className="mt-1 text-xs text-muted-foreground">of {attempt.maxScore}</span>
        </ScoreRing>

        <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', TONE[tone].soft)}>
              <VerdictIcon className="h-3.5 w-3.5" aria-hidden /> {verdict}
            </span>
            <span className="text-xs text-muted-foreground">{attempt.accuracyPercentage}% accuracy</span>
            <XpChip xpAwarded={xpAwarded} />
          </div>
          {attempt.feedback && <p className="text-sm leading-relaxed text-foreground">{attempt.feedback}</p>}
        </div>
      </div>

      {review?.explanation && (
        <div className="space-y-1.5 border-t border-border bg-muted/30 px-6 py-4">
          <SectionLabel icon={Lightbulb}>Why</SectionLabel>
          <p className="text-sm leading-relaxed text-foreground">{review.explanation}</p>
        </div>
      )}
    </Card>
  );
}

/**
 * The learner's sentence with only the words that changed marked: the wrong
 * ones struck through, the correction right after them.
 */
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

const CONFIDENCE_LABEL: Record<Evaluation['scoreConfidence'], string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};

/**
 * What an IELTS estimate does and does not cover. A speaking estimate from a
 * transcript has no Pronunciation criterion, so it is three of the four the
 * Speaking band is made of; a writing estimate is one task, where the Writing
 * band weights Task 2 twice as heavily as Task 1.
 */
function ieltsNote(evaluation: Evaluation, score: number | null, criteria: Evaluation['criteria']): string | null {
  if (evaluation.exam !== 'IELTS' || score === null) return null;
  if (evaluation.skill === 'speaking' && !(criteria ?? []).some(c => /pronunciation/i.test(c.name))) {
    return 'Pronunciation was not assessed, so this uses three of the four Speaking criteria. It is not a Speaking band.';
  }
  if (evaluation.skill === 'writing') {
    return 'This rates one task. The IELTS Writing band combines both tasks, with Task 2 counting twice as much as Task 1.';
  }
  if (evaluation.skill === 'speaking') {
    return 'This rates one answer. The IELTS Speaking band reflects performance across all three parts of the test.';
  }
  return null;
}

/** Writing and speaking: an estimate on the exam's scale plus rubric feedback. */
function EvaluationResult({ evaluation, xpAwarded }: { evaluation: Evaluation; xpAwarded: number }) {
  const [showRewrite, setShowRewrite] = useState(false);
  const scale = SCALE[evaluation.exam] ?? SCALE.PTE;
  const score = evaluation.estimatedScore;
  const fraction = score === null ? null : (score - scale.min) / (scale.max - scale.min);
  const tone = toneFor(fraction);
  // The server encodes an empty list as null, so none of these can be assumed.
  const criteria = evaluation.criteria ?? [];
  const strengths = evaluation.strengths ?? [];
  const weaknesses = evaluation.weaknesses ?? [];
  const sentenceFeedback = evaluation.sentenceFeedback ?? [];

  return (
    <Card className={cn('overflow-hidden p-0 animate-in fade-in slide-in-from-bottom-2 duration-300', TONE[tone].edge)}>
      {/* Headline: the estimate against its scale, and the evaluator's summary. */}
      <div className="flex flex-col items-center gap-5 p-6 sm:flex-row sm:items-center">
        <ScoreRing fraction={fraction ?? 0} tone={tone}>
          <span className="font-display text-3xl font-semibold leading-none text-foreground">{score ?? '—'}</span>
          <span className="mt-1 text-xs text-muted-foreground">of {scale.max}</span>
        </ScoreRing>

        <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', TONE[tone].soft)}>
              <Target className="h-3.5 w-3.5" aria-hidden /> {scale.label} estimate
            </span>
            {score !== null && (
              <span className="text-xs text-muted-foreground">{CONFIDENCE_LABEL[evaluation.scoreConfidence]}</span>
            )}
            <XpChip xpAwarded={xpAwarded} />
          </div>
          {evaluation.summary && <p className="text-sm leading-relaxed text-foreground">{evaluation.summary}</p>}
          <p className="text-[11px] text-muted-foreground">A practice estimate, not an official result.</p>
          {ieltsNote(evaluation, score, criteria) && (
            <p className="text-[11px] text-muted-foreground">{ieltsNote(evaluation, score, criteria)}</p>
          )}
        </div>
      </div>

      <div className="space-y-5 border-t border-border px-6 py-5">
        {/* What was actually heard. Every judgement below is about these words,
            so a learner can see whether the evaluator heard them correctly
            before taking the score to heart. */}
        {evaluation.skill === 'speaking' && (
          <div className="space-y-1.5">
            <SectionLabel icon={Quote}>What we heard</SectionLabel>
            {evaluation.transcript ? (
              <p className="rounded-xl bg-muted/40 px-4 py-3 text-sm italic leading-relaxed text-foreground">
                &ldquo;{evaluation.transcript}&rdquo;
              </p>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">
                No speech could be made out in that recording, so there is no score for it.
                Check your microphone and record the answer again.
              </p>
            )}
          </div>
        )}

        {criteria.length > 0 && (
          <div className="space-y-3">
            <SectionLabel icon={Target}>Breakdown</SectionLabel>
            <ul className="space-y-3">
              {criteria.map(criterion => {
                const part = criterion.maxScore > 0 ? criterion.score / criterion.maxScore : 0;
                const partTone = toneFor(part);
                return (
                  <li key={criterion.name} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-foreground">{criterion.name}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {criterion.score}/{criterion.maxScore}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn('h-full rounded-full transition-[width] duration-700 ease-out', TONE[partTone].bar)}
                        style={{ width: `${Math.round(Math.min(1, Math.max(0, part)) * 100)}%` }}
                      />
                    </div>
                    {criterion.feedback && <p className="text-xs leading-relaxed text-muted-foreground">{criterion.feedback}</p>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {(strengths.length > 0 || weaknesses.length > 0) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {strengths.length > 0 && (
              <div className="space-y-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  <ThumbsUp className="h-3.5 w-3.5" aria-hidden /> What worked
                </p>
                <ul className="space-y-1.5">
                  {strengths.map(item => (
                    <li key={item} className="flex gap-2 text-sm leading-relaxed text-foreground">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {weaknesses.length > 0 && (
              <div className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                  <Lightbulb className="h-3.5 w-3.5" aria-hidden /> Work on next
                </p>
                <ul className="space-y-1.5">
                  {weaknesses.map(item => (
                    <li key={item} className="flex gap-2 text-sm leading-relaxed text-foreground">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-500" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {sentenceFeedback.length > 0 && (
          <div className="space-y-2">
            <SectionLabel icon={CircleAlert}>Sentence fixes</SectionLabel>
            <ul className="space-y-2">
              {sentenceFeedback.map((fix, i) => (
                <li key={i} className="space-y-1.5 rounded-xl border border-border p-3 text-sm">
                  <CorrectedSentence original={fix.original} correction={fix.correction} />
                  {fix.explanation && <p className="text-xs leading-relaxed text-muted-foreground">{fix.explanation}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {evaluation.modelRewrite && (
          <div className="rounded-xl border border-primary/20 bg-primary/5">
            <button
              type="button"
              onClick={() => setShowRewrite(open => !open)}
              aria-expanded={showRewrite}
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm text-primary"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" aria-hidden /> See a stronger version
              </span>
              <ChevronDown className={cn('h-4 w-4 transition-transform', showRewrite && 'rotate-180')} aria-hidden />
            </button>
            {showRewrite && (
              <p className="whitespace-pre-line border-t border-primary/10 px-4 py-3 text-sm leading-relaxed text-foreground">
                {evaluation.modelRewrite}
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
