import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BookOpen,
  Bot,
  Building2,
  ClipboardList,
  CreditCard,
  Gauge,
  Loader2,
  Megaphone,
  MessageSquareWarning,
  PlayCircle,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Timer,
  UserCheck,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { AdminPageSkeleton } from '@/components/layout/PageSkeleton';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import AdminUsersPanel from '@/components/admin/AdminUsersPanel';
import AdminAnnouncementCard from '@/components/admin/AdminAnnouncementCard';

const OnboardingFlow = lazy(() => import('@/components/onboarding/OnboardingFlow'));

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

interface ExamQuestionCount {
  exam: string;
  count: number;
}

interface ModelUsage {
  model: string;
  requests: number;
  promptTokens: number;
  completionTokens: number;
}

interface MetricsResponse {
  metrics: AdminMetrics;
  usageByModel: ModelUsage[];
  questionsByExam?: ExamQuestionCount[];
}

const TABS = ['overview', 'users', 'ai', 'announcements'] as const;
type TabId = (typeof TABS)[number];

/** One colour family per meaning, used the same way in every card. */
const TONES = {
  blue: {
    card: 'border-sky-500/25 bg-gradient-to-br from-sky-500/10 to-transparent',
    icon: 'bg-sky-500 text-white',
    text: 'text-sky-700 dark:text-sky-300',
    bar: 'bg-sky-500',
  },
  green: {
    card: 'border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-transparent',
    icon: 'bg-emerald-500 text-white',
    text: 'text-emerald-700 dark:text-emerald-300',
    bar: 'bg-emerald-500',
  },
  violet: {
    card: 'border-violet-500/25 bg-gradient-to-br from-violet-500/10 to-transparent',
    icon: 'bg-violet-500 text-white',
    text: 'text-violet-700 dark:text-violet-300',
    bar: 'bg-violet-500',
  },
  amber: {
    card: 'border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-transparent',
    icon: 'bg-amber-500 text-white',
    text: 'text-amber-700 dark:text-amber-300',
    bar: 'bg-amber-500',
  },
  rose: {
    card: 'border-rose-500/25 bg-gradient-to-br from-rose-500/10 to-transparent',
    icon: 'bg-rose-500 text-white',
    text: 'text-rose-700 dark:text-rose-300',
    bar: 'bg-rose-500',
  },
} as const;
type Tone = keyof typeof TONES;

const EXAMS: { id: string; label: string; tone: Tone }[] = [
  { id: 'PTE', label: 'PTE', tone: 'blue' },
  { id: 'IELTS', label: 'IELTS', tone: 'violet' },
  { id: 'EPS_TOPIK', label: 'EPS-TOPIK', tone: 'green' },
  { id: 'JLPT', label: 'JLPT', tone: 'rose' },
];

const QUICK_LINKS: { to: string; label: string; hint: string; icon: LucideIcon }[] = [
  { to: '/admin/payments', label: 'Plan Management', hint: 'Approve payments', icon: CreditCard },
  { to: '/admin/reports', label: 'Issue reports', hint: 'What learners reported', icon: MessageSquareWarning },
  { to: '/admin/consultancies', label: 'Consultancies', hint: 'Institutions & students', icon: Building2 },
];

/** Whole-number percentage, 0 when there is nothing to divide by. */
function percent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

/** 4264 → "4.3 s", 850 → "850 ms". */
function formatLatency(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)} s`;
  return `${ms} ms`;
}

/** 926419 → "926.4K". The exact figure goes in a tooltip. */
function compact(n: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

function plural(n: number, word: string): string {
  return `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;
}

