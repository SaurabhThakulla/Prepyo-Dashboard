import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import MistakePracticeLink from '@/components/mistakes/MistakePracticeLink';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  Search,
  Tag,
  AlertTriangle,
  RotateCcw,
  BarChart3,
  Lock,
  Crown,
  BookOpen,
  ArrowRight,
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
import { SkillType, ExamType, Mistake, MistakeAnalytics, isAdmin } from '@/lib/types';

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

const DUMMY_ANALYTICS: Partial<Record<ExamType, MistakeAnalytics>> = {
  PTE: {
    period: 'weekly',
    total: 24,
    unresolved: 7,
    resolved: 17,
    repeatCount: 4,
    bySkill: {
      reading: 10,
      listening: 8,
      writing: 4,
      speaking: 2,
    },
    byTag: [
      { tag: 'Collocation & Prepositions', count: 6 },
      { tag: 'Fast Speech Plural Drops', count: 5 },
      { tag: 'Subject-Verb Agreement', count: 4 },
      { tag: 'Cohesive Linking Transitions', count: 3 },
      { tag: 'Pronunciation Intonation Trap', count: 2 },
    ],
    timeline: [
      { date: '2026-03-07', label: 'Mon', count: 5, resolved: 3 },
      { date: '2026-03-08', label: 'Tue', count: 4, resolved: 3 },
      { date: '2026-03-09', label: 'Wed', count: 6, resolved: 4 },
      { date: '2026-03-10', label: 'Thu', count: 3, resolved: 2 },
      { date: '2026-03-11', label: 'Fri', count: 5, resolved: 4 },
      { date: '2026-03-12', label: 'Sat', count: 2, resolved: 1 },
      { date: '2026-03-13', label: 'Sun', count: 4, resolved: 3 },
    ],
  },
  IELTS: {
    period: 'weekly',
    total: 22,
    unresolved: 6,
    resolved: 16,
    repeatCount: 3,
    bySkill: {
      reading: 9,
      listening: 7,
      writing: 4,
      speaking: 2,
    },
    byTag: [
      { tag: 'True/False/Not Given Trap', count: 6 },
      { tag: 'Paraphrasing Synonyms', count: 5 },
      { tag: 'Distractor - Changed Numbers', count: 4 },
      { tag: 'Task 2 Coherence & Cohesion', count: 3 },
    ],
    timeline: [
      { date: '2026-03-07', label: 'Mon', count: 4, resolved: 3 },
      { date: '2026-03-08', label: 'Tue', count: 3, resolved: 2 },
      { date: '2026-03-09', label: 'Wed', count: 5, resolved: 4 },
      { date: '2026-03-10', label: 'Thu', count: 4, resolved: 3 },
      { date: '2026-03-11', label: 'Fri', count: 4, resolved: 3 },
      { date: '2026-03-12', label: 'Sat', count: 2, resolved: 1 },
      { date: '2026-03-13', label: 'Sun', count: 3, resolved: 2 },
    ],
  },
};

