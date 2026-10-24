import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Clock, LucideIcon, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { formatExamDate } from '@/lib/dates';
import { errorMessage } from '@/lib/api';
import { fetchStudents, InstitutionAccount, InstitutionStatus, PLANS, Student, STUDENT_ALLOWANCE } from './api';
import { sectionPath } from './paths';
import BrandMark from './BrandMark';
import { branchesLabel, examName, studentRangeLabel } from './profile';

const STATUS: Record<InstitutionStatus, { label: string; color: string; icon: LucideIcon; title: string; text: string }> = {
  none: {
    label: 'No plan',
    color: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/25',
    icon: Clock,
    title: 'Your plan is not set up yet',
    text: 'Contact Prepyo to choose Basic (10 students), Extended (25) or Ultimate (50). You can add students once it is active.',
  },
  active: {
    label: 'Active',
    color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
    icon: Check,
    title: 'Your plan is active',
    text: `Each student gets ${STUDENT_ALLOWANCE}.`,
  },
  expired: {
    label: 'Expired',
    color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
    icon: ShieldAlert,
    title: 'Your plan has ended',
    text: 'Your students can still practise reading and listening. AI scoring, the AI tutor and full mocks are off until you renew. Contact Prepyo to renew.',
  },
};

/** The dashboard's first page: the institution, its plan, and its students at a glance. */
export default function OverviewSection({ account }: { account: InstitutionAccount }) {
  const { institution } = account;
  const { profile } = institution;
  const status = STATUS[institution.status] ?? STATUS.none;
  const StatusIcon = status.icon;
  const plan = institution.plan ? PLANS[institution.plan] : null;

  const [students, setStudents] = useState<Student[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetchStudents(30)
      .then(data => setStudents(data.students))
      .catch(err => setError(errorMessage(err)));
  }, []);

  const list = students ?? [];
  const active = list.filter(s => s.usage.practiceAttempts + s.usage.mocksCompleted + s.usage.aiEvaluations + s.usage.tutorMessages > 0).length;
  const sum = (key: 'practiceAttempts' | 'mocksCompleted' | 'aiEvaluations') => list.reduce((n, s) => n + s.usage[key], 0);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="h-1.5" style={{ backgroundColor: profile.brandColor || undefined }} />
        <div className="flex flex-wrap items-center gap-4 p-5">
          <BrandMark name={institution.name} logoUrl={institution.logoUrl} color={profile.brandColor} className="h-14 w-14 rounded-2xl text-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-sm font-semibold text-foreground">
              {profile.city} · {branchesLabel(profile.branches)} · {studentRangeLabel(profile.monthlyStudents)} students a month
            </p>
            <div className="flex flex-wrap gap-1.5">
              {profile.exams.map(exam => (
                <Badge key={exam} variant="secondary" className="rounded-full">{examName(exam)}</Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="flex gap-3 p-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
          <StatusIcon className="h-4 w-4 text-foreground" />
        </div>
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap gap-1.5">
            {plan && <Badge variant="secondary">{plan.name} · {plan.seats} students</Badge>}
            <Badge variant="outline" className={status.color}>{status.label}</Badge>
          </div>
          <CardTitle className="text-base">{status.title}</CardTitle>
          <CardDescription>{status.text}</CardDescription>
          {institution.validUntil && (
            <p className="text-xs text-muted-foreground">
              {institution.status === 'expired' ? 'Ended on' : 'Runs until'}{' '}
              <span className="font-semibold text-foreground">{formatExamDate(institution.validUntil)}</span>
            </p>
          )}
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Students · last 30 days</CardTitle>
            <CardDescription>{error ?? `${list.length} of ${institution.seatLimit} seats used`}</CardDescription>
          </div>
          <Link
            to={sectionPath(institution.code, 'students')}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted"
          >
            Manage students <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Active students" value={students ? `${active} / ${list.length}` : '…'} />
          <Stat label="Practice answers" value={students ? sum('practiceAttempts') : '…'} />
          <Stat label="Full mocks" value={students ? sum('mocksCompleted') : '…'} />
          <Stat label="AI evaluations" value={students ? sum('aiEvaluations') : '…'} />
        </div>
      </Card>
    </div>
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
