import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, CircleMinus, ClipboardList, Info, Loader2, Mic, RotateCcw, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { PART_LABELS, pteMockMeta } from '@/lib/pteMock/catalog';
import { PtePart, PteReport, PteReviewItem } from '@/lib/pteMock/types';
import PteReportForm from './PteReportForm';

interface Props {
  report: PteReport;
  onBack: () => void;
  onRetake?: () => void;
}

/** While the paper is scored: how far along, and that it can be left. */
export function PteScoringProgress({ report, onBack }: { report: PteReport; onBack: () => void }) {
  const percent = report.totalItems ? Math.round((report.scored / report.totalItems) * 100) : 0;
  return (
    <div className="w-full max-w-xl mx-auto px-4 py-16">
      <Card className="p-8 text-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
        <h1 className="text-xl font-bold text-foreground">Scoring your test</h1>
        <p className="text-sm text-muted-foreground">
          Reading and listening items are marked at once; spoken and written answers are rated one by one. This
          usually takes a minute or two.
        </p>
        <Progress value={percent} />
        <p className="text-xs text-muted-foreground tabular-nums">
          {report.scored} of {report.totalItems} items scored
        </p>
        <p className="text-[11px] text-muted-foreground">
          You can leave this page — your report will be waiting under Score Reports.
        </p>
        <Button variant="outline" size="sm" onClick={onBack}>Back to mock tests</Button>
      </Card>
    </div>
  );
}

