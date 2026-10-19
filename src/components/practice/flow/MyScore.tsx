import { useState, type ReactNode } from 'react';
import { ChevronRight, History, Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { EvaluationCriterion, PracticeAttempt } from '@/lib/types';
import PracticeResultCard, { SCALE } from '../PracticeResultCard';
import PracticeResultDialog from '../PracticeResultDialog';
import { TONE, toneFor, type Tone } from '../ResultParts';
import { pastTries, usePracticeHistory, type PastTry } from './history';

/** The "My Score" tab under a practice item: this learner's earlier tries at it, each openable to its full result. */
export default function MyScore({ questionIds, bySitting = false }: { questionIds: string[]; bySitting?: boolean }) {
  const history = usePracticeHistory(questionIds);
  const tries = pastTries(history.data, bySitting);
  const [open, setOpen] = useState<PastTry | null>(null);
  const summaries = tries.map(summarise);
  const best = summaries.reduce<Summary | null>((b, s) => (s.fraction !== null && (!b || s.fraction > b.fraction!) ? s : b), null);

  return (
    <section aria-labelledby="my-score-tab" className="space-y-3 border-t border-border pt-3">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 px-1">
        <h3 id="my-score-tab" className="border-b-2 border-primary pb-1.5 text-sm font-bold text-primary">
          My Score{tries.length > 0 && <span className="ml-1.5 text-xs font-semibold text-muted-foreground">({tries.length})</span>}
        </h3>
        {best && (
          <dl className="flex items-center gap-4 pb-1.5 text-xs">
            <Stat label="Best" value={`${best.score}/${best.outOf}`} className={TONE[best.tone].text} />
            <Stat label="Latest" value={`${summaries[0].score}/${summaries[0].outOf}`} className={TONE[summaries[0].tone].text} />
            <Stat label="Tries" value={String(tries.length)} />
          </dl>
        )}
      </div>

      <div className="rounded-xl bg-primary/[0.05] p-3 sm:p-4 dark:bg-primary/10">
        {history.isLoading ? (
          <p className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading your attempts…
          </p>
        ) : history.isError ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Your earlier attempts could not be loaded.</p>
        ) : tries.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-5 text-center">
            <History className="h-5 w-5 text-muted-foreground" aria-hidden />
            <p className="text-sm font-semibold text-foreground">No attempts yet</p>
            <p className="text-xs text-muted-foreground">Submit an answer and your score will show up here.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {tries.map((t, i) => (
              <ReportRow
                key={`${t.kind}-${t.id}`}
                entry={t}
                summary={summaries[i]}
                previous={summaries[i + 1]}
                latest={i === 0 && tries.length > 1}
                onOpen={() => setOpen(t)}
              />
            ))}
          </ul>
        )}
      </div>

      {open && open.kind !== 'sitting' && (
        <PracticeResultDialog
          title={`Your result · ${when(open.at)}`}
          result={open.kind === 'attempt' ? { attempt: open.attempt, xpAwarded: 0 } : { evaluation: open.evaluation, xpAwarded: 0 }}
          recording={null}
          open
          onOpenChange={o => !o && setOpen(null)}
        />
      )}
      {open?.kind === 'sitting' && <SittingDialog entry={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('font-bold tabular-nums text-foreground', className)}>{value}</dd>
    </div>
  );
}

/** One try: a score ring, when, the change since the try before, its traits as bars, and the way into the full result. */
function ReportRow({ entry, summary: s, previous, latest, onOpen }: {
  entry: PastTry;
  summary: Summary;
  previous?: Summary;
  latest: boolean;
  onOpen: () => void;
}) {
  const delta = previous && s.value !== null && previous.value !== null && previous.outOf === s.outOf ? round(s.value - previous.value) : null;
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:gap-4 sm:px-4"
      >
        <MiniRing fraction={s.fraction ?? 0} tone={s.tone}>
          <span className={cn('text-sm font-bold leading-none tabular-nums', TONE[s.tone].text)}>{s.score}</span>
          <span className="text-[9px] font-medium leading-none text-muted-foreground">/{s.outOf}</span>
        </MiniRing>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-foreground">{when(entry.at)}</span>
            {latest && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">Latest</span>}
            {delta !== null && delta !== 0 && (
              <span className={cn('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums', delta > 0 ? TONE.good.badge : TONE.poor.badge)}>
                {delta > 0 ? <TrendingUp className="h-3 w-3" aria-hidden /> : <TrendingDown className="h-3 w-3" aria-hidden />}
                {delta > 0 ? '+' : ''}{delta} since last try
              </span>
            )}
          </div>
          {s.traits.length > 0 ? (
            <div className="grid max-w-xl gap-y-1.5">
              {s.traits.map(t => <TraitBar key={t.name} name={t.name} score={t.score} maxScore={t.maxScore} />)}
            </div>
          ) : (
            <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {s.breakdown.map(b => <span key={b}>{b}</span>)}
            </p>
          )}
        </div>

        <span className="ml-auto hidden shrink-0 items-center gap-1 text-xs font-bold text-primary sm:inline-flex">
          View result <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground sm:hidden" aria-hidden />
      </button>
    </li>
  );
}

