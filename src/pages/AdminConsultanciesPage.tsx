import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Loader2, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api, errorMessage } from '@/lib/api';
import { PLANS, type InstitutionPlan, type InstitutionProfile } from '@/institution/api';
import { branchesLabel, examName, studentRangeLabel } from '@/institution/profile';

interface Usage {
  practiceAttempts: number;
  mocksCompleted: number;
  aiEvaluations: number;
  tutorMessages: number;
  lastActiveAt: string | null;
}

export interface Consultancy {
  id: string;
  name: string;
  code: string;
  phone: string;
  status: 'none' | 'active' | 'expired';
  plan: InstitutionPlan | '';
  validUntil: string | null;
  seatLimit: number;
  createdAt: string;
  adminName: string;
  adminEmail: string;
  // What it answered in its setup; empty until onboarded.
  profile: InstitutionProfile;
  onboarded: boolean;
  students: number;
  activeStudents: number;
  usage: Usage;
}

export interface ConsultancyStudent {
  userId: string;
  name: string;
  username: string;
  targetExam: string;
  planId: string;
  planValidUntil: string | null;
  addedAt: string;
  disabled: boolean;
  usage: Usage;
}

const PERIODS = [
  [7, '7 days'],
  [30, '30 days'],
  [90, '90 days'],
  [0, 'All time'],
] as const;

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
  expired: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25',
  none: 'bg-muted text-muted-foreground border-border',
};

const date = (value: string | null) => (value ? new Date(value).toLocaleDateString() : '—');

