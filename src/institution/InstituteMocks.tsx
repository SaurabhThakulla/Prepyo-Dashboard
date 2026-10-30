import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, ClipboardCheck, Loader2, Lock, Pencil, Play, Plus, Search, Sparkles, Square, Trash2, Users, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { errorMessage } from '@/lib/api';
import {
  BankQuestion,
  Batch,
  createInstituteMock,
  deleteInstituteMock,
  fetchBatches,
  fetchInstituteMock,
  fetchInstituteMocks,
  fetchMockReview,
  fetchQuestionBank,
  fetchStudents,
  fillInstituteMock,
  IELTSModule,
  InstituteMockDetail,
  InstituteMockExam,
  InstituteMockKind,
  instituteMockKinds,
  InstituteMockSummary,
  InstitutionAccount,
  MockAttemptRow,
  MockReview,
  MockSlot,
  MockState,
  mockRecordingUrl,
  PaperItem,
  PteResult,
  publishInstituteMock,
  releaseMockResult,
  ReviewItem,
  saveInstituteMock,
  saveMockReview,
  Student,
} from './api';
import { FormError } from './FormField';
import IeltsReviewScreen, { bandText } from './IeltsReview';
import { TONES, useConfirm } from './ui';

// ---------------------------------------------------------------- shared bits

const STATE_LABEL: Record<MockState, { label: string; tone: string }> = {
  draft: { label: 'Draft', tone: 'border-border bg-muted text-muted-foreground' },
  scheduled: { label: 'Scheduled', tone: TONES.blue.soft },
  open: { label: 'Open', tone: TONES.green.soft },
  closed: { label: 'Closed', tone: 'border-border bg-muted text-muted-foreground' },
};

const ATTEMPT_LABEL: Record<MockAttemptRow['status'], { label: string; tone: string }> = {
  in_progress: { label: 'Taking it', tone: TONES.blue.soft },
  submitted: { label: 'To review', tone: TONES.amber.soft },
  released: { label: 'Released', tone: TONES.green.soft },
};

// The teacher's levels, as a share of an item's marks.
const LEVEL_NAMES: [number, string][] = [
  [1, 'Excellent'],
  [0.75, 'Good'],
  [0.5, 'Fair'],
  [0.25, 'Weak'],
  [0, 'None'],
];

const levelName = (share: number | null) => {
  if (share === null) return 'Not marked';
  let best = LEVEL_NAMES[0];
  for (const l of LEVEL_NAMES) if (Math.abs(l[0] - share) < Math.abs(best[0] - share)) best = l;
  return best[1];
};

const day = (value: string | null) =>
  value ? new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—';

const SKILL_NAMES: Record<string, string> = { speaking: 'Speaking', writing: 'Writing', reading: 'Reading', listening: 'Listening' };

/** A PTE result on its own scale: overall out of 90, or each skill's. */
function scoreText(result: PteResult | null, finalScore?: number | null): string {
  if (result?.overall != null) return `${result.overall} / 90`;
  const skills = Object.entries(result?.skills ?? {});
  if (skills.length) return skills.map(([skill, score]) => `${SKILL_NAMES[skill] ?? skill} ${score} / 90`).join(' · ');
  return finalScore != null ? `${Math.round(finalScore)} / 90` : '—';
}

/** A released score on its exam's scale: PTE out of 90, an IELTS band. */
const finalScoreText = (exam: InstituteMockExam, score: number | null) =>
  score == null ? '—' : exam === 'IELTS' ? bandText(score) : `${Math.round(score)} / 90`;

/** The words for what a paper is made of: PTE questions, IELTS tests. */
const unitWord = (exam: InstituteMockExam, n = 2) => (exam === 'IELTS' ? (n === 1 ? 'test' : 'tests') : n === 1 ? 'question' : 'questions');

// <input type="datetime-local"> works in local time without a zone.
const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

/** Institute Mocks: the list, one mock's page (?mock=), and one student's review (?mock=&attempt=). */
export default function InstituteMocksSection({ account }: { account: InstitutionAccount }) {
  const [params, setParams] = useSearchParams();
  const mockId = params.get('mock');
  const attemptId = params.get('attempt');
  const go = (next: Record<string, string>) => setParams(next);

  if (mockId && attemptId)
    return <ReviewScreen account={account} mockId={mockId} attemptId={attemptId} onBack={() => go({ mock: mockId, tab: 'results' })} />;
  if (mockId)
    return (
      <MockEditor
        mockId={mockId}
        initialTab={(params.get('tab') as EditorTab) || undefined}
        onBack={() => go({})}
        onReview={attempt => go({ mock: mockId, attempt })}
      />
    );
  return <MocksList account={account} onOpen={id => go({ mock: id })} />;
}

// ---------------------------------------------------------------- the list

