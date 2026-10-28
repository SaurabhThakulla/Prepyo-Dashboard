import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  BadgeCheck,
  Building2,
  Check,
  ChevronDown,
  Copy,
  GraduationCap,
  KeyRound,
  Layers,
  Loader2,
  MoreHorizontal,
  RotateCcw,
  Search,
  Settings,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatExamDate } from '@/lib/dates';
import { errorMessage } from '@/lib/api';
import {
  addStudent,
  AI_GRADINGS_PER_MONTH,
  Batch,
  ExamCode,
  fetchBatches,
  fetchFees,
  fetchStudents,
  InstitutionAccount,
  PLANS,
  Readiness,
  removeStudent,
  resetStudentPassword,
  setStudentBatch,
  setStudentDisabled,
  setStudentExam,
  Student,
  STUDENT_ALLOWANCE,
  StudentFee,
} from './api';
import { EXAM_CHOICES } from './profile';
import { dashboardPath, sectionPath } from './paths';
import { FormError } from './FormField';
import { EXAM_TONE, FilterTabs, heroButton, heroGhostButton, Kpi, PageHero, SectionTitle, TONES } from './ui';
import StudentActivityPanel from './StudentActivity';
import StudentProgressPanel, { scoreOutOf } from './StudentProgress';
import { rupees } from './FeesSection';

interface Props {
  account: InstitutionAccount;
  // The exams students can be given; new students start on the first.
  exams: ExamCode[];
}

// A password is shown once, right after it is made.
interface Credentials {
  name: string;
  username: string;
  password: string;
}

type StatusFilter = 'all' | 'active' | 'ready' | 'idle' | 'off';

const PERIODS = [
  [7, '7 days'],
  [30, '30 days'],
  [90, '90 days'],
  [0, 'All time'],
] as const;

// A student with nothing for this long needs a nudge.
const IDLE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const shortDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** "today", "3d ago", "5w ago". */
function ago(value: string | null, now: number): string {
  if (!value) return 'Never';
  const days = Math.floor((now - new Date(value).getTime()) / DAY_MS);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 14) return `${days}d ago`;
  if (days < 60) return `${Math.floor(days / 7)}w ago`;
  return shortDate(value);
}

const isIdle = (student: Student, now: number) =>
  !student.disabled && (!student.usage.lastActiveAt || now - new Date(student.usage.lastActiveAt).getTime() > IDLE_DAYS * DAY_MS);

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase())
    .join('');

const STATUS_TEXT = {
  none: { title: 'Your plan is not set up yet', text: 'Contact Prepyo to choose a plan. You can add students once it is active.', tone: 'sky' },
  active: { title: 'Your plan is active', text: `Each student gets ${STUDENT_ALLOWANCE}.`, tone: 'emerald' },
  expired: {
    title: 'Your plan has ended',
    text: 'Students can still practise reading and listening. AI scoring and full mocks are off until you renew with Prepyo.',
    tone: 'rose',
  },
} as const;

