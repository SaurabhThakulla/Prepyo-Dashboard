import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { Ban, Copy, KeyRound, Loader2, RotateCcw, Trash2, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { errorMessage } from '@/lib/api';
import {
  addStudent,
  AI_GRADINGS_PER_MONTH,
  fetchStudents,
  removeStudent,
  resetStudentPassword,
  setStudentDisabled,
  Student,
} from './api';
import { dashboardPath } from './paths';
import { FormError } from './FormField';
import StudentActivityPanel from './StudentActivity';

interface Props {
  code: string;
  seatLimit: number;
}

// A password is shown once, right after it is made.
interface Credentials {
  name: string;
  username: string;
  password: string;
}

const PERIODS = [
  [7, '7 days'],
  [30, '30 days'],
  [90, '90 days'],
  [0, 'All time'],
] as const;

const shortDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** The dashboard's student board: usage over a period, each student's activity, and managing logins. */
export default function StudentsCard({ code, seatLimit }: Props) {
  const [days, setDays] = useState(30);
  const [students, setStudents] = useState<Student[] | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const loginAddress = window.location.origin + dashboardPath(code);

  const load = useCallback(
    () =>
      fetchStudents(days)
        .then(data => setStudents(data.students))
        .catch(err => setError(errorMessage(err))),
    [days],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // run does one change, then reloads the list; any failure is shown in the card.
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

  const add = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError("Enter the student's name.");
      return;
    }
    void run(async () => {
      const created = await addStudent(name.trim());
      setCredentials({ name: created.student.name, username: created.student.username, password: created.password });
      setName('');
    });
  };

  const reset = (student: Student) =>
    run(async () => {
      const { password } = await resetStudentPassword(student.id);
      setCredentials({ name: student.name, username: student.username, password });
    });

  const toggleDisabled = (student: Student) => {
    if (!student.disabled && !window.confirm(`Turn off ${student.name}'s account? They are signed out and cannot sign in until you turn it back on.`)) return;
    void run(async () => {
      await setStudentDisabled(student.id, !student.disabled);
    });
  };

  const remove = (student: Student) => {
    if (!window.confirm(`Remove ${student.name}? Their account and all their practice history are deleted.`)) return;
    void run(async () => {
      await removeStudent(student.id);
      setCredentials(null);
    });
  };

  const list = students ?? [];
  const openStudent = list.find(s => s.id === openId) ?? null;
  const seatsUsed = list.length;
  const full = seatsUsed >= seatLimit;
  const total = (key: 'practiceAttempts' | 'mocksCompleted' | 'aiEvaluations' | 'tutorMessages') =>
    list.reduce((sum, s) => sum + s.usage[key], 0);
  const active = list.filter(s => s.usage.practiceAttempts + s.usage.mocksCompleted + s.usage.aiEvaluations + s.usage.tutorMessages > 0).length;
  const period = PERIODS.find(([value]) => value === days)?.[1].toLowerCase() ?? '';

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base">Students</CardTitle>
          <CardDescription>
            {seatsUsed} of {seatLimit} seats used. Students sign in at{' '}
            <span className="break-all font-semibold text-foreground">{loginAddress}</span>
          </CardDescription>
        </div>
        <CopyButton text={loginAddress} label="Copy address" />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PERIODS.map(([value, label]) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={days === value ? 'default' : 'outline'}
            onClick={() => setDays(value)}
            className="h-8 rounded-full text-xs font-bold"
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Active students" value={`${active} / ${seatsUsed}`} />
        <Stat label="Practice answers" value={total('practiceAttempts')} />
        <Stat label="Full mocks" value={total('mocksCompleted')} />
        <Stat label="AI evaluations" value={total('aiEvaluations')} />
        <Stat label="Tutor messages" value={total('tutorMessages')} />
      </div>

      {credentials && (
        <div className="space-y-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3.5 text-xs">
          <p className="font-semibold text-foreground">
            Sign-in details for {credentials.name}. The password is shown this once, so copy it now.
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-muted-foreground">Username</dt>
            <dd className="font-mono font-semibold text-foreground">{credentials.username}</dd>
            <dt className="text-muted-foreground">Password</dt>
            <dd className="font-mono font-semibold text-foreground">{credentials.password}</dd>
          </dl>
          <CopyButton
            text={`${loginAddress}\nUsername: ${credentials.username}\nPassword: ${credentials.password}`}
            label="Copy details"
          />
        </div>
      )}

      {students === null && !error && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading students…
        </p>
      )}

      {students?.length === 0 && <p className="text-xs text-muted-foreground">No students yet. Add your first one below.</p>}

      {list.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[760px] text-xs">
            <caption className="sr-only">Students and their usage over {period}</caption>
            <thead>
              <tr className="border-b border-border text-left font-bold uppercase text-muted-foreground">
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2 text-right">Practice</th>
                <th className="px-3 py-2 text-right">Mocks</th>
                <th className="px-3 py-2 text-right">AI evals</th>
                <th className="px-3 py-2 text-right">AI gradings this month</th>
                <th className="px-3 py-2">Last active</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map(student => {
                return (
                  <React.Fragment key={student.id}>
                    <tr
                      onClick={() => setOpenId(student.id)}
                      className={`cursor-pointer border-b border-border/60 hover:bg-muted/40 ${student.disabled ? 'opacity-60' : ''}`}
                    >
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          className="flex items-center gap-1.5 text-left hover:text-primary"
                          aria-haspopup="dialog"
                        >
                          <span>
                            <span className="block font-semibold text-foreground underline-offset-2 hover:underline">{student.name}</span>
                            <span className="block font-mono text-muted-foreground">{student.username}</span>
                          </span>
                        </button>
                        {student.disabled && (
                          <Badge variant="outline" className="mt-1 border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400">
                            Turned off
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{student.usage.practiceAttempts}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{student.usage.mocksCompleted}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{student.usage.aiEvaluations}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {Math.round(student.usage.aiGradingsThisMonth * 10) / 10} / {AI_GRADINGS_PER_MONTH}
                      </td>
                      <td className="px-3 py-2.5">{shortDate(student.usage.lastActiveAt)}</td>
                      <td className="px-3 py-2.5">
                        {/* The buttons act on their own; they do not open the details. */}
                        <div className="flex justify-end gap-0.5" onClick={event => event.stopPropagation()}>
                          <IconButton label="New password" disabled={busy} onClick={() => void reset(student)} icon={KeyRound} />
                          <IconButton
                            label={student.disabled ? 'Turn on' : 'Turn off'}
                            disabled={busy}
                            onClick={() => toggleDisabled(student)}
                            icon={student.disabled ? RotateCcw : Ban}
                          />
                          <IconButton label="Remove" disabled={busy} onClick={() => remove(student)} icon={Trash2} danger />
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <FormError message={error} />

      <Dialog open={!!openStudent} onOpenChange={isOpen => !isOpen && setOpenId(null)}>
        {openStudent && (
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader className="text-left">
              <DialogTitle className="flex flex-wrap items-center gap-2 pr-8">
                {openStudent.name}
                {openStudent.disabled && (
                  <Badge variant="outline" className="border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    Turned off
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                Username <span className="font-mono font-semibold text-foreground">{openStudent.username}</span> · added{' '}
                {shortDate(openStudent.createdAt)}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Stat label={`Practice · ${period}`} value={openStudent.usage.practiceAttempts} />
              <Stat label={`Full mocks · ${period}`} value={openStudent.usage.mocksCompleted} />
              <Stat label={`AI evaluations · ${period}`} value={openStudent.usage.aiEvaluations} />
              <Stat label={`Tutor messages · ${period}`} value={openStudent.usage.tutorMessages} />
              <Stat
                label="AI gradings this month"
                value={`${Math.round(openStudent.usage.aiGradingsThisMonth * 10) / 10} / ${AI_GRADINGS_PER_MONTH}`}
              />
              <Stat label="Last active" value={shortDate(openStudent.usage.lastActiveAt)} />
            </div>
            <div className="text-xs">
              <StudentActivityPanel id={openStudent.id} days={days} period={period} />
            </div>
          </DialogContent>
        )}
      </Dialog>

      {full ? (
        <p className="text-xs text-muted-foreground">
          {seatLimit === 0
            ? 'You can add students once Prepyo has set up your plan.'
            : 'All seats are in use. Remove a student or contact Prepyo for a bigger plan.'}
        </p>
      ) : (
        <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
          <Input
            aria-label="Student name"
            placeholder="Student's full name"
            value={name}
            onChange={event => setName(event.target.value)}
            disabled={busy}
            className="h-10 flex-1 rounded-xl text-sm"
          />
          <Button type="submit" disabled={busy} className="h-10 rounded-xl text-xs font-bold">
            {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <UserPlus className="mr-1.5 h-3.5 w-3.5" />}
            Add student
          </Button>
        </form>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function IconButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled: boolean;
  danger?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`h-8 w-8 p-0 ${danger ? 'text-rose-600 dark:text-rose-400' : ''}`}
    >
      <Icon className="h-3.5 w-3.5" />
    </Button>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
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
    <Button type="button" variant="outline" size="sm" onClick={() => void copy()} className="rounded-xl text-xs font-bold">
      <Copy className="mr-1.5 h-3.5 w-3.5" />
      {copied ? 'Copied' : label}
    </Button>
  );
}