const DUMMY_MISTAKES: Partial<Record<ExamType, Mistake[]>> = {
  PTE: [
    {
      id: 'dummy-pte-1',
      questionId: 'dummy-q-1',
      questionTitle: 'Biological Diversity in Montane Forest Ecosystems',
      exam: 'PTE',
      skill: 'reading',
      typeName: 'Fill in the Blanks (Reading)',
      prompt: 'Forest canopies in high-altitude montane zones harbor intricate microclimates that sustain species richness under varying thermal conditions.',
      userResponse: 'b1: sustained, b2: vulnerable, b3: variation',
      correctResponse: 'b1: sustaining, b2: vulnerable, b3: diversity',
      explanation: 'The present participle "sustaining" functions adjectivally to describe the microclimate mechanism. "Diversity" is required here as a standard academic collocation with "species".',
      errorTag: 'Collocation & Prepositions',
      failedCount: 2,
      resolved: false,
      lastAttemptedAt: '2026-03-13T09:20:00Z',
    },
    {
      id: 'dummy-pte-2',
      questionId: 'dummy-q-2',
      questionTitle: 'Academic Research Methodologies',
      exam: 'PTE',
      skill: 'listening',
      typeName: 'Write from Dictation',
      prompt: 'Audio recording from a university faculty lecture on experimental data collection and empirical validation.',
      userResponse: 'The faculty requires all submission to include empirical evidence.',
      correctResponse: 'The faculty requires all submissions to include empirical evidence.',
      explanation: 'The quantifier "all" precedes a countable plural noun, requiring "submissions". In connected fast speech, unstressed plural endings are frequently missed.',
      errorTag: 'Fast Speech Plural Drops',
      failedCount: 3,
      resolved: false,
      lastAttemptedAt: '2026-03-12T14:45:00Z',
    },
    {
      id: 'dummy-pte-3',
      questionId: 'dummy-q-3',
      questionTitle: 'The Evolution of Modern Cryptography',
      exam: 'PTE',
      skill: 'reading',
      typeName: 'Re-order Paragraphs',
      prompt: 'Arrange the historical progression of asymmetric key cryptography algorithms in chronological order.',
      userResponse: 'Paragraph Order: [B, A, D, C]',
      correctResponse: 'Paragraph Order: [B, D, A, C]',
      explanation: 'Paragraph D introduces Diffie-Hellman key exchange, which directly precedes the implementation referenced by the demonstrative pronoun "This innovation" in Paragraph A.',
      errorTag: 'Cohesive Linking Transitions',
      failedCount: 1,
      resolved: true,
      lastAttemptedAt: '2026-03-11T16:10:00Z',
    },
    {
      id: 'dummy-pte-4',
      questionId: 'dummy-q-4',
      questionTitle: 'Renewable Energy Storage Infrastructure',
      exam: 'PTE',
      skill: 'writing',
      typeName: 'Summarize Written Text',
      prompt: 'Synthesize the passage on lithium-iron phosphate battery grid storage into one single sentence between 5 and 75 words.',
      userResponse: 'Although battery costs have declined rapidly, grid integration remains difficult, therefore subsidies are still essential.',
      correctResponse: 'Although battery costs have declined rapidly, grid integration remains challenging; therefore, governmental subsidies remain indispensable.',
      explanation: 'A comma splice occurred before "therefore". Conjunctive adverbs connecting two independent clauses must be preceded by a semicolon or period to avoid syntactic penalty.',
      errorTag: 'Subject-Verb Agreement',
      failedCount: 2,
      resolved: false,
      lastAttemptedAt: '2026-03-10T11:05:00Z',
    },
  ],
  IELTS: [
    {
      id: 'dummy-ielts-1',
      questionId: 'dummy-iq-1',
      questionTitle: 'Early Agricultural Settlements in Mesopotamia',
      exam: 'IELTS',
      skill: 'reading',
      typeName: 'True / False / Not Given',
      prompt: 'Question: The early irrigation canals were constructed exclusively by seasonal migrant laborers from neighboring valley tribes.',
      userResponse: 'FALSE',
      correctResponse: 'NOT GIVEN',
      explanation: 'The passage confirms canals were dug before the harvest season, but provides no historical evidence about who comprised the labor force. The absolute qualifier "exclusively" cannot be proven false.',
      errorTag: 'True/False/Not Given Trap',
      failedCount: 2,
      resolved: false,
      lastAttemptedAt: '2026-03-13T09:20:00Z',
    },
    {
      id: 'dummy-ielts-2',
      questionId: 'dummy-iq-2',
      questionTitle: 'Student Accommodation Booking Dialogue',
      exam: 'IELTS',
      skill: 'listening',
      typeName: 'Form Completion',
      prompt: 'Section 1 listening excerpt: international student inquiring about studio flat rental deposit.',
      userResponse: 'Payment deposit: $450',
      correctResponse: 'Payment deposit: $415',
      explanation: 'Distractor trap: the housing officer first quotes the standard $450 deposit, then immediately corrects it after verifying the university bursary discount of $35.',
      errorTag: 'Distractor - Changed Numbers',
      failedCount: 1,
      resolved: true,
      lastAttemptedAt: '2026-03-12T14:45:00Z',
    },
    {
      id: 'dummy-ielts-3',
      questionId: 'dummy-iq-3',
      questionTitle: 'Urban Heat Islands and Microclimate Architecture',
      exam: 'IELTS',
      skill: 'reading',
      typeName: 'Matching Information',
      prompt: 'Which paragraph contains a description of how reflective roof materials lower surface temperatures?',
      userResponse: 'Paragraph B',
      correctResponse: 'Paragraph D',
      explanation: 'Paragraph B mentions roofs only when discussing building costs. Paragraph D explains how reflective materials send sunlight back and keep surfaces cooler, which is the information asked for.',
      errorTag: 'Paraphrasing Synonyms',
      failedCount: 2,
      resolved: false,
      lastAttemptedAt: '2026-03-11T16:10:00Z',
    },
  ],
};

