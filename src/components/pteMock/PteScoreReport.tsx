import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronRight, CircleMinus, ClipboardList, Info, Loader2, Mic, RotateCcw, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PART_LABELS, pteMockMeta } from '@/lib/pteMock/catalog';
import { PtePart, PteReport, PteReviewItem } from '@/lib/pteMock/types';
import type { Question } from '@/lib/types';
import PteReportForm from './PteReportForm';
import PracticeResultDialog from '@/components/practice/PracticeResultDialog';
import type { PracticeResult } from '@/lib/hooks/usePracticeSession';

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
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 font-report" data-testid="pte-score-report">
      {/* Summary and actions above the card, as on the IELTS report. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex min-w-0 flex-1 items-start gap-1.5 text-xs text-muted-foreground leading-relaxed">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            {result.answered} of {result.items} answered.
            {hadSpeaking && ' Speaking is judged from what was transcribed, so pronunciation is only partly assessed.'}
            {result.unscored > 0 && ` ${result.unscored} item${result.unscored === 1 ? '' : 's'} could not be rated and ${result.unscored === 1 ? 'is' : 'are'} left out rather than counted as zero.`}
            {report.missing.length > 0 && ` ${report.missing.length} task type(s) were not in the bank.`}
          </span>
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
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
      </div>

      <PteReportForm
        candidateName={user?.name ?? ''}
        testDate={report.completedAt ?? report.createdAt}
        reportId={report.id}
        testType={report.kind === 'full' ? 'Full mock test' : `${meta.shortLabel} sectional`}
        overall={result.overall}
        skills={skills}
      />

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
                    <span className="font-bold tabular-nums text-foreground">{t.scored ? `${t.percent}%` : '—'}</span>
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
                      className={cn(CARD, 'flex items-center gap-3')}
                      data-testid="pte-review-item"
                    >
                      <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg bg-muted px-1.5 text-sm font-bold tabular-nums text-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                        {item.position}
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="line-clamp-2 text-sm text-foreground">{item.question.title || item.taskName}</p>
                        <p className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">{item.task}</Badge>
                            {item.taskName}
                            {item.hasRecording && <Mic className="h-3 w-3 text-primary" aria-label="has a recording" />}
                          </span>
                          {item.status !== 'answered' && <span>{STATUS_LABELS[item.status]}</span>}
                        </p>
                      </div>
                      <span className={cn('hidden items-center gap-1 text-xs font-semibold sm:flex', tone.text)}>
                        <Icon className="h-4 w-4" /> {tone.label}{item.percent != null && item.percent > 0 && item.percent < 100 ? ` · ${item.percent}%` : ''}
                      </span>
                      <Icon className={cn('h-4 w-4 shrink-0 sm:hidden', tone.text)} aria-label={tone.label} />
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

      {/* A marked item opens on the same card as a practice answer's result. */}
      {openItem && (
        <PracticeResultDialog
          open
          onOpenChange={next => !next && setOpen(null)}
          title={`Question ${openItem.position} · ${openItem.taskName}`}
          description={openItem.scored ? STATUS_LABELS[openItem.status]
            : `Not rated: ${openItem.unscoredReason || 'left out of your score rather than counted as zero.'}`}
          result={itemResult(openItem)}
          recording={null}
          recordingUrl={openItem.hasRecording ? pteRecordingUrl(report.id, openItem.position) : undefined}
          taskType={openItem.question.typeId}
          blankAnswers={openItem.response?.blankResponses}
          onNext={openIndex < report.review.length - 1 ? () => setOpen(report.review[openIndex + 1].position) : undefined}
        />
      )}

    </div>
  );
}

/** A review card: lifts and turns brand blue on hover, and opens its details on click. */
// The same card, heading and button as the IELTS answer review.
const CARD =
  'group cursor-pointer rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-all duration-200 ' +
  'hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 active:translate-y-0 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';
const PART_HEADING = 'px-1 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-primary';
const DETAILS =
  'h-8 shrink-0 border-primary/40 text-xs text-primary group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground';

/** How an item went, by its share of the marks. */
function itemTone(item: PteReviewItem) {
  if (item.percent == null) return { label: 'Not rated', icon: Info, text: 'text-muted-foreground' };
  const label = item.percent >= 100 ? 'Correct' : item.percent > 0 ? 'Partly right' : 'Wrong';
  if (item.percent >= 70) return { label, icon: CheckCircle2, text: 'text-emerald-600 dark:text-emerald-400' };
  if (item.percent >= 40) return { label, icon: CircleMinus, text: 'text-amber-600 dark:text-amber-400' };
  return { label, icon: XCircle, text: 'text-rose-600 dark:text-rose-400' };
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

/** Where a spoken answer is played from (the session cookie signs it). */
export const pteRecordingUrl = (sessionId: string, position: number) =>
  `/api/v1/pte/mocks/${encodeURIComponent(sessionId)}/items/${position}/recording`;

/** The key the practice card marks against, from what the report shows ("A, B" or "b1: word, b2: word"). */
function answerKey(item: PteReviewItem): Pick<Question, 'correctAnswers' | 'blanks'> {
  const shown = item.correctDisplay ?? '';
  const pairs = shown.split(',').map(p => p.trim().match(/^(\w+):\s*(.*)$/)).filter((m): m is RegExpMatchArray => m != null);
  if (pairs.length > 0) {
    const key = new Map(pairs.map(m => [m[1], m[2]]));
    return { blanks: (item.question.blanks ?? pairs.map(m => ({ id: m[1] }))).map(b => ({ ...b, correctAnswer: key.get(b.id) })) };
  }
  return item.question.options?.length ? { correctAnswers: shown.split(',').map(s => s.trim()).filter(Boolean) } : {};
}

/** An item as a practice result: its rating, its mark with the question as the key, or not rated. */
function itemResult(item: PteReviewItem): PracticeResult {
  if (item.evaluation) return { evaluation: item.evaluation, xpAwarded: 0 };
  if (!item.scored || item.score == null || item.maxScore == null) {
    // Not rated: the practice card's "Not rated" state, with the answer and the model answer.
    const typed = item.response?.textResponse || '';
    // A typed answer (SST sits in the listening part) shows as writing, a spoken one as speaking.
    const skill = typed ? 'writing' : item.transcript ? 'speaking' : item.part === 'speaking_writing' ? 'writing' : item.part;
    return {
      xpAwarded: 0,
      evaluation: {
        id: '', exam: 'PTE', skill, evaluationVersion: '', estimatedScore: null, scoreConfidence: 'low',
        summary: item.unscoredReason || item.feedback || 'This answer could not be rated, so it is left out of your score.',
        criteria: [], strengths: [], weaknesses: [], sentenceFeedback: [], createdAt: '',
        transcript: item.transcript, answer: typed, modelRewrite: item.modelAnswer,
      },
    };
  }
  const percent = item.percent ?? 0;
  const key = percent < 100 && item.correctDisplay ? `Correct answer: ${item.correctDisplay}.` : '';
  return {
    xpAwarded: 0,
    review: { ...item.question, exam: 'PTE', explanation: item.explanation ?? item.question.explanation, ...answerKey(item) },
    attempt: {
      id: String(item.position), questionId: item.question.id, examVersionId: '', createdAt: '', timeSpentSeconds: 0,
      isCorrect: percent >= 100, score: item.score, maxScore: item.maxScore, accuracyPercentage: percent,
      feedback: [item.feedback, key].filter(Boolean).join(' '),
      userResponse: item.userDisplay || item.response?.textResponse || item.response?.selectedOptions?.join(', ') || '',
    },
  };
}

