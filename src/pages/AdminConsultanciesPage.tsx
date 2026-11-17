import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, Building2, CalendarDays, Check, Cpu, Loader2, Mail, Phone, Plus, Sparkles, UserRound, Users, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import {
  CREDIT_GROUPS,
  creditSummary,
  CREDIT_TIERS,
  creditTier,
  creditsPrice,
  MIN_CREDITS,
  type CreditEntry,
  type CreditGroup,
  type Credits,
  type ExamCode,
  type InstitutionProfile,
} from '@/institution/api';
import { branchesLabel, EXAM_CHOICES, examName, STUDENT_RANGES, studentRangeLabel } from '@/institution/profile';

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
  // Credits left to give its students, per exam group.
  credits: Credits;
  // Students whose credit-paid access is running now.
  studentsWithAccess: number;
  // What the packs added this calendar month cost, in rupees.
  packSalesNpr: number;
  // The exams the plan includes: the consultancy can give its students only these.
  planExams: ExamCode[];
  createdAt: string;
  adminName: string;
  adminEmail: string;
  // Its exams, set when Prepyo creates it, and the details its admin can add in Settings.
  profile: InstitutionProfile;
  onboarded: boolean;
  students: number;
  activeStudents: number;
  usage: Usage;
  // AI gradings each calendar month: per student, and for all students together (null: no cap).
  aiGradingsPerStudent: number;
  aiGradingsTotal: number | null;
  // Used by all its students this calendar month.
  aiGradingsUsed: number;
  // What its students' AI calls cost this calendar month, in rupees, and the part of it
  // estimated from tokens (calls with no cost reported by the provider).
  aiCostNpr: number;
  aiCostEstimatedNpr: number;
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
  // Used this calendar month.
  aiGradingsUsed: number;
  // What the student's AI calls cost this calendar month, in rupees.
  aiCostNpr: number;
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
const gradings = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 1 });
const npr = (value: number) => `NPR ${value.toLocaleString(undefined, { maximumFractionDigits: value < 100 ? 2 : 0 })}`;

/** Whether part of an AI cost is estimated, said under it. */
const costHint = (estimated: number) =>
  estimated > 0 ? `this month · ${npr(estimated)} estimated` : 'this month';

/** What the consultancy answered in its setup, on one line. */
const profileLine = (c: Consultancy) =>
  [
    c.profile.exams.length > 0 ? c.profile.exams.map(examName).join(', ') : 'No exams chosen',
    c.profile.city,
    c.profile.city && branchesLabel(c.profile.branches),
    c.profile.monthlyStudents && `${studentRangeLabel(c.profile.monthlyStudents)}/month`,
  ]
    .filter(Boolean)
    .join(' · ');

