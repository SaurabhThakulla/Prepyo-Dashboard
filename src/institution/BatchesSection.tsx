import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronRight, Layers, Loader2, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { errorMessage } from '@/lib/api';
import { Batch, BatchForm, createBatch, deleteBatch, ExamCode, fetchBatches, fetchStudents, Student, updateBatch } from './api';
import { scoreOutOf } from './StudentProgress';
import { examName } from './profile';
import { dashboardPath } from './paths';
import FormField, { FormError } from './FormField';
import { EXAM_TONE, SectionTitle, TONES } from './ui';

interface Props {
  code: string;
  // The exams the plan includes; a batch is for one of them.
  exams: ExamCode[];
}

const day = (value: string) => new Date(value + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** The text under a batch's name: when it runs. */
export function batchDates(batch: Pick<Batch, 'startsOn' | 'endsOn'>): string {
  if (batch.startsOn && batch.endsOn) return `${day(batch.startsOn)} – ${day(batch.endsOn)}`;
  if (batch.startsOn) return `From ${day(batch.startsOn)}`;
  if (batch.endsOn) return `Until ${day(batch.endsOn)}`;
  return 'No dates set';
}

/** The admin's batches (classes): create, rename, delete, and open the students in one. */
export default function BatchesSection({ code, exams }: Props) {
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // undefined: no dialog; null: a new batch; a Batch: editing it.
  const [editing, setEditing] = useState<Batch | null | undefined>(undefined);
  // The batch whose students are shown.
  const [viewing, setViewing] = useState<Batch | null>(null);

  const load = useCallback(
    () =>
      fetchBatches()
        .then(data => (setBatches(data.batches), setError(null)))
        .catch(err => setError(errorMessage(err))),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (batch: Batch) => {
    const students = batch.students === 1 ? '1 student stays' : `${batch.students} students stay`;
    if (!window.confirm(`Delete the batch "${batch.name}"? Its ${students} in your institution, without a batch.`)) return;
    try {
      await deleteBatch(batch.id);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Card className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle
          icon={Layers}
          tone="violet"
          title="Your batches"
          description={batches ? `${batches.length} ${batches.length === 1 ? 'batch' : 'batches'} · ${batches.reduce((n, b) => n + b.students, 0)} students in them` : 'Loading…'}
        />
        <Button type="button" size="sm" onClick={() => setEditing(null)} className="font-medium">
          <Plus className="mr-1.5 h-4 w-4" /> New batch
        </Button>
      </div>

      {batches === null && !error && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading batches…
        </p>
      )}

      {batches?.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500 text-white">
            <Layers className="h-6 w-6" />
          </span>
          <p className="font-display text-lg font-medium text-foreground">No batches yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Create one for each class you run, such as “IELTS morning” or “EPS-TOPIK Baisakh intake”, then put students in it.
          </p>
        </div>
      )}

      {batches && batches.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {batches.map(batch => {
            const t = TONES[EXAM_TONE[batch.exam] ?? 'blue'];
            return (
            <li
              key={batch.id}
              role="button"
              tabIndex={0}
              aria-label={`Show the students in ${batch.name}`}
              onClick={() => setViewing(batch)}
              onKeyDown={event => {
                if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  setViewing(batch);
                }
              }}
              className={`flex cursor-pointer flex-col justify-between gap-4 rounded-xl border p-5 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${t.card}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1.5">
                  <p className="break-words font-display text-lg font-medium text-foreground">{batch.name}</p>
                  <Badge variant="outline" className={`normal-case tracking-normal text-xs font-medium ${t.soft}`}>
                    {examName(batch.exam)}
                  </Badge>
                </div>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${t.icon}`}>
                  <Layers className="h-5 w-5" />
                </span>
              </div>
              <div>
                <div className={`font-display text-4xl font-semibold tabular-nums ${t.text}`}>{batch.students}</div>
                <p className="flex items-center gap-1.5 text-sm text-foreground/70">
                  <CalendarDays className="h-3.5 w-3.5" /> {batchDates(batch)}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${t.text}`}>
                  <Users className="h-4 w-4" />
                  {batch.students === 1 ? '1 student' : `${batch.students} students`}
                </span>
                <div className="flex gap-0.5" onClick={event => event.stopPropagation()}>
                  <Button type="button" variant="ghost" size="sm" aria-label={`Edit ${batch.name}`} title="Edit" onClick={() => setEditing(batch)} className="h-8 w-8 p-0">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Delete ${batch.name}`}
                    title="Delete"
                    onClick={() => void remove(batch)}
                    className="h-8 w-8 p-0 text-rose-600 dark:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </li>
            );
          })}
        </ul>
      )}

      <FormError message={error} />

      <Dialog open={viewing !== null} onOpenChange={open => !open && setViewing(null)}>
        {viewing && <BatchStudentsDialog batch={viewing} code={code} />}
      </Dialog>

      <Dialog open={editing !== undefined} onOpenChange={open => !open && setEditing(undefined)}>
        {editing !== undefined && (
          <BatchDialog
            batch={editing}
            exams={exams}
            onSaved={() => {
              setEditing(undefined);
              void load();
            }}
          />
        )}
      </Dialog>
    </Card>
  );
}

