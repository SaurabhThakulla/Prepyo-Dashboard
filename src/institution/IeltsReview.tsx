import { useMemo, useState } from 'react';
import { ArrowLeft, Bot, Loader2, Mic, PenTool } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { errorMessage } from '@/lib/api';
import IeltsReportForm from '@/components/mocks/ielts/IeltsReportForm';
import { ObjectiveReview } from '@/components/mocks/ielts/IeltsAnswerReview';
import { IeltsSkill, ieltsOverallBand, ieltsWritingBand } from '@/lib/mockReview';
import {
  BandMark,
  IeltsAnswer,
  IeltsPart,
  IeltsResult,
  IeltsSection,
  InstitutionAccount,
  mockRecordingUrl,
  MockReview,
  releaseMockResult,
  saveMockReview,
} from './api';
import { FormError } from './FormField';
import { TONES, useConfirm } from './ui';

/** An IELTS band as IELTS prints it: 6.5, 7.0. */
export const bandText = (band: number | null | undefined) => (band == null ? '—' : `Band ${band.toFixed(1)}`);

const SKILLS = ['listening', 'reading', 'writing', 'speaking'];
const SKILL_NAMES: Record<string, string> = { listening: 'Listening', reading: 'Reading', writing: 'Writing', speaking: 'Speaking' };

/** An IELTS result: the overall band, or each section's band. */
function resultText(result: IeltsResult | null | undefined): string {
  if (!result) return '—';
  if (result.overall != null) return `Overall ${bandText(result.overall)}`;
  const skills = SKILLS.filter(s => result.skills[s] != null);
  return skills.length ? skills.map(s => `${SKILL_NAMES[s]} ${result.skills[s].toFixed(1)}`).join(' · ') : '—';
}

const day = (value: string | null) =>
  value ? new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—';

type Marks = Record<string, { band: number | null; comment: string }>;

const marksOf = (r: MockReview): Marks =>
  Object.fromEntries((r.sections ?? []).flatMap(s => s.parts.map(p => [p.key, { band: p.band, comment: p.comment }])));

/**
 * Each section's band as the student would get it now: the released band, or
 * the teacher's band where they gave one and the AI's (or the answer key's)
 * where not. Worked out as the server does on release.
 */
function liveBands(review: MockReview, marks: Marks): Partial<Record<IeltsSkill, number | null>> {
  const bands: Partial<Record<IeltsSkill, number | null>> = {};
  for (const section of review.sections ?? []) {
    const skill = section.skill as IeltsSkill;
    if (review.status === 'released') {
      bands[skill] = review.ieltsResult?.skills[skill] ?? section.finalBand;
      continue;
    }
    const bandOf = (part: IeltsPart) => marks[part.key]?.band ?? part.aiBand;
    if (skill === 'writing') {
      const [t1, t2] = section.parts.map(bandOf);
      bands[skill] = t1 != null && t2 != null ? ieltsWritingBand(t1, t2) : null;
    } else if (skill === 'speaking') {
      bands[skill] = section.parts[0] ? bandOf(section.parts[0]) : null;
    } else {
      bands[skill] = section.aiBand;
    }
  }
  return bands;
}