function StatusBadge({ status }: { status: Consultancy['status'] }) {
  return (
    <Badge variant="outline" className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${STATUS_STYLES[status]}`}>
      {status === 'none' ? 'no plan' : status}
    </Badge>
  );
}

/** Every consultancy with its students' usage; click one to see each student. */
export default function AdminConsultanciesPage() {
  const [days, setDays] = useState(30);
  const [list, setList] = useState<Consultancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const toast = useToast();

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
  const open = list.find(c => c.id === openId) ?? null;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-5 pb-10">
      <div className="border-b border-border pb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground">Consultancies</h1>
            <Badge variant="destructive">Admin</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Usage counts cover the chosen period; last active is all time. Open a consultancy to manage it.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => (setCreating(true), setCreated(null))} className="font-bold text-xs gap-1">
          <Plus className="w-4 h-4" />
          Create consultancy
        </Button>
      </div>

      <CreateConsultancyDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={message => {
          setCreating(false);
          setCreated(message);
          toast.success('Consultancy created', 'The consultancy has been created successfully.');
          load();
        }}
      />

      {created && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
          {created}
        </div>
      )}

      {list.length > 0 && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
          <Stat label="Consultancies" value={String(list.length)} hint={`${list.filter(c => c.status === 'none').length} without credits yet`} />
          <Stat label="Active" value={String(list.filter(c => c.status === 'active').length)} hint={`${list.filter(c => c.status === 'expired').length} used up`} />
          <Stat
            label="Students"
            value={String(list.reduce((n, c) => n + c.students, 0))}
            hint={`${list.reduce((n, c) => n + c.activeStudents, 0)} active in ${period.toLowerCase()}`}
          />
          <Stat
            label="Packs this month"
            value={`NPR ${list.reduce((n, c) => n + (c.packSalesNpr ?? 0), 0).toLocaleString()}`}
            hint="credit packs added"
          />
          <Stat
            label="AI cost"
            value={npr(list.reduce((n, c) => n + c.aiCostNpr, 0))}
            hint={costHint(list.reduce((n, c) => n + c.aiCostEstimatedNpr, 0))}
          />
        </div>
      )}

      <div className="inline-flex flex-wrap gap-1 rounded-full border border-border bg-muted/50 p-1">
        {PERIODS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setDays(value)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
              days === value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
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
        <div className="space-y-3">
          {list.map(c => (
            <ConsultancyCard key={c.id} consultancy={c} onOpen={() => setOpenId(c.id)} />
          ))}
        </div>
      )}

      <ConsultancyDialog consultancy={open} days={days} period={period} onClose={() => setOpenId(null)} onSaved={load} />
    </div>
  );
}

/** One consultancy as a full-width row of the list; opens its dialog. */
function ConsultancyCard({ consultancy: c, onOpen }: { consultancy: Consultancy; onOpen: () => void }) {
  const withAccess = c.students > 0 ? Math.min(100, ((c.studentsWithAccess ?? 0) / c.students) * 100) : 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group grid w-full gap-3 rounded-xl border border-border/80 bg-card/60 px-4 py-3 text-left shadow-xs transition-all hover:border-primary/40 hover:bg-card hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,1.5fr)_minmax(0,1.1fr)] lg:items-center"
    >
      {/* Who */}
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-display text-sm font-bold text-primary transition-colors group-hover:bg-primary/15">
          {c.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate font-display text-sm font-bold leading-tight text-foreground group-hover:text-primary">
              {c.name}
            </h3>
            <StatusBadge status={c.status} />
          </div>
          <p className="truncate text-xs text-muted-foreground mt-0.5">
            {c.adminName || '—'}
          </p>
        </div>
      </div>

      {/* Seats */}
      <div className="space-y-1">
        <div className="flex items-baseline justify-between text-xs max-w-[7.5rem]">
          <span className="text-[11px] font-medium text-muted-foreground">Students</span>
          <span className="font-semibold text-foreground tabular-nums">
            {c.studentsWithAccess ?? 0} / {c.students}
          </span>
        </div>
        <div className="h-1 max-w-[7.5rem] overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${withAccess}%` }} />
        </div>
        <div className="text-[11px] text-muted-foreground">with access · {c.activeStudents} active</div>
      </div>

      {/* AI gradings */}
      <div className="space-y-0.5">
        <div className="flex items-baseline justify-between text-xs max-w-[7.5rem]">
          <span className="text-[11px] font-medium text-muted-foreground">AI gradings</span>
          <span className="font-semibold text-foreground tabular-nums">
            {gradings(c.aiGradingsUsed)}{c.aiGradingsTotal !== null && ` / ${c.aiGradingsTotal.toLocaleString()}`}
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground">
          {c.aiGradingsTotal === null ? 'this month · no cap' : 'this month'}
        </div>
        <div className="text-[11px] font-medium text-foreground">{npr(c.aiCostNpr)} AI cost</div>
      </div>

      {/* Usage */}
      <div className="grid grid-cols-4 rounded-lg bg-muted/40 py-1.5 px-1 text-center">
        <MiniStat label="Practice" value={c.usage.practiceAttempts} />
        <MiniStat label="Mocks" value={c.usage.mocksCompleted} />
        <MiniStat label="AI evals" value={c.usage.aiEvaluations} />
        <MiniStat label="Tutor" value={c.usage.tutorMessages} />
      </div>

      {/* Plan */}
      <div className="flex items-center justify-between gap-2 text-xs lg:block lg:text-right">
        <div>
          <div className="text-xs font-bold text-foreground">Credits left</div>
          <div className="text-[11px] text-muted-foreground">{creditSummary(c.credits)}</div>
        </div>
        <div className="text-[10px] text-muted-foreground lg:mt-0.5">Active {date(c.usage.lastActiveAt)}</div>
      </div>
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xs font-bold text-foreground tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