export default function PteScoreReport({ report, onBack, onRetake }: Props) {
  const { user } = useApp();
  const [showReview, setShowReview] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const result = report.result;
  const meta = pteMockMeta(report.kind);
  const hadSpeaking = report.parts.some(p => p.part === 'speaking_writing') && report.kind !== 'writing';

  const tasksByPart = useMemo(() => {
    const groups = new Map<PtePart, NonNullable<typeof result>['tasks']>();
    for (const t of result?.tasks ?? []) groups.set(t.part, [...(groups.get(t.part) ?? []), t]);
    return Array.from(groups.entries());
  }, [result]);
  const itemsByPart = useMemo(() => {
    const groups = new Map<PtePart, PteReviewItem[]>();
    for (const r of report.review) groups.set(r.part, [...(groups.get(r.part) ?? []), r]);
    return Array.from(groups.entries());
  }, [report.review]);

  if (!result) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-16">
        <Card className="p-8 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
          <p className="text-sm text-foreground">This test has no score.</p>
          <Button variant="outline" onClick={onBack}>Back</Button>
        </Card>
      </div>
    );
  }

  const skills: Partial<Record<string, number | null>> = {};
  for (const skill of report.skills) skills[skill] = result.skills[skill] ?? null;
  const openIndex = open == null ? -1 : report.review.findIndex(r => r.position === open);
  const openItem = openIndex >= 0 ? report.review[openIndex] : null;

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 font-report" data-testid="pte-score-report">
      <PteReportForm
        candidateName={user?.name ?? ''}
        testDate={report.completedAt ?? report.createdAt}
        reportId={report.id}
        testType={report.kind === 'full' ? 'Full mock test' : `${meta.shortLabel} sectional`}
        overall={result.overall}
        skills={skills}
      />

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground leading-relaxed">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>
          {result.answered} of {result.items} answered.
          {hadSpeaking && ' Speaking is judged from what was transcribed, so pronunciation is only partly assessed.'}
          {result.unscored > 0 && ` ${result.unscored} item${result.unscored === 1 ? '' : 's'} could not be rated and ${result.unscored === 1 ? 'is' : 'are'} left out rather than counted as zero.`}
          {report.missing.length > 0 && ` ${report.missing.length} task type(s) were not in the bank.`}
        </span>
      </p>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Mock tests
        </Button>
        {onRetake && (
          <Button variant="outline" onClick={onRetake} className="gap-1.5">
            <RotateCcw className="h-4 w-4" /> Redo
          </Button>
        )}
        <Button onClick={() => setShowReview(v => !v)} className="gap-1.5" data-testid="open-review">
          <ClipboardList className="h-4 w-4" />
          {showReview ? 'Hide review' : 'Review answers'}
        </Button>
      </div>

      {showReview && (
        <div className="space-y-5">
          <h3 className="text-lg font-bold text-foreground">Review</h3>

          {/* How each task type went, as cards. */}
          <div className="space-y-2">
            <p className={PART_HEADING}>How you did on each task</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {tasksByPart.flatMap(([, tasks]) => tasks).map(t => (
                <div key={t.code} className="rounded-xl border border-border bg-card p-3 shadow-sm space-y-2">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <Badge variant="outline" className="font-mono text-xs shrink-0">{t.code}</Badge>
                      <span className="truncate font-medium text-foreground">{t.name}</span>
                    </span>
                    <span className="font-bold tabular-nums text-foreground">{t.scored ? `${t.percent}%` : 'â€”'}</span>
                  </div>
                  <Progress value={t.scored ? t.percent : 0} className="h-1.5" indicatorClassName={barColor(t.percent)} />
                </div>
              ))}
            </div>
          </div>

          {/* Every item, part by part, each opening into its details. */}
          {itemsByPart.map(([part, items]) => (
            <div key={part} className="space-y-2">
              <p className={PART_HEADING}>{PART_LABELS[part]}</p>
              <ul className="space-y-2">
                {items.map(item => {
                  const tone = itemTone(item);
                  const Icon = tone.icon;
                  return (
                    <li
                      key={item.position}
                      role="button"
                      tabIndex={0}
                      onClick={() => setOpen(item.position)}
                      onKeyDown={e => {
                        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          setOpen(item.position);
                        }
                      }}
                      className={cn(CARD, 'flex items-center gap-3 border-l-4', tone.edge)}
                      data-testid="pte-review-item"
                    >
                      <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg bg-muted px-1.5 text-sm font-bold tabular-nums text-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                        {item.position}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">{item.question.title || item.taskName}</p>
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">{item.task}</Badge>
                          {STATUS_LABELS[item.status]}
                          {item.hasRecording && <Mic className="h-3 w-3 text-primary" aria-label="has a recording" />}
                        </p>
                      </div>
                      <span className={cn('hidden items-center gap-1 text-xs font-semibold sm:flex', tone.text)}>
                        <Icon className="h-4 w-4" /> {item.percent != null ? `${item.percent}%` : 'Not rated'}
                      </span>
                      <Button size="sm" variant="outline" tabIndex={-1} className={DETAILS}>
                        View details
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      <Dialog open={openItem != null} onOpenChange={next => !next && setOpen(null)}>
        {openItem && (
          <DialogContent className="font-report sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2">
                Question {openItem.position}
                <Badge variant="outline" className="font-mono text-xs">{openItem.task}</Badge>
              </DialogTitle>
              <DialogDescription>
                {openItem.taskName} Â· {STATUS_LABELS[openItem.status]}
                {openItem.percent != null ? ` Â· ${openItem.percent}%` : ''}
              </DialogDescription>
            </DialogHeader>
            <ItemDetails item={openItem} sessionId={report.id} />
            <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
              <Button variant="outline" size="sm" disabled={openIndex <= 0} onClick={() => setOpen(report.review[openIndex - 1].position)} className="gap-1">
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                {openIndex + 1} of {report.review.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={openIndex >= report.review.length - 1}
                onClick={() => setOpen(report.review[openIndex + 1].position)}
                className="gap-1"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

/** A review card: lifts and turns brand blue on hover, and opens its details on click. */
const CARD =
  'group cursor-pointer rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-all duration-150 ' +
  'hover:-translate-y-px hover:border-primary hover:bg-primary/[0.03] hover:shadow-md ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';
const PART_HEADING = 'px-1 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-muted-foreground';
const DETAILS = 'h-8 shrink-0 text-xs group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground';

/** How an item went, by its share of the marks. */
function itemTone(item: PteReviewItem) {
  if (item.percent == null) return { icon: Info, text: 'text-muted-foreground', edge: 'border-l-muted-foreground/40' };
  if (item.percent >= 70) return { icon: CheckCircle2, text: 'text-emerald-600 dark:text-emerald-400', edge: 'border-l-emerald-500' };
  if (item.percent >= 40) return { icon: CircleMinus, text: 'text-amber-600 dark:text-amber-400', edge: 'border-l-amber-500' };
  return { icon: XCircle, text: 'text-rose-600 dark:text-rose-400', edge: 'border-l-rose-500' };
}

function barColor(percent: number): string {
  if (percent >= 70) return 'bg-emerald-500';
  if (percent >= 40) return 'bg-amber-500';
  return 'bg-rose-500';
}

const STATUS_LABELS: Record<PteReviewItem['status'], string> = {
  answered: 'Answered',
  skipped: 'Skipped',
  timed_out: 'Time ran out',
  pending: 'Not reached',
};

/** One item in full: the question, the recording, the answer against the key, and the feedback. */
function ItemDetails({ item, sessionId }: { item: PteReviewItem; sessionId: string }) {
  const yourAnswer =
    item.userDisplay ||
    item.transcript ||
    item.response?.textResponse ||
    (item.response?.selectedOptions?.length ? item.response.selectedOptions.join(', ') : '');
  const good = item.percent != null && item.percent >= 70;

  return (
    <div className="space-y-4 text-sm">
      {item.question.prompt && <p className="whitespace-pre-line font-medium text-foreground">{item.question.prompt}</p>}
      {item.question.audioTranscript && <Field label="Recording script">{item.question.audioTranscript}</Field>}
      {item.hasRecording && (
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Your recording</p>
          <audio controls preload="none" src={pteRecordingUrl(sessionId, item.position)} className="h-9 w-full" data-testid="pte-recording">
            Your browser cannot play this recording.
          </audio>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={cn('rounded-xl border p-3', good ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-rose-500/40 bg-rose-500/5')}>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {item.transcriptSource === 'browser' ? 'Your answer (as your browser heard it)' : 'Your answer'}
          </p>
          <p className="whitespace-pre-line text-foreground">{yourAnswer || <span className="italic text-muted-foreground">No answer</span>}</p>
        </div>
        {item.correctDisplay && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Correct answer</p>
            <p className="whitespace-pre-line font-semibold text-emerald-700 dark:text-emerald-400">{item.correctDisplay}</p>
          </div>
        )}
      </div>
      {item.feedback && <Field label="Feedback">{item.feedback}</Field>}
      {item.modelAnswer && <Field label="Model answer">{item.modelAnswer}</Field>}
      {item.explanation && <Field label="Why">{item.explanation}</Field>}
      {item.unscoredReason && <p className="text-amber-600 dark:text-amber-400">{item.unscoredReason}</p>}
    </div>
  );
}

/** Where a spoken answer is played from (the session cookie signs it). */
export const pteRecordingUrl = (sessionId: string, position: number) =>
  `/api/v1/pte/mocks/${encodeURIComponent(sessionId)}/items/${position}/recording`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5 rounded-xl bg-muted/50 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-foreground leading-relaxed whitespace-pre-line">{children}</div>
    </div>
  );
}
