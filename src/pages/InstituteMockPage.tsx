import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Check, CheckCircle2, ChevronRight, ClipboardCheck, Clock, Hourglass, Loader2, Mic } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import PteTestRunner from '@/components/pteMock/PteTestRunner';
import { ListeningMockRunner, ListeningSession } from '@/components/practice/ListeningMockPanel';
import { SpeakingMockRunner, SpeakingSession } from '@/components/practice/SpeakingMockPanel';
import WritingMockPanel, { WritingMockSession } from '@/components/practice/WritingMockPanel';
import ReadingMockPanel from '@/components/reading/ReadingMockPanel';
import { ReadingMockSession } from '@/lib/types';
import { TestMicrophone } from '@/lib/pteMock/audio';
import { pteReportHref } from '@/lib/pteMock/catalog';
import { PteSession } from '@/lib/pteMock/types';
import { unlockAudio } from '@/lib/scriptPlayer';

type Skill = 'listening' | 'reading' | 'writing' | 'speaking';

interface StudentSection {
  skill: Skill;
  name: string;
  status: 'not_started' | 'in_progress' | 'submitted';
}

interface StudentMock {
  id: string;
  name: string;
  exam: 'PTE' | 'IELTS';
  module?: 'academic' | 'general_training';
  kind: 'full' | 'speaking' | 'writing' | 'reading' | 'listening';
  title: string;
  institution: string;
  opensAt: string | null;
  closesAt: string | null;
  state: 'scheduled' | 'open' | 'closed';
  status: 'not_started' | 'in_progress' | 'submitted' | 'released';
  sessionId: string | null;
  finalScore: number | null;
  releasedAt: string | null;
  purgeAfter: string | null;
  // IELTS: the sections, in the order they are sat.
  sections?: StudentSection[];
}

interface StudentResult extends StudentMock {
  result: { overall: number | null; skills: Record<string, number> } | null;
  ielts?: { overall: number | null; skills: Record<string, number> } | null;
  comment: string;
  reviewerName: string;
  comments: { position: number; taskName: string; level: number | null; band?: number | null; comment: string }[];
}

/** A released score on its exam's scale: PTE out of 90, an IELTS band. */
const scoreText = (m: StudentMock) =>
  m.finalScore == null ? '' : m.exam === 'IELTS' ? `Band ${m.finalScore.toFixed(1)}` : `${Math.round(m.finalScore)} / 90`;

const SKILL_NAMES: Record<string, string> = { speaking: 'Speaking', writing: 'Writing', reading: 'Reading', listening: 'Listening' };

const when = (value: string | null) =>
  value ? new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';

function statusLine(m: StudentMock): { text: string; tone: string } {
  if (m.status === 'released') return { text: 'Result ready', tone: 'text-emerald-700 dark:text-emerald-300' };
  if (m.status === 'submitted') return { text: 'Waiting for your teacher', tone: 'text-amber-700 dark:text-amber-300' };
  if (m.status === 'in_progress') return { text: 'Started · continue where you left off', tone: 'text-primary' };
  if (m.state === 'scheduled') return { text: `Opens ${when(m.opensAt)}`, tone: 'text-muted-foreground' };
  if (m.state === 'closed') return { text: 'Closed', tone: 'text-muted-foreground' };
  return { text: m.closesAt ? `Open until ${when(m.closesAt)}` : 'Open now', tone: 'text-emerald-700 dark:text-emerald-300' };
}

/** /institute-mock — the tests the student's institution set; /institute-mock/:id — one of them. */
export default function InstituteMockPage() {
  const { id } = useParams();
  const { user } = useApp();
  if (!user?.institution) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-16">
        <Card className="space-y-2 p-8 text-center">
          <ClipboardCheck className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="font-display text-lg font-semibold text-foreground">Institute Mocks are for institution students</h1>
          <p className="text-sm text-muted-foreground">Your institution sets these tests. Practice mocks are under Mock tests.</p>
          <Button asChild variant="outline">
            <Link to="/mocks">Mock tests</Link>
          </Button>
        </Card>
      </div>
    );
  }
  return id ? <MockScreen id={id} /> : <MockList institution={user.institution.name} />;
}

