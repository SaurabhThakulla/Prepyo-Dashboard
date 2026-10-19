import { useState } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { PracticeAttempt } from '@/lib/types';
import PracticeResultCard, { SCALE } from '../PracticeResultCard';
import PracticeResultDialog from '../PracticeResultDialog';
import { TONE, toneFor, type Tone } from '../ResultParts';
import { pastTries, usePracticeHistory, type PastTry } from './history';

/** The "My Score" tab under a practice item: this learner's earlier tries at it, each openable to its full result. */
export default function MyScore({ questionIds, bySitting = false }: { questionIds: string[]; bySitting?: boolean }) {
  const history = usePracticeHistory(questionIds);
  const tries = pastTries(history.data, bySitting);
  const [open, setOpen] = useState<PastTry | null>(null);

  return (
    <section aria-labelledby="my-score-tab" className="space-y-3 border-t border-border pt-3">
      <div className="flex items-end gap-6 px-1">
        <h3 id="my-score-tab" className="border-b-2 border-primary pb-1.5 text-sm font-bold text-primary">
          My Score{tries.length > 0 && <span className="ml-1.5 text-xs font-semibold text-muted-foreground">({tries.length})</span>}
        </h3>
      </div>

      <div className="rounded-xl bg-primary/[0.05] p-3 sm:p-4 dark:bg-primary/10">
        {history.isLoading ? (
          <p className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading your attempts…
          </p>
        ) : history.isError ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Your earlier attempts could not be loaded.</p>
        ) : tries.length === 0 ? (
          <p className="py-4 text-center text-sm text-foreground">No Record Available</p>
        ) : (
          <ul className="space-y-2">
            {tries.map(t => <ReportRow key={`${t.kind}-${t.id}`} entry={t} onOpen={() => setOpen(t)} />)}
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

/** One compact report card: when, the score, a short breakdown and a way into the full result. */
function ReportRow({ entry, onOpen }: { entry: PastTry; onOpen: () => void }) {
  const s = summarise(entry);
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 sm:flex-nowrap sm:px-4">
      <span className={cn('min-w-[4.5rem] rounded-lg px-2.5 py-1.5 text-center text-sm font-bold tabular-nums', TONE[s.tone].badge)}>
        {s.score}<span className="text-xs font-semibold opacity-70">/{s.outOf}</span>
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground">{when(entry.at)}</p>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground">
          {s.breakdown.map(b => <span key={b}>{b}</span>)}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onOpen} className="ml-auto h-8 gap-1 rounded-lg px-3 text-xs font-bold">
        View result <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </Button>
    </li>
  );
}

function summarise(entry: PastTry): { score: string; outOf: number; tone: Tone; breakdown: string[] } {
  if (entry.kind === 'evaluation') {
    const e = entry.evaluation;
    const scale = SCALE[e.exam] ?? SCALE.PTE;
    const score = e.estimatedScore;
    const fraction = score === null ? null : (score - scale.min) / (scale.max - scale.min);
    const criteria = (e.criteria ?? []).slice(0, 4).map(c => `${c.name} ${c.score}/${c.maxScore}`);
    return { score: score === null ? '—' : String(score), outOf: scale.max, tone: toneFor(fraction), breakdown: criteria.length ? criteria : [score === null ? 'Not rated' : scale.label] };
  }
  const list = entry.kind === 'attempt' ? [entry.attempt] : entry.attempts;
  const score = list.reduce((n, a) => n + a.score, 0);
  const outOf = list.reduce((n, a) => n + a.maxScore, 0);
  const fraction = outOf > 0 ? score / outOf : null;
  const right = list.filter(a => a.isCorrect).length;
  const breakdown = entry.kind === 'attempt'
    ? [verdict(entry.attempt), `${entry.attempt.accuracyPercentage}% accuracy`]
    : [`${right} of ${list.length} questions right`, `${Math.round((fraction ?? 0) * 100)}% accuracy`];
  return { score: String(round(score)), outOf: round(outOf), tone: toneFor(fraction), breakdown };
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
const when = (at: string) =>
  new Date(at).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
