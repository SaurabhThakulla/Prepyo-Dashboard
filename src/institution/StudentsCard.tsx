import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import {
  AlertTriangle,
  Ban,
  BadgeCheck,
  Check,
  ChevronDown,
  Copy,
  KeyRound,
  Loader2,
  MoreHorizontal,
  RotateCcw,
  Search,
  Target,
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
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { errorMessage } from '@/lib/api';
import {
  addPayment,
  addStudent,
  AI_GRADINGS_PER_MONTH,
  Batch,
  ExamCode,
  fetchBatches,
  fetchFees,
  fetchStudents,
  fetchTargets,
  InstitutionAccount,
  PAYMENT_METHODS,
  PaymentMethod,
  Readiness,
  removeStudent,
  resetStudentPassword,
  saveTargets,
  setStudentFee,
  setStudentBatch,
  setStudentDisabled,
  setStudentExam,
  Student,
  STUDENT_ALLOWANCE,
  StudentFee,
  TARGET_EXAMS,
  TargetExam,
} from './api';
import { EXAM_CHOICES } from './profile';
import { dashboardPath, sectionPath } from './paths';
import { FormError } from './FormField';
import { EXAM_TONE, FilterTabs, Kpi, TONES } from './ui';
import StudentActivityPanel from './StudentActivity';
import StudentProgressPanel, { scoreOutOf } from './StudentProgress';
import { rupees, today } from './FeesSection';

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
  // Set when the student was added but their fee or payment could not be saved.
  warning?: string;
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
  // ?student=<id> opens that student's details, as a link from a batch does.
  const [openId, setOpenId] = useState<string | null>(() => new URLSearchParams(window.location.search).get('student'));
  const [adding, setAdding] = useState(false);
  const [settingTargets, setSettingTargets] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
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
  const idleCount = inBatch.filter(s => isIdle(s, now)).length;
  const batchFees = fees ? inBatch.map(s => fees.get(s.id)).filter((f): f is StudentFee => !!f) : [];
  const toCollect = batchFees.reduce((n, f) => n + Math.max(0, f.balanceNpr), 0);
  const overdue = batchFees.filter(f => f.overdue).length;
  const batchName = (id: string | null) => batches.find(b => b.id === id)?.name ?? '';

  const activeCount = inBatch.filter(s => !s.disabled && activeInPeriod(s)).length;
  const activeShare = inBatch.length ? Math.round((activeCount / inBatch.length) * 100) : 0;
  const statusText = STATUS_TEXT[institution.status] ?? STATUS_TEXT.none;
  const shownBatch = filterKnown && batchFilter && batchFilter !== 'none' ? batches.find(b => b.id === batchFilter) : null;
  const targetExams = TARGET_EXAMS.filter(exam => exams.includes(exam));

  const copySignInLink = async () => {
    try {
      await navigator.clipboard.writeText(loginAddress);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Clipboard access can be refused; the link is in Settings to copy by hand.
    }
  };

  return (
    <div className="space-y-6">
      {institution.status !== 'active' && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-sm font-medium text-amber-800 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {statusText.text}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-base font-semibold text-foreground">
            {shownBatch ? shownBatch.name : batchFilter === 'none' && filterKnown ? 'Students without a batch' : 'Students'}
            {linkCopied && (
              <span role="status" className="ml-2 text-xs font-normal text-emerald-600 dark:text-emerald-400">
                Link copied
              </span>
            )}
          </h2>
          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search students"
              placeholder="Search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              className="h-9 pl-9"
            />
          </div>
          <Button size="sm" className="h-9" onClick={() => setAdding(true)} disabled={full} title={full ? 'All seats are in use' : undefined}>
            <UserPlus className="mr-1.5 h-4 w-4" /> Add student
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9" aria-label="More actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={() => void copySignInLink()}>
                <Copy className="mr-2 h-4 w-4" /> Copy sign-in link
              </DropdownMenuItem>
              {targetExams.length > 0 && (
                <DropdownMenuItem onSelect={() => setSettingTargets(true)}>
                  <Target className="mr-2 h-4 w-4" /> Booking targets
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-auto max-w-full">
            <FilterTabs
              label="Filter by status"
              value={status}
              onChange={setStatus}
              options={[
                { id: 'all', label: 'All', count: inBatch.length },
                { id: 'active', label: 'Active', count: activeCount },
                { id: 'ready', label: 'Ready to book', count: inBatch.filter(isReady).length },
                { id: 'idle', label: 'Need attention', count: idleCount },
                { id: 'off', label: 'Turned off', count: inBatch.filter(s => s.disabled).length },
              ]}
            />
          </div>
          {batches.length > 0 && (
            <BatchSelect label="Show batch" value={filterKnown ? batchFilter : ''} batches={batches} onChange={filterBy} disabled={false} allLabel="All batches" withNone />
          )}
          <select
            aria-label="Period"
            value={days}
            onChange={event => setDays(Number(event.target.value))}
            className="h-9 rounded-lg border border-input bg-card px-2.5 text-sm text-foreground"
          >
            {PERIODS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

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
            <p className="font-display text-lg font-medium text-foreground">No students yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">Add your first student to give them a login for your page.</p>
          </div>
        )}
        {everyone.length > 0 && list.length === 0 && <p className="text-sm text-muted-foreground">No students match these filters.</p>}

        {list.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[860px] text-sm">
              <caption className="sr-only">Students and their activity over {period}</caption>
              <thead>
                <tr className="whitespace-nowrap bg-muted/60 text-left text-xs font-medium text-muted-foreground">
                  <th className="w-full px-4 py-3">Student</th>
                  <th className="px-5 py-3">Exam</th>
                  {batches.length > 0 && <th className="px-5 py-3">Batch</th>}
                  <th className="px-5 py-3">Latest mock</th>
                  <th className="px-5 py-3">Booking</th>
                  <th className="px-5 py-3">Practice</th>
                  <th className="px-5 py-3">Last active</th>
                  {fees && <th className="px-5 py-3">Fee balance</th>}
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
                            <span className="block truncate font-medium text-foreground">{student.name}</span>
                            <span className="block font-mono text-xs text-foreground/60">{student.username}</span>
                          </span>
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <ExamPill exam={student.exam} />
                      </td>
                      {batches.length > 0 && <td className="whitespace-nowrap px-5 py-3 text-foreground/75">{batchName(student.batchId) || '—'}</td>}
                      <td className="whitespace-nowrap px-5 py-3 tabular-nums">
                        {student.latestMock ? (
                          <span title={student.latestMock.title} className="font-medium text-foreground">
                            {scoreOutOf(student.latestMock.exam, student.latestMock.score)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <ReadinessBadge student={student} />
                      </td>
                      <td className="px-5 py-3 tabular-nums text-foreground">{student.usage.practiceAttempts}</td>
                      <td className="whitespace-nowrap px-5 py-3">
                        {student.disabled ? (
                          <Badge variant="outline" className={`normal-case tracking-normal text-xs font-medium ${TONES.rose.soft}`}>
                            Turned off
                          </Badge>
                        ) : (
                          <Badge variant="outline" className={`normal-case tracking-normal text-xs font-medium ${idle ? TONES.amber.soft : TONES.green.soft}`}>
                            {ago(student.usage.lastActiveAt, now)}
                          </Badge>
                        )}
                      </td>
                      {fees && (
                        <td className="whitespace-nowrap px-5 py-3 tabular-nums">
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
        onClose={() => {
          setOpenId(null);
          if (searchParams.has('student')) {
            const next = new URLSearchParams(searchParams);
            next.delete('student');
            setSearchParams(next, { replace: true });
          }
        }}
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

      <Dialog open={settingTargets} onOpenChange={open => !open && setSettingTargets(false)}>
        {settingTargets && (
          <TargetsDialog
            exams={targetExams}
            onSaved={() => {
              setSettingTargets(false);
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
      className={`flex shrink-0 items-center justify-center rounded-full border font-semibold ${TONES[EXAM_TONE[exam] ?? 'blue'].soft} ${large ? 'h-14 w-14 text-lg' : 'h-9 w-9 text-sm'}`}
    >
      {initialsOf(name) || '?'}
    </span>
  );
}

function ExamPill({ exam }: { exam: ExamCode }) {
  return (
    <Badge variant="outline" className={`normal-case tracking-normal whitespace-nowrap text-xs font-medium ${TONES[EXAM_TONE[exam] ?? 'blue'].soft}`}>
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
  const { target, targetFrom, fullMocks } = readinessOf(student);
  if (!HAS_FULL_MOCK.includes(student.exam)) return `${examLabel(student.exam)} has no full mock test yet, so readiness can't be judged.`;
  if (target === null) return 'No target score yet. Set one for everyone with Booking targets.';
  const goal = scoreOutOf(student.exam, target) + (targetFrom === 'student' ? " (the student's own)" : '');
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
      className={`normal-case tracking-normal whitespace-nowrap text-xs font-medium ${ready ? TONES.green.soft : 'border-border bg-muted/60 text-foreground/70'}`}
    >
      {ready && <BadgeCheck className="normal-case tracking-normal mr-1 h-3.5 w-3.5" />}
      {ready ? 'Ready to book' : 'In progress'}
    </Badge>
  );
}

function FeeBalance({ fee }: { fee: StudentFee | undefined }) {
  if (!fee || (!fee.set && fee.paidNpr === 0)) return <span className="text-muted-foreground">—</span>;
  if (fee.balanceNpr > 0)
    return (
      <span className={`font-medium ${fee.overdue ? TONES.rose.text : 'text-foreground'}`}>
        {rupees(fee.balanceNpr)}
        {fee.overdue && (
          <Badge variant="outline" className={`normal-case tracking-normal ml-1.5 text-[10px] font-medium ${TONES.rose.soft}`}>
            Overdue
          </Badge>
        )}
      </span>
    );
  return (
    <Badge variant="outline" className={`normal-case tracking-normal text-xs font-medium ${TONES.green.soft}`}>
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
          <SheetPrimitive.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[88dvh] min-h-[min(30rem,88dvh)] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
            <div className="space-y-4 px-5 pb-4 pt-5">
              <div className="flex items-start gap-3">
                <Avatar name={student.name} exam={student.exam} />
                <div className="min-w-0 flex-1">
                  <SheetPrimitive.Title className="break-words text-lg font-semibold leading-tight text-foreground">{student.name}</SheetPrimitive.Title>
                  <SheetPrimitive.Description className="mt-0.5 text-sm text-muted-foreground">
                    <span className="font-mono">{student.username}</span>
                    {student.email && (
                      <>
                        {' · '}
                        <a href={`mailto:${student.email}`} className="hover:text-foreground hover:underline">
                          {student.email}
                        </a>
                      </>
                    )}{' '}
                    · added {shortDate(student.createdAt)}
                  </SheetPrimitive.Description>
                </div>
                <SheetPrimitive.Close className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </SheetPrimitive.Close>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <ExamPill exam={student.exam} />
                <ReadinessBadge student={student} />
                {student.batchId && (
                  <span className="rounded-md border border-border px-2 py-0.5 text-muted-foreground">
                    {batches.find(b => b.id === student.batchId)?.name}
                  </span>
                )}
                {student.disabled && (
                  <Badge variant="outline" className="normal-case tracking-normal border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    Turned off
                  </Badge>
                )}
              </div>

              <p
                className={`rounded-lg px-3 py-2 text-sm ${
                  isReady(student) ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-muted/60 text-muted-foreground'
                }`}
              >
                {readinessReason(student)}
              </p>

              <div className="grid grid-cols-3 gap-2">
                {[
                  ['Latest mock', student.latestMock ? scoreOutOf(student.latestMock.exam, student.latestMock.score) : '—'],
                  [`Practice · ${period}`, String(student.usage.practiceAttempts)],
                  ['Last active', student.usage.lastActiveAt ? shortDate(student.usage.lastActiveAt) : 'Never'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border px-3 py-2.5">
                    <p className="truncate text-xs text-muted-foreground">{label}</p>
                    <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <Tabs defaultValue="progress" className="flex min-h-0 flex-1 flex-col">
              <TabsList className="mx-5 h-auto justify-start gap-5 rounded-none border-x-0 border-b border-t-0 border-border bg-transparent p-0 shadow-none">
                {(['progress', 'activity', 'fees', 'account'] as const).map(tab => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="-mb-px rounded-none border-b-2 border-transparent bg-transparent px-0 pb-2 pt-0 text-sm font-medium capitalize text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-4 text-sm">
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
                  <Link to={sectionPath(code, 'fees')} className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
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
                    <Button type="button" variant="outline" size="sm" disabled={actions.busy} onClick={() => void actions.reset(student)} className="rounded-xl text-xs font-medium">
                      <KeyRound className="mr-1.5 h-3.5 w-3.5" /> New password
                    </Button>
                    <Button type="button" variant="outline" size="sm" disabled={actions.busy} onClick={() => actions.toggleDisabled(student)} className="rounded-xl text-xs font-medium">
                      {student.disabled ? <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> : <Ban className="mr-1.5 h-3.5 w-3.5" />}
                      {student.disabled ? 'Turn on' : 'Turn off'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={actions.busy}
                      onClick={() => actions.remove(student)}
                      className="rounded-xl border-rose-500/30 text-xs font-medium text-rose-600 dark:text-rose-400"
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

// Every field's label in the add-student form.
const FIELD_LABEL = 'text-sm font-medium text-foreground';

// Whole rupees typed in a box: '' counts as 0, anything else that is not digits is NaN.
const amountOf = (value: string) => (value.trim() === '' ? 0 : /^\d+$/.test(value.trim()) ? Number(value.trim()) : NaN);

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
  const [email, setEmail] = useState('');
  const [exam, setExam] = useState<ExamCode>(exams[0] ?? 'IELTS');
  const [batch, setBatch] = useState(initialBatch);
  const [total, setTotal] = useState('');
  const [discount, setDiscount] = useState('');
  const [dueOn, setDueOn] = useState('');
  const [paid, setPaid] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalNpr = amountOf(total);
  const discountNpr = amountOf(discount);
  const paidNpr = amountOf(paid);

  const add = async (event: FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError("Enter the student's name.");
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter an email like name@example.com, or leave it empty.');
      return;
    }
    if ([totalNpr, discountNpr, paidNpr].some(Number.isNaN)) {
      setError('Enter amounts in whole rupees, like 25000.');
      return;
    }
    if (discountNpr > totalNpr) {
      setError('The discount cannot be more than the fee.');
      return;
    }
    if ((discountNpr > 0 || dueOn) && totalNpr === 0) {
      setError('Enter the course fee first.');
      return;
    }
    setBusy(true);
    setError(null);
    let created: { student: Student; password: string };
    try {
      created = await addStudent(name.trim(), exam, batch, email.trim());
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
      return;
    }
    // The student exists now, so a fee or payment that fails is reported, not undone.
    let warning: string | undefined;
    try {
      if (totalNpr > 0) await setStudentFee(created.student.id, { totalNpr, discountNpr, dueOn });
      if (paidNpr > 0) await addPayment(created.student.id, { amountNpr: paidNpr, paidOn: today(), method, note: '' });
    } catch (err) {
      warning = `The fee was not saved (${errorMessage(err)}). Set it on the Fees page.`;
    }
    onAdded({ name: created.student.name, username: created.student.username, password: created.password, warning });
  };

  return (
    <DialogContent className="gap-5 sm:max-w-md">
      <DialogHeader className="space-y-1 text-left">
        <DialogTitle className="font-sans text-lg font-semibold">Add a student</DialogTitle>
        <DialogDescription>They get a username and password to sign in at your page.</DialogDescription>
      </DialogHeader>
      <form onSubmit={add} className="space-y-5">
        <section className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Student</h3>
          <div className="space-y-1.5">
            <label htmlFor="new-student-name" className={FIELD_LABEL}>
              Full name
            </label>
            <Input
              id="new-student-name"
              aria-label="Student name"
              placeholder="e.g. Sita Sharma"
              value={name}
              onChange={event => setName(event.target.value)}
              disabled={busy}
              autoFocus
              className="h-10 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="new-student-email" className={FIELD_LABEL}>
              Email <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="new-student-email"
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder="name@example.com"
              value={email}
              onChange={event => setEmail(event.target.value)}
              disabled={busy}
              className="h-10 text-sm"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className={FIELD_LABEL}>Exam</p>
              <ExamSelect label="Exam" value={exam} options={exams} disabled={busy} onChange={setExam} size="md" />
            </div>
            {batches.length > 0 && (
              <div className="space-y-1.5">
                <p className={FIELD_LABEL}>Batch</p>
                <BatchSelect label="Batch" value={batch} batches={batches} disabled={busy} onChange={setBatch} allLabel="No batch" size="md" />
              </div>
            )}
          </div>
        </section>

        <section className="space-y-3 border-t border-border pt-5">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fee</h3>
            <span className="text-xs text-muted-foreground">Optional · you can set it later</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <MoneyField id="new-student-fee" label="Course fee" value={total} onChange={setTotal} disabled={busy} placeholder="25000" />
            <MoneyField id="new-student-discount" label="Discount" value={discount} onChange={setDiscount} disabled={busy} placeholder="0" />
            <MoneyField id="new-student-paid" label="Paid now" value={paid} onChange={setPaid} disabled={busy} placeholder="0" />
            <div className="space-y-1.5">
              <label htmlFor="new-student-method" className={FIELD_LABEL}>
                Paid by
              </label>
              <select
                id="new-student-method"
                value={method}
                onChange={event => setMethod(event.target.value as PaymentMethod)}
                disabled={busy || !(paidNpr > 0)}
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {PAYMENT_METHODS.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="new-student-due" className={FIELD_LABEL}>
                Due date
              </label>
              <Input id="new-student-due" type="date" value={dueOn} onChange={event => setDueOn(event.target.value)} disabled={busy} className="h-10 w-full text-sm" />
            </div>
            <div className="flex flex-col justify-end">
              <div className="rounded-md bg-muted/60 px-3 py-2 text-xs">
                <div className="flex justify-between gap-2 text-muted-foreground">
                  <span>Fee after discount</span>
                  <span className="tabular-nums">{totalNpr > 0 && !Number.isNaN(discountNpr) ? rupees(Math.max(0, totalNpr - discountNpr)) : '—'}</span>
                </div>
                <div className="mt-1 flex justify-between gap-2 font-medium text-foreground">
                  <span>Left to pay</span>
                  <span className="tabular-nums">
                    {totalNpr > 0 && !Number.isNaN(discountNpr) && !Number.isNaN(paidNpr) ? rupees(Math.max(0, totalNpr - discountNpr - paidNpr)) : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <FormError message={error} />
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="h-10" disabled={busy}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" className="h-10" disabled={busy}>
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <UserPlus className="mr-1.5 h-4 w-4" />}
            Add student
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

/** An amount in whole rupees: digits only, with Rs in front. */
function MoneyField({
  id,
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rs</span>
        <Input
          id={id}
          inputMode="numeric"
          value={value}
          onChange={event => onChange(event.target.value.replace(/\D/g, ''))}
          disabled={disabled}
          placeholder={placeholder}
          className="h-10 pl-9 text-sm tabular-nums"
        />
      </div>
    </div>
  );
}

const TARGET_SCALE: Record<TargetExam, { max: number; step: number }> = {
  PTE: { max: 90, step: 1 },
  IELTS: { max: 9, step: 0.5 },
};

/** One booking target per exam, for every student on it; an empty box leaves students' own targets. */
function TargetsDialog({ exams, onSaved }: { exams: TargetExam[]; onSaved: () => void }) {
  const [values, setValues] = useState<Partial<Record<TargetExam, string>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const examKey = exams.join(',');

  useEffect(() => {
    fetchTargets()
      .then(data => setValues(Object.fromEntries(exams.map(exam => [exam, data.targets[exam]?.toString() ?? '']))))
      .catch(err => {
        setValues({});
        setError(errorMessage(err));
      });
    // examKey stands for exams: a new array each render, the same names.
  }, [examKey]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!values) return;
    setBusy(true);
    setError(null);
    try {
      await saveTargets(Object.fromEntries(exams.map(exam => [exam, values[exam]?.trim() ? Number(values[exam]) : null])));
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <DialogContent className="gap-5 sm:max-w-sm">
      <DialogHeader className="space-y-1 text-left">
        <DialogTitle className="font-sans text-base font-semibold">Booking targets</DialogTitle>
        <DialogDescription className="text-sm">Ready to book when the last 2 full mocks reach this score.</DialogDescription>
      </DialogHeader>
      {values === null ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      ) : (
        <form onSubmit={save} className="space-y-4">
          <div className="divide-y divide-border rounded-lg border border-border">
            {exams.map(exam => (
              <div key={exam} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <label htmlFor={`target-${exam}`} className="text-sm text-foreground">
                  {examLabel(exam)}
                </label>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Input
                    id={`target-${exam}`}
                    type="number"
                    inputMode="decimal"
                    min={TARGET_SCALE[exam].step === 1 ? 10 : 1}
                    max={TARGET_SCALE[exam].max}
                    step={TARGET_SCALE[exam].step}
                    placeholder="—"
                    value={values[exam] ?? ''}
                    onChange={event => setValues({ ...values, [exam]: event.target.value })}
                    disabled={busy}
                    className="h-8 w-20 rounded-md text-right text-sm tabular-nums"
                  />
                  <span className="w-8 whitespace-nowrap">/ {TARGET_SCALE[exam].max}</span>
                </span>
              </div>
            ))}
          </div>
          <FormError message={error} />
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm" disabled={busy}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={busy}>
              {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      )}
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
      {credentials.warning && (
        <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
          {credentials.warning}
        </p>
      )}
      <CopyButton text={`${loginAddress}\nUsername: ${credentials.username}\nPassword: ${credentials.password}`} label="Copy details" />
    </DialogContent>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
      <p className="font-display text-base font-medium tabular-nums text-foreground">{value}</p>
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
              <span className="block text-sm font-medium">{examLabel(value)}</span>
              <span className="block text-[11px] text-muted-foreground">Not in your plan any more</span>
            </span>
          </DropdownMenuItem>
        )}
        {EXAM_CHOICES.filter(choice => options.includes(choice.id)).map(choice => (
          <DropdownMenuItem key={choice.id} onSelect={() => choice.id !== value && onChange(choice.id)} className="items-start">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: choice.accent }} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">{examLabel(choice.id)}</span>
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
    <Button type="button" variant={className ? 'default' : 'outline'} size="sm" onClick={() => void copy()} className={className || 'shrink-0 rounded-xl text-xs font-medium'}>
      {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
      {copied ? 'Copied' : label}
    </Button>
  );
}