function useStudentMocks() {
  const [mocks, setMocks] = useState<StudentMock[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(
    () =>
      api
        .get<{ mocks: StudentMock[] }>('/institute-mocks')
        .then(data => (setMocks(data.mocks), setError(null)))
        .catch(err => setError(errorMessage(err))),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  return { mocks, error, load };
}

/** What the card's button says: the next thing the student can do with the test. */
function actionLabel(m: StudentMock): string {
  if (m.status === 'released') return 'See result';
  if (m.status === 'submitted') return 'View';
  if (m.status === 'in_progress') return 'Continue';
  if (m.state === 'open') return 'Start';
  return 'View';
}

// The status badge's colours, by the line statusLine gives.
const BADGE: Record<string, string> = {
  released: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300',
  submitted: 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300',
  in_progress: 'bg-primary/10 text-primary ring-primary/20',
  open: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300',
  other: 'bg-muted text-muted-foreground ring-border',
};

const badgeTone = (m: StudentMock) =>
  m.status !== 'not_started' ? BADGE[m.status] : m.state === 'open' ? BADGE.open : BADGE.other;

function MockList({ institution }: { institution: string }) {
  const { mocks, error } = useStudentMocks();
  const count = (test: (m: StudentMock) => boolean) => mocks?.filter(test).length ?? 0;
  const stats = [
    { label: 'To take', value: count(m => m.status === 'not_started' || m.status === 'in_progress') },
    { label: 'With your teacher', value: count(m => m.status === 'submitted') },
    { label: 'Results', value: count(m => m.status === 'released') },
  ];

  return (
    <div className="w-full space-y-5 p-4 sm:space-y-6 sm:p-6 lg:p-8">
      {/* Header in the sidebar's blue, as on the dashboard */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2a56cf] via-primary to-[#132e7d] p-5 text-white shadow-xl shadow-primary/20 dark:from-blue-900 dark:via-blue-950 dark:to-slate-950 sm:p-7">
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border-[28px] border-white/10" />
        <span aria-hidden className="pointer-events-none absolute -bottom-24 right-1/3 h-48 w-48 rounded-full bg-sky-300/25 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <ClipboardCheck className="h-6 w-6" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">Institute Mock</h1>
              <p className="mt-1.5 max-w-xl text-sm font-medium text-white/80">
                Tests set by {institution}. Your teacher reviews each one before you see the score.
              </p>
            </div>
          </div>
          {mocks && mocks.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {stats.map(s => (
                <div key={s.label} className="rounded-2xl bg-white/10 px-4 py-2.5 ring-1 ring-white/20">
                  <p className="font-display text-2xl font-bold tabular-nums">{s.value}</p>
                  <p className="text-[11px] font-medium text-white/75 sm:text-xs">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      {mocks === null && !error && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {mocks?.length === 0 && (
        <Card className="space-y-2 p-10 text-center">
          <ClipboardCheck className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="font-display text-lg font-semibold text-foreground">No tests yet</p>
          <p className="text-sm text-muted-foreground">When {institution} sets you a test, it appears here.</p>
        </Card>
      )}

      <ul className="space-y-3">
        {mocks?.map(m => {
          const line = statusLine(m);
          const primary = m.status === 'in_progress' || (m.status === 'not_started' && m.state === 'open');
          return (
            <li key={m.id}>
              <Link to={`/institute-mock/${m.id}`} className="group block">
                <Card className="flex flex-col gap-4 p-4 transition-all group-hover:-translate-y-0.5 group-hover:shadow-lg sm:flex-row sm:items-center sm:p-5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    {m.status === 'released' ? <CheckCircle2 className="h-6 w-6" /> : m.status === 'submitted' ? <Hourglass className="h-6 w-6" /> : <ClipboardCheck className="h-6 w-6" />}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="truncate font-display text-lg font-bold text-foreground">{m.name}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
                      <span>{m.title}</span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${badgeTone(m)}`}>
                        {line.text}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    {m.status === 'released' && m.finalScore != null && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{m.exam === 'IELTS' ? 'Band' : 'Score'}</p>
                        <p className="font-display text-2xl font-bold tabular-nums text-foreground">{scoreText(m).replace('Band ', '')}</p>
                      </div>
                    )}
                    <span
                      className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-5 text-sm font-semibold transition-colors ${
                        primary ? 'bg-primary text-primary-foreground group-hover:bg-primary/90' : 'border border-border text-foreground group-hover:bg-muted'
                      }`}
                    >
                      {actionLabel(m)}
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MockScreen({ id }: { id: string }) {
  const navigate = useNavigate();
  const { mocks, error, load } = useStudentMocks();
  const [session, setSession] = useState<PteSession | null>(null);
  const [mic, setMic] = useState<TestMicrophone | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const mock = mocks?.find(m => m.id === id);
  const [section, setSection] = useState<{ skill: Skill; session: unknown } | null>(null);

  // The microphone belongs to the test; it is released when the page goes.
  useEffect(() => () => mic?.close(), [mic]);

  // Stable, as PteMockPage keeps them: the runner registers the running test with
  // the app whenever onLeave changes, and that re-renders this page.
  const finished = useCallback(() => {
    mic?.close();
    setSession(null);
    void load();
  }, [mic, load]);
  const leave = useCallback(() => {
    mic?.close();
    navigate('/institute-mock');
  }, [mic, navigate]);

  const start = async (checked: TestMicrophone | null) => {
    setStarting(true);
    setStartError(null);
    try {
      const data = await api.post<{ session: PteSession | null; mock: StudentMock | null }>(`/institute-mocks/${id}/start`);
      setMic(checked);
      if (data.session?.status === 'in_progress') setSession(data.session);
      else void load();
    } catch (err) {
      checked?.close();
      setStartError(errorMessage(err));
    } finally {
      setStarting(false);
    }
  };

  // An IELTS section opens in its own player; finishing or leaving it comes back here.
  const openSection = async (skill: Skill) => {
    setStarting(true);
    setStartError(null);
    try {
      if (mock?.status === 'not_started') await api.post(`/institute-mocks/${id}/start`);
      const data = await api.post<{ session: unknown }>(`/institute-mocks/${id}/sections/${skill}`);
      setSection({ skill, session: data.session });
    } catch (err) {
      setStartError(errorMessage(err));
      void load();
    } finally {
      setStarting(false);
    }
  };
  const backToTest = useCallback(() => {
    setSection(null);
    void load();
  }, [load]);

  if (section) {
    const label = `${mock?.name ?? 'Institute Mock'} · ${SKILL_NAMES[section.skill]}`;
    return (
      <div className="w-full">
        <div className="px-3 pt-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground sm:px-6 lg:px-8">{label}</div>
        {section.skill === 'listening' && (
          <ListeningMockRunner
            session={section.session as ListeningSession}
            title={label}
            onDone={backToTest}
            onClosed={backToTest}
            onLeave={backToTest}
          />
        )}
        {section.skill === 'reading' && (
          <ReadingMockPanel section={{ session: section.session as ReadingMockSession, onSubmitted: backToTest, onLeave: backToTest }} />
        )}
        {section.skill === 'writing' && (
          <WritingMockPanel section={{ session: section.session as WritingMockSession, onSubmitted: backToTest, onLeave: backToTest }} />
        )}
        {section.skill === 'speaking' && (
          <SpeakingMockRunner session={section.session as SpeakingSession} onDone={backToTest} onClosed={backToTest} onLeave={backToTest} />
        )}
      </div>
    );
  }

  if (session) {
    return <PteTestRunner initial={session} mic={mic} onFinished={finished} onLeave={leave} />;
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 sm:px-6">
      <Link to="/institute-mock" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Institute Mock
      </Link>
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      {mocks === null && !error && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      {mocks && !mock && <p className="text-sm text-muted-foreground">This test is not set for you.</p>}
      {mock && (
        <>
          <div>
            <p className="text-sm text-muted-foreground">{mock.institution}</p>
            <h1 className="font-display text-2xl font-semibold text-foreground">{mock.name}</h1>
            <p className="text-sm text-muted-foreground">{mock.title}</p>
          </div>
          {mock.exam === 'IELTS' && (mock.status === 'not_started' || mock.status === 'in_progress') && (
            <IeltsSections mock={mock} starting={starting} error={startError} onOpen={skill => void openSection(skill)} />
          )}
          {mock.exam !== 'IELTS' && (mock.status === 'not_started' || mock.status === 'in_progress') && (
            <StartCard mock={mock} starting={starting} error={startError} onStart={checked => void start(checked)} />
          )}
          {mock.status === 'submitted' && (
            <Card className="flex items-start gap-3 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-300">
                <Hourglass className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-base font-semibold text-foreground">Handed in. Your teacher will review it.</p>
                <p className="text-sm text-muted-foreground">
                  You will see your {mock.exam === 'IELTS' ? 'bands' : 'score'} and their comments here once they release it.
                </p>
              </div>
            </Card>
          )}
          {mock.status === 'released' && (mock.exam === 'IELTS' ? <IeltsResultCard id={id} mock={mock} /> : <ResultCard id={id} mock={mock} />)}
        </>
      )}
    </div>
  );
}

function StartCard({
  mock,
  starting,
  error,
  onStart,
}: {
  mock: StudentMock;
  starting: boolean;
  error: string | null;
  onStart: (mic: TestMicrophone | null) => void;
}) {
  const needsMic = mock.kind === 'full' || mock.kind === 'speaking';
  const [mic, setMic] = useState<TestMicrophone | null>(null);
  const [peak, setPeak] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [handedOver, setHandedOver] = useState(false);

  useEffect(() => {
    if (!mic) return;
    const timer = setInterval(() => setPeak(p => Math.max(p, mic.level())), 80);
    return () => clearInterval(timer);
  }, [mic]);
  useEffect(() => () => {
    if (!handedOver) mic?.close();
  }, [mic, handedOver]);

  const openMic = async () => {
    unlockAudio();
    setMicError(null);
    if (!TestMicrophone.supported()) {
      setMicError('This browser cannot record audio. Use Chrome or Edge on a computer.');
      return;
    }
    const m = new TestMicrophone();
    try {
      await m.open();
      setMic(m);
    } catch {
      setMicError('Microphone access was refused. Allow the microphone for this site and try again.');
    }
  };

  const heard = peak >= TestMicrophone.VOICE_LEVEL;
  const ready = mock.state === 'open' || mock.status === 'in_progress';
  const canStart = ready && (!needsMic || (mic !== null && heard));

  return (
    <Card className="space-y-5 p-5">
      <ul className="space-y-2 text-sm text-foreground">
        <li className="flex gap-2">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> Timed like the real test. The clock keeps running if you leave.
        </li>
        <li className="flex gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> One attempt. You cannot go back to a question.
        </li>
        <li className="flex gap-2">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          {mock.closesAt ? `Hand it in before ${when(mock.closesAt)}.` : 'Your teacher sees it as soon as you finish.'}
        </li>
      </ul>

      {needsMic && mock.status === 'not_started' && (
        <div className="space-y-2 rounded-lg border border-border p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Mic className="h-4 w-4" /> Check your microphone
          </p>
          {!mic ? (
            <Button variant="outline" size="sm" onClick={() => void openMic()}>
              Turn on the microphone
            </Button>
          ) : (
            <div className="space-y-1.5">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${heard ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${Math.min(100, peak * 400)}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{heard ? 'We can hear you. You are ready.' : 'Say a few words so we can hear you.'}</p>
            </div>
          )}
          {micError && <p className="text-sm text-rose-600 dark:text-rose-400">{micError}</p>}
        </div>
      )}

      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      {!ready && <p className="text-sm text-muted-foreground">{mock.state === 'scheduled' ? `It opens ${when(mock.opensAt)}.` : 'It is closed.'}</p>}
      <Button
        className="h-10 w-full sm:w-auto"
        disabled={starting || !(canStart || (mock.status === 'in_progress' && ready))}
        onClick={() => {
          setHandedOver(true);
          onStart(mic);
        }}
      >
        {starting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
        {mock.status === 'in_progress' ? 'Continue the test' : 'Start the test'}
      </Button>
    </Card>
  );
}

function ResultCard({ id, mock }: { id: string; mock: StudentMock }) {
  const [result, setResult] = useState<StudentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api
      .get<{ result: StudentResult }>(`/institute-mocks/${id}/result`)
      .then(data => setResult(data.result))
      .catch(err => setError(errorMessage(err)));
  }, [id]);

  if (error) return <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>;
  if (!result) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  const skills = Object.entries(result.result?.skills ?? {});

  return (
    <div className="space-y-4">
      <Card className="space-y-4 bg-gradient-to-br from-primary/10 via-transparent to-transparent p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Your score</p>
            <p className="font-display text-4xl font-semibold text-foreground">
              {result.result?.overall != null ? result.result.overall : mock.finalScore != null ? Math.round(mock.finalScore) : '—'}
              <span className="text-lg font-normal text-muted-foreground"> / 90</span>
            </p>
          </div>
          <p className="text-sm text-muted-foreground">Reviewed by {result.reviewerName || mock.institution}</p>
        </div>
        {skills.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {skills.map(([skill, score]) => (
              <div key={skill} className="rounded-lg border border-border bg-card px-3 py-2">
                <p className="text-xs text-muted-foreground">{SKILL_NAMES[skill] ?? skill}</p>
                <p className="font-display text-lg font-semibold text-foreground">{score} / 90</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {(result.comment || result.comments.length > 0) && (
        <Card className="space-y-3 p-5">
          <p className="font-display text-base font-semibold text-foreground">Your teacher's comments</p>
          {result.comment && <p className="whitespace-pre-wrap text-sm text-foreground">{result.comment}</p>}
          {result.comments.map(c => (
            <div key={c.position} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <p className="text-xs text-muted-foreground">
                {c.taskName} · question {c.position}
              </p>
              <p className="whitespace-pre-wrap text-foreground">{c.comment}</p>
            </div>
          ))}
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {mock.sessionId && (
          <Button asChild variant="outline" size="sm">
            <Link to={pteReportHref(mock.sessionId)}>See every answer</Link>
          </Button>
        )}
        {mock.purgeAfter && <span>Your answers are kept until {when(mock.purgeAfter)}; the score stays.</span>}
      </div>
    </div>
  );
}

/** An IELTS mock's sections, sat in order: each opens in the IELTS section player. */
function IeltsSections({
  mock,
  starting,
  error,
  onOpen,
}: {
  mock: StudentMock;
  starting: boolean;
  error: string | null;
  onOpen: (skill: Skill) => void;
}) {
  const sections = mock.sections ?? [];
  const next = sections.find(s => s.status !== 'submitted');
  const open = mock.state === 'open' || next?.status === 'in_progress';
  return (
    <Card className="space-y-5 p-5">
      <ul className="space-y-2 text-sm text-foreground">
        <li className="flex gap-2">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> Each section is timed like the real test. Its clock keeps running if you leave.
        </li>
        <li className="flex gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> Sections are sat in order, once each. Use headphones and a microphone.
        </li>
        <li className="flex gap-2">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          {mock.closesAt ? `Start before ${when(mock.closesAt)}.` : 'Your teacher sees it as soon as you finish the last section.'}
        </li>
      </ul>
      <ol className="divide-y divide-border rounded-lg border border-border">
        {sections.map((s, i) => {
          const done = s.status === 'submitted';
          const current = next?.skill === s.skill;
          return (
            <li key={s.skill} className="flex items-center gap-3 px-4 py-3">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  done ? 'bg-emerald-500 text-white' : current ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'
                }`}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-foreground">{s.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {done ? 'Handed in' : s.status === 'in_progress' ? 'Started' : current ? 'Next' : 'Waiting'}
                </span>
              </span>
              {current && (
                <Button size="sm" className="h-9" disabled={starting || !open} onClick={() => onOpen(s.skill)}>
                  {starting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  {s.status === 'in_progress' ? 'Continue' : `Start ${s.name}`}
                </Button>
              )}
            </li>
          );
        })}
      </ol>
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      {!open && <p className="text-sm text-muted-foreground">{mock.state === 'scheduled' ? `It opens ${when(mock.opensAt)}.` : 'It is closed.'}</p>}
    </Card>
  );
}

function IeltsResultCard({ id, mock }: { id: string; mock: StudentMock }) {
  const [result, setResult] = useState<StudentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api
      .get<{ result: StudentResult }>(`/institute-mocks/${id}/result`)
      .then(data => setResult(data.result))
      .catch(err => setError(errorMessage(err)));
  }, [id]);

  if (error) return <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>;
  if (!result) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  const order: Skill[] = ['listening', 'reading', 'writing', 'speaking'];
  const skills = order.filter(s => result.ielts?.skills[s] != null);
  const headline = result.ielts?.overall ?? mock.finalScore;

  return (
    <div className="space-y-4">
      <Card className="space-y-4 bg-gradient-to-br from-primary/10 via-transparent to-transparent p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{result.ielts?.overall != null ? 'Overall band' : 'Your band'}</p>
            <p className="font-display text-4xl font-semibold text-foreground">{headline != null ? headline.toFixed(1) : '—'}</p>
          </div>
          <p className="text-sm text-muted-foreground">Reviewed by {result.reviewerName || mock.institution}</p>
        </div>
        {skills.length > 1 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {skills.map(skill => (
              <div key={skill} className="rounded-lg border border-border bg-card px-3 py-2">
                <p className="text-xs text-muted-foreground">{SKILL_NAMES[skill]}</p>
                <p className="font-display text-lg font-semibold text-foreground">{result.ielts!.skills[skill].toFixed(1)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {(result.comment || result.comments.length > 0) && (
        <Card className="space-y-3 p-5">
          <p className="font-display text-base font-semibold text-foreground">Your teacher's comments</p>
          {result.comment && <p className="whitespace-pre-wrap text-sm text-foreground">{result.comment}</p>}
          {result.comments.map(c => (
            <div key={c.position} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <p className="text-xs text-muted-foreground">
                {c.taskName}
                {c.band != null && ` · Band ${c.band.toFixed(1)}`}
              </p>
              <p className="whitespace-pre-wrap text-foreground">{c.comment}</p>
            </div>
          ))}
        </Card>
      )}
      {mock.purgeAfter && (
        <p className="text-sm text-muted-foreground">Your answers are kept until {when(mock.purgeAfter)}; the bands stay.</p>
      )}
    </div>
  );
}
