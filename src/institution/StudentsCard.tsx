import React, { FormEvent, useEffect, useState } from 'react';
import { Copy, KeyRound, Loader2, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { errorMessage } from '@/lib/api';
import { addStudent, fetchStudents, removeStudent, resetStudentPassword, Student } from './api';
import { dashboardPath } from './paths';
import { FormError } from './FormField';

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

/** The dashboard's student list: add a student, reset a password, remove a student. */
export default function StudentsCard({ code, seatLimit }: Props) {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  const loginAddress = window.location.origin + dashboardPath(code);

  const load = () =>
    fetchStudents()
      .then(data => setStudents(data.students))
      .catch(err => setError(errorMessage(err)));

  useEffect(() => {
    void load();
  }, []);

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

  const remove = (student: Student) => {
    if (!window.confirm(`Remove ${student.name}? Their account and all their practice history are deleted.`)) return;
    void run(async () => {
      await removeStudent(student.id);
      setCredentials(null);
    });
  };

  const seatsUsed = students?.length ?? 0;
  const full = seatsUsed >= seatLimit;

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <CardTitle className="text-base">Students</CardTitle>
          <CardDescription>
            {seatsUsed} of {seatLimit} seats used. Students sign in at{' '}
            <span className="break-all font-semibold text-foreground">{loginAddress}</span>
          </CardDescription>
        </div>
        <CopyButton text={loginAddress} label="Copy address" />
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

      {students && students.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {students.map(student => (
            <li key={student.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{student.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{student.username}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => void reset(student)} className="text-xs">
                  <KeyRound className="mr-1.5 h-3.5 w-3.5" /> New password
                </Button>
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => remove(student)} className="text-xs text-rose-600 dark:text-rose-400">
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <FormError message={error} />

      {full ? (
        <p className="text-xs text-muted-foreground">All seats are in use. Remove a student or contact Prepyo for more seats.</p>
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