function TraitBar({ name, score, maxScore }: { name: string; score: number; maxScore: number }) {
  const fraction = maxScore > 0 ? score / maxScore : 0;
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="truncate text-muted-foreground">{name}</span>
        <span className="shrink-0 font-semibold tabular-nums text-foreground">{round(score)}/{round(maxScore)}</span>
      </div>
      <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
        <span className={cn('block h-full rounded-full', TONE[toneFor(fraction)].bar)} style={{ width: `${Math.min(1, Math.max(0, fraction)) * 100}%` }} />
      </span>
    </div>
  );
}

function MiniRing({ fraction, tone, children }: { fraction: number; tone: Tone; children: ReactNode }) {
  const radius = 21;
  const length = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, fraction));
  return (
    <div className="relative h-12 w-12 shrink-0">
      <svg viewBox="0 0 48 48" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="24" cy="24" r={radius} fill="none" strokeWidth="4" className="stroke-muted" />
        {clamped > 0 && (
          <circle cx="24" cy="24" r={radius} fill="none" strokeWidth="4" strokeLinecap="round" stroke="currentColor" className={TONE[tone].ring} strokeDasharray={`${clamped * length} ${length}`} />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">{children}</div>
    </div>
  );
}

interface Summary {
  score: string;
  /** The score as a number, for the change since the last try; null when not rated. */
  value: number | null;
  outOf: number;
  fraction: number | null;
  tone: Tone;
  traits: EvaluationCriterion[];
  breakdown: string[];
}

function summarise(entry: PastTry): Summary {
  if (entry.kind === 'evaluation') {
    const e = entry.evaluation;
    const scale = SCALE[e.exam] ?? SCALE.PTE;
    const score = e.estimatedScore;
    const fraction = score === null ? null : (score - scale.min) / (scale.max - scale.min);
    return {
      score: score === null ? '—' : String(score),
      value: score,
      outOf: scale.max,
      fraction,
      tone: toneFor(fraction),
      traits: (e.criteria ?? []).slice(0, 6),
      breakdown: [score === null ? 'Not rated' : scale.label],
    };
  }
  const list = entry.kind === 'attempt' ? [entry.attempt] : entry.attempts;
  const score = list.reduce((n, a) => n + a.score, 0);
  const outOf = list.reduce((n, a) => n + a.maxScore, 0);
  const fraction = outOf > 0 ? score / outOf : null;
  const right = list.filter(a => a.isCorrect).length;
  const breakdown = entry.kind === 'attempt'
    ? [verdict(entry.attempt), `${entry.attempt.accuracyPercentage}% accuracy`]
    : [`${right} of ${list.length} questions right`, `${Math.round((fraction ?? 0) * 100)}% accuracy`];
  return { score: String(round(score)), value: round(score), outOf: round(outOf), fraction, tone: toneFor(fraction), traits: [], breakdown };
}

/** A passage sitting: each question's own result, as it was marked then. */
function SittingDialog({ entry, onClose }: { entry: Extract<PastTry, { kind: 'sitting' }>; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-5xl gap-5">
        <div className="space-y-1 border-b border-border pb-4 pr-8">
          <DialogTitle className="text-lg font-semibold">Your result · {when(entry.at)}</DialogTitle>
          <DialogDescription className="text-sm">How each question you answered on this passage was marked.</DialogDescription>
        </div>
        <div className="space-y-4">
          {entry.attempts.map((a: PracticeAttempt, i: number) => (
            <div key={a.id} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Question {i + 1}</p>
              <PracticeResultCard result={{ attempt: a, xpAwarded: 0 }} />
            </div>
          ))}
        </div>
        <div className="flex justify-end border-t border-border pt-4">
          <Button variant="ghost" className="h-10 rounded-xl px-5 text-xs font-bold" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const verdict = (a: PracticeAttempt) => (a.isCorrect ? 'Correct' : a.score > 0 ? 'Partly right' : 'Not quite');
const round = (n: number) => Math.round(n * 100) / 100;
/** "Today, 8:10 PM", "Yesterday, 4:59 PM", or the full date for anything older. */
const when = (at: string) => {
  const d = new Date(at);
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000);
  if (days === 0) return `Today, ${time}`;
  if (days === 1) return `Yesterday, ${time}`;
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