/** The students in one batch; picking one opens their details on the students page. */
function BatchStudentsDialog({ batch, code }: { batch: Batch; code: string }) {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents(30)
      .then(data => setStudents(data.students.filter(student => student.batchId === batch.id)))
      .catch(err => setError(errorMessage(err)));
  }, [batch.id]);

  const listPath = `${dashboardPath(code)}?batch=${encodeURIComponent(batch.id)}`;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const ready = students?.filter(s => s.readiness?.status === 'ready').length ?? 0;
  const activeThisWeek = students?.filter(s => s.usage.lastActiveAt && new Date(s.usage.lastActiveAt).getTime() >= weekAgo).length ?? 0;
  const lastSeen = (value: string | null) =>
    value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'Never';

  return (
    <DialogContent className="gap-5 sm:max-w-2xl">
      <DialogHeader className="space-y-1 text-left">
        <DialogTitle className="font-sans text-lg font-semibold">{batch.name}</DialogTitle>
        <DialogDescription className="text-sm">
          {examName(batch.exam)} · {batchDates(batch)}
        </DialogDescription>
      </DialogHeader>

      {students && students.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            ['Students', students.length],
            ['Ready to book', ready],
            ['Active this week', activeThisWeek],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border px-3 py-2.5">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">{value}</p>
            </div>
          ))}
        </div>
      )}

      {students === null && !error && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      )}
      <FormError message={error} />
      {students?.length === 0 && <p className="text-sm text-muted-foreground">No students in this batch yet.</p>}

      {students && students.length > 0 && (
        <div className="max-h-[50dvh] overflow-auto rounded-lg border border-border">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="sticky top-0 bg-muted/90 backdrop-blur">
              <tr className="whitespace-nowrap text-left text-xs font-medium text-muted-foreground">
                <th className="w-full px-3 py-2.5">Student</th>
                <th className="px-3 py-2.5">Latest mock</th>
                <th className="px-3 py-2.5">Practice · 30 days</th>
                <th className="px-3 py-2.5">Last active</th>
                <th className="px-3 py-2.5">Booking</th>
                <th className="px-2 py-2.5">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map(student => {
                const isReady = student.readiness?.status === 'ready';
                const to = `${listPath}&student=${encodeURIComponent(student.id)}`;
                return (
                  <tr key={student.id} className="transition-colors hover:bg-muted/50">
                    <td className="px-3 py-2.5">
                      <Link to={to} className="block min-w-0">
                        <span className="block truncate text-foreground">{student.name}</span>
                        <span className="block truncate font-mono text-xs text-muted-foreground">{student.username}</span>
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                      {student.latestMock ? scoreOutOf(student.latestMock.exam, student.latestMock.score) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{student.usage.practiceAttempts}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{lastSeen(student.usage.lastActiveAt)}</td>
                    <td className={`whitespace-nowrap px-3 py-2.5 text-xs ${isReady ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                      {isReady ? 'Ready to book' : 'In progress'}
                    </td>
                    <td className="px-2 py-2.5">
                      <Link to={to} aria-label={`Open ${student.name}`} className="flex text-muted-foreground hover:text-foreground">
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Link to={listPath} className="text-right text-sm font-medium text-primary hover:underline">
        Open in the student list
      </Link>
    </DialogContent>
  );
}

function BatchDialog({ batch, exams, onSaved }: { batch: Batch | null; exams: ExamCode[]; onSaved: () => void }) {
  const [form, setForm] = useState<BatchForm>({
    name: batch?.name ?? '',
    exam: batch?.exam ?? exams[0] ?? 'IELTS',
    startsOn: batch?.startsOn ?? '',
    endsOn: batch?.endsOn ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof BatchForm>(key: K, value: BatchForm[K]) => setForm(current => ({ ...current, [key]: value }));
  // A batch on an exam the plan no longer has can keep it.
  const choices = batch && !exams.includes(batch.exam) ? [batch.exam, ...exams] : exams;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('Enter a batch name.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (batch) await updateBatch(batch.id, form);
      else await createBatch(form);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader className="text-left">
        <DialogTitle>{batch ? 'Edit batch' : 'New batch'}</DialogTitle>
        <DialogDescription>The dates are for your own planning; students can practise any time.</DialogDescription>
      </DialogHeader>
      <form onSubmit={save} className="space-y-3">
        <FormField label="Name" value={form.name} onChange={value => set('name', value)} maxLength={60} placeholder="IELTS morning" autoFocus />
        <div className="space-y-1.5">
          <label htmlFor="batch-exam" className="text-xs font-semibold text-foreground">
            Exam
          </label>
          <select
            id="batch-exam"
            value={form.exam}
            onChange={event => set('exam', event.target.value as ExamCode)}
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground"
          >
            {choices.map(exam => (
              <option key={exam} value={exam}>
                {examName(exam)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Starts (optional)" type="date" value={form.startsOn} onChange={value => set('startsOn', value)} />
          <FormField label="Ends (optional)" type="date" value={form.endsOn} onChange={value => set('endsOn', value)} />
        </div>
        <FormError message={error} />
        <Button type="submit" disabled={busy} className="h-10 w-full rounded-xl text-sm font-medium">
          {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          {batch ? 'Save batch' : 'Create batch'}
        </Button>
      </form>
    </DialogContent>
  );
}