/** The institution's home: plan and seats, the numbers that matter, and every student in one list, CRM-style. */
export default function StudentsPage({ account, exams }: Props) {
  const { institution } = account;
  const [days, setDays] = useState(30);
  const [students, setStudents] = useState<Student[] | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [fees, setFees] = useState<Map<string, StudentFee> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  // ?batch=<id> shows one batch, ?batch=none the students without one.
  const [searchParams, setSearchParams] = useSearchParams();
  const batchFilter = searchParams.get('batch') ?? '';
  const now = Date.now();

  const loginAddress = window.location.origin + dashboardPath(institution.code);

  const load = useCallback(
    () =>
      Promise.all([
        fetchStudents(days).then(data => setStudents(data.students)),
        // Batches and fees add columns; the list works without them.
        fetchBatches()
          .then(data => setBatches(data.batches ?? []))
          .catch(() => setBatches([])),
        fetchFees()
          .then(data => setFees(data.students ? new Map(data.students.map(fee => [fee.studentId, fee])) : null))
          .catch(() => setFees(null)),
      ]).catch(err => setError(errorMessage(err))),
    [days],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // run does one change, then reloads the list; any failure is shown on the page.
  const run = async (change: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await change();
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const actions: StudentActions = {
    busy,
    reset: student =>
      run(async () => {
        const { password } = await resetStudentPassword(student.id);
        setCredentials({ name: student.name, username: student.username, password });
      }),
    changeExam: (student, next) => {
      if (next !== student.exam) void run(() => setStudentExam(student.id, next).then(() => undefined));
    },
    changeBatch: (student, batchId) => {
      if (batchId !== (student.batchId ?? '')) void run(() => setStudentBatch(student.id, batchId).then(() => undefined));
    },
    toggleDisabled: student => {
      if (!student.disabled && !window.confirm(`Turn off ${student.name}'s account? They are signed out and cannot sign in until you turn it back on.`)) return;
      void run(() => setStudentDisabled(student.id, !student.disabled).then(() => undefined));
    },
    remove: student => {
      if (!window.confirm(`Remove ${student.name}? Their account, practice history and fee records are deleted.`)) return;
      void run(async () => {
        await removeStudent(student.id);
        setOpenId(null);
      });
    },
  };

  const filterBy = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('batch', value);
    else next.delete('batch');
    setSearchParams(next, { replace: true });
  };

  const everyone = students ?? [];
  // A filter for a batch that was deleted shows everyone.
  const filterKnown = batchFilter === 'none' || batches.some(b => b.id === batchFilter);
  const inBatch = !batchFilter || !filterKnown ? everyone : everyone.filter(s => (batchFilter === 'none' ? !s.batchId : s.batchId === batchFilter));
  const activeInPeriod = (s: Student) => s.usage.practiceAttempts + s.usage.mocksCompleted + s.usage.aiEvaluations + s.usage.tutorMessages > 0;
  const needle = query.trim().toLowerCase();
  const list = inBatch.filter(s => {
    if (needle && !s.name.toLowerCase().includes(needle) && !s.username.toLowerCase().includes(needle)) return false;
    if (status === 'active') return !s.disabled && activeInPeriod(s);
    if (status === 'ready') return isReady(s);
    if (status === 'idle') return isIdle(s, now);
    if (status === 'off') return s.disabled;
    return true;
  });

  const openStudent = everyone.find(s => s.id === openId) ?? null;
  const seatsUsed = everyone.length;
  const full = seatsUsed >= institution.seatLimit;
  const period = PERIODS.find(([value]) => value === days)?.[1].toLowerCase() ?? '';
  const sum = (key: 'practiceAttempts' | 'mocksCompleted') => inBatch.reduce((n, s) => n + s.usage[key], 0);
  const idleCount = inBatch.filter(s => isIdle(s, now)).length;
  const batchFees = fees ? inBatch.map(s => fees.get(s.id)).filter((f): f is StudentFee => !!f) : [];
  const toCollect = batchFees.reduce((n, f) => n + Math.max(0, f.balanceNpr), 0);
  const overdue = batchFees.filter(f => f.overdue).length;
  const batchName = (id: string | null) => batches.find(b => b.id === id)?.name ?? '';

  const activeCount = inBatch.filter(s => !s.disabled && activeInPeriod(s)).length;
  const activeShare = inBatch.length ? Math.round((activeCount / inBatch.length) * 100) : 0;
  const firstName = account.admin.name.split(' ')[0];
  const plan = institution.plan ? PLANS[institution.plan] : null;
  const statusText = STATUS_TEXT[institution.status] ?? STATUS_TEXT.none;
  const shownBatch = filterKnown && batchFilter && batchFilter !== 'none' ? batches.find(b => b.id === batchFilter) : null;

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Institution dashboard"
        eyebrowIcon={Building2}
        title={firstName ? `Welcome back, ${firstName}` : institution.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{institution.name}</span>
            <span aria-hidden>·</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${institution.status === 'active' ? 'bg-emerald-400/20 text-white' : 'bg-rose-400/30 text-white'}`}>
              {institution.status === 'active' ? <Check className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
              {statusText.title}
            </span>
            {plan && (
              <span>
                {plan.name} plan
                {institution.validUntil && <> · {institution.status === 'expired' ? 'ended' : 'until'} {formatExamDate(institution.validUntil)}</>}
              </span>
            )}
          </span>
        }
        actions={
          <>
            <Button size="sm" className={heroButton} onClick={() => setAdding(true)} disabled={full} title={full ? 'All seats are in use' : undefined}>
              <UserPlus className="mr-1.5 h-4 w-4" /> Add student
            </Button>
            <CopyButton text={loginAddress} label="Copy sign-in link" className={heroGhostButton} />
          </>
        }
      >
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { to: sectionPath(institution.code, 'batches'), label: 'Batches', hint: batches.length === 1 ? '1 batch' : `${batches.length} batches`, icon: Layers },
            { to: sectionPath(institution.code, 'fees'), label: 'Fees', hint: fees ? `${rupees(toCollect)} to collect` : 'Payments and receipts', icon: Wallet },
            { to: sectionPath(institution.code, 'settings'), label: 'Settings', hint: 'Logo, colour and details', icon: Settings },
          ].map(link => (
            <Link
              key={link.label}
              to={link.to}
              className="group flex flex-col items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-2 py-3 text-center transition-colors hover:bg-white/20 sm:flex-row sm:gap-3 sm:px-4 sm:text-left"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20">
                <link.icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold leading-tight sm:text-sm">{link.label}</span>
                <span className="hidden truncate text-xs text-white/70 sm:block">{link.hint}</span>
              </span>
              <ArrowRight className="hidden h-4 w-4 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100 sm:block" />
            </Link>
          ))}
        </div>
      </PageHero>

      {institution.status !== 'active' && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-sm font-medium text-amber-800 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {statusText.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={Users}
          tone="blue"
          label="Students"
          value={students ? seatsUsed : '…'}
          note={`${seatsUsed} of ${institution.seatLimit} seats used`}
          progress={institution.seatLimit ? (seatsUsed / institution.seatLimit) * 100 : 0}
          action={full ? undefined : 'Add'}
          onClick={full ? undefined : () => setAdding(true)}
        />
        <Kpi
          icon={UserCheck}
          tone="green"
          label={`Active · ${period}`}
          value={students ? activeCount : '…'}
          note={`${activeShare}% of ${shownBatch ? 'this batch' : 'your students'}`}
          progress={activeShare}
        />
        <Kpi
          icon={AlertTriangle}
          tone="amber"
          label="Need attention"
          value={students ? idleCount : '…'}
          note={`No practice in ${IDLE_DAYS}+ days`}
          action={idleCount > 0 ? (status === 'idle' ? 'Show all' : 'Show') : undefined}
          onClick={idleCount > 0 ? () => setStatus(status === 'idle' ? 'all' : 'idle') : undefined}
          pressed={status === 'idle'}
        />
        <Kpi
          icon={Wallet}
          tone={overdue > 0 ? 'rose' : 'violet'}
          label="Fees to collect"
          value={fees ? rupees(toCollect) : '—'}
          note={overdue > 0 ? `${overdue} past the due date` : 'Nothing overdue'}
          action="Open"
          to={sectionPath(institution.code, 'fees')}
        />
      </div>

      <Card className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
          <SectionTitle
            icon={GraduationCap}
            title={shownBatch ? shownBatch.name : batchFilter === 'none' && filterKnown ? 'Students without a batch' : 'All students'}
            description={`${sum('practiceAttempts').toLocaleString()} practice answers and ${sum('mocksCompleted').toLocaleString()} full mocks in the last ${period}`}
          />
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
              <Input
                aria-label="Search students"
                placeholder="Search name or username"
                value={query}
                onChange={event => setQuery(event.target.value)}
                className="h-9 pl-9"
              />
            </div>
            {batches.length > 0 && (
              <BatchSelect label="Show batch" value={filterKnown ? batchFilter : ''} batches={batches} onChange={filterBy} disabled={false} allLabel="All batches" withNone />
            )}
            <select
              aria-label="Period"
              value={days}
              onChange={event => setDays(Number(event.target.value))}
              className="h-9 rounded-lg border border-input bg-card px-2.5 text-sm font-semibold text-foreground"
            >
              {PERIODS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <FilterTabs
          label="Filter by status"
          value={status}
          onChange={setStatus}
          options={[
            { id: 'all', label: 'All', count: inBatch.length, icon: Users },
            { id: 'active', label: 'Active', count: activeCount, icon: UserCheck },
            { id: 'ready', label: 'Ready to book', count: inBatch.filter(isReady).length, icon: BadgeCheck },
            { id: 'idle', label: 'Need attention', count: idleCount, icon: AlertTriangle },
            { id: 'off', label: 'Turned off', count: inBatch.filter(s => s.disabled).length, icon: Ban },
          ]}
        />

        {students === null && !error && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading students…
          </p>
        )}

        {students?.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500 text-white">
              <Users className="h-6 w-6" />
            </span>
            <p className="font-display text-lg font-bold text-foreground">No students yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">Add your first student to give them a login for your page.</p>
          </div>
        )}
        {everyone.length > 0 && list.length === 0 && <p className="text-sm text-muted-foreground">No students match these filters.</p>}

        {list.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[1080px] text-sm">
              <caption className="sr-only">Students and their activity over {period}</caption>
              <thead>
                <tr className="whitespace-nowrap bg-muted/60 text-left text-xs font-bold uppercase tracking-wide text-foreground/70">
                  <th className="px-4 py-3">Student</th>
                  <th className="py-3 pr-3">Exam</th>
                  {batches.length > 0 && <th className="py-3 pr-3">Batch</th>}
                  <th className="py-3 pr-3 text-right">Latest mock</th>
                  <th className="py-3 pr-3">Booking</th>
                  <th className="py-3 pr-3 text-right">Practice</th>
                  <th className="py-3 pr-3">Last active</th>
                  {fees && <th className="py-3 pr-3 text-right">Fee balance</th>}
                  <th className="py-3 pr-4">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map(student => {
                  const fee = fees?.get(student.id);
                  const idle = isIdle(student, now);
                  return (
                    <tr
                      key={student.id}
                      onClick={() => setOpenId(student.id)}
                      className={`cursor-pointer transition-colors hover:bg-muted/40 ${student.disabled ? 'opacity-60' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <button type="button" className="flex items-center gap-3 text-left" aria-haspopup="dialog">
                          <Avatar name={student.name} exam={student.exam} />
                          <span className="min-w-0">
                            <span className="block truncate font-bold text-foreground">{student.name}</span>
                            <span className="block font-mono text-xs text-foreground/60">{student.username}</span>
                          </span>
                        </button>
                      </td>
                      <td className="py-3 pr-3">
                        <ExamPill exam={student.exam} />
                      </td>
                      {batches.length > 0 && <td className="whitespace-nowrap py-3 pr-3 text-foreground/75">{batchName(student.batchId) || '—'}</td>}
                      <td className="py-3 pr-3 text-right tabular-nums">
                        {student.latestMock ? (
                          <span title={student.latestMock.title} className="font-bold text-foreground">
                            {scoreOutOf(student.latestMock.exam, student.latestMock.score)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-3">
                        <ReadinessBadge student={student} />
                      </td>
                      <td className="py-3 pr-3 text-right font-semibold tabular-nums">{student.usage.practiceAttempts}</td>
                      <td className="whitespace-nowrap py-3 pr-3">
                        {student.disabled ? (
                          <Badge variant="outline" className={`text-xs font-bold ${TONES.rose.soft}`}>
                            Turned off
                          </Badge>
                        ) : (
                          <Badge variant="outline" className={`text-xs font-bold ${idle ? TONES.amber.soft : TONES.green.soft}`}>
                            {ago(student.usage.lastActiveAt, now)}
                          </Badge>
                        )}
                      </td>
                      {fees && (
                        <td className="whitespace-nowrap py-3 pr-3 text-right tabular-nums">
                          <FeeBalance fee={fee} />
                        </td>
                      )}
                      <td className="py-3 pr-4 text-right" onClick={event => event.stopPropagation()}>
                        <RowMenu student={student} actions={actions} onOpen={() => setOpenId(student.id)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-sm font-medium text-rose-600 dark:text-rose-400">{error}</div>
        )}
      </Card>
      <StudentSheet
        student={openStudent}
        onClose={() => setOpenId(null)}
        exams={exams}
        batches={batches}
        fee={openStudent ? fees?.get(openStudent.id) : undefined}
        days={days}
        period={period}
        code={institution.code}
        actions={actions}
      />

      <Dialog open={adding} onOpenChange={open => !open && setAdding(false)}>
        {adding && (
          <AddStudentDialog
            exams={exams}
            batches={batches}
            initialBatch={batchFilter === 'none' || !filterKnown ? '' : batchFilter}
            onAdded={created => {
              setCredentials(created);
              setAdding(false);
              void load();
            }}
          />
        )}
      </Dialog>

      <Dialog open={!!credentials} onOpenChange={open => !open && setCredentials(null)}>
        {credentials && <CredentialsDialog credentials={credentials} loginAddress={loginAddress} />}
      </Dialog>
    </div>
  );
}

interface StudentActions {
  busy: boolean;
  reset: (student: Student) => Promise<void>;
  changeExam: (student: Student, exam: ExamCode) => void;
  changeBatch: (student: Student, batchId: string) => void;
  toggleDisabled: (student: Student) => void;
  remove: (student: Student) => void;
}

const examAccent = (exam: ExamCode) => EXAM_CHOICES.find(c => c.id === exam)?.accent ?? '#64748b';
/** An exam's short name, as the table shows it. */
const examLabel = (exam: ExamCode) => {
  const choice = EXAM_CHOICES.find(c => c.id === exam);
  return exam === 'PTE' || !choice ? exam : choice.name;
};

function Avatar({ name, exam, large }: { name: string; exam: ExamCode; large?: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full border font-black ${TONES[EXAM_TONE[exam] ?? 'blue'].soft} ${large ? 'h-14 w-14 text-lg' : 'h-9 w-9 text-sm'}`}
    >
      {initialsOf(name) || '?'}
    </span>
  );
}

function ExamPill({ exam }: { exam: ExamCode }) {
  return (
    <Badge variant="outline" className={`whitespace-nowrap text-xs font-bold ${TONES[EXAM_TONE[exam] ?? 'blue'].soft}`}>
      {examLabel(exam)}
    </Badge>
  );
}

const NOT_JUDGED: Readiness = { status: 'in_progress', target: null, fullMocks: [] };
const readinessOf = (student: Student): Readiness => student.readiness ?? NOT_JUDGED;
const isReady = (student: Student) => readinessOf(student).status === 'ready';

// Exams with a full mock test; readiness is decided from those.
const HAS_FULL_MOCK: ExamCode[] = ['PTE', 'IELTS'];

/** Why the student is or is not ready to book, in one line. */
function readinessReason(student: Student): string {
  const { target, fullMocks } = readinessOf(student);
  if (!HAS_FULL_MOCK.includes(student.exam)) return `${examLabel(student.exam)} has no full mock test yet, so readiness can't be judged.`;
  if (target === null) return 'The student has not set a target score yet.';
  const goal = scoreOutOf(student.exam, target);
  if (fullMocks.length < 2) {
    return `Needs 2 full mocks in the last 90 days to judge (has ${fullMocks.length}). Target ${goal}.`;
  }
  const scores = fullMocks.map(score => scoreOutOf(student.exam, score)).join(' and ');
  return isReady(student)
    ? `Last 2 full mocks (${scores}) both met the target ${goal}.`
    : `Last 2 full mocks: ${scores}. Both need to reach ${goal}.`;
}

function ReadinessBadge({ student }: { student: Student }) {
  const ready = isReady(student);
  return (
    <Badge
      variant="outline"
      title={readinessReason(student)}
      className={`whitespace-nowrap text-xs font-bold ${ready ? TONES.green.soft : 'border-border bg-muted/60 text-foreground/70'}`}
    >
      {ready && <BadgeCheck className="mr-1 h-3.5 w-3.5" />}
      {ready ? 'Ready to book' : 'In progress'}
    </Badge>
  );
}

function FeeBalance({ fee }: { fee: StudentFee | undefined }) {
  if (!fee || (!fee.set && fee.paidNpr === 0)) return <span className="text-muted-foreground">—</span>;
  if (fee.balanceNpr > 0)
    return (
      <span className={`font-bold ${fee.overdue ? TONES.rose.text : 'text-foreground'}`}>
        {rupees(fee.balanceNpr)}
        {fee.overdue && (
          <Badge variant="outline" className={`ml-1.5 text-[10px] font-bold ${TONES.rose.soft}`}>
            Overdue
          </Badge>
        )}
      </span>
    );
  return (
    <Badge variant="outline" className={`text-xs font-bold ${TONES.green.soft}`}>
      Paid
    </Badge>
  );
}

function RowMenu({ student, actions, onOpen }: { student: Student; actions: StudentActions; onOpen: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={actions.busy}>
        <Button type="button" variant="ghost" size="sm" aria-label={`Actions for ${student.name}`} className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={onOpen}>
          <Users className="mr-2 h-3.5 w-3.5" /> Open profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void actions.reset(student)}>
          <KeyRound className="mr-2 h-3.5 w-3.5" /> New password
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.toggleDisabled(student)}>
          {student.disabled ? <RotateCcw className="mr-2 h-3.5 w-3.5" /> : <Ban className="mr-2 h-3.5 w-3.5" />}
          {student.disabled ? 'Turn on' : 'Turn off'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => actions.remove(student)} className="text-rose-600 focus:text-rose-600 dark:text-rose-400">
          <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** A student's profile, sliding in from the right: progress, activity, fees and their account. */
function StudentSheet({
  student,
  onClose,
  exams,
  batches,
  fee,
  days,
  period,
  code,
  actions,
}: {
  student: Student | null;
  onClose: () => void;
  exams: ExamCode[];
  batches: Batch[];
  fee: StudentFee | undefined;
  days: number;
  period: string;
  code: string;
  actions: StudentActions;
}) {
  return (
    <SheetPrimitive.Root open={!!student} onOpenChange={open => !open && onClose()}>
      <SheetPrimitive.Portal>
        <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        {student && (
          <SheetPrimitive.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-border bg-card shadow-2xl data-[state=open]:animate-in data-[state=open]:slide-in-from-right">
            <div className="flex items-start gap-3 border-b border-border bg-gradient-to-br from-primary/10 via-transparent to-transparent p-5">
              <Avatar name={student.name} exam={student.exam} large />
              <div className="min-w-0 flex-1">
                <SheetPrimitive.Title className="break-words font-display text-lg font-bold text-foreground">{student.name}</SheetPrimitive.Title>
                <SheetPrimitive.Description className="text-xs text-muted-foreground">
                  <span className="font-mono font-semibold text-foreground">{student.username}</span> · added {shortDate(student.createdAt)}
                </SheetPrimitive.Description>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  <ExamPill exam={student.exam} />
                  <ReadinessBadge student={student} />
                  {student.batchId && (
                    <span className="rounded-full border border-border px-2 py-0.5 font-semibold text-muted-foreground">
                      {batches.find(b => b.id === student.batchId)?.name}
                    </span>
                  )}
                  {student.disabled && (
                    <Badge variant="outline" className="border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      Turned off
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{readinessReason(student)}</p>
              </div>
              <SheetPrimitive.Close className="rounded-full border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </SheetPrimitive.Close>
            </div>

            <div className="grid grid-cols-3 gap-px border-b border-border bg-border text-center">
              {[
                ['Latest mock', student.latestMock ? scoreOutOf(student.latestMock.exam, student.latestMock.score) : '—', TONES.violet.text],
                [`Practice · ${period}`, String(student.usage.practiceAttempts), TONES.blue.text],
                ['Last active', shortDate(student.usage.lastActiveAt), TONES.green.text],
              ].map(([label, value, color]) => (
                <div key={label} className="bg-card px-2 py-3.5">
                  <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                  <p className={`font-display text-lg font-black tabular-nums ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            <Tabs defaultValue="progress" className="flex min-h-0 flex-1 flex-col">
              <TabsList className="mx-5 mt-4 grid grid-cols-4">
                <TabsTrigger value="progress">Progress</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="fees">Fees</TabsTrigger>
                <TabsTrigger value="account">Account</TabsTrigger>
              </TabsList>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-4 text-xs">
                <TabsContent value="progress" className="mt-0">
                  <StudentProgressPanel id={student.id} />
                </TabsContent>
                <TabsContent value="activity" className="mt-0 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <MiniStat label={`Full mocks · ${period}`} value={student.usage.mocksCompleted} />
                    <MiniStat label={`AI evaluations · ${period}`} value={student.usage.aiEvaluations} />
                    <MiniStat label={`Tutor messages · ${period}`} value={student.usage.tutorMessages} />
                    <MiniStat label="AI gradings this month" value={`${Math.round(student.usage.aiGradingsThisMonth * 10) / 10} / ${AI_GRADINGS_PER_MONTH}`} />
                  </div>
                  <StudentActivityPanel id={student.id} days={days} period={period} />
                </TabsContent>
                <TabsContent value="fees" className="mt-0 space-y-3">
                  {fee && (fee.set || fee.paidNpr > 0) ? (
                    <div className="grid grid-cols-2 gap-2">
                      <MiniStat label="Fee after discount" value={fee.set ? rupees(fee.totalNpr - fee.discountNpr) : 'Not set'} />
                      <MiniStat label="Paid" value={rupees(fee.paidNpr)} />
                      <MiniStat label="Balance" value={<FeeBalance fee={fee} />} />
                      <MiniStat label="Due" value={fee.dueOn ? shortDate(fee.dueOn) : '—'} />
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No fee set for this student yet.</p>
                  )}
                  <Link to={sectionPath(code, 'fees')} className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline">
                    <Wallet className="h-3.5 w-3.5" /> Record a payment or set the fee
                  </Link>
                </TabsContent>
                <TabsContent value="account" className="mt-0 space-y-4">
                  <div className="space-y-1.5">
                    <p className="font-semibold text-foreground">Exam</p>
                    <ExamSelect label={`Exam for ${student.name}`} value={student.exam} options={exams} disabled={actions.busy} onChange={next => actions.changeExam(student, next)} size="md" />
                    <p className="text-muted-foreground">Switching the exam clears the student's target score.</p>
                  </div>
                  {batches.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="font-semibold text-foreground">Batch</p>
                      <BatchSelect
                        label={`Batch for ${student.name}`}
                        value={student.batchId ?? ''}
                        batches={batches}
                        disabled={actions.busy}
                        onChange={next => actions.changeBatch(student, next)}
                        allLabel="No batch"
                        size="md"
                      />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                    <Button type="button" variant="outline" size="sm" disabled={actions.busy} onClick={() => void actions.reset(student)} className="rounded-xl text-xs font-bold">
                      <KeyRound className="mr-1.5 h-3.5 w-3.5" /> New password
                    </Button>
                    <Button type="button" variant="outline" size="sm" disabled={actions.busy} onClick={() => actions.toggleDisabled(student)} className="rounded-xl text-xs font-bold">
                      {student.disabled ? <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> : <Ban className="mr-1.5 h-3.5 w-3.5" />}
                      {student.disabled ? 'Turn on' : 'Turn off'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={actions.busy}
                      onClick={() => actions.remove(student)}
                      className="rounded-xl border-rose-500/30 text-xs font-bold text-rose-600 dark:text-rose-400"
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
                    </Button>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </SheetPrimitive.Content>
        )}
      </SheetPrimitive.Portal>
    </SheetPrimitive.Root>
  );
}

function AddStudentDialog({
  exams,
  batches,
  initialBatch,
  onAdded,
}: {
  exams: ExamCode[];
  batches: Batch[];
  initialBatch: string;
  onAdded: (credentials: Credentials) => void;
}) {
  const [name, setName] = useState('');
  const [exam, setExam] = useState<ExamCode>(exams[0] ?? 'IELTS');
  const [batch, setBatch] = useState(initialBatch);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async (event: FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError("Enter the student's name.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await addStudent(name.trim(), exam, batch);
      onAdded({ name: created.student.name, username: created.student.username, password: created.password });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader className="text-left">
        <DialogTitle>Add a student</DialogTitle>
        <DialogDescription>They get a username and password to sign in at your page.</DialogDescription>
      </DialogHeader>
      <form onSubmit={add} className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="new-student-name" className="text-xs font-semibold text-foreground">
            Full name
          </label>
          <Input
            id="new-student-name"
            aria-label="Student name"
            placeholder="Student's full name"
            value={name}
            onChange={event => setName(event.target.value)}
            disabled={busy}
            autoFocus
            className="h-10 rounded-xl text-sm"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground">Exam</p>
            <ExamSelect label="Exam" value={exam} options={exams} disabled={busy} onChange={setExam} size="md" />
          </div>
          {batches.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-foreground">Batch</p>
              <BatchSelect label="Batch" value={batch} batches={batches} disabled={busy} onChange={setBatch} allLabel="No batch" size="md" />
            </div>
          )}
        </div>
        <FormError message={error} />
        <Button type="submit" disabled={busy} className="h-10 w-full rounded-xl text-sm font-bold">
          {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <UserPlus className="mr-1.5 h-4 w-4" />}
          Add student
        </Button>
      </form>
    </DialogContent>
  );
}

function CredentialsDialog({ credentials, loginAddress }: { credentials: Credentials; loginAddress: string }) {
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader className="text-left">
        <DialogTitle>Sign-in details for {credentials.name}</DialogTitle>
        <DialogDescription>The password is shown this once, so copy it now.</DialogDescription>
      </DialogHeader>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm">
        <dt className="text-muted-foreground">Address</dt>
        <dd className="break-all font-mono text-xs font-semibold text-foreground">{loginAddress}</dd>
        <dt className="text-muted-foreground">Username</dt>
        <dd className="font-mono font-semibold text-foreground">{credentials.username}</dd>
        <dt className="text-muted-foreground">Password</dt>
        <dd className="font-mono font-semibold text-foreground">{credentials.password}</dd>
      </dl>
      <CopyButton text={`${loginAddress}\nUsername: ${credentials.username}\nPassword: ${credentials.password}`} label="Copy details" />
    </DialogContent>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
      <p className="font-display text-base font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

/**
 * Picks a student's exam from the ones the plan includes. A student already
 * on an exam the plan no longer has keeps it shown, marked, but cannot be
 * moved back to it. With one exam there is nothing to choose, so it is a label.
 */
function ExamSelect({
  label,
  value,
  options,
  onChange,
  disabled,
  size = 'sm',
}: {
  label: string;
  value: ExamCode;
  options: ExamCode[];
  onChange: (exam: ExamCode) => void;
  disabled: boolean;
  size?: 'sm' | 'md';
}) {
  const height = size === 'md' ? 'h-10 text-sm' : 'h-8 text-xs';
  const dot = <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: examAccent(value) }} />;
  if (options.length === 1 && options[0] === value) {
    return (
      <span aria-label={label} className={`inline-flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 font-semibold text-foreground ${height}`}>
        {dot}
        {examLabel(value)}
      </span>
    );
  }
  const outOfPlan = !options.includes(value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label={label}
          className={`inline-flex w-full min-w-[9rem] items-center justify-between gap-2 rounded-xl border border-input bg-background px-3 font-semibold text-foreground shadow-2xs transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50 data-[state=open]:border-primary ${height}`}
        >
          <span className="flex min-w-0 items-center gap-2">
            {dot}
            <span className="truncate">{examLabel(value)}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {outOfPlan && (
          <DropdownMenuItem disabled className="items-start">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: examAccent(value) }} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">{examLabel(value)}</span>
              <span className="block text-[11px] text-muted-foreground">Not in your plan any more</span>
            </span>
          </DropdownMenuItem>
        )}
        {EXAM_CHOICES.filter(choice => options.includes(choice.id)).map(choice => (
          <DropdownMenuItem key={choice.id} onSelect={() => choice.id !== value && onChange(choice.id)} className="items-start">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: choice.accent }} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-foreground">{examLabel(choice.id)}</span>
              <span className="block text-[11px] leading-snug text-muted-foreground">{choice.detail}</span>
            </span>
            {choice.id === value && <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Picks one of the institution's batches; the empty value is allLabel ("No batch" or "All batches"). */
function BatchSelect({
  label,
  value,
  batches,
  onChange,
  disabled,
  allLabel,
  withNone,
  size = 'sm',
}: {
  label: string;
  value: string;
  batches: Batch[];
  onChange: (batchId: string) => void;
  disabled: boolean;
  allLabel: string;
  // Adds "No batch" as a choice of its own, for filtering.
  withNone?: boolean;
  size?: 'sm' | 'md';
}) {
  const height = size === 'md' ? 'h-10 w-full text-sm' : 'h-9 max-w-[12rem] text-xs';
  return (
    <select
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={event => onChange(event.target.value)}
      className={`rounded-xl border border-input bg-background px-2.5 font-semibold text-foreground disabled:opacity-50 ${height}`}
    >
      <option value="">{allLabel}</option>
      {withNone && <option value="none">No batch</option>}
      {batches.map(batch => (
        <option key={batch.id} value={batch.id}>
          {batch.name}
        </option>
      ))}
    </select>
  );
}

function CopyButton({ text, label, className = '' }: { text: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused; the text is on screen to copy by hand.
    }
  };

  return (
    <Button type="button" variant={className ? 'default' : 'outline'} size="sm" onClick={() => void copy()} className={className || 'shrink-0 rounded-xl text-xs font-bold'}>
      {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
      {copied ? 'Copied' : label}
    </Button>
  );
}
