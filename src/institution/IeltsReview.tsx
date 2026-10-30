import { useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { errorMessage } from '@/lib/api';
import {
  BandMark,
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

/** One student's IELTS sitting: each section with the AI's band, the teacher's bands and comments, then release. */
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
  const parts = (review.sections ?? []).flatMap(s => s.parts);
  const needs = parts.filter(p => p.markable && p.aiBand === null && marks[p.key]?.band == null && review.status === 'submitted');
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
    <div className="space-y-4">
      <Card className="space-y-3 p-4 sm:p-6">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {review.mockName}
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">{review.studentName}</h2>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono">@{review.username}</span> · handed in {day(review.submittedAt)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="text-xs text-muted-foreground">AI's first marking</p>
              <p className="font-display font-semibold text-foreground">{resultText(review.ieltsAiResult)}</p>
            </div>
            <div className={`rounded-lg border px-3 py-2 ${released ? TONES.green.card : 'border-border'}`}>
              <p className="text-xs text-muted-foreground">Released bands</p>
              <p className="font-display font-semibold text-foreground">{released ? resultText(review.ieltsResult) : 'Not yet'}</p>
            </div>
          </div>
        </div>
        {released && (
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
            Released by {review.reviewerName || 'your institution'} on {day(review.releasedAt)}.{' '}
            {review.purgedAt ? `Answers were deleted on ${day(review.purgedAt)}.` : `Answers are kept until ${day(review.purgeAfter)}.`}
          </p>
        )}
      </Card>

      {(review.sections ?? []).map(section => (
        <SectionCard
          key={section.skill}
          section={section}
          bands={review.bands ?? []}
          marks={marks}
          readOnly={released}
          recordingUrl={position => mockRecordingUrl(mockId, attemptId, position)}
          onChange={setMark}
        />
      ))}

      <Card className="sticky bottom-3 space-y-3 p-4 shadow-lg sm:p-5">
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
        <FormError message={error} />
        {notice && <p className="text-sm text-emerald-700 dark:text-emerald-300">{notice}</p>}
        {!released && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {needs.length > 0 && (
              <p className="mr-auto text-sm text-amber-700 dark:text-amber-300">
                {needs.map(p => p.name).join(' and ')} need{needs.length === 1 ? 's' : ''} your band before you release.
              </p>
            )}
            <Button variant="outline" className="h-9" onClick={() => void save()} disabled={busy || !dirty}>
              Save
            </Button>
            <Button className="h-9" onClick={() => void release()} disabled={busy || needs.length > 0 || review.status !== 'submitted'}>
              {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Release result
            </Button>
          </div>
        )}
      </Card>
      {confirmDialog}
    </div>
  );
}

function SectionCard({
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
  onChange: (key: string, change: Partial<{ band: number | null; comment: string }>) => void;
}) {
  return (
    <Card className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-base font-semibold text-foreground">{section.name}</h3>
        <span className="text-sm text-muted-foreground">
          {section.status !== 'submitted' ? 'Not handed in' : section.finalBand != null ? `Released ${bandText(section.finalBand)}` : `AI ${bandText(section.aiBand)}`}
        </span>
      </div>
      {section.parts.map(part => (
        <PartBlock
          key={part.key}
          part={part}
          bands={bands}
          mark={marks[part.key] ?? { band: null, comment: '' }}
          readOnly={readOnly}
          recordingUrl={recordingUrl}
          onChange={change => onChange(part.key, change)}
        />
      ))}
    </Card>
  );
}

function PartBlock({
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
  const keyed = part.key === 'listening' || part.key === 'reading';
  return (
    <div className={`space-y-3 rounded-xl border p-4 ${needs ? 'border-amber-500/50 ring-1 ring-amber-500/30' : 'border-border'}`}>
      {part.key !== 'listening' && part.key !== 'reading' && part.key !== 'speaking' && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium text-foreground">{part.name}</p>
          {needs && (
            <Badge variant="outline" className={`normal-case tracking-normal text-xs font-medium ${TONES.amber.soft}`}>
              Needs your band
            </Badge>
          )}
        </div>
      )}
      {part.key === 'speaking' && needs && (
        <Badge variant="outline" className={`normal-case tracking-normal text-xs font-medium ${TONES.amber.soft}`}>
          Needs your band
        </Badge>
      )}

      {keyed && (
        <p className="text-sm text-foreground">
          Marked by the answer key: <span className="font-medium tabular-nums">{part.correct ?? 0} / {part.total ?? 40}</span> correct ·{' '}
          <span className="font-medium">{bandText(part.aiBand)}</span>
        </p>
      )}

      {(part.key === 'task1' || part.key === 'task2') && (
        <>
          <details className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
            <summary className="cursor-pointer text-muted-foreground">The task</summary>
            <div className="mt-2 space-y-2 text-foreground">
              {part.title && <p className="font-medium">{part.title}</p>}
              {part.prompt && <p className="whitespace-pre-wrap">{part.prompt}</p>}
              {part.imageUrl && <img src={part.imageUrl} alt="" className="max-h-56 rounded border border-border" />}
            </div>
          </details>
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Student's answer · {part.words ?? 0} words</p>
            <p className="whitespace-pre-wrap rounded-lg border border-border px-3 py-2 text-sm leading-relaxed text-foreground">
              {part.response || <span className="text-muted-foreground">Nothing was written, or it has been deleted.</span>}
            </p>
          </div>
        </>
      )}

      {part.key === 'speaking' && (
        <ol className="space-y-2">
          {(part.turns ?? []).map(turn => (
            <li key={turn.position} className="space-y-1.5 rounded-lg border border-border px-3 py-2 text-sm">
              <p className="text-muted-foreground">
                <span className="mr-1.5 rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground">Part {turn.part}</span>
                {turn.question}
              </p>
              {turn.hasRecording && <audio controls preload="none" src={recordingUrl(turn.position)} className="h-9 w-full max-w-md" />}
              <p className="whitespace-pre-wrap text-foreground">{turn.transcript || <span className="text-muted-foreground">Nothing was heard.</span>}</p>
            </li>
          ))}
        </ol>
      )}

      {part.markable && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">AI's band</p>
            <p className="text-sm font-medium text-foreground">{part.aiBand == null ? 'Could not rate it' : bandText(part.aiBand)}</p>
            {part.summary && <p className="text-sm text-muted-foreground">{part.summary}</p>}
            {(part.criteria ?? []).length > 0 && (
              <ul className="space-y-0.5 text-sm text-muted-foreground">
                {part.criteria!.map(c => (
                  <li key={c.name} className="flex justify-between gap-3">
                    <span>{c.name}</span>
                    <span className="tabular-nums text-foreground">{c.score.toFixed(1)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`band-${part.key}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Your band
            </label>
            <select
              id={`band-${part.key}`}
              value={mark.band ?? ''}
              disabled={readOnly}
              onChange={e => onChange({ band: e.target.value === '' ? null : Number(e.target.value) })}
              className="h-10 w-full max-w-[14rem] rounded-md border border-input bg-card px-3 text-sm text-foreground disabled:opacity-70"
            >
              <option value="">{part.aiBand == null ? 'Choose a band' : "Keep the AI's band"}</option>
              {[...bands].reverse().map(b => (
                <option key={b} value={b}>
                  {b.toFixed(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <Textarea
        aria-label={`Comment on ${part.name}`}
        value={mark.comment}
        onChange={e => onChange({ comment: e.target.value })}
        readOnly={readOnly}
        rows={2}
        placeholder={`A comment for the student on ${part.name} (optional)`}
      />
    </div>
  );
}