function MocksList({ account, onOpen }: { account: InstitutionAccount; onOpen: (id: string) => void }) {
  const [mocks, setMocks] = useState<InstituteMockSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchInstituteMocks()
      .then(data => setMocks(data.mocks))
      .catch(err => setError(errorMessage(err)));
  }, []);

  return (
    <Card className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Institute Mocks</h2>
          <p className="text-sm text-muted-foreground">Tests you set, the AI marks, and you review before students see the score.</p>
        </div>
        <Button size="sm" className="h-9" onClick={() => setCreating(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> New mock
        </Button>
      </div>

      <FormError message={error} />
      {mocks === null && !error && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      )}
      {mocks?.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ClipboardCheck className="h-6 w-6" />
          </span>
          <p className="font-display text-base font-semibold text-foreground">No Institute Mocks yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">Create one, choose its questions, and set it for a batch.</p>
        </div>
      )}
      {mocks && mocks.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="whitespace-nowrap bg-muted/60 text-left text-xs font-medium text-muted-foreground">
                <th className="w-full px-4 py-3">Mock</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Paper</th>
                <th className="px-5 py-3">Students</th>
                <th className="px-5 py-3">To review</th>
                <th className="px-5 py-3">Released</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mocks.map(m => (
                <tr key={m.id} onClick={() => onOpen(m.id)} className="cursor-pointer transition-colors hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <span className="block font-medium text-foreground">{m.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {m.title}
                      {m.exam === 'IELTS' && ' · Academic'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3">
                    <Badge variant="outline" className={`normal-case tracking-normal text-xs font-medium ${STATE_LABEL[m.state].tone}`}>
                      {STATE_LABEL[m.state].label}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 tabular-nums">
                    {m.questions} / {m.needed} {unitWord(m.exam, m.needed)}
                  </td>
                  <td className="px-5 py-3 tabular-nums">{m.students}</td>
                  <td className={`px-5 py-3 tabular-nums ${m.waiting > 0 ? 'font-medium text-amber-700 dark:text-amber-300' : ''}`}>{m.waiting}</td>
                  <td className="px-5 py-3 tabular-nums">{m.released}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={creating} onOpenChange={open => !open && setCreating(false)}>
        {creating && <CreateDialog exams={mockExams(account)} onCreated={id => onOpen(id)} />}
      </Dialog>
    </Card>
  );
}

/** The exams the institution can set Institute Mocks for: PTE and IELTS, as far as its plan goes. */
function mockExams(account: InstitutionAccount): InstituteMockExam[] {
  const plan = account.institution.planExams ?? account.institution.profile.exams ?? [];
  const exams = (['PTE', 'IELTS'] as const).filter(e => plan.includes(e));
  return exams.length ? [...exams] : ['PTE'];
}

function CreateDialog({ exams, onCreated }: { exams: InstituteMockExam[]; onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const [exam, setExam] = useState<InstituteMockExam>(exams[0]);
  const [kind, setKind] = useState<InstituteMockKind>('full');
  const module: IELTSModule = 'academic';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { mock } = await createInstituteMock({ name: name.trim(), exam, kind, ...(exam === 'IELTS' ? { module } : {}) });
      onCreated(mock.id);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <DialogContent className="gap-5 sm:max-w-md">
      <DialogHeader className="space-y-1 text-left">
        <DialogTitle className="font-sans text-base font-semibold">New Institute Mock</DialogTitle>
        <DialogDescription>You choose its paper next.</DialogDescription>
      </DialogHeader>
      <form onSubmit={create} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="mock-name" className="text-sm font-medium text-foreground">
            Name
          </label>
          <Input
            id="mock-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={`e.g. Week 4 ${exam} full test`}
            className="h-10"
            autoFocus
          />
        </div>
        {exams.length > 1 && (
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">Exam</p>
            <div role="radiogroup" aria-label="Exam" className="grid grid-cols-2 gap-2">
              {exams.map(e => (
                <button
                  key={e}
                  type="button"
                  role="radio"
                  aria-checked={exam === e}
                  onClick={() => setExam(e)}
                  className={`h-10 rounded-md border text-sm font-medium transition-colors ${
                    exam === e ? 'border-primary bg-primary/10 text-foreground' : 'border-input text-muted-foreground hover:bg-muted/60'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-1.5">
          <label htmlFor="mock-kind" className="text-sm font-medium text-foreground">
            Test
          </label>
          <select
            id="mock-kind"
            value={kind}
            onChange={e => setKind(e.target.value as InstituteMockKind)}
            className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground"
          >
            {instituteMockKinds(exam).map(k => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </div>
        <FormError message={error} />
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="h-9">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" className="h-9" disabled={busy || name.trim().length < 2}>
            {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Create
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

// ---------------------------------------------------------------- one mock

type EditorTab = 'paper' | 'students' | 'results';

function MockEditor({
  mockId,
  initialTab,
  onBack,
  onReview,
}: {
  mockId: string;
  initialTab?: EditorTab;
  onBack: () => void;
  onReview: (attemptId: string) => void;
}) {
  const [mock, setMock] = useState<InstituteMockDetail | null>(null);
  const [name, setName] = useState('');
  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [items, setItems] = useState<PaperItem[]>([]);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<EditorTab>(initialTab ?? 'paper');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [confirm, confirmDialog] = useConfirm();

  const take = useCallback((m: InstituteMockDetail) => {
    setMock(m);
    setName(m.name);
    setOpensAt(toLocalInput(m.opensAt));
    setClosesAt(toLocalInput(m.closesAt));
    setStudentIds(m.studentIds);
    setItems(m.items.map(i => ({ questionId: i.questionId, task: i.task })));
    setDirty(false);
  }, []);

  useEffect(() => {
    fetchInstituteMock(mockId)
      .then(data => {
        take(data.mock);
        if (!initialTab && data.mock.started > 0) setTab('results');
      })
      .catch(err => setError(errorMessage(err)));
    fetchStudents(30)
      .then(data => setStudents(data.students))
      .catch(() => setStudents([]));
    fetchBatches()
      .then(data => setBatches(data.batches))
      .catch(() => setBatches([]));
  }, [mockId, take, initialTab]);

  const form = () => ({
    name,
    kind: mock!.kind,
    opensAt: fromLocalInput(opensAt),
    closesAt: fromLocalInput(closesAt),
    studentIds,
    items,
  });

  const run = async (change: () => Promise<{ mock: InstituteMockDetail } | void>, done?: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await change();
      if (result) take(result.mock);
      if (done) setNotice(done);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const save = () => run(() => saveInstituteMock(mockId, form()), 'Saved.');

  const fill = () =>
    run(async () => {
      if (dirty) await saveInstituteMock(mockId, form());
      return fillInstituteMock(mockId);
    }, mock?.exam === 'IELTS' ? 'The empty sections are filled with Prepyo tests.' : 'The empty places are filled from our question bank.');

  const publish = async () => {
    const ok = await confirm({
      title: `Publish "${name}"?`,
      description: 'The chosen students see it and can start it while it is open. Its paper cannot change once someone starts.',
      confirmLabel: 'Publish',
    });
    if (!ok) return;
    void run(async () => {
      await saveInstituteMock(mockId, form());
      return publishInstituteMock(mockId);
    }, 'Published. Your students can see it now.');
  };

  const remove = async () => {
    const ok = await confirm({
      title: `Delete "${name}"?`,
      description: 'The mock and its paper are deleted. This cannot be undone.',
      confirmLabel: 'Delete mock',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await deleteInstituteMock(mockId);
      onBack();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (!mock) {
    return (
      <Card className="p-6">
        {error ? <FormError message={error} /> : <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </Card>
    );
  }

  const locked = mock.started > 0;
  const chosen = items.length;
  const needed = mock.slots.reduce((n, s) => n + s.count, 0);

  return (
    <div className="space-y-4">
      <Card className="space-y-5 p-4 pb-0 sm:p-6 sm:pb-0">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Institute Mocks
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            {/* The name reads as a title and edits in place. */}
            <div className="group relative max-w-xl">
              <Input
                aria-label="Mock name"
                value={name}
                onChange={e => (setName(e.target.value), setDirty(true))}
                className="h-11 border-transparent bg-transparent px-2 -mx-2 pr-8 font-display text-xl font-bold shadow-none hover:border-border focus-visible:border-input sm:text-2xl"
              />
              <Pencil className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className={`normal-case tracking-normal text-xs font-medium ${STATE_LABEL[mock.state].tone}`}>
                {STATE_LABEL[mock.state].label}
              </Badge>
              <span>{mock.title}</span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" aria-hidden /> {studentIds.length} student{studentIds.length === 1 ? '' : 's'}
              </span>
              {dirty && (
                <>
                  <span aria-hidden>·</span>
                  <span className="text-amber-600 dark:text-amber-400">Unsaved changes</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {mock.started === 0 && (
              <Button variant="ghost" size="sm" className="h-9 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400" onClick={() => void remove()}>
                <Trash2 className="mr-1.5 h-4 w-4" /> Delete
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-9 px-4" onClick={() => void save()} disabled={busy || !dirty}>
              Save
            </Button>
            {!mock.publishedAt && (
              <Button size="sm" className="h-9 px-5" onClick={() => void publish()} disabled={busy}>
                {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Publish
              </Button>
            )}
          </div>
        </div>

        {/* How full the paper is, at a glance. */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">Paper</span>
            <span className="tabular-nums text-muted-foreground">
              {chosen} of {needed} {unitWord(mock.exam, needed)} chosen
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${chosen >= needed ? 'bg-emerald-500' : 'bg-primary'}`}
              style={{ width: `${needed ? Math.min(100, (chosen / needed) * 100) : 0}%` }}
            />
          </div>
        </div>

        <FormError message={error} />
        {notice && (
          <p className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
            <Check className="h-4 w-4" aria-hidden /> {notice}
          </p>
        )}

        <div role="tablist" className="-mx-4 flex gap-6 overflow-x-auto border-t border-border px-4 sm:-mx-6 sm:px-6">
          {(
            [
              ['paper', 'Paper', `${chosen}/${needed}`],
              ['students', 'Students & time', String(studentIds.length)],
              ['results', 'Results', mock.waiting ? `${mock.waiting} to review` : ''],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`-mt-px flex shrink-0 items-center gap-2 border-t-2 py-3 text-sm font-medium transition-colors ${tab === id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {label}
              {count && (
                <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${tab === id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </Card>

      {tab === 'paper' && (
        <PaperBuilder
          mock={mock}
          items={items}
          locked={locked}
          busy={busy}
          onChange={next => (setItems(next), setDirty(true))}
          onFill={() => void fill()}
        />
      )}
      {tab === 'students' && (
        <StudentsPicker
          exam={mock.exam}
          students={students}
          batches={batches}
          selected={studentIds}
          opensAt={opensAt}
          closesAt={closesAt}
          onSelect={next => (setStudentIds(next), setDirty(true))}
          onOpensAt={v => (setOpensAt(v), setDirty(true))}
          onClosesAt={v => (setClosesAt(v), setDirty(true))}
        />
      )}
      {tab === 'results' && <ResultsTable mock={mock} onReview={onReview} />}
      {confirmDialog}
    </div>
  );
}

// ---------------------------------------------------------------- the paper builder

function PaperBuilder({
  mock,
  items,
  locked,
  busy,
  onChange,
  onFill,
}: {
  mock: InstituteMockDetail;
  items: PaperItem[];
  locked: boolean;
  busy: boolean;
  onChange: (items: PaperItem[]) => void;
  onFill: () => void;
}) {
  const [task, setTask] = useState(mock.slots[0]?.task ?? '');
  const [search, setSearch] = useState('');
  const [hideSeen, setHideSeen] = useState(false);
  const [bank, setBank] = useState<BankQuestion[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Previews of questions on the paper, from the mock and from the bank as it is browsed.
  const [known, setKnown] = useState<Record<string, BankQuestion>>(() =>
    Object.fromEntries(mock.items.filter(i => i.question).map(i => [i.questionId, i.question!])),
  );

  const ielts = mock.exam === 'IELTS';
  const slot = mock.slots.find(s => s.task === task);
  const chosenHere = items.filter(i => i.task === task);
  const countOf = (t: string) => items.filter(i => i.task === t).length;

  const load = useCallback(
    (offset: number) => {
      if (!task) return;
      setError(null);
      fetchQuestionBank(task, search.trim(), '', offset, mock.module ?? '')
        .then(data => {
          setBank(prev => (offset === 0 ? data.questions : [...(prev ?? []), ...data.questions]));
          setTotal(data.total);
          setKnown(prev => ({ ...prev, ...Object.fromEntries(data.questions.map(q => [q.id, q])) }));
        })
        .catch(err => setError(errorMessage(err)));
    },
    [task, search, mock.module],
  );

  useEffect(() => {
    setBank(null);
    const timer = window.setTimeout(() => load(0), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const toggle = (q: BankQuestion) => {
    if (locked) return;
    if (items.some(i => i.questionId === q.id)) onChange(items.filter(i => i.questionId !== q.id));
    else if (slot && chosenHere.length < slot.count) {
      // Keep the paper in the test's order: by task, then as chosen.
      const order = mock.slots.map(s => s.task);
      onChange([...items, { questionId: q.id, task }].sort((a, b) => order.indexOf(a.task) - order.indexOf(b.task)));
    }
  };

  const shown = (bank ?? []).filter(q => !hideSeen || q.seenBy === 0);
  const full = !!slot && chosenHere.length >= slot.count;
  // Several tasks share a part in PTE, so the list is headed by part there.
  const groups = mock.slots.reduce<{ part: string; slots: MockSlot[] }[]>((acc, s) => {
    const last = acc[acc.length - 1];
    if (last && last.part === s.part) last.slots.push(s);
    else acc.push({ part: s.part, slots: [s] });
    return acc;
  }, []);
  const showParts = groups.some(g => g.slots.length > 1);

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid md:grid-cols-[17rem_1fr]">
        <nav aria-label={ielts ? 'Sections' : 'Tasks'} className="border-b border-border bg-muted/30 p-3 md:border-b-0 md:border-r">
          <div className="space-y-4 md:sticky md:top-4">
            {groups.map(g => (
              <div key={g.part} className="space-y-0.5">
                {showParts && (
                  <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {PART_NAMES[g.part] ?? g.part}
                  </p>
                )}
                {g.slots.map(s => {
                  const n = countOf(s.task);
                  const done = n >= s.count;
                  const active = task === s.task;
                  return (
                    <button
                      key={s.task}
                      type="button"
                      onClick={() => setTask(s.task)}
                      aria-current={active ? 'true' : undefined}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        active ? 'bg-background font-medium text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                            done ? 'bg-emerald-500 text-white' : n > 0 ? 'border-2 border-primary' : 'border border-muted-foreground/40'
                          }`}
                        >
                          {done && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
                        </span>
                        <span className="truncate" title={s.name}>{s.name}</span>
                      </span>
                      <span className={`shrink-0 tabular-nums text-xs ${done ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                        {n}/{s.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </nav>

        <div className="min-w-0 space-y-6 p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="font-display text-lg font-bold text-foreground">{slot?.name}</h3>
              <p className="text-sm text-muted-foreground">
                Choose {slot?.count} {unitWord(mock.exam, slot?.count)} ·{' '}
                <span className={full ? 'font-medium text-emerald-600 dark:text-emerald-400' : 'font-medium text-foreground'}>
                  {chosenHere.length} chosen
                </span>
              </p>
            </div>
            {!locked && (
              <div className="flex flex-wrap items-center gap-2">
                {chosenHere.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={() => onChange(items.filter(i => i.task !== task))} disabled={busy}>
                    <X className="mr-1.5 h-4 w-4" /> Unselect all
                  </Button>
                )}
                <Button variant="outline" size="sm" className="h-9" onClick={onFill} disabled={busy}>
                  <Sparkles className="mr-1.5 h-4 w-4 text-primary" /> Fill the rest for me
                </Button>
              </div>
            )}
          </div>

          {locked && (
            <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4 shrink-0" aria-hidden /> The paper is locked because students have started.
            </p>
          )}

          {/* On the paper */}
          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">On the paper</h4>
            {chosenHere.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                Nothing chosen yet. Pick from the list below, or let us fill it.
              </p>
            ) : (
              <ol className="space-y-2.5">
                {chosenHere.map((i, n) => {
                  const q = known[i.questionId];
                  return (
                    <li key={i.questionId} className="flex items-start gap-4 rounded-xl border border-border bg-background p-4 shadow-2xs transition-shadow hover:shadow-sm sm:px-5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold tabular-nums text-primary">
                        {n + 1}
                      </span>
                      <QuestionSummary q={q} fallback={i.questionId} />
                      {!locked && (
                        <button
                          type="button"
                          aria-label="Take it off the paper"
                          title="Take it off the paper"
                          onClick={() => onChange(items.filter(x => x.questionId !== i.questionId))}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {!locked && (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {ielts ? 'Tests' : 'Question bank'}
                  {bank !== null && <span className="ml-1.5 font-normal normal-case tracking-normal">({total})</span>}
                </h4>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={hideSeen} onChange={e => setHideSeen(e.target.checked)} className="h-4 w-4 accent-primary" />
                  {ielts ? 'Hide tests my students have sat' : 'Hide ones my students have practised'}
                </label>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label={ielts ? 'Search tests' : 'Search questions'}
                  placeholder={ielts ? 'Search tests' : 'Search questions'}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-10 pl-9"
                />
              </div>
              {full && (
                <p className="text-xs text-muted-foreground">This task is full. Take one off the paper to choose another.</p>
              )}
              <FormError message={error} />
              {bank === null && !error && (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {bank !== null && shown.length === 0 && (
                <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  No {unitWord(mock.exam)} match.
                </p>
              )}
              {shown.length > 0 && (
                <ul className="space-y-2.5">
                  {shown.map(q => {
                    const on = items.some(i => i.questionId === q.id);
                    const blocked = !on && full;
                    return (
                      <li key={q.id}>
                        <label
                          className={`flex items-start gap-4 rounded-xl border p-4 text-sm transition-colors sm:px-5 ${
                            on
                              ? 'border-primary/40 bg-primary/5'
                              : blocked
                                ? 'cursor-not-allowed border-border opacity-50'
                                : 'cursor-pointer border-border bg-background hover:border-primary/30 hover:bg-muted/30'
                          }`}
                        >
                          <input
                            type="checkbox"
                            aria-label={`Choose ${q.title || q.preview.slice(0, 40)}`}
                            checked={on}
                            disabled={blocked}
                            onChange={() => toggle(q)}
                            className="mt-1 h-[18px] w-[18px] shrink-0 accent-primary"
                          />
                          <QuestionSummary q={q} />
                          {q.seenBy > 0 && (
                            <span className="shrink-0 whitespace-nowrap rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300">
                              {ielts ? 'Sat by' : 'Practised by'} {q.seenBy}
                            </span>
                          )}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
              {bank !== null && bank.length < total && (
                <div className="flex justify-center">
                  <Button variant="outline" size="sm" onClick={() => load(bank.length)}>
                    Show more ({total - bank.length} left)
                  </Button>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </Card>
  );
}

const PART_NAMES: Record<string, string> = {
  speaking_writing: 'Speaking & Writing',
  speaking: 'Speaking',
  writing: 'Writing',
  reading: 'Reading',
  listening: 'Listening',
};

// A title that is really an id (no spaces, e.g. "pte-b3-rs-037") tells the teacher nothing.
const readable = (text?: string) => (text && /\s/.test(text.trim()) ? text.trim() : '');

// Only one recording plays at a time across the page.
let playing: HTMLAudioElement | null = null;

/** A small round play/stop button, so a list of recordings stays one line a row. */
function PlayButton({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [on, setOn] = useState(false);

  useEffect(() => () => ref.current?.pause(), []);

  const toggle = (event: React.MouseEvent) => {
    // The button sits inside a row's label: do not tick the row.
    event.preventDefault();
    event.stopPropagation();
    if (!ref.current) {
      ref.current = new Audio(src);
      ref.current.onended = ref.current.onpause = () => setOn(false);
      ref.current.onplay = () => setOn(true);
    }
    const audio = ref.current;
    if (on) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }
    if (playing && playing !== audio) playing.pause();
    playing = audio;
    void audio.play().catch(() => setOn(false));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={on ? 'Stop the recording' : 'Play the recording'}
      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors ${
        on ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary hover:bg-primary/20'
      }`}
    >
      {on ? <Square className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current" />}
      {on ? 'Stop' : 'Listen'}
    </button>
  );
}

/** One question as a teacher scans it: a picture, a title and one line of its text, and a play button for a recording. */
function QuestionSummary({ q, fallback }: { q?: BankQuestion; fallback?: string }) {
  const title = readable(q?.title);
  const preview = q?.preview?.trim() ?? '';
  const heading = title || preview || (q?.audioUrl ? 'Audio question' : q?.title || fallback);
  const sub = title ? preview : '';
  return (
    <span className="flex min-w-0 flex-1 items-start gap-4">
      {q?.imageUrl && <img src={q.imageUrl} alt="" className="h-14 w-20 shrink-0 rounded-lg border border-border object-cover" />}
      <span className="min-w-0 flex-1 space-y-1">
        <span className={`line-clamp-2 block text-[15px] leading-snug text-foreground ${title ? 'font-semibold' : ''}`}>{heading}</span>
        {sub && <span className="line-clamp-2 block max-w-3xl text-sm leading-relaxed text-muted-foreground">{sub}</span>}
      </span>
      {q?.audioUrl && <PlayButton src={q.audioUrl} />}
    </span>
  );
}

// ---------------------------------------------------------------- students and time

function StudentsPicker({
  exam,
  students,
  batches,
  selected,
  opensAt,
  closesAt,
  onSelect,
  onOpensAt,
  onClosesAt,
}: {
  exam: InstituteMockExam;
  students: Student[];
  batches: Batch[];
  selected: string[];
  opensAt: string;
  closesAt: string;
  onSelect: (ids: string[]) => void;
  onOpensAt: (v: string) => void;
  onClosesAt: (v: string) => void;
}) {
  const pte = useMemo(() => students.filter(s => s.exam === exam && !s.disabled), [students, exam]);
  const others = students.filter(s => s.exam !== exam);
  const toggle = (id: string) => onSelect(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  const addAll = (ids: string[]) => onSelect([...new Set([...selected, ...ids])]);

  return (
    <Card className="space-y-5 p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="mock-opens" className="text-sm font-medium text-foreground">
            Opens
          </label>
          <Input id="mock-opens" type="datetime-local" value={opensAt} onChange={e => onOpensAt(e.target.value)} className="h-10" />
          <p className="text-xs text-muted-foreground">Leave empty to open as soon as you publish.</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="mock-closes" className="text-sm font-medium text-foreground">
            Closes
          </label>
          <Input id="mock-closes" type="datetime-local" value={closesAt} onChange={e => onClosesAt(e.target.value)} className="h-10" />
          <p className="text-xs text-muted-foreground">Leave empty to keep it open.</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-auto text-sm font-medium text-foreground">Who takes it</p>
          <Button variant="outline" size="sm" onClick={() => addAll(pte.map(s => s.id))}>
            All {exam} students
          </Button>
          {batches
            .filter(b => b.exam === exam)
            .map(b => (
              <Button key={b.id} variant="outline" size="sm" onClick={() => addAll(pte.filter(s => s.batchId === b.id).map(s => s.id))}>
                + {b.name}
              </Button>
            ))}
          {selected.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => onSelect([])}>
              Clear
            </Button>
          )}
        </div>
        {pte.length === 0 && <p className="text-sm text-muted-foreground">None of your students is preparing for {exam} yet.</p>}
        <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {pte.map(s => (
            <li key={s.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/40">
                <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} className="h-4 w-4" />
                <span className="min-w-0">
                  <span className="block truncate text-foreground">{s.name}</span>
                  <span className="block truncate font-mono text-xs text-muted-foreground">{s.username}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        {others.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {others.length} student{others.length === 1 ? ' is' : 's are'} on another exam and cannot take an {exam} mock.
          </p>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- results

function ResultsTable({ mock, onReview }: { mock: InstituteMockDetail; onReview: (attemptId: string) => void }) {
  const notStarted = mock.students - mock.attempts.length;
  return (
    <Card className="space-y-4 p-4 sm:p-6">
      <p className="text-sm text-muted-foreground">
        {mock.attempts.length} started · {mock.waiting} to review · {mock.released} released
        {notStarted > 0 && ` · ${notStarted} not started yet`}
      </p>
      {mock.attempts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No one has started it yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="whitespace-nowrap bg-muted/60 text-left text-xs font-medium text-muted-foreground">
                <th className="w-full px-4 py-3">Student</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Handed in</th>
                <th className="px-5 py-3">Score</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Review</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mock.attempts.map(a => (
                <tr key={a.id}>
                  <td className="px-4 py-3">
                    <span className="block text-foreground">{a.name}</span>
                    <span className="block font-mono text-xs text-muted-foreground">{a.username}</span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3">
                    <Badge variant="outline" className={`normal-case tracking-normal text-xs font-medium ${ATTEMPT_LABEL[a.status].tone}`}>
                      {ATTEMPT_LABEL[a.status].label}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">{day(a.submittedAt)}</td>
                  <td className="whitespace-nowrap px-5 py-3 tabular-nums">{finalScoreText(mock.exam, a.finalScore)}</td>
                  <td className="px-4 py-3 text-right">
                    {a.status !== 'in_progress' && (
                      <Button size="sm" variant={a.status === 'submitted' ? 'default' : 'outline'} onClick={() => onReview(a.id)}>
                        {a.status === 'submitted' ? 'Review' : 'View'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- the review

function ReviewScreen({
  account,
  mockId,
  attemptId,
  onBack,
}: {
  account: InstitutionAccount;
  mockId: string;
  attemptId: string;
  onBack: () => void;
}) {
  const [review, setReview] = useState<MockReview | null>(null);
  const [marks, setMarks] = useState<Record<number, { level: number | null; comment: string }>>({});
  const [comment, setComment] = useState('');
  const [reviewer, setReviewer] = useState(account.admin.name);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();

  const take = (r: MockReview) => {
    setReview(r);
    setMarks(Object.fromEntries(r.items.map(i => [i.position, { level: i.level, comment: i.comment }])));
    setComment(r.comment);
    if (r.reviewerName) setReviewer(r.reviewerName);
    setDirty(false);
  };

  useEffect(() => {
    fetchMockReview(mockId, attemptId)
      .then(data => take(data.review))
      .catch(err => setError(errorMessage(err)));
  }, [mockId, attemptId]);

  if (!review) {
    return <Card className="p-6">{error ? <FormError message={error} /> : <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}</Card>;
  }
  if (review.exam === 'IELTS') {
    return <IeltsReviewScreen account={account} initial={review} mockId={mockId} attemptId={attemptId} onBack={onBack} />;
  }

  const released = review.status === 'released';
  const marked = review.items.filter(i => i.marking !== 'key');
  const keyed = review.items.filter(i => i.marking === 'key');
  const keyRight = keyed.filter(i => i.aiScore !== null && i.aiScore >= 1).length;
  const needs = marked.filter(i => i.status === 'answered' && i.aiScore === null && marks[i.position]?.level == null).length;

  const formMarks = () => marked.map(i => ({ position: i.position, level: marks[i.position]?.level ?? null, comment: marks[i.position]?.comment ?? '' }));

  const save = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      take((await saveMockReview(mockId, attemptId, { marks: formMarks(), comment })).review);
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
      description: `They see their score and your comments straight away. Their answers and recordings are deleted ${7} days after release.`,
      confirmLabel: 'Release result',
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await saveMockReview(mockId, attemptId, { marks: formMarks(), comment });
      take((await releaseMockResult(mockId, attemptId, reviewer.trim())).review);
      setNotice('Released. The student can see their result now.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const setMark = (position: number, change: Partial<{ level: number | null; comment: string }>) => {
    setMarks(prev => ({ ...prev, [position]: { level: prev[position]?.level ?? null, comment: prev[position]?.comment ?? '', ...change } }));
    setDirty(true);
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
              <p className="font-display font-semibold text-foreground">{scoreText(review.aiResult)}</p>
            </div>
            <div className={`rounded-lg border px-3 py-2 ${released ? TONES.green.card : 'border-border'}`}>
              <p className="text-xs text-muted-foreground">Released score</p>
              <p className="font-display font-semibold text-foreground">{released ? scoreText(review.finalResult, review.finalScore) : 'Not yet'}</p>
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

      {keyed.length > 0 && (
        <Card className="p-4 sm:p-6">
          <p className="text-sm font-medium text-foreground">Marked by the answer key</p>
          <p className="text-sm text-muted-foreground">
            {keyRight} of {keyed.length} fully right. These need no review.
          </p>
        </Card>
      )}

      {marked.map(item => (
        <ReviewCard
          key={item.position}
          item={item}
          mockId={mockId}
          attemptId={attemptId}
          mark={marks[item.position] ?? { level: null, comment: '' }}
          readOnly={released}
          onChange={change => setMark(item.position, change)}
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
            {needs > 0 && <p className="mr-auto text-sm text-amber-700 dark:text-amber-300">{needs} answer(s) need your mark before you release.</p>}
            <Button variant="outline" className="h-9" onClick={() => void save()} disabled={busy || !dirty}>
              Save
            </Button>
            <Button className="h-9" onClick={() => void release()} disabled={busy || needs > 0}>
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

function ReviewCard({
  item,
  mockId,
  attemptId,
  mark,
  readOnly,
  onChange,
}: {
  item: ReviewItem;
  mockId: string;
  attemptId: string;
  mark: { level: number | null; comment: string };
  readOnly: boolean;
  onChange: (change: Partial<{ level: number | null; comment: string }>) => void;
}) {
  const skipped = item.status !== 'answered';
  const needs = item.status === 'answered' && item.aiScore === null && mark.level === null;
  return (
    <Card className={`space-y-4 p-4 sm:p-6 ${needs ? 'border-amber-500/50 ring-1 ring-amber-500/30' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display font-semibold text-foreground">
          {item.taskName} <span className="text-sm font-normal text-muted-foreground">· question {item.position}</span>
        </p>
        {skipped && (
          <Badge variant="outline" className="normal-case tracking-normal border-border bg-muted text-xs font-medium text-muted-foreground">
            Not answered
          </Badge>
        )}
        {needs && (
          <Badge variant="outline" className={`normal-case tracking-normal text-xs font-medium ${TONES.amber.soft}`}>
            Needs your mark
          </Badge>
        )}
      </div>

      <details className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
        <summary className="cursor-pointer text-muted-foreground">The question</summary>
        <div className="mt-2 space-y-2 text-foreground">
          {item.title && <p className="font-medium">{item.title}</p>}
          {item.prompt && <p className="whitespace-pre-wrap">{item.prompt}</p>}
          {item.passage && <p className="whitespace-pre-wrap text-muted-foreground">{item.passage}</p>}
          {item.imageUrl && <img src={item.imageUrl} alt="" className="max-h-56 rounded border border-border" />}
          {item.audioUrl && <audio controls preload="none" src={item.audioUrl} className="h-9 max-w-full" />}
        </div>
      </details>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Student's answer</p>
        {item.marking === 'spoken' && item.hasRecording && (
          <audio controls preload="none" src={mockRecordingUrl(mockId, attemptId, item.position)} className="h-9 w-full max-w-md" />
        )}
        {item.marking === 'spoken' && (
          <p className="whitespace-pre-wrap rounded-lg border border-border px-3 py-2 text-sm text-foreground">
            {item.transcript || <span className="text-muted-foreground">Nothing was heard.</span>}
          </p>
        )}
        {item.marking === 'written' && (
          <p className="whitespace-pre-wrap rounded-lg border border-border px-3 py-2 text-sm text-foreground">
            {item.response || <span className="text-muted-foreground">Nothing was written.</span>}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">AI's mark</p>
          <p className="text-sm font-medium text-foreground">{levelName(item.aiScore)}</p>
          {item.feedback && <p className="text-sm text-muted-foreground">{item.feedback}</p>}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your mark</p>
          <div className="flex flex-wrap gap-1.5">
            <LevelButton active={mark.level === null} disabled={readOnly} onClick={() => onChange({ level: null })}>
              Keep AI's
            </LevelButton>
            {LEVEL_NAMES.map(([value, label]) => (
              <LevelButton key={value} active={mark.level === value} disabled={readOnly} onClick={() => onChange({ level: value })}>
                {label}
              </LevelButton>
            ))}
          </div>
        </div>
      </div>
      <Textarea
        aria-label={`Comment on question ${item.position}`}
        value={mark.comment}
        onChange={e => onChange({ comment: e.target.value })}
        readOnly={readOnly}
        rows={2}
        placeholder="A comment for the student on this answer (optional)"
      />
    </Card>
  );
}

function LevelButton({ active, disabled, onClick, children }: { active: boolean; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-default ${
        active ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:bg-muted disabled:hover:bg-transparent'
      }`}
    >
      {children}
    </button>
  );
}