export default function AdminPage() {
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [previewingOnboarding, setPreviewingOnboarding] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useApp();

  // The open tab lives in the URL, so a reload or a shared link lands on it.
  const tabParam = searchParams.get('tab');
  const tab: TabId = TABS.includes(tabParam as TabId) ? (tabParam as TabId) : 'overview';
  const setTab = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'overview') params.delete('tab');
    else params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  const load = useCallback(async (signal?: { cancelled: boolean }) => {
    try {
      const response = await api.get<MetricsResponse>('/admin/metrics');
      if (signal?.cancelled) return;
      setData({
        metrics: { ...EMPTY_METRICS, ...response.metrics },
        usageByModel: response.usageByModel ?? [],
        questionsByExam: response.questionsByExam ?? [],
      });
      setUpdatedAt(new Date());
      setError(null);
    } catch (err) {
      if (signal?.cancelled) return;
      if (err instanceof ApiError && err.status === 403) setForbidden(true);
      else setError(errorMessage(err));
    } finally {
      if (!signal?.cancelled) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const signal = { cancelled: false };
    void load(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [load]);

  const refresh = () => {
    setRefreshing(true);
    void load();
  };

  if (loading) {
    return <AdminPageSkeleton />;
  }

  if (forbidden) {
    return (
      <Card className="p-12 text-center space-y-3 max-w-lg mx-auto">
        <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto" />
        <CardTitle className="text-base">Admin access only</CardTitle>
        <CardDescription>This area is limited to accounts with the admin role.</CardDescription>
        <Button asChild variant="outline" size="sm" className="font-bold text-xs">
          <Link to="/dashboard">Back to home</Link>
        </Button>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-12 text-center space-y-3 max-w-lg mx-auto">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <CardTitle className="text-base">Could not load metrics</CardTitle>
        <CardDescription>{error}</CardDescription>
        <Button variant="outline" size="sm" className="font-bold text-xs" disabled={refreshing} onClick={refresh}>
          {refreshing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
          Try again
        </Button>
      </Card>
    );
  }

  const { metrics, usageByModel } = data;
  const firstName = user?.name?.split(' ')[0];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-10">
      {/* Banner: who you are, what this is, and the actions that apply to the whole page. */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-indigo-600 p-6 sm:p-7 text-primary-foreground shadow-lg">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-sky-400/20 blur-2xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide">
              <ShieldAlert className="h-3.5 w-3.5" /> Admin · Internal
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight">
              {firstName ? `Welcome back, ${firstName}` : 'Admin Observability'}
            </h1>
            <p className="text-sm text-white/80">
              Live numbers from the database
              {updatedAt && <> · updated {updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="font-bold bg-white text-primary hover:bg-white/90"
              disabled={refreshing}
              onClick={refresh}
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              className="font-bold bg-white/15 text-white hover:bg-white/25 border border-white/25"
              onClick={() => setPreviewingOnboarding(true)}
            >
              <PlayCircle className="h-4 w-4 mr-1.5" />
              Preview onboarding
            </Button>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-3 gap-2 sm:gap-3">
          {QUICK_LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className="group flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 rounded-xl bg-white/10 border border-white/15 px-2 py-3 sm:px-4 text-center sm:text-left transition-colors hover:bg-white/20"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20">
                <link.icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs sm:text-sm font-bold leading-tight">{link.label}</span>
                <span className="hidden sm:block text-xs text-white/70">{link.hint}</span>
              </span>
              <ArrowRight className="hidden sm:block h-4 w-4 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm font-medium text-amber-800 dark:text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Refresh failed, so these numbers may be out of date: {error}
        </div>
      )}

      {previewingOnboarding && user && (
        <Suspense fallback={null}>
          <OnboardingFlow user={user} preview onDone={() => setPreviewingOnboarding(false)} />
        </Suspense>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="justify-start bg-card shadow-sm p-1.5">
          {[
            { value: 'overview', label: 'Overview', icon: Gauge },
            { value: 'users', label: 'Users', icon: Users, count: metrics.totalUsers },
            { value: 'ai', label: 'AI usage', icon: Sparkles },
            { value: 'announcements', label: 'Announcements', icon: Megaphone },
          ].map(item => (
            <TabsTrigger key={item.value} value={item.value} className="gap-2 px-4 py-2 text-sm">
              <item.icon className="h-4 w-4" />
              {item.label}
              {item.count !== undefined && (
                <span className="rounded-full bg-foreground/10 px-1.5 text-[11px] font-bold tabular-nums">
                  {item.count.toLocaleString()}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <OverviewTab metrics={metrics} questionsByExam={data.questionsByExam ?? []} onOpen={setTab} />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <AdminUsersPanel />
        </TabsContent>

        <TabsContent value="ai" className="mt-6 space-y-6">
          <AiUsageTab metrics={metrics} usageByModel={usageByModel} />
        </TabsContent>

        <TabsContent value="announcements" className="mt-6">
          <AdminAnnouncementCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

function Kpi({
  icon: Icon,
  tone,
  label,
  value,
  note,
  progress,
  onClick,
  action,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  note: string;
  progress?: number;
  onClick?: () => void;
  action?: string;
}) {
  const t = TONES[tone];
  return (
    <Card className={`p-5 flex flex-col gap-3 border ${t.card}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-foreground">{label}</span>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${t.icon}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className={`font-display text-4xl font-black tabular-nums ${t.text}`}>{value}</div>
      {progress !== undefined && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/10">
          <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      )}
      <div className="mt-auto flex items-center justify-between gap-2">
        <span className="text-sm text-foreground/70">{note}</span>
        {onClick && action && (
          <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-1 text-sm font-bold whitespace-nowrap hover:underline ${t.text}`}
          >
            {action} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </Card>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  description,
  tone = 'blue',
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  tone?: Tone;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TONES[tone].icon}`}>
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <div>
        <CardTitle className="text-lg font-bold text-foreground">{title}</CardTitle>
        {description && <CardDescription className="text-sm text-foreground/60">{description}</CardDescription>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

function OverviewTab({
  metrics,
  questionsByExam,
  onOpen,
}: {
  metrics: AdminMetrics;
  questionsByExam: ExamQuestionCount[];
  onOpen: (tab: TabId) => void;
}) {
  // An older API sends no per-exam breakdown, so the total falls back to the
  // flat published count rather than showing zero.
  const questionsFor = (exam: string) => questionsByExam.find(entry => entry.exam === exam)?.count ?? 0;
  const examTotal = questionsByExam.reduce((sum, entry) => sum + entry.count, 0) || metrics.questions;
  const activeShare = percent(metrics.activeLast7Days, metrics.learners);

  const activity: { label: string; value: number; icon: LucideIcon; tone: Tone }[] = [
    { label: 'Practice attempts', value: metrics.practiceAttempts, icon: ClipboardList, tone: 'blue' },
    { label: 'Mock attempts', value: metrics.mockAttempts, icon: Activity, tone: 'violet' },
    { label: 'AI evaluations', value: metrics.evaluations, icon: Bot, tone: 'green' },
    { label: 'AI tokens used', value: metrics.promptTokens + metrics.completionTokens, icon: Zap, tone: 'amber' },
  ];

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi
          icon={Users}
          tone="blue"
          label="Learners"
          value={metrics.learners.toLocaleString()}
          note={`${plural(metrics.totalUsers, 'account')} in total`}
          onClick={() => onOpen('users')}
          action="Manage"
        />
        <Kpi
          icon={UserCheck}
          tone="green"
          label="Active this week"
          value={metrics.activeLast7Days.toLocaleString()}
          note={`${activeShare}% of learners in the last 7 days`}
          progress={activeShare}
        />
        <Kpi
          icon={Bot}
          tone="violet"
          label="AI evaluations today"
          value={metrics.evaluationsToday.toLocaleString()}
          note={`${metrics.evaluations.toLocaleString()} all time`}
          onClick={() => onOpen('ai')}
          action="Details"
        />
        <Kpi
          icon={Timer}
          tone="amber"
          label="Median AI latency"
          value={formatLatency(metrics.medianLatencyMs)}
          note="To score one answer"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="p-6 space-y-6 lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionTitle
              icon={BookOpen}
              title="Question bank"
              description={`Published questions across ${plural(metrics.mocks, 'mock')}`}
            />
            <div className="text-right">
              <div className="font-display text-3xl font-black text-foreground tabular-nums">
                {examTotal.toLocaleString()}
              </div>
              <div className="text-xs font-semibold uppercase tracking-wide text-foreground/60">questions</div>
            </div>
          </div>

          <div
            className="flex h-4 w-full gap-1 overflow-hidden rounded-full"
            role="img"
            aria-label="Share of questions by exam"
          >
            {EXAMS.map(exam => {
              const width = percent(questionsFor(exam.id), examTotal);
              return width > 0 ? (
                <div key={exam.id} className={`${TONES[exam.tone].bar} rounded-full`} style={{ width: `${width}%` }} />
              ) : null;
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {EXAMS.map(exam => {
              const count = questionsFor(exam.id);
              const t = TONES[exam.tone];
              return (
                <div key={exam.id} className={`rounded-xl border p-4 space-y-1 ${t.card}`}>
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <span className={`h-2.5 w-2.5 rounded-full ${t.bar}`} />
                    {exam.label}
                  </div>
                  <div className={`font-display text-3xl font-black tabular-nums ${t.text}`}>
                    {count.toLocaleString()}
                  </div>
                  <div className="text-sm text-foreground/70">{percent(count, examTotal)}% of the bank</div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6 space-y-5 lg:col-span-2">
          <SectionTitle icon={Activity} title="Learner activity" description="All-time totals" tone="green" />
          <ul className="space-y-2.5">
            {activity.map(item => {
              const t = TONES[item.tone];
              return (
                <li key={item.label} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${t.card}`}>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${t.icon}`}>
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-sm font-semibold text-foreground">{item.label}</span>
                  <span className={`font-display text-xl font-black tabular-nums ${t.text}`}>
                    {item.value.toLocaleString()}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* AI usage                                                            */
/* ------------------------------------------------------------------ */

const MODELS_SHOWN = 6;

const PROVIDER_STYLES: Record<string, string> = {
  google: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
  openai: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  anthropic: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
};
const LOCAL_STAGE_STYLE = 'bg-muted text-foreground/80 border-border';

/**
 * A model id names a pipeline: "openai/whisper-large-v3-turbo+verbatim-alignment+google/gemini-2.5-flash"
 * is transcription, alignment, then scoring. Each stage reads better on its
 * own, coloured by provider.
 */
function ModelName({ model }: { model: string }) {
  const stages = model.split('+');
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {stages.map((stage, index) => {
        const slash = stage.indexOf('/');
        const provider = slash > 0 ? stage.slice(0, slash) : '';
        const name = slash > 0 ? stage.slice(slash + 1) : stage;
        const style = PROVIDER_STYLES[provider] ?? LOCAL_STAGE_STYLE;
        return (
          <React.Fragment key={`${stage}-${index}`}>
            {index > 0 && <ArrowRight className="h-3 w-3 text-foreground/40" aria-label="then" />}
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-xs font-semibold ${style}`}
              title={stage}
            >
              {provider && <span className="opacity-70">{provider}</span>}
              {provider && <span className="opacity-40">/</span>}
              {name}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function AiUsageTab({ metrics, usageByModel }: { metrics: AdminMetrics; usageByModel: ModelUsage[] }) {
  const [showAll, setShowAll] = useState(false);

  const totalTokens = metrics.promptTokens + metrics.completionTokens;
  const totalRequests = usageByModel.reduce((sum, row) => sum + row.requests, 0);
  const promptShare = percent(metrics.promptTokens, totalTokens);

  const rows = [...usageByModel].sort(
    (a, b) => b.promptTokens + b.completionTokens - (a.promptTokens + a.completionTokens) || b.requests - a.requests,
  );
  const visible = showAll ? rows : rows.slice(0, MODELS_SHOWN);
  const largest = rows.length > 0 ? rows[0].promptTokens + rows[0].completionTokens : 0;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={`p-5 space-y-3 border ${TONES.amber.card}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">Tokens used</span>
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONES.amber.icon}`}>
              <Zap className="h-5 w-5" />
            </span>
          </div>
          <div
            className={`font-display text-4xl font-black tabular-nums ${TONES.amber.text}`}
            title={totalTokens.toLocaleString()}
          >
            {compact(totalTokens)}
          </div>
          <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full">
            <div className="bg-amber-500 rounded-full" style={{ width: `${promptShare}%` }} />
            <div className="bg-violet-500 rounded-full" style={{ width: `${100 - promptShare}%` }} />
          </div>
          <div className="flex flex-wrap justify-between gap-2 text-sm text-foreground/75">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              Prompt <b className="text-foreground">{compact(metrics.promptTokens)}</b>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
              Completion <b className="text-foreground">{compact(metrics.completionTokens)}</b>
            </span>
          </div>
        </Card>
        <Kpi
          icon={Bot}
          tone="violet"
          label="Evaluations"
          value={metrics.evaluations.toLocaleString()}
          note={`${metrics.evaluationsToday.toLocaleString()} today · ${plural(rows.length, 'model setup')}`}
        />
        <Kpi
          icon={Timer}
          tone="blue"
          label="Median latency"
          value={formatLatency(metrics.medianLatencyMs)}
          note="From answer submitted to score returned"
        />
      </div>

      <Card className="p-6 space-y-5">
        <SectionTitle
          icon={Sparkles}
          title="Usage by model"
          description="Sorted by tokens. Arrows show the stages of one scoring pipeline."
          tone="violet"
        />

        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {[
            ['google', 'Google'],
            ['openai', 'OpenAI'],
            ['anthropic', 'Anthropic'],
          ].map(([id, label]) => (
            <span key={id} className={`rounded-full border px-2.5 py-0.5 ${PROVIDER_STYLES[id]}`}>
              {label}
            </span>
          ))}
          <span className={`rounded-full border px-2.5 py-0.5 ${LOCAL_STAGE_STYLE}`}>Built-in step</span>
        </div>

        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-foreground/60">
            No AI evaluations have run yet, so there is nothing to report.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="hidden md:grid grid-cols-[minmax(0,1fr)_8rem_8rem_11rem] gap-4 bg-muted/60 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-foreground/70">
              <span>Model</span>
              <span className="text-right">Requests</span>
              <span className="text-right">Tokens</span>
              <span>Share of tokens</span>
            </div>
            <ul className="divide-y divide-border">
              {visible.map((row, index) => {
                const tokens = row.promptTokens + row.completionTokens;
                return (
                  <li
                    key={row.model}
                    className="grid grid-cols-2 md:grid-cols-[minmax(0,1fr)_8rem_8rem_11rem] items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-muted/40"
                  >
                    <div className="col-span-2 md:col-span-1 flex min-w-0 items-center gap-3">
                      <span className="w-5 shrink-0 text-sm font-bold text-foreground/40 tabular-nums">{index + 1}</span>
                      <ModelName model={row.model} />
                    </div>
                    <div className="text-sm md:text-right">
                      <span className="md:hidden text-foreground/60">Requests </span>
                      <span className="font-bold text-foreground tabular-nums">{row.requests.toLocaleString()}</span>
                      <span className="text-foreground/50 text-xs"> · {percent(row.requests, totalRequests)}%</span>
                    </div>
                    <div
                      className="text-sm text-right"
                      title={`${row.promptTokens.toLocaleString()} prompt / ${row.completionTokens.toLocaleString()} completion`}
                    >
                      <span className="md:hidden text-foreground/60">Tokens </span>
                      <span className="font-bold text-foreground tabular-nums">{tokens.toLocaleString()}</span>
                    </div>
                    <div className="col-span-2 md:col-span-1 flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-foreground/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-sky-500"
                          style={{ width: `${largest > 0 ? (tokens / largest) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-sm font-bold text-foreground tabular-nums">
                        {percent(tokens, totalTokens)}%
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {rows.length > MODELS_SHOWN && (
          <div className="flex justify-center">
            <Button variant="outline" size="sm" className="font-bold" onClick={() => setShowAll(v => !v)}>
              {showAll ? 'Show fewer' : `Show all ${rows.length} models`}
            </Button>
          </div>
        )}
      </Card>
    </>
  );
}
