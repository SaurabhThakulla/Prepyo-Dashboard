import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { api, errorMessage } from '@/lib/api';
import type { InstitutionProfile } from '@/institution/api';
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
  status: 'free' | 'active' | 'expired';
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
  free: 'bg-muted text-muted-foreground border-border',
};

const date = (value: string | null) => (value ? new Date(value).toLocaleDateString() : '—');

/** Every consultancy with its students' usage; click one to see each student. */
export default function AdminConsultanciesPage() {
  const [days, setDays] = useState(30);
  const [list, setList] = useState<Consultancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

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
      <div className="border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold text-foreground">Consultancies</h1>
          <Badge variant="destructive">Admin</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Usage counts cover the chosen period; last active is all time. Click a consultancy to see its students.
        </p>
      </div>

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
                        <Badge variant="outline" className={`text-xs font-bold ${STATUS_STYLES[c.status]}`}>
                          {c.status}
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
                        <td colSpan={10} className="p-3 bg-muted/30">
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