export default function MistakesPage() {
  const { user, activeExam } = useApp();
  const navigate = useNavigate();
  const toast = useToast();
  const [selectedSkill, setSelectedSkill] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');

  // Both queries receive the active period so all components reflect it!
  const { data, isPending, error } = useMistakes(activeExam, selectedSkill, false, period);
  const { data: analyticsData, error: analyticsError } = useMistakeAnalytics(
    activeExam,
    period
  );

  // Check if forbidden (freemium user) or on free 'suru' tier
  const isForbidden =
    (error && 'status' in error && (error as { status: number }).status === 403) ||
    (analyticsError && 'status' in analyticsError && (analyticsError as { status: number }).status === 403);

  const isSuru = Boolean(
    isForbidden ||
    (user && !isAdmin(user) && (user.role === 'suru' || !user.paidPlanActive))
  );

  const rawMistakes = isSuru
    ? (DUMMY_MISTAKES[activeExam] ?? DUMMY_MISTAKES.PTE ?? [])
    : (data?.mistakes ?? []);
  const analytics = isSuru
    ? (DUMMY_ANALYTICS[activeExam] ?? DUMMY_ANALYTICS.PTE)
    : analyticsData?.analytics;
  const loading = isSuru ? false : isPending;

  useEffect(() => {
    if (error && !isForbidden && !isSuru) {
      toast.error('Could not load your mistake bank', errorMessage(error));
    }
  }, [error, isForbidden, isSuru]);

  const skillFilters = ['all', 'reading', 'listening', 'writing', 'speaking'];

  const filteredMistakes = rawMistakes.filter(item => {
    if (selectedSkill !== 'all' && item.skill !== selectedSkill) return false;
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
    period === 'weekly' ? 'Past 7 Days' : 'Past 4 Weeks';

  return (
    <div className="relative w-full pb-16 overflow-hidden">
      {/* ======================================================================= */}
      {/* Full Page Content: Regular for Paid Users, Blurred Out with Dummy Data for Suru */}
      {/* ======================================================================= */}
      <div
        className={`w-full space-y-6 ${
          isSuru ? 'filter blur-[5px] opacity-60 pointer-events-none select-none transition-all' : ''
        }`}
        aria-hidden={isSuru ? 'true' : undefined}
      >
        {/* ======================================================================= */}
        {/* Edge-to-edge Analytics Dashboard (no top or side gaps) */}
        {/* ======================================================================= */}
        <div className="w-full bg-card border-b border-border/80 shadow-xs">
          <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6">
          {/* Header row: Title & Timeframe Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">
              Mistake Frequency &amp; Recovery Trends
            </h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              All metrics, graphs, and mistake lists below currently reflect the <span className="font-semibold text-foreground font-mono">{periodLabel}</span> filter.
            </p>
          </div>

            {/* Period Switcher Button Group */}
            <div className="flex bg-muted/60 p-1 rounded-xl border border-border/80 self-start sm:self-auto">
              {(['weekly', 'monthly'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-xs font-bold capitalize rounded-lg transition-all ${
                    period === p
                      ? 'bg-card text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p === 'weekly' ? 'Weekly' : 'Monthly'}
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
      </div>

      {/* Main Container for Filter & Mistake List */}
      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-6">
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
              {rawMistakes.length === 0 ? `No mistakes recorded in the ${periodLabel.toLowerCase()}` : 'No matching mistakes found'}
            </CardTitle>
            <CardDescription className="text-xs max-w-md mx-auto">
              {rawMistakes.length === 0
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

                <div className="rounded-xl border border-border p-4 space-y-2">
                  <p className="text-xs font-bold text-muted-foreground">Previous response</p>
                  {renderResponseBadges(item.userResponse, true)}
                </div>
                {!isSuru && <MistakePracticeLink mistake={item} />}
              </div>
            ))}
          </div>
        )}
      </div>
      </div>

      {/* ======================================================================= */}
      {/* Premium Upgrade Modal Overlay for Suru Users (Fixed & Non-movable) */}
      {/* ======================================================================= */}
      {isSuru && (
        <div className="fixed inset-x-0 top-14 lg:top-16 bottom-[var(--mobile-nav-h,0px)] z-20 flex justify-center items-start pt-6 sm:pt-10 px-4 pointer-events-none lg:left-[var(--sidebar-offset,384px)] transition-[left] duration-300">
          <div className="pointer-events-auto w-full max-w-lg bg-card/95 backdrop-blur-md border border-border/90 shadow-2xl rounded-3xl p-5 sm:p-7 text-center space-y-4 overflow-hidden">
            {/* Ambient radiant glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-gradient-to-br from-amber-500/25 via-blue-500/15 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-3.5">
              {/* Crown Icon & Plan Pill */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
                  <Crown className="w-6 h-6" />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 text-[11px] font-bold uppercase tracking-wider">
                  <Lock className="w-3 h-3" />
                  <span>Suru Plan Preview</span>
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-1">
                <h2 className="font-display text-xl sm:text-2xl font-black text-foreground tracking-tight">
                  Unlock Your Mistake Bank
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                  Every question you miss during practice and full mock exams is automatically cataloged with examiner explanations and recovery timelines.
                </p>
              </div>

              {/* Primary Upgrade CTA Button - Positioned Higher Up ("upside") */}
              <div className="pt-1 space-y-1.5">
                <Button
                  onClick={() => navigate('/subscription')}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <span>Upgrade to Unlock Full Mistake Bank</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <p className="text-[11px] text-muted-foreground font-medium">
                  Plans start at NPR 99 · Instant access to all premium features
                </p>
              </div>

              {/* Value Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-left pt-2 border-t border-border/60">
                <div className="p-2.5 rounded-xl border border-border/80 bg-background/80 space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                    <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                    <p className="text-[11px] font-bold text-foreground">Recovery Graphs</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">Mastery &amp; error timeline analytics</p>
                </div>

                <div className="p-2.5 rounded-xl border border-border/80 bg-background/80 space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <p className="text-[11px] font-bold text-foreground">Repeat Traps</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">Catch questions missed &gt;1 time</p>
                </div>

                <div className="p-2.5 rounded-xl border border-border/80 bg-background/80 space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <p className="text-[11px] font-bold text-foreground">AI Explanations</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">Deep examiner solution breakdowns</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