/** One student's IELTS sitting: their score card, each section to review and mark, then release. */
export default function IeltsReviewScreen({
  account,
  initial,
  mockId,
  attemptId,
  onBack,
}: {
  account: InstitutionAccount;
  initial: MockReview;
  mockId: string;
  attemptId: string;
  onBack: () => void;
}) {
  const [review, setReview] = useState(initial);
  const [marks, setMarks] = useState<Marks>(() => marksOf(initial));
  const [comment, setComment] = useState(initial.comment);
  const [reviewer, setReviewer] = useState(initial.reviewerName || account.admin.name);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();

  const take = (r: MockReview) => {
    setReview(r);
    setMarks(marksOf(r));
    setComment(r.comment);
    if (r.reviewerName) setReviewer(r.reviewerName);
    setDirty(false);
  };

  const released = review.status === 'released';
  const sections = review.sections ?? [];
  const parts = sections.flatMap(s => s.parts);
  const needs = parts.filter(p => p.markable && p.aiBand === null && marks[p.key]?.band == null && review.status === 'submitted');
  const bands = useMemo(() => liveBands(review, marks), [review, marks]);
  const full = review.kind === 'full';
  const overall = full ? (released ? review.ieltsResult?.overall ?? null : ieltsOverallBand(bands)) : null;
  const form = () => ({
    marks: [],
    comment,
    bands: parts.map<BandMark>(p => ({ key: p.key, band: p.markable ? marks[p.key]?.band ?? null : null, comment: marks[p.key]?.comment ?? '' })),
  });

  const setMark = (key: string, change: Partial<{ band: number | null; comment: string }>) => {
    setMarks(prev => ({ ...prev, [key]: { band: prev[key]?.band ?? null, comment: prev[key]?.comment ?? '', ...change } }));
    setDirty(true);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      take((await saveMockReview(mockId, attemptId, form())).review);
      setNotice('Saved.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const release = async () => {
    const ok = await confirm({
      title: `Release ${review.studentName}'s result?`,
      description: 'They see their bands and your comments straight away. Their essays, transcripts and recordings are deleted 7 days after release.',
      confirmLabel: 'Release result',
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await saveMockReview(mockId, attemptId, form());
      take((await releaseMockResult(mockId, attemptId, reviewer.trim())).review);
      setNotice('Released. The student can see their result now.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 font-report">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {review.mockName}
        </button>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            <span className="font-mono">@{review.username}</span> · handed in {day(review.submittedAt)}
          </span>
          <Badge variant="outline" className={`normal-case tracking-normal text-xs font-medium ${released ? TONES.green.soft : TONES.amber.soft}`}>
            {released ? 'Released' : 'To review'}
          </Badge>
        </div>
      </div>

      {/* The score card as the student will see it, with the marks given so far. */}
      <IeltsReportForm
        candidateName={review.studentName}
        module={review.module ?? 'academic'}
        testDate={review.submittedAt ?? ''}
        reportId={attemptId}
        bands={bands}
        overall={overall}
        sectional={!full}
      />

      <p className={cn('rounded-lg px-3 py-2 text-sm', released ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' : 'bg-primary/[0.06] text-foreground')}>
        {released ? (
          <>
            Released by {review.reviewerName || 'your institution'} on {day(review.releasedAt)}.{' '}
            {review.purgedAt ? `Answers were deleted on ${day(review.purgedAt)}.` : `Answers are kept until ${day(review.purgeAfter)}.`}
          </>
        ) : (
          <>
            This is the score card {review.studentName} will see. It updates as you change a band below. The AI's first marking:{' '}
            <span className="font-medium">{resultText(review.ieltsAiResult)}</span>.
          </>
        )}
      </p>

      {sections.length > 0 && (
        <Tabs defaultValue={sections[0].skill} className="space-y-4">
          {sections.length > 1 && (
            <TabsList className="min-h-0 justify-start overflow-x-auto">
              {sections.map(section => {
                const waiting = section.parts.some(p => needs.includes(p));
                return (
                  <TabsTrigger key={section.skill} value={section.skill} className="gap-1.5">
                    {section.name}
                    {waiting && <span className="h-2 w-2 rounded-full bg-amber-500" aria-label="needs your band" />}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          )}
          {sections.map(section => (
            <TabsContent key={section.skill} value={section.skill} className="mt-0">
              <SectionReview
                section={section}
                bands={review.bands ?? []}
                marks={marks}
                readOnly={released}
                recordingUrl={position => mockRecordingUrl(mockId, attemptId, position)}
                onChange={setMark}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* The comment and the name sit with the review; only the actions follow the page. */}
      <Card className="space-y-3 p-4 sm:p-6">
        <div className="grid gap-3 md:grid-cols-[1fr_16rem]">
          <div className="space-y-1.5">
            <label htmlFor="review-comment" className="text-sm font-medium text-foreground">
              Overall comment for the student
            </label>
            <Textarea
              id="review-comment"
              value={comment}
              onChange={e => (setComment(e.target.value), setDirty(true))}
              readOnly={released}
              rows={2}
              placeholder="What went well, and what to work on next"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="review-name" className="text-sm font-medium text-foreground">
              Reviewed by
            </label>
            <Input id="review-name" value={reviewer} onChange={e => setReviewer(e.target.value)} readOnly={released} className="h-10" />
          </div>
        </div>
      </Card>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/95 px-4 py-2.5 shadow-lg backdrop-blur">
        <div className="mr-auto min-w-0 text-sm">
          <FormError message={error} />
          {notice && <p className="text-emerald-700 dark:text-emerald-300">{notice}</p>}
          {!released && !notice && !error && (
            <p className={needs.length > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground'}>
              {needs.length > 0 ? `${needs.map(p => p.name).join(' and ')} need${needs.length === 1 ? 's' : ''} your band before you release.` : 'Every answer has a mark. Release when you are happy with it.'}
            </p>
          )}
        </div>
        {!released && (
          <>
            <Button variant="outline" className="h-9" onClick={() => void save()} disabled={busy || !dirty}>
              Save
            </Button>
            <Button className="h-9" onClick={() => void release()} disabled={busy || needs.length > 0 || review.status !== 'submitted'}>
              {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Release result
            </Button>
          </>
        )}
      </div>
      {confirmDialog}
    </div>
  );
}

type OnMark = (key: string, change: Partial<{ band: number | null; comment: string }>) => void;

function SectionReview({
  section,
  bands,
  marks,
  readOnly,
  recordingUrl,
  onChange,
}: {
  section: IeltsSection;
  bands: number[];
  marks: Marks;
  readOnly: boolean;
  recordingUrl: (position: number) => string;
  onChange: OnMark;
}) {
  if (section.status !== 'submitted') {
    return <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">This section was not handed in.</p>;
  }
  return (
    <div className="space-y-3">
      {section.parts.map(part =>
        part.key === 'listening' || part.key === 'reading' ? (
          <AnswerSheet key={part.key} answers={part.answers} skill={part.key} correct={part.correct} total={part.total} band={part.aiBand} />
        ) : (
          <MarkedPart
            key={part.key}
            part={part}
            bands={bands}
            mark={marks[part.key] ?? { band: null, comment: '' }}
            readOnly={readOnly}
            recordingUrl={recordingUrl}
            onChange={change => onChange(part.key, change)}
          />
        ),
      )}
    </div>
  );
}

/** A Listening or Reading paper question by question, as the student's own review shows it. */
export function AnswerSheet({
  answers,
  skill = 'reading',
  correct,
  total,
  band = null,
}: {
  answers?: IeltsAnswer[];
  skill?: 'listening' | 'reading';
  correct?: number;
  total?: number;
  band?: number | null;
}) {
  if (!answers || answers.length === 0) {
    return <p className="text-sm text-muted-foreground">The student's answers are no longer kept, or none were saved.</p>;
  }
  const marks = answers.reduce((sum, a) => sum + a.marks, 0);
  const outOf = answers.reduce((sum, a) => sum + a.outOf, 0);
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Marked by the answer key{band != null ? ` · ${bandText(band)}` : ''}. Nothing to mark here.
      </p>
      <ObjectiveReview
        section={{
          skill,
          band,
          correct: correct ?? marks,
          total: total ?? outOf,
          items: answers.map(a => ({ ...a, part: 0, typeId: '' })),
        }}
      />
    </div>
  );
}

const BAND_CARD = 'rounded-xl border bg-card p-4 shadow-sm sm:p-5';

/** A writing task or the speaking test: what the student did, the AI's band, and the teacher's band and comment. */
function MarkedPart({
  part,
  bands,
  mark,
  readOnly,
  recordingUrl,
  onChange,
}: {
  part: IeltsPart;
  bands: number[];
  mark: { band: number | null; comment: string };
  readOnly: boolean;
  recordingUrl: (position: number) => string;
  onChange: (change: Partial<{ band: number | null; comment: string }>) => void;
}) {
  const needs = part.markable && part.aiBand === null && mark.band === null;
  const Icon = part.key === 'speaking' ? Mic : PenTool;
  const given = mark.band ?? part.aiBand;

  return (
    <section className={cn(BAND_CARD, needs ? 'border-amber-500/60 ring-1 ring-amber-500/30' : 'border-border')} data-testid={`marked-${part.key}`}>
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-foreground">{part.name}</h3>
          {part.words != null && part.key !== 'speaking' && <p className="text-xs text-muted-foreground">{part.words} words</p>}
        </div>
        {needs ? (
          <Badge variant="outline" className={`normal-case tracking-normal text-xs font-medium ${TONES.amber.soft}`}>
            Needs your band
          </Badge>
        ) : (
          <span className="text-2xl font-bold tabular-nums text-foreground">{given != null ? given.toFixed(1) : '—'}</span>
        )}
      </header>

      {(part.key === 'task1' || part.key === 'task2') && (
        <div className="space-y-3">
          <details className="rounded-xl border border-border bg-muted/30">
            <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-semibold text-foreground hover:text-primary">The task</summary>
            <div className="space-y-3 border-t border-border px-4 py-4 text-foreground">
              {part.title && <p className="text-base font-semibold">{part.title}</p>}
              {part.prompt && <p className="max-w-[72ch] whitespace-pre-wrap text-[15px] leading-8">{part.prompt}</p>}
              {part.imageUrl && <img src={part.imageUrl} alt="" className="max-h-56 border border-border bg-white" />}
            </div>
          </details>
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Student's answer</p>
            <p className="max-w-[72ch] whitespace-pre-wrap rounded-lg border border-primary/20 bg-primary/[0.03] px-4 py-3 text-[15px] leading-8 text-foreground">
              {part.response || <span className="text-muted-foreground">Nothing was written, or it has been deleted.</span>}
            </p>
          </div>
        </div>
      )}

      {part.key === 'speaking' && (
        <ol className="space-y-2">
          {(part.turns ?? []).map(turn => (
            <li
              key={turn.position}
              className="space-y-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm transition-colors hover:border-primary"
              data-testid="marked-turn"
            >
              <p className="flex items-start gap-2 text-foreground">
                <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">Part {turn.part}</span>
                <span className="font-medium">{turn.question}</span>
                <span className="ml-auto shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">{turn.seconds}s</span>
              </p>
              {turn.hasRecording && <audio controls preload="none" src={recordingUrl(turn.position)} className="h-9 w-full" />}
              <p className="whitespace-pre-wrap text-[15px] leading-7 text-foreground">{turn.transcript || <span className="italic text-muted-foreground">Nothing was heard.</span>}</p>
            </li>
          ))}
        </ol>
      )}

      {part.markable && (
        <div className="mt-4 grid gap-4 border-t border-border pt-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <Bot className="h-3.5 w-3.5" /> AI's band · {part.aiBand == null ? 'could not rate it' : part.aiBand.toFixed(1)}
            </p>
            {part.summary && <p className="text-sm leading-6 text-foreground/80">{part.summary}</p>}
            {(part.criteria ?? []).length > 0 && (
              <ul className="space-y-1 text-sm">
                {part.criteria!.map(c => (
                  <li key={c.name} className="flex justify-between gap-3 rounded-md bg-muted/40 px-2 py-1">
                    <span className="text-muted-foreground">{c.name}</span>
                    <span className="font-semibold tabular-nums text-foreground">{c.score.toFixed(1)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Your band</p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`Your band for ${part.name}`}>
              <BandChip active={mark.band == null} disabled={readOnly} onClick={() => onChange({ band: null })}>
                {part.aiBand == null ? 'None' : 'Keep AI'}
              </BandChip>
              {[...bands].reverse().map(b => (
                <BandChip key={b} active={mark.band === b} disabled={readOnly} onClick={() => onChange({ band: b })}>
                  {b.toFixed(1)}
                </BandChip>
              ))}
            </div>
          </div>
        </div>
      )}

      <Textarea
        aria-label={`Comment on ${part.name}`}
        value={mark.comment}
        onChange={e => onChange({ comment: e.target.value })}
        readOnly={readOnly}
        rows={2}
        className="mt-3"
        placeholder={`A comment for the student on ${part.name} (optional)`}
      />
    </section>
  );
}

function BandChip({ active, disabled, onClick, children }: { active: boolean; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'min-w-11 rounded-md border px-2 py-1 text-xs font-semibold tabular-nums transition-colors disabled:cursor-not-allowed',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-foreground hover:border-primary hover:text-primary disabled:hover:border-border disabled:hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