/** A titled block inside a dialog. */
function Section({
  icon: Icon,
  title,
  hint,
  action,
  children,
}: {
  icon: React.ElementType;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h3 className="font-display text-[15px] font-bold leading-tight text-foreground">{title}</h3>
            {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const TONES = {
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
} as const;

function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'blue',
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ElementType;
  tone?: keyof typeof TONES;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
        {Icon && (
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${TONES[tone]}`}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="mt-1.5 font-display text-xl font-bold text-foreground tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

/** A thin bar for how much of something is used. */
function UsageBar({ used, of, tone = 'bg-primary' }: { used: number; of: number; tone?: string }) {
  const share = of > 0 ? Math.min(100, (used / of) * 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full ${share >= 90 ? 'bg-rose-500' : tone}`} style={{ width: `${share}%` }} />
    </div>
  );
}

/** A label and value in the admin login block. */
function Detail({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="truncate text-sm font-semibold text-foreground">{value}</div>
      </div>
    </div>
  );
}

/** One consultancy: its numbers, admin, plan, AI gradings and students. */
function ConsultancyDialog({
  consultancy: c,
  days,
  period,
  onClose,
  onSaved,
}: {
  consultancy: Consultancy | null;
  days: number;
  period: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={c !== null} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-5xl gap-0 bg-slate-50 p-0 sm:p-0 dark:bg-background">
        {c && (
          <>
            <DialogHeader className="border-b border-border bg-card px-5 pb-5 pt-6 text-left sm:px-7">
              <div className="flex flex-wrap items-center gap-4 pr-10">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary font-display text-2xl font-bold text-primary-foreground shadow-md">
                  {c.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <DialogTitle className="text-xl sm:text-2xl">{c.name}</DialogTitle>
                    <StatusBadge status={c.status} />
                  </div>
                  <DialogDescription className="text-sm">
                    <span className="font-mono text-xs">/{c.code}</span> · {profileLine(c)}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-5 px-5 py-5 sm:px-7 sm:py-6">
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
                <Stat
                  icon={Users}
                  label="Students"
                  value={`${c.studentsWithAccess ?? 0} of ${c.students}`}
                  hint={`with access · ${c.activeStudents} active in ${period.toLowerCase()}`}
                />
                <Stat
                  icon={Sparkles}
                  tone="violet"
                  label="AI gradings"
                  value={gradings(c.aiGradingsUsed)}
                  hint={c.aiGradingsTotal === null ? 'this month · no cap' : `of ${c.aiGradingsTotal.toLocaleString()} this month`}
                />
                <Stat
                  icon={CalendarDays}
                  tone="emerald"
                  label="Credits left"
                  value={String((c.credits?.ieltsPte ?? 0) + (c.credits?.epsJlpt ?? 0))}
                  hint={creditSummary(c.credits)}
                />
                <Stat
                  icon={Wallet}
                  tone="amber"
                  label="Packs this month"
                  value={`NPR ${(c.packSalesNpr ?? 0).toLocaleString()}`}
                />
                <Stat icon={Cpu} tone="rose" label="AI cost" value={npr(c.aiCostNpr)} hint={costHint(c.aiCostEstimatedNpr)} />
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <Section icon={UserRound} title="Admin login" hint="Who signs in for the consultancy">
                  <div className="grid gap-2">
                    <Detail icon={UserRound} label="Name" value={c.adminName || '—'} />
                    <Detail icon={Mail} label="Email" value={c.adminEmail || '—'} />
                    <Detail icon={Phone} label="Phone" value={c.phone} />
                    <Detail icon={CalendarDays} label="Created" value={date(c.createdAt)} />
                  </div>
                </Section>
                <Section icon={BookOpen} title="Exams" hint="Students can be given only these exams">
                  <PlanForm consultancy={c} onSaved={onSaved} />
                </Section>
              </div>

              <Section icon={Wallet} title="Credits" hint="Add credits once they are paid. One credit gives one student 30 days">
                <CreditsForm consultancy={c} onSaved={onSaved} />
              </Section>

              <Section icon={Users} title="Students a month" hint="Roughly how many they prepare. Only Prepyo sets this; the consultancy sees it read-only">
                <MonthlyStudentsForm consultancy={c} onSaved={onSaved} />
              </Section>

              <Section icon={Sparkles} title="AI gradings" hint="Speaking and writing answers the AI marks; they renew on the 1st of each month">
                <GradingsForm consultancy={c} onSaved={onSaved} />
              </Section>

              <Section
                icon={Users}
                title="Students"
                hint={`${c.studentsWithAccess ?? 0} of ${c.students} with access · usage over ${period.toLowerCase()}`}
              >
                <StudentsList consultancyId={c.id} days={days} perStudent={c.aiGradingsPerStudent} />
              </Section>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const EMPTY_FORM = { institutionName: '', name: '', email: '', phone: '', password: '' };
const DEFAULT_GRADINGS = { perStudent: '1100', total: '' };
type TextField = readonly [keyof typeof EMPTY_FORM, string, string];
const CONSULTANCY_FIELDS: readonly TextField[] = [
  ['institutionName', 'Consultancy name', 'text'],
  ['phone', 'Phone', 'tel'],
];
const ADMIN_FIELDS: readonly TextField[] = [
  ['name', 'Admin name', 'text'],
  ['email', 'Admin email', 'email'],
  ['password', 'Password (10+ characters)', 'text'],
];

/** Adds a consultancy with its admin login and AI gradings; credits are added once it pays. */
function CreateConsultancyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (message: string) => void;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [exams, setExams] = useState<ExamCode[]>([]);
  const [aiGradings, setAIGradings] = useState(DEFAULT_GRADINGS);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  // Each time it opens it starts empty.
  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
      setExams([]);
      setAIGradings(DEFAULT_GRADINGS);
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (exams.length === 0) {
      toast.error('Consultancy not created', 'Choose at least one exam the consultancy teaches.');
      return;
    }
    if (form.password.length < 10) {
      toast.error('Consultancy not created', 'The admin password needs at least 10 characters.');
      return;
    }
    setSaving(true);
    try {
      const made = await api.post<{ name: string; code: string }>('/admin/consultancies', {
        ...form,
        exams,
        // What it teaches is also what its plan includes, until changed on the Plan card.
        planExams: exams,
        aiGradings: gradingsBody(aiGradings.perStudent, aiGradings.total),
      });
      onCreated(`${made.name} created at /${made.code}. The admin signs in with ${form.email.trim().toLowerCase()}.`);
    } catch {
      toast.error('Consultancy not created', 'Something went wrong. Please check the details and try again.');
    } finally {
      setSaving(false);
    }
  };

  const fields = (list: readonly TextField[]) =>
    list.map(([key, label, type]) => (
      <label key={key} className="space-y-1 text-[11px] font-bold text-muted-foreground">
        <span>{label}</span>
        <Input
          type={type}
          required
          value={form[key]}
          onChange={e => setForm({ ...form, [key]: e.target.value })}
        />
      </label>
    ));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-4">
        <DialogHeader className="text-left">
          <DialogTitle>New consultancy</DialogTitle>
          <DialogDescription>Creates the consultancy and the login its admin uses to add students.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Section icon={Building2} title="Consultancy">
            <div className="grid gap-3 sm:grid-cols-2">{fields(CONSULTANCY_FIELDS)}</div>
          </Section>
          <Section icon={BookOpen} title="Exams supported" hint="The plan includes these; students can be given only these exams">
            <ExamPicker value={exams} onChange={setExams} />
          </Section>
          <Section icon={UserRound} title="Admin login">
            <div className="grid gap-3 sm:grid-cols-2">{fields(ADMIN_FIELDS)}</div>
          </Section>
          <Section icon={Sparkles} title="AI gradings" hint="You can change these later">
            <div className="grid gap-3 sm:grid-cols-2">
              <GradingsFields
                perStudent={aiGradings.perStudent}
                total={aiGradings.total}
                onChange={(perStudent, total) => setAIGradings({ perStudent, total })}
              />
            </div>
          </Section>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => onOpenChange(false)} className="font-bold text-xs">
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="font-bold text-xs">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Create consultancy
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** The exams a consultancy teaches, as toggles; compact fits half the dialog. */
function ExamPicker({
  value,
  onChange,
  compact,
}: {
  value: ExamCode[];
  onChange: (exams: ExamCode[]) => void;
  compact?: boolean;
}) {
  return (
    <div className={`grid gap-2 ${compact ? 'grid-cols-2' : 'sm:grid-cols-3'}`}>
      {EXAM_CHOICES.map(exam => {
        const on = value.includes(exam.id);
        return (
          <button
            key={exam.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter(id => id !== exam.id) : [...value, exam.id])}
            className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors ${
              on ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/40'
            }`}
          >
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                on ? 'border-primary bg-primary text-primary-foreground' : 'border-input'
              }`}
            >
              {on && <Check className="h-3 w-3" />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-foreground">{exam.name}</span>
              <span className="block text-[11px] text-muted-foreground">{exam.detail}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** The AI gradings request body; an empty total means no cap. */
const gradingsBody = (perStudent: string, total: string) => ({
  perStudent: Number(perStudent),
  total: total.trim() === '' ? null : Number(total),
});

/** Per-student and overall monthly AI gradings, shared by the create form and the gradings form. */
function GradingsFields({
  perStudent,
  total,
  onChange,
}: {
  perStudent: string;
  total: string;
  onChange: (perStudent: string, total: string) => void;
}) {
  return (
    <>
      <label className="space-y-1 text-[11px] font-bold text-muted-foreground">
        <span>AI gradings per student / month</span>
        <Input type="number" min={0} required value={perStudent} onChange={e => onChange(e.target.value, total)} />
      </label>
      <label className="space-y-1 text-[11px] font-bold text-muted-foreground">
        <span>All students together / month (empty: no cap)</span>
        <Input type="number" min={0} value={total} placeholder="No cap" onChange={e => onChange(perStudent, e.target.value)} />
      </label>
    </>
  );
}

/** A form's save button; what happened is shown as a toast. */
function SaveRow({ saving, label }: { saving: boolean; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="submit" size="sm" disabled={saving} className="font-bold text-xs">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {label}
      </Button>
    </div>
  );
}

/** Changes the exams a consultancy's plan includes. */
function PlanForm({ consultancy, onSaved }: { consultancy: Consultancy; onSaved: () => void }) {
  const [planExams, setPlanExams] = useState<ExamCode[]>(consultancy.planExams ?? []);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (planExams.length === 0) {
      toast.error('Plan not saved', 'Choose at least one exam the plan includes.');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/admin/consultancies/${consultancy.id}/plan`, { planExams });
      toast.success('Plan saved', 'The plan has been updated successfully.');
      onSaved();
    } catch {
      toast.error('Plan not saved', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="space-y-1.5">
        <p className="text-[11px] font-bold text-muted-foreground">Exams in the plan</p>
        <ExamPicker value={planExams} onChange={setPlanExams} compact />
        <p className="text-[11px] text-muted-foreground">The consultancy can give its students only these exams.</p>
      </div>
      <SaveRow saving={saving} label="Save plan" />
    </form>
  );
}

/** Adds paid credits, priced by how many at once, and lists the credits added and used. */
function CreditsForm({ consultancy, onSaved }: { consultancy: Consultancy; onSaved: () => void }) {
  const [group, setGroup] = useState<CreditGroup>('ieltsPte');
  const [count, setCount] = useState(String(MIN_CREDITS));
  const [log, setLog] = useState<CreditEntry[] | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = useCallback(() => {
    api
      .get<{ credits: CreditEntry[] }>(`/admin/consultancies/${consultancy.id}?days=30`)
      .then(data => setLog(data.credits ?? []))
      .catch(() => setLog([]));
  }, [consultancy.id]);
  useEffect(load, [load]);

  const label = CREDIT_GROUPS.find(g => g.key === group)?.label ?? '';
  const size = Number(count);
  const tier = creditTier(size);
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tier) {
      toast.error('Credits not added', `Add at least ${MIN_CREDITS} credits.`);
      return;
    }
    if (!window.confirm(`Add ${size} ${label} credits for NPR ${creditsPrice(group, size).toLocaleString()}? Do this only once it is paid.`)) return;
    setSaving(true);
    try {
      await api.post(`/admin/consultancies/${consultancy.id}/credits`, { group: CREDIT_GROUPS.find(g => g.key === group)?.api, size });
      toast.success('Credits added', `${size} ${label} credits added.`);
      load();
      onSaved();
    } catch (err) {
      toast.error('Credits not added', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const SELECT = 'flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground';
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {CREDIT_GROUPS.map(g => (
          <Detail key={g.key} icon={Wallet} label={`${g.label} credits left`} value={String(consultancy.credits?.[g.key] ?? 0)} />
        ))}
      </div>
      <form onSubmit={add} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="space-y-1 text-[11px] font-bold text-muted-foreground">
          <span>Exams</span>
          <select value={group} onChange={e => setGroup(e.target.value as CreditGroup)} className={SELECT}>
            {CREDIT_GROUPS.map(g => (
              <option key={g.key} value={g.key}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-[11px] font-bold text-muted-foreground">
          <span>Credits</span>
          <Input type="number" min={MIN_CREDITS} max={10000} required value={count} onChange={e => setCount(e.target.value)} />
        </label>
        <Button type="submit" size="sm" disabled={saving} className="h-10 font-bold text-xs">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add credits
        </Button>
      </form>
      <p className="text-[11px] text-muted-foreground">
        {tier
          ? `NPR ${creditsPrice(group, size).toLocaleString()} · NPR ${tier.perCredit[group]} a credit (${CREDIT_TIERS.map(t => `${t.to ? `${t.from}-${t.to}` : `${t.from - 1}+`}: ${t.perCredit[group]}`).join(', ')})`
          : `At least ${MIN_CREDITS} credits.`}
      </p>
      {log && log.length > 0 && (
        <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-card text-xs">
          {log.map((entry, i) => (
            <li key={i} className="flex items-center justify-between gap-2 px-3 py-1.5">
              <span className="text-foreground">
                {entry.change > 0
                  ? `${entry.change} ${CREDIT_GROUPS.find(g => g.api === entry.group)?.label} credits added · NPR ${(entry.priceNpr ?? 0).toLocaleString()}`
                  : `${entry.studentName} · ${CREDIT_GROUPS.find(g => g.api === entry.group)?.label}`}
              </span>
              <span className="text-muted-foreground tabular-nums">
                {date(entry.at)} · {entry.change > 0 ? `+${entry.change}` : entry.change}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Sets roughly how many students a consultancy prepares a month: Prepyo's to set, not the consultancy's. */
function MonthlyStudentsForm({ consultancy, onSaved }: { consultancy: Consultancy; onSaved: () => void }) {
  const [value, setValue] = useState(consultancy.profile.monthlyStudents ?? '');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value) {
      toast.error('Students a month not saved', 'Choose a range.');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/admin/consultancies/${consultancy.id}/monthly-students`, { monthlyStudents: value });
      toast.success('Students a month saved', 'The change has been saved successfully.');
      onSaved();
    } catch {
      toast.error('Students a month not saved', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-3">
      <select
        aria-label="Students a month"
        value={value}
        onChange={event => setValue(event.target.value)}
        className="h-10 w-full max-w-xs rounded-xl border border-input bg-background px-3 text-sm text-foreground"
      >
        <option value="" disabled>
          Not set
        </option>
        {STUDENT_RANGES.map(range => (
          <option key={range.id} value={range.id}>
            {range.label} · {range.detail}
          </option>
        ))}
      </select>
      <SaveRow saving={saving} label="Save" />
    </form>
  );
}

/** Sets the AI gradings a consultancy's students get each calendar month. */
function GradingsForm({ consultancy, onSaved }: { consultancy: Consultancy; onSaved: () => void }) {
  const [perStudent, setPerStudent] = useState(String(consultancy.aiGradingsPerStudent));
  const [total, setTotal] = useState(consultancy.aiGradingsTotal === null ? '' : String(consultancy.aiGradingsTotal));
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/admin/consultancies/${consultancy.id}/ai-gradings`, gradingsBody(perStudent, total));
      toast.success('AI gradings saved', 'The AI gradings have been updated successfully.');
      onSaved();
    } catch {
      toast.error('AI gradings not saved', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const cap = consultancy.aiGradingsTotal;
  return (
    <form onSubmit={save} className="space-y-4">
      <div className="space-y-2 rounded-xl bg-muted/40 p-3">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-semibold text-foreground">Used this month</span>
          <span className="tabular-nums text-muted-foreground">
            <span className="font-display text-base font-bold text-foreground">{gradings(consultancy.aiGradingsUsed)}</span>
            {cap === null ? ' · no cap' : ` of ${cap.toLocaleString()}`}
          </span>
        </div>
        {cap !== null && <UsageBar used={consultancy.aiGradingsUsed} of={cap} tone="bg-violet-500" />}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <GradingsFields perStudent={perStudent} total={total} onChange={(p, t) => (setPerStudent(p), setTotal(t))} />
      </div>
      <SaveRow saving={saving} label="Save AI gradings" />
    </form>
  );
}

/** One consultancy's students, one row each, with their own usage. */
function StudentsList({ consultancyId, days, perStudent }: { consultancyId: string; days: number; perStudent: number }) {
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

  if (error) return <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>;
  if (!students) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (students.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
        No students added yet.
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {students.map(s => (
        <li
          key={s.userId}
          className="grid gap-3 rounded-xl border border-border bg-background/70 p-3.5 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.6fr)_auto] md:items-center"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {s.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="truncate text-sm font-bold text-foreground">{s.name}</span>
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-bold text-muted-foreground">
                  {s.targetExam.replace('_', '-')}
                </span>
                {s.disabled && (
                  <span className="rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                    Turned off
                  </span>
                )}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                <span className="font-mono">@{s.username}</span> · added {date(s.addedAt)}
                {s.planId !== 'free' && ` · own plan ${s.planId}${s.planValidUntil ? ` until ${date(s.planValidUntil)}` : ''}`}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-muted-foreground">AI gradings</span>
              <span className="font-semibold text-foreground tabular-nums">
                {gradings(s.aiGradingsUsed)} / {perStudent.toLocaleString()}
              </span>
            </div>
            <UsageBar used={s.aiGradingsUsed} of={perStudent} tone="bg-violet-500" />
            <div className="text-xs text-muted-foreground">
              AI cost <span className="font-semibold text-foreground tabular-nums">{npr(s.aiCostNpr)}</span>
            </div>
          </div>

          <div className="grid grid-cols-4 rounded-lg bg-muted/50 py-2 text-center">
            <MiniStat label="Practice" value={s.usage.practiceAttempts} />
            <MiniStat label="Mocks" value={s.usage.mocksCompleted} />
            <MiniStat label="AI evals" value={s.usage.aiEvaluations} />
            <MiniStat label="Tutor" value={s.usage.tutorMessages} />
          </div>

          <div className="text-xs text-muted-foreground md:text-right">
            <div>Last active</div>
            <div className="font-semibold text-foreground">{date(s.usage.lastActiveAt)}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
