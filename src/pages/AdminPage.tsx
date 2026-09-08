import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  Zap,
  Activity,
  Sparkles,
  Bot,
  Users,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { AdminPageSkeleton } from '@/components/layout/PageSkeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { api, ApiError, errorMessage } from '@/lib/api';
import AdminUsersPanel from '@/components/admin/AdminUsersPanel';
import StatCard, { StatOption } from '@/components/admin/StatCard';
import { ROLE_LABELS, UserRole } from '@/lib/types';

interface AdminMetrics {
  questions: number;
  mocks: number;
  totalUsers: number;
  learners: number;
  activeLast7Days: number;
  practiceAttempts: number;
  mockAttempts: number;
  evaluations: number;
  evaluationsToday: number;
  promptTokens: number;
  completionTokens: number;
  medianLatencyMs: number;
}

/**
 * Metrics default to zero before the response is merged in.
 *
 * The frontend and the API deploy separately, so this page can run against a
 * backend that predates a field it reads — which is what `totalUsers` did:
 * calling .toLocaleString() on the missing value threw during render and blanked
 * the whole page. Merging over these defaults means an older backend costs a
 * wrong zero, not a white screen.
 */
const EMPTY_METRICS: AdminMetrics = {
  questions: 0,
  mocks: 0,
  totalUsers: 0,
  learners: 0,
  activeLast7Days: 0,
  practiceAttempts: 0,
  mockAttempts: 0,
  evaluations: 0,
  evaluationsToday: 0,
  promptTokens: 0,
  completionTokens: 0,
  medianLatencyMs: 0,
};

interface RoleCount {
  role: UserRole;
  plan: string;
  count: number;
}

interface ExamQuestionCount {
  exam: string;
  count: number;
}

/** Paid tiers. Suru is the free plan, so it is not a subscription. */
const PAID_ROLES: UserRole[] = ['abhyas', 'taiyari', 'udaan'];

const ALL = 'all';

/**
 * Japanese has no questions and no exam type behind it yet, so it is listed
 * unselectable rather than left out: the dashboard should show what is coming,
 * without implying it can be filtered to today.
 */
const EXAM_OPTIONS: StatOption[] = [
  { value: ALL, label: 'All exams' },
  { value: 'PTE', label: 'PTE' },
  { value: 'IELTS', label: 'IELTS' },
  { value: 'Japanese', label: 'Japanese (coming soon)', disabled: true },
];

interface ModelUsage {
  model: string;
  requests: number;
  promptTokens: number;
  completionTokens: number;
}

