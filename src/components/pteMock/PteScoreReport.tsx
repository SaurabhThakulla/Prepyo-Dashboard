import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, Info, Loader2, RotateCcw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { SkillType } from '@/lib/types';
import { PART_LABELS, pteMockMeta } from '@/lib/pteMock/catalog';
import { PtePart, PteReport, PteReviewItem } from '@/lib/pteMock/types';

const SKILL_LABELS: Record<SkillType, string> = {
  listening: 'Listening',
  reading: 'Reading',
  speaking: 'Speaking',
  writing: 'Writing',
};

/** The order a PTE score report lists the communicative skills in. */
const SKILL_ORDER: SkillType[] = ['listening', 'reading', 'speaking', 'writing'];

const SKILL_COLORS: Record<SkillType, string> = {
  listening: 'bg-slate-500',
  reading: 'bg-amber-500',
  speaking: 'bg-blue-500',
  writing: 'bg-emerald-500',
};

interface Props {
  report: PteReport;
  onBack: () => void;
  onRetake?: () => void;
}

/** A position on the 10-90 scale as a share of the bar. */
const onScale = (score: number) => ((Math.min(90, Math.max(10, score)) - 10) / 80) * 100;

/** While the paper is scored: how far along, and that it can be left. */
export function PteScoringProgress({ report, onBack }: { report: PteReport; onBack: () => void }) {
  const percent = report.totalItems ? Math.round((report.scored / report.totalItems) * 100) : 0;
  return (
    <div className="w-full max-w-xl mx-auto px-4 py-16">
      <Card className="p-8 text-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
        <h1 className="font-display text-xl font-bold text-foreground">Scoring your test</h1>
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
  const result = report.result;
  const meta = pteMockMeta(report.kind);
  const skills = SKILL_ORDER.filter(s => result?.skills[s] != null);
  const headline = result?.overall ?? (report.skills.length === 1 ? result?.skills[report.skills[0]] : undefined);
  const headlineLabel = result?.overall != null ? 'Overall Score' : `${SKILL_LABELS[report.skills[0]]} Score`;
  const hadSpeaking = report.parts.some(p => p.part === 'speaking_writing') && report.kind !== 'writing';

  const tasksByPart = useMemo(() => {
    const groups = new Map<PtePart, NonNullable<typeof result>['tasks']>();
    for (const t of result?.tasks ?? []) groups.set(t.part, [...(groups.get(t.part) ?? []), t]);
    return Array.from(groups.entries());
  }, [result]);

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

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Mock tests
        </Button>
        {onRetake && (
          <Button variant="outline" size="sm" onClick={onRetake} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Take another {meta.shortLabel.toLowerCase()} test
          </Button>
        )}
      </div>

      {/* Score summary */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3">
          <div className={`bg-gradient-to-br ${meta.accent} p-6 text-white flex flex-col items-center justify-center gap-2`}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/80">{headlineLabel}</p>
            <ScoreRing score={headline ?? null} />
            <p className="text-xs text-white/85 text-center">{report.title}</p>
            <p className="text-[11px] text-white/70">
              {new Date(report.completedAt ?? report.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
            </p>
          </div>
          <div className="md:col-span-2 p-6 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Communicative Skills</h2>
            <div className="space-y-3.5">
              {skills.map(skill => {
                const score = result.skills[skill]!;
                return (
                  <div key={skill} className="grid grid-cols-[80px_1fr_36px] items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">{SKILL_LABELS[skill]}</span>
                    <div className="relative h-3 rounded-full bg-muted">
                      <div className={`absolute inset-y-0 left-0 rounded-full ${SKILL_COLORS[skill]}`} style={{ width: `${onScale(score)}%` }} />
                      {headline != null && result.overall != null && (
                        <div className="absolute -top-1 -bottom-1 w-0.5 bg-foreground/70" style={{ left: `${onScale(result.overall)}%` }} title="Overall" />
                      )}
                    </div>
                    <span className="text-sm font-bold tabular-nums text-foreground text-right">{score}</span>
                  </div>
                );
              })}
              <div className="grid grid-cols-[80px_1fr_36px] gap-3 text-xs text-muted-foreground">
                <span />
                <div className="flex justify-between"><span>10</span><span>30</span><span>50</span><span>70</span><span>90</span></div>
                <span />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <Badge variant="outline">{result.answered} of {result.items} answered</Badge>
              {result.unscored > 0 && <Badge variant="warning">{result.unscored} not rated</Badge>}
              {report.missing.length > 0 && <Badge variant="warning">{report.missing.length} task type(s) not in bank</Badge>}
            </div>
            <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground leading-relaxed">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              A practice estimate on the PTE 10–90 scale, not an official score. Items count towards more than one skill,
              as in the real test.
              {hadSpeaking && ' Speaking is judged from what your device transcribed, so pronunciation is not assessed.'}
              {result.unscored > 0 && ' Items that could not be rated are left out rather than counted as zero.'}
            </p>
          </div>
        </div>
      </Card>

      {/* Task breakdown */}
      <Card className="p-5 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">How you did on each task</h2>
        {tasksByPart.map(([part, tasks]) => (
          <div key={part} className="space-y-2">
            <p className="text-[11px] font-bold text-foreground">{PART_LABELS[part]}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {tasks.map(t => (
                <div key={t.code} className="rounded-lg border border-border p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <Badge variant="outline" className="font-mono text-xs shrink-0">{t.code}</Badge>
                      <span className="truncate font-medium text-foreground">{t.name}</span>
                    </span>
                    <span className="font-bold tabular-nums text-foreground">{t.scored ? `${t.percent}%` : '—'}</span>
                  </div>
                  <Progress value={t.scored ? t.percent : 0} className="h-1.5" indicatorClassName={barColor(t.percent)} />
                  <div className="flex flex-wrap gap-1">
                    {SKILL_ORDER.filter(s => t.weights[s]).map(s => (
                      <span key={s} className="text-xs text-muted-foreground">
                        <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${SKILL_COLORS[s]}`} />
                        {SKILL_LABELS[s]}
                      </span>
                    ))}
                    <span className="text-xs text-muted-foreground ml-auto">{t.items} item{t.items === 1 ? '' : 's'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </Card>

      {/* Item review */}
      <Card className="p-5 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Review every item</h2>
        <div className="space-y-2">
          {report.review.map(r => <ReviewRow key={r.position} item={r} />)}
        </div>
      </Card>
    </div>
  );
}

function barColor(percent: number): string {
  if (percent >= 70) return 'bg-emerald-500';
  if (percent >= 40) return 'bg-amber-500';
  return 'bg-rose-500';
}

function ScoreRing({ score }: { score: number | null }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const fill = score == null ? 0 : onScale(score) / 100;
  return (
    <div className="relative h-36 w-36">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke="white" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - fill)} className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl font-extrabold tabular-nums">{score ?? '—'}</span>
        <span className="text-xs text-white/75">out of 90</span>
      </div>
    </div>
  );
}

const STATUS_LABELS: Record<PteReviewItem['status'], string> = {
  answered: 'Answered',
  skipped: 'Skipped',
  timed_out: 'Time ran out',
  pending: 'Not reached',
};

function ReviewRow({ item }: { item: PteReviewItem }) {
  const [open, setOpen] = useState(false);
  const good = item.percent != null && item.percent >= 70;
  const yourAnswer =
    item.userDisplay ||
    item.transcript ||
    item.response?.textResponse ||
    (item.response?.selectedOptions?.length ? item.response.selectedOptions.join(', ') : '');

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40"
        aria-expanded={open}
      >
        <span className="w-7 text-xs font-bold text-muted-foreground tabular-nums">{item.position}</span>
        {item.percent == null ? (
          <Info className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : good ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
        ) : (
          <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
        )}
        <Badge variant="outline" className="font-mono text-xs shrink-0">{item.task}</Badge>
        <span className="text-xs text-foreground truncate flex-1">{item.question.title || item.taskName}</span>
        <span className="text-[11px] text-muted-foreground hidden sm:inline">{STATUS_LABELS[item.status]}</span>
        <span className="text-xs font-bold tabular-nums w-10 text-right">{item.percent != null ? `${item.percent}%` : '—'}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-border px-4 py-3 space-y-3 text-xs">
          {item.question.prompt && <p className="text-foreground font-medium whitespace-pre-line">{item.question.prompt}</p>}
          {item.question.audioTranscript && (
            <Field label="Recording script">{item.question.audioTranscript}</Field>
          )}
          <Field label={item.transcriptSource === 'browser' ? 'Your answer (as your browser heard it)' : 'Your answer'}>
            {yourAnswer || <span className="italic text-muted-foreground">No answer</span>}
          </Field>
          {item.correctDisplay && <Field label="Correct answer">{item.correctDisplay}</Field>}
          {item.modelAnswer && <Field label="Model answer">{item.modelAnswer}</Field>}
          {item.feedback && <Field label="Feedback">{item.feedback}</Field>}
          {item.unscoredReason && <p className="text-amber-600 dark:text-amber-400">{item.unscoredReason}</p>}
          {item.explanation && <Field label="Explanation">{item.explanation}</Field>}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-foreground leading-relaxed whitespace-pre-line">{children}</div>
    </div>
  );
}