/** Every consultancy with its students' usage; click one to see each student. */
export default function AdminConsultanciesPage() {
  const [days, setDays] = useState(30);
  const [list, setList] = useState<Consultancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ consultancies: Consultancy[] }>(`/admin/consultancies?days=${days}`);
      setList(data.consultancies ?? []);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const period = PERIODS.find(([value]) => value === days)?.[1] ?? '';

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-5 pb-10">
      <div className="border-b border-border pb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground">Consultancies</h1>
            <Badge variant="destructive">Admin</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Usage counts cover the chosen period; last active is all time. Click a consultancy to see its students.
          </p>
        </div>
        {!creating && (
          <Button type="button" size="sm" onClick={() => (setCreating(true), setCreated(null))} className="font-bold text-xs gap-1">
            <Plus className="w-4 h-4" />
            Create consultancy
          </Button>
        )}
      </div>

      {creating && (
        <CreateConsultancyForm
          onCancel={() => setCreating(false)}
          onCreated={message => {
            setCreating(false);
            setCreated(message);
            load();
          }}
        />
      )}

      {created && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
          {created}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {PERIODS.map(([value, label]) => (
          <Button
            key={value}
            type="button"
            variant={days === value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDays(value)}
            className="font-bold text-xs"
          >
            {label}
          </Button>
        ))}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-[11px] font-medium text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      {loading && list.length === 0 && (
        <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading consultancies…</span>
        </div>
      )}

      {!loading && list.length === 0 && !error && (
        <Card className="p-10 text-center space-y-2">
          <Building2 className="w-8 h-8 text-muted-foreground mx-auto" />
          <CardTitle className="text-sm">No consultancies yet</CardTitle>
          <CardDescription className="text-xs">They appear here once they sign up.</CardDescription>
        </Card>
      )}

      {list.length > 0 && (
        <Card className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[920px]">
              <thead>
                <tr className="text-left text-xs uppercase text-muted-foreground font-bold border-b border-border">
                  <th className="py-2 pr-3">Consultancy</th>
                  <th className="py-2 pr-3">Admin</th>
                  <th className="py-2 pr-3">Created</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3 text-right">Students</th>
                  <UsageHeaders />
                </tr>
              </thead>
              <tbody>
                {list.map(c => (
                  <React.Fragment key={c.id}>
                    <tr
                      onClick={() => setOpenId(openId === c.id ? null : c.id)}
                      className={`border-b border-border/60 cursor-pointer hover:bg-muted/50 ${openId === c.id ? 'bg-muted/50' : ''}`}
                    >
                      <td className="py-2.5 pr-3">
                        <div className="font-bold text-foreground">{c.name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">/{c.code}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {c.onboarded
                            ? `${c.profile.exams.map(examName).join(', ')} · ${c.profile.city} · ${branchesLabel(c.profile.branches)} · ${studentRangeLabel(c.profile.monthlyStudents)}/month`
                            : 'Setup not finished'}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="text-foreground">{c.adminName || '—'}</div>
                        <div className="text-[11px] text-muted-foreground">{c.adminEmail}</div>
                        <div className="text-[11px] text-muted-foreground">{c.phone}</div>
                      </td>
                      <td className="py-2.5 pr-3">{date(c.createdAt)}</td>
                      <td className="py-2.5 pr-3">
                        {c.plan && <div className="font-bold text-foreground">{PLANS[c.plan].name}</div>}
                        <Badge variant="outline" className={`text-xs font-bold ${STATUS_STYLES[c.status]}`}>
                          {c.status === 'none' ? 'no plan' : c.status}
                        </Badge>
                        {c.validUntil && <div className="text-[11px] text-muted-foreground">until {date(c.validUntil)}</div>}
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        <div className="font-bold text-foreground">
                          {c.students} / {c.seatLimit}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{c.activeStudents} active</div>
                      </td>
                      <UsageCells usage={c.usage} />
                    </tr>
                    {openId === c.id && (
                      <tr className="border-b border-border/60">
                        <td colSpan={10} className="p-3 bg-muted/30 space-y-3">
                          <PlanForm consultancy={c} onSaved={load} />
                          <StudentsTable consultancyId={c.id} days={days} period={period} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// A month from today, the usual end date for a new plan.
const nextMonth = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
};

const EMPTY_FORM = { institutionName: '', name: '', email: '', phone: '', password: '', plan: 'basic', validUntil: nextMonth() };
const FIELDS = [
  ['institutionName', 'Consultancy name', 'text'],
  ['name', 'Admin name', 'text'],
  ['email', 'Admin email', 'email'],
  ['phone', 'Phone', 'tel'],
  ['password', 'Password (10+ characters)', 'text'],
] as const;

/** Adds a consultancy with its admin login, on the plan and end date chosen. */
function CreateConsultancyForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (message: string) => void }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const made = await api.post<{ name: string; code: string }>('/admin/consultancies', form);
      onCreated(`${made.name} created at /${made.code}. The admin signs in with ${form.email.trim().toLowerCase()}.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4">
      <form onSubmit={submit} className="space-y-3">
        <CardTitle className="text-sm">New consultancy</CardTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FIELDS.map(([key, label, type]) => (
            <label key={key} className="space-y-1 text-[11px] font-bold text-muted-foreground">
              <span>{label}</span>
              <Input
                type={type}
                required
                value={form[key]}
                onChange={e => setForm({ ...form, [key]: e.target.value })}
                minLength={key === 'password' ? 10 : undefined}
              />
            </label>
          ))}
          <PlanFields
            plan={form.plan}
            validUntil={form.validUntil}
            onChange={(plan, validUntil) => setForm({ ...form, plan, validUntil })}
          />
        </div>
        {error && <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={saving} className="font-bold text-xs">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Create
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onCancel} className="font-bold text-xs">
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** Plan select and end date, shared by the create form and the change-plan form. */
function PlanFields({ plan, validUntil, onChange }: { plan: string; validUntil: string; onChange: (plan: string, validUntil: string) => void }) {
  return (
    <>
      <label className="space-y-1 text-[11px] font-bold text-muted-foreground">
        <span>Plan</span>
        <select
          required
          value={plan}
          onChange={e => onChange(e.target.value, validUntil)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
        >
          {Object.entries(PLANS).map(([id, p]) => (
            <option key={id} value={id}>
              {p.name} · {p.seats} students
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-[11px] font-bold text-muted-foreground">
        <span>Plan ends on</span>
        <Input type="date" required value={validUntil} onChange={e => onChange(plan, e.target.value)} />
      </label>
    </>
  );
}

/** Changes a consultancy's plan or end date, to renew or upgrade it. */
function PlanForm({ consultancy, onSaved }: { consultancy: Consultancy; onSaved: () => void }) {
  const [plan, setPlan] = useState<string>(consultancy.plan || 'basic');
  const [validUntil, setValidUntil] = useState(consultancy.validUntil?.slice(0, 10) || nextMonth());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/admin/consultancies/${consultancy.id}/plan`, { plan, validUntil });
      setMessage('Plan saved.');
      onSaved();
    } catch (err) {
      setMessage(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="flex flex-wrap items-end gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <PlanFields plan={plan} validUntil={validUntil} onChange={(p, v) => (setPlan(p), setValidUntil(v))} />
      </div>
      <Button type="submit" size="sm" disabled={saving} className="font-bold text-xs">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        Save plan
      </Button>
      {message && <p className="text-[11px] font-medium text-muted-foreground">{message}</p>}
    </form>
  );
}

/** One consultancy's students with their own usage. */
function StudentsTable({ consultancyId, days, period }: { consultancyId: string; days: number; period: string }) {
  const [students, setStudents] = useState<ConsultancyStudent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    api
      .get<{ students: ConsultancyStudent[] }>(`/admin/consultancies/${consultancyId}?days=${days}`)
      .then(data => current && (setStudents(data.students ?? []), setError(null)))
      .catch(err => current && setError(errorMessage(err)));
    return () => {
      current = false;
    };
  }, [consultancyId, days]);

  if (error) return <p className="text-[11px] text-rose-600 dark:text-rose-400">{error}</p>;
  if (!students) return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
  if (students.length === 0) return <p className="text-[11px] text-muted-foreground">No students added yet.</p>;

  return (
    <table className="w-full text-xs">
      <caption className="text-left text-[11px] font-bold text-foreground pb-2">
        {students.length} students · usage over {period.toLowerCase()}
      </caption>
      <thead>
        <tr className="text-left text-xs uppercase text-muted-foreground font-bold border-b border-border">
          <th className="py-1.5 pr-3">Student</th>
          <th className="py-1.5 pr-3">Exam</th>
          <th className="py-1.5 pr-3">Own plan</th>
          <th className="py-1.5 pr-3">Added</th>
          <UsageHeaders />
        </tr>
      </thead>
      <tbody>
        {students.map(s => (
          <tr key={s.userId} className="border-b border-border/60 last:border-0">
            <td className="py-2 pr-3">
              <div className="font-bold text-foreground">{s.name}</div>
              <div className="text-[11px] text-muted-foreground font-mono">{s.username}</div>
              {s.disabled && <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400">Turned off</div>}
            </td>
            <td className="py-2 pr-3">{s.targetExam.replace('_', '-')}</td>
            <td className="py-2 pr-3">
              {s.planId}
              {s.planValidUntil && <div className="text-[11px] text-muted-foreground">until {date(s.planValidUntil)}</div>}
            </td>
            <td className="py-2 pr-3">{date(s.addedAt)}</td>
            <UsageCells usage={s.usage} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function UsageHeaders() {
  return (
    <>
      <th className="py-2 pr-3 text-right">Practice</th>
      <th className="py-2 pr-3 text-right">Mocks</th>
      <th className="py-2 pr-3 text-right">AI evals</th>
      <th className="py-2 pr-3 text-right">Tutor</th>
      <th className="py-2">Last active</th>
    </>
  );
}

function UsageCells({ usage }: { usage: Usage }) {
  return (
    <>
      <td className="py-2 pr-3 text-right tabular-nums">{usage.practiceAttempts}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{usage.mocksCompleted}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{usage.aiEvaluations}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{usage.tutorMessages}</td>
      <td className="py-2">{date(usage.lastActiveAt)}</td>
    </>
  );
}
