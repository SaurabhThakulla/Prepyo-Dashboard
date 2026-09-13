import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  Search,
  Tag,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  BarChart3,
  Lock,
  Crown,
  BookOpen,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { MistakesPageSkeleton } from '@/components/layout/PageSkeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { errorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { useMistakes, useMistakeAnalytics } from '@/lib/hooks/useResources';
import { SkillType } from '@/lib/types';

function renderResponseBadges(text: string, isWrong: boolean) {
  if (!text) return <span className="text-muted-foreground italic text-xs">No response</span>;

  if (/b\d+:/.test(text)) {
    const parts = text.split(/,\s*/);
    return (
      <div className="flex flex-wrap gap-1.5">
        {parts.map((part, i) => {
          const colonIdx = part.indexOf(':');
          const key = colonIdx > -1 ? part.slice(0, colonIdx) : `Gap ${i + 1}`;
          const val = colonIdx > -1 ? part.slice(colonIdx + 1).trim() : part.trim();
          return (
            <span
              key={i}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium border ${
                isWrong
                  ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-900/50 text-rose-700 dark:text-rose-300'
                  : 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              <span className="font-bold opacity-70">{key}:</span>
              <span>{val || '—'}</span>
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <p
      className={`text-xs sm:text-sm font-medium leading-relaxed ${
        isWrong ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'
      }`}
    >
      {text}
    </p>
  );
}

const chartConfig = {
  unresolved: {
    label: 'Unresolved',
    color: 'hsl(350 89% 60%)',
  },
  resolved: {
    label: 'Resolved',
    color: 'hsl(142 71% 45%)',
  },
} satisfies ChartConfig;

export default function MistakesPage() {
  const { activeExam } = useApp();
  const navigate = useNavigate();
  const toast = useToast();
  const [selectedSkill, setSelectedSkill] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'lifetime'>('weekly');

  // Both queries receive the active period so all components reflect it!
  const { data, isPending, error } = useMistakes(activeExam, selectedSkill, false, period);
  const { data: analyticsData, error: analyticsError } = useMistakeAnalytics(
    activeExam,
    period
  );

  const mistakes = data?.mistakes ?? [];
  const analytics = analyticsData?.analytics;
  const loading = isPending;

  // Check if forbidden (freemium user)
  const isForbidden =
    (error && 'status' in error && (error as { status: number }).status === 403) ||
    (analyticsError && 'status' in analyticsError && (analyticsError as { status: number }).status === 403);

  useEffect(() => {
    if (error && !isForbidden) {
      toast.error('Could not load your mistake bank', errorMessage(error));
    }
  }, [error, isForbidden]);

  const skillFilters = ['all', 'reading', 'listening', 'writing', 'speaking'];

  const filteredMistakes = mistakes.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.questionTitle?.toLowerCase().includes(q) ||
      item.prompt?.toLowerCase().includes(q) ||
      item.explanation?.toLowerCase().includes(q) ||
      item.errorTag?.toLowerCase().includes(q) ||
      item.typeName?.toLowerCase().includes(q)
    );
  });

  // Prepare chart dataset for shadcn graph
  const timelineData = (analytics?.timeline ?? []).map(point => ({
    label: point.label,
    date: point.date,
    total: point.count,
    resolved: point.resolved,
    unresolved: Math.max(0, point.count - point.resolved),
  }));

  const periodLabel =
    period === 'weekly' ? 'Past 7 Days' : period === 'monthly' ? 'Past 30 Days' : 'All-Time Lifetime';

  // If user is freemium and blocked by middleware:
  if (isForbidden) {
    return (
      <div className="w-full pb-16 space-y-8 max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        <div className="w-full bg-card border border-border/80 rounded-3xl p-8 sm:p-12 shadow-sm text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent pointer-events-none" />
          
          <div className="max-w-xl mx-auto space-y-6 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center shadow-xs">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-xs font-bold uppercase tracking-wider">
                <Crown className="w-3.5 h-3.5" />
                <span>Premium Feature</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                Unlock Mistake Bank &amp; Recovery Graphs
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Mistake Bank tracks every question you miss in practice sessions and mock exams, giving you deep examiner explanations, repeat-error diagnostics, and recovery timelines.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
              <div className="p-3.5 rounded-xl border border-border/80 bg-background/50 space-y-1">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold text-foreground">Weekly / Monthly Graphs</h4>
                <p className="text-[11px] text-muted-foreground">Visual error intake and resolution analytics.</p>
              </div>
              <div className="p-3.5 rounded-xl border border-border/80 bg-background/50 space-y-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-bold text-foreground">Repeat Error Traps</h4>
                <p className="text-[11px] text-muted-foreground">Catch questions you repeatedly miss.</p>
              </div>
              <div className="p-3.5 rounded-xl border border-border/80 bg-background/50 space-y-1">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-foreground">Examiner Explanations</h4>
                <p className="text-[11px] text-muted-foreground">Detailed step-by-step solution breakdowns.</p>
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={() => navigate('/subscription')}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md flex items-center gap-2 mx-auto"
              >
                <span>Upgrade to Premium</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-16 space-y-6">
      {/* Full width edge-to-edge Header Banner */}
      <div className="w-full bg-card border-b border-border/80 overflow-hidden">
        <div className="px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Mistake Bank
              </h1>
              <Badge variant="outline" className="text-xs font-mono font-bold px-2.5 py-0.5">
                {activeExam}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Review diagnostic trends from your practice sessions and mock tests to analyze correct solutions and examiner explanations.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider bg-muted/80 px-3 py-1.5 rounded-xl border border-border shadow-xs flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>{periodLabel}: {analytics?.total ?? mistakes.length} Mistakes</span>
            </span>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-6">
        {/* ======================================================================= */}
        {/* Analytics Dashboard Card with shadcn Chart */}
        {/* ======================================================================= */}
        <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-6">
          {/* Header row: Title & Timeframe Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-foreground">
                  Mistake Frequency &amp; Recovery Trends
                </h2>
                <p className="text-[11px] sm:text-xs text-muted-foreground">
                  All metrics, graphs, and mistake lists below currently reflect the <span className="font-semibold text-foreground font-mono">{periodLabel}</span> filter.
                </p>
              </div>
            </div>

            {/* Period Switcher Button Group */}
            <div className="flex bg-muted/60 p-1 rounded-xl border border-border/80 self-start sm:self-auto">
              {(['weekly', 'monthly', 'lifetime'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-xs font-bold capitalize rounded-lg transition-all ${
                    period === p
                      ? 'bg-card text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p === 'weekly' ? 'Weekly (7d)' : p === 'monthly' ? 'Monthly (30d)' : 'Lifetime'}
                </button>
              ))}
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Total ({period})
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-foreground font-mono">
                  {analytics?.total ?? 0}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground">errors</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/10 space-y-1">
              <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider block">
                Unresolved
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">
                  {analytics?.unresolved ?? 0}
                </span>
                <span className="text-[10px] font-bold text-rose-600/80">needs review</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10 space-y-1">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
                Resolved / Mastered
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {analytics?.resolved ?? 0}
                </span>
                <span className="text-[10px] font-bold text-emerald-600/80">
                  {analytics?.total ? Math.round((analytics.resolved / analytics.total) * 100) : 0}% recovery
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10 space-y-1">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
                Repeated Errors
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">
                  {analytics?.repeatCount ?? 0}
                </span>
                <span className="text-[10px] font-bold text-amber-600/80">missed &gt;1x</span>
              </div>
            </div>
          </div>

          {/* shadcn Graph Container */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider">
                Timeline Bar Graph ({periodLabel})
              </span>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" />
                  Unresolved
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                  Resolved
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-muted/20 border border-border/60 p-4 pt-6">
              <ChartContainer config={chartConfig} className="h-44 sm:h-52 w-full">
                <BarChart
                  data={timelineData}
                  margin={{ top: 8, right: 12, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={11}
                    className="font-mono font-medium text-muted-foreground"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={6}
                    fontSize={11}
                    allowDecimals={false}
                    className="font-mono text-muted-foreground"
                  />
                  <ChartTooltip
                    cursor={{ fill: 'currentColor', opacity: 0.05 }}
                    content={
                      <ChartTooltipContent
                        indicator="dot"
                        labelFormatter={(label, payload) => {
                          const date = payload?.[0]?.payload?.date;
                          return (
                            <div className="flex items-center justify-between gap-3 font-bold">
                              <span>{label}</span>
                              {date && (
                                <span className="text-[10px] font-mono text-muted-foreground font-normal">
                                  {date}
                                </span>
                              )}
                            </div>
                          );
                        }}
                      />
                    }
                  />
                  <Bar
                    dataKey="resolved"
                    stackId="mistakes"
                    fill="hsl(142 71% 45%)"
                    radius={[0, 0, 3, 3]}
                  />
                  <Bar
                    dataKey="unresolved"
                    stackId="mistakes"
                    fill="hsl(350 89% 60%)"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </div>

          {/* Skill Breakdown & Top Error Tags Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/60">
            {/* By Skill Breakdown */}
            <div className="p-4 rounded-2xl border border-border/60 bg-muted/15 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  Mistakes By Skill ({period})
                </span>
                <span className="text-[11px] text-muted-foreground">Click to filter below</span>
              </div>

              <div className="space-y-2">
                {(['reading', 'listening', 'writing', 'speaking'] as SkillType[]).map(s => {
                  const count = analytics?.bySkill?.[s] ?? 0;
                  const total = analytics?.total || 1;
                  const pct = Math.round((count / total) * 100);
                  const isSelected = selectedSkill === s;

                  return (
                    <div
                      key={s}
                      onClick={() => setSelectedSkill(isSelected ? 'all' : s)}
                      className={`p-2 rounded-xl cursor-pointer transition-all border ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-transparent hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold capitalize text-foreground">{s}</span>
                        <span className="font-mono text-muted-foreground">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Error Categories / Tags */}
            <div className="p-4 rounded-2xl border border-border/60 bg-muted/15 space-y-3">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                Top Recurring Error Topics ({period})
              </span>

              {analytics?.byTag && analytics.byTag.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {analytics.byTag.map(t => (
                    <button
                      key={t.tag}
                      onClick={() => setSearchQuery(t.tag)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-medium text-amber-800 dark:text-amber-300 transition-colors"
                    >
                      <span className="font-bold">{t.tag}</span>
                      <span className="px-1.5 py-0.2 rounded-md bg-amber-500/20 text-[10px] font-mono font-bold">
                        {t.count}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic pt-2">
                  No error categories tagged in this period yet.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* Filter Tag & Search Bar */}
        {/* ======================================================================= */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/40 p-2.5 sm:p-3 rounded-2xl border border-border/80">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {skillFilters.map(t => (
              <Button
                key={t}
                size="sm"
                variant={selectedSkill === t ? 'default' : 'ghost'}
                onClick={() => setSelectedSkill(t)}
                className="text-xs font-bold whitespace-nowrap h-8 rounded-xl capitalize"
              >
                {t}
              </Button>
            ))}
          </div>

          <div className="relative min-w-[220px] sm:max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search mistakes or topics…"
              className="h-8 pl-8 text-xs bg-background rounded-xl border-border/80"
            />
          </div>
        </div>

        {/* ======================================================================= */}
        {/* Mistake Cards List (Reflects Period Filter!) */}
        {/* ======================================================================= */}
        {loading ? (
          <MistakesPageSkeleton bare />
        ) : filteredMistakes.length === 0 ? (
          <Card className="p-12 text-center space-y-3 rounded-2xl border-border/80">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <CardTitle className="text-base font-bold">
              {mistakes.length === 0 ? `No mistakes recorded in the ${periodLabel.toLowerCase()}` : 'No matching mistakes found'}
            </CardTitle>
            <CardDescription className="text-xs max-w-md mx-auto">
              {mistakes.length === 0
                ? `Questions you miss during practice and full mock exams within the ${periodLabel.toLowerCase()} will appear here for review.`
                : 'Try clearing your search query or switching to another skill filter.'}
            </CardDescription>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>Showing <strong>{filteredMistakes.length}</strong> mistakes from <strong>{periodLabel}</strong></span>
              {selectedSkill !== 'all' && (
                <span className="capitalize">Filtered by: <strong>{selectedSkill}</strong></span>
              )}
            </div>

            {filteredMistakes.map(item => (
              <div
                key={item.id}
                className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs hover:border-primary/30 hover:shadow-md transition-all duration-200 space-y-4"
              >
                {/* Header row: Skill & metadata pills */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-blue-600 text-white font-extrabold text-[11px] uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
                      {item.typeName}
                    </span>
                    {item.skill && (
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/80 px-2.5 py-0.5 rounded-md border border-border">
                        {item.skill}
                      </span>
                    )}
                    {item.errorTag && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/20">
                        <Tag className="w-3 h-3" />
                        <span>{item.errorTag}</span>
                      </span>
                    )}
                    {item.failedCount > 1 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-md border border-rose-500/20">
                        <RotateCcw className="w-3 h-3" />
                        <span>Missed {item.failedCount}x</span>
                      </span>
                    )}
                  </div>
                  {item.lastAttemptedAt && (
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {new Date(item.lastAttemptedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>

                {/* Title & Prompt Context */}
                <div className="space-y-1.5">
                  <h3 className="font-display font-bold text-base sm:text-lg text-foreground tracking-tight">
                    {item.questionTitle}
                  </h3>
                  {item.prompt && (
                    <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed">
                      {item.prompt}
                    </p>
                  )}
                </div>

                {/* Response Comparison Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 rounded-xl border border-border/80 divide-y sm:divide-y-0 sm:divide-x divide-border/80 bg-muted/15 overflow-hidden">
                  {/* Your Response */}
                  <div className="p-4 space-y-2.5 bg-background/50">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                      <XCircle className="w-4 h-4 shrink-0" />
                      <span>Your Response</span>
                    </div>
                    <div>{renderResponseBadges(item.userResponse, true)}</div>
                  </div>

                  {/* Correct Solution */}
                  <div className="p-4 space-y-2.5 bg-background/80">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Correct Solution</span>
                    </div>
                    <div>{renderResponseBadges(item.correctResponse, false)}</div>
                  </div>
                </div>

                {/* Examiner Explanation Callout */}
                {item.explanation && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/30 text-xs sm:text-[13px]">
                    <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 block">
                        Examiner Explanation
                      </span>
                      <p className="text-foreground/90 leading-relaxed font-normal">
                        {item.explanation}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