export default function AdminPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [usageByModel, setUsageByModel] = useState<ModelUsage[]>([]);
  const [usersByRole, setUsersByRole] = useState<RoleCount[]>([]);
  const [questionsByExam, setQuestionsByExam] = useState<ExamQuestionCount[]>([]);
  const [planFilter, setPlanFilter] = useState<string>(ALL);
  const [examFilter, setExamFilter] = useState<string>(ALL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api
      .get<{
        metrics: AdminMetrics;
        usageByModel: ModelUsage[];
        usersByRole?: RoleCount[];
        questionsByExam?: ExamQuestionCount[];
      }>('/admin/metrics')
      .then(data => {
        if (cancelled) return;
        setMetrics({ ...EMPTY_METRICS, ...data.metrics });
        setUsageByModel(data.usageByModel ?? []);
        setUsersByRole(data.usersByRole ?? []);
        setQuestionsByExam(data.questionsByExam ?? []);
        setError(null);
      })
      .catch(err => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 403) setForbidden(true);
        else setError(errorMessage(err));
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <AdminPageSkeleton />;
  }

  if (forbidden) {
    return (
      <Card className="p-12 text-center space-y-3 max-w-lg mx-auto">
        <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto" />
        <CardTitle className="text-base">Admin access only</CardTitle>
        <CardDescription>
          This area is limited to accounts with the admin role.
        </CardDescription>
        <Button asChild variant="outline" size="sm" className="font-bold text-xs">
          <Link to="/dashboard">Back to home</Link>
        </Button>
      </Card>
    );
  }

  if (error || !metrics) {
    return (
      <Card className="p-12 text-center space-y-3 max-w-lg mx-auto">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <CardTitle className="text-base">Could not load metrics</CardTitle>
        <CardDescription>{error}</CardDescription>
      </Card>
    );
  }

  // Every figure below is a slice of data already loaded, so the dropdowns
  // never refetch and cannot show a number from a stale response.
  const countFor = (role: UserRole) => usersByRole.find(entry => entry.role === role)?.count ?? 0;
  const paidTotal = PAID_ROLES.reduce((sum, role) => sum + countFor(role), 0);
  const totalUsers = Math.max(metrics.totalUsers, metrics.learners);

  const subscribedValue = planFilter === ALL ? paidTotal : countFor(planFilter as UserRole);
  const subscribedNote =
    planFilter === ALL
      ? `${PAID_ROLES.map(role => `${ROLE_LABELS[role]} ${countFor(role)}`).join(' · ')}`
      : planFilter === 'suru'
        ? 'Free tier — not a subscription'
        : `${totalUsers > 0 ? Math.round((subscribedValue / totalUsers) * 100) : 0}% of all users`;

  const planOptions: StatOption[] = [
    { value: ALL, label: 'All paid plans' },
    { value: 'suru', label: `${ROLE_LABELS.suru} (free)` },
    ...PAID_ROLES.map(role => ({ value: role, label: ROLE_LABELS[role] })),
  ];

  // An older API sends no breakdown; fall back to the flat published count so
  // the card still reads true rather than dropping to zero.
  const examTotal = questionsByExam.reduce((sum, entry) => sum + entry.count, 0);
  const questionsValue =
    examFilter === ALL
      ? examTotal || metrics.questions
      : (questionsByExam.find(entry => entry.exam === examFilter)?.count ?? 0);
  const questionsNote =
    examFilter === ALL
      ? `${metrics.mocks} mock exam${metrics.mocks === 1 ? '' : 's'}`
      : `${examFilter} only`;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-10">

      <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground">Admin Observability</h1>
            <Badge variant="destructive">Internal</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Live counts straight from the database. Everything here is measured, nothing is estimated.
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total users"
          value={totalUsers.toLocaleString()}
          note={`${metrics.activeLast7Days} active in last 7 days`}
          icon={Users}
        />
        <StatCard
          label="Subscribed users"
          value={subscribedValue.toLocaleString()}
          note={subscribedNote}
          icon={CreditCard}
          color="text-primary"
          options={planOptions}
          selected={planFilter}
          onSelect={setPlanFilter}
          selectLabel="Filter subscribed users by plan"
        />
        <StatCard
          label="Total questions"
          value={questionsValue.toLocaleString()}
          note={questionsNote}
          icon={Activity}
          color="text-indigo-400"
          options={EXAM_OPTIONS}
          selected={examFilter}
          onSelect={setExamFilter}
          selectLabel="Filter questions by exam"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="AI tokens used"
          value={(metrics.promptTokens + metrics.completionTokens).toLocaleString()}
          note={`${metrics.promptTokens.toLocaleString()} prompt / ${metrics.completionTokens.toLocaleString()} completion`}
          icon={Sparkles}
          color="text-amber-500"
        />
        <StatCard
          label="Median AI latency"
          value={`${metrics.medianLatencyMs} ms`}
          note={`${metrics.evaluations} evaluation${metrics.evaluations === 1 ? '' : 's'} recorded`}
          icon={Bot}
          color="text-indigo-400"
        />
      </div>

      <AdminUsersPanel />

      {/* Activity */}
      <Card className="p-6 space-y-4">
        <CardTitle className="text-base">Learner activity</CardTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Practice attempts', value: metrics.practiceAttempts },
            { label: 'Mock attempts', value: metrics.mockAttempts },
            { label: 'Evaluations (all time)', value: metrics.evaluations },
            { label: 'Evaluations today', value: metrics.evaluationsToday },
          ].map(item => (
            <div key={item.label} className="p-3.5 rounded-xl bg-background border border-border text-center space-y-1">
              <div className="font-display text-xl font-black text-foreground">{item.value.toLocaleString()}</div>
              <span className="text-[10px] text-muted-foreground font-semibold">{item.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Usage by model */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Usage by model</CardTitle>
        </div>
        {usageByModel.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No AI evaluations have run yet, so there is nothing to report.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {usageByModel.map(row => (
              <div key={row.model} className="flex items-center justify-between py-2.5 text-xs">
                <span className="font-mono font-bold text-foreground">{row.model}</span>
                <div className="flex gap-6 text-right">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Requests</span>
                    <span className="font-bold text-foreground">{row.requests}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Tokens</span>
                    <span className="font-bold text-primary">
                      {(row.promptTokens + row.completionTokens).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* The question bank is seeded through migrations; there is no write API. */}
      <Card className="p-6 space-y-2">
        <CardTitle className="text-base">Question bank</CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          Questions are managed through database migrations in{' '}
          <code className="font-mono">backend/migrations</code>, not through this page. The API exposes no
          endpoint for creating questions, so there is no authoring form here yet.
        </CardDescription>
      </Card>
    </div>
  );
}
