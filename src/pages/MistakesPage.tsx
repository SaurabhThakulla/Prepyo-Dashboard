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
  ArrowRight,
  Clock,
  Flame,
  BookOpen,
  Headphones,
  SquarePen,
  Mic,
  Lightbulb,
  Layers,
  X,
  Target,
} from 'lucide-react';
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
      className={`text-xs sm:text-sm font-medium leading-relaxed break-words ${
        isWrong ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'
      }`}
    >
      {text}
    </p>
  );
}

const SKILL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  all: Layers,
  reading: BookOpen,
  listening: Headphones,
  writing: SquarePen,
  speaking: Mic,
};

const SKILL_STYLES: Record<string, string> = {
  reading: 'bg-blue-50/90 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50',
  listening: 'bg-purple-50/90 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50',
  writing: 'bg-indigo-50/90 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50',
  speaking: 'bg-amber-50/90 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50',
};


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

  const periodLabel =
    period === 'weekly' ? 'Past 7 Days' : 'Past 4 Weeks';

  const recoveryRate = analytics?.total && analytics.total > 0
    ? Math.round((analytics.resolved / analytics.total) * 100)
    : 0;

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
        {/* Analytics Dashboard Header & KPI Summary Cards */}
        {/* ======================================================================= */}
        <div className="w-full">
          <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
            {/* Header row: Title & Timeframe Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                    Mistake Bank
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-primary/10 text-primary border border-primary/20 tracking-wider">
                    {activeExam}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Review questions missed during practice &amp; mocks in the{' '}
                  <span className="font-semibold text-foreground font-mono">{periodLabel}</span> to target weak areas.
                </p>
              </div>

              {/* Period Switcher Button Group */}
              <div className="inline-flex self-start sm:self-auto bg-muted/60 p-1 rounded-2xl border border-border/80 shadow-2xs">
                {(['weekly', 'monthly'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3.5 py-1.5 text-xs font-bold capitalize rounded-xl transition-all ${
                      period === p
                        ? 'bg-background text-foreground shadow-xs'
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
              {/* Total Logged */}
              <div className="group relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-indigo-50/40 dark:to-indigo-950/20 p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-indigo-400/40 transition-all duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Total Logged
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-foreground font-mono tracking-tight">
                    {analytics?.total ?? 0}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground">questions</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground/80 truncate">
                  Logged in {periodLabel.toLowerCase()}
                </p>
              </div>

              {/* Unresolved / Needs Review */}
              <div className="group relative overflow-hidden rounded-2xl border border-rose-200/80 dark:border-rose-900/40 bg-gradient-to-br from-card via-card to-rose-50/40 dark:to-rose-950/20 p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-rose-400/40 transition-all duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
                    Unresolved
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <Flame className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">
                    {analytics?.unresolved ?? 0}
                  </span>
                  <span className="text-[11px] font-semibold text-rose-600/80">needs retry</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground/80 truncate">
                  Awaiting practice retry
                </p>
              </div>

              {/* Mastered / Resolved */}
              <div className="group relative overflow-hidden rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 bg-gradient-to-br from-card via-card to-emerald-50/40 dark:to-emerald-950/20 p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-emerald-400/40 transition-all duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                    Mastered
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                    {analytics?.resolved ?? 0}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600/80">
                    {recoveryRate}% recovery
                  </span>
                </div>
                <div className="mt-2 w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${recoveryRate}%` }}
                  />
                </div>
              </div>

              {/* Repeat Traps */}
              <div className="group relative overflow-hidden rounded-2xl border border-amber-200/80 dark:border-amber-900/40 bg-gradient-to-br from-card via-card to-amber-50/40 dark:to-amber-950/20 p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-amber-400/40 transition-all duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                    Repeat Traps
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
                    {analytics?.repeatCount ?? 0}
                  </span>
                  <span className="text-[11px] font-semibold text-amber-600/80">missed &gt;1x</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground/80 truncate">
                  High priority revision
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Container for Filter & Mistake List */}
        <div className="w-full px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
          {/* Filter Tag & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/30 p-2.5 sm:p-3 rounded-2xl border border-border/80 shadow-2xs">
            {/* Skill Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {skillFilters.map(t => {
                const Icon = SKILL_ICONS[t] || Layers;
                const isSelected = selectedSkill === t;
                return (
                  <Button
                    key={t}
                    size="sm"
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() => setSelectedSkill(t)}
                    className={`h-9 px-3 rounded-xl capitalize text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 ${
                      isSelected
                        ? 'shadow-xs font-bold'
                        : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t}</span>
                  </Button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-auto sm:min-w-[240px] sm:max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search mistakes or topics…"
                className="h-10 sm:h-9 pl-9 pr-8 text-xs bg-background rounded-xl border-border/80 focus-visible:ring-1 focus-visible:ring-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Mistake Cards List */}
          {loading ? (
            <MistakesPageSkeleton bare />
          ) : filteredMistakes.length === 0 ? (
            <Card className="p-12 text-center space-y-4 rounded-3xl border border-dashed border-border/80 bg-muted/10">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-2xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <CardTitle className="text-base sm:text-lg font-bold">
                  {rawMistakes.length === 0
                    ? `No mistakes recorded in the ${periodLabel.toLowerCase()}`
                    : 'No matching mistakes found'}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm leading-relaxed">
                  {rawMistakes.length === 0
                    ? `Questions you miss during practice and full mock exams within the ${periodLabel.toLowerCase()} will appear here automatically.`
                    : 'Try clearing your search query or switching to another skill filter.'}
                </CardDescription>
              </div>
              {searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="rounded-xl text-xs"
                >
                  Clear Search Filter
                </Button>
              )}
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground px-1">
                <span>
                  Showing <strong className="text-foreground">{filteredMistakes.length}</strong> mistakes from <strong className="text-foreground">{periodLabel}</strong>
                </span>
                {selectedSkill !== 'all' && (
                  <span className="capitalize">
                    Filtered by: <strong className="text-foreground">{selectedSkill}</strong>
                  </span>
                )}
              </div>

              {filteredMistakes.map(item => {
                const SkillIcon = SKILL_ICONS[item.skill] || Layers;
                const skillStyle = SKILL_STYLES[item.skill] || 'bg-muted text-muted-foreground border-border';

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-xs hover:border-primary/40 hover:shadow-md transition-all duration-200 space-y-4"
                  >
                    {/* Header row: Skill, question type, repeat count & timestamp */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
                        {/* Skill Pill */}
                        {item.skill && (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border ${skillStyle}`}>
                            <SkillIcon className="w-3 h-3" />
                            <span>{item.skill}</span>
                          </span>
                        )}

                        {/* Question Type */}
                        <span className="px-3 py-1 rounded-lg text-[11px] font-bold tracking-tight bg-secondary/80 text-secondary-foreground border border-border/60">
                          {item.typeName}
                        </span>

                        {/* Status Pill */}
                        {item.resolved ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/25">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>Mastered</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/25">
                            <Flame className="w-3 h-3 text-rose-500" />
                            <span>Unresolved</span>
                          </span>
                        )}

                        {/* Error Tag */}
                        {item.errorTag && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                            <Tag className="w-3 h-3" />
                            <span>{item.errorTag}</span>
                          </span>
                        )}

                        {/* Repeat Count */}
                        {item.failedCount > 1 && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/25">
                            <RotateCcw className="w-3 h-3" />
                            <span>Missed {item.failedCount}x</span>
                          </span>
                        )}
                      </div>

                      {/* Timestamp */}
                      {item.lastAttemptedAt && (
                        <span className="shrink-0 inline-flex items-center gap-1 pt-1 text-[11px] font-mono text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {new Date(item.lastAttemptedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>

                    {/* Title & Prompt Context */}
                    <div className="space-y-2">
                      <h3 className="font-display font-bold text-base sm:text-lg text-foreground tracking-tight break-words">
                        {item.questionTitle}
                      </h3>
                      {item.prompt && (
                        <div className="text-xs sm:text-[13px] text-muted-foreground/90 bg-muted/20 border-l-2 border-primary/40 pl-3 py-1.5 rounded-r-lg leading-relaxed break-words">
                          {item.prompt}
                        </div>
                      )}
                    </div>

                    {/* Responses Comparison: Your Answer vs Correct Answer */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {/* Previous (Wrong) Response */}
                      <div className="rounded-xl border border-rose-200/70 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20 p-3 sm:p-3.5 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Previous response</span>
                        </div>
                        <div className="pt-0.5">
                          {renderResponseBadges(item.userResponse, true)}
                        </div>
                      </div>

                      {/* Correct Answer (if available) */}
                      {item.correctResponse && (
                        <div className="rounded-xl border border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 p-3 sm:p-3.5 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Correct answer</span>
                          </div>
                          <div className="pt-0.5">
                            {renderResponseBadges(item.correctResponse, false)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Examiner Explanation Box */}
                    {item.explanation && (
                      <div className="rounded-xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-500/5 p-3.5 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>Examiner Explanation &amp; Key Learning</span>
                        </div>
                        <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed pl-5">
                          {item.explanation}
                        </p>
                      </div>
                    )}

                    {/* Action link */}
                    {!isSuru && <MistakePracticeLink mistake={item} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ======================================================================= */}
      {/* Premium Upgrade Modal Overlay for Suru Users (Fixed & Non-movable) */}
      {/* ======================================================================= */}
      {isSuru && (
        <div className="fixed inset-x-0 top-14 lg:top-16 bottom-[var(--mobile-nav-h,0px)] z-20 flex justify-center items-start py-4 sm:pt-10 px-4 pointer-events-none lg:left-[var(--sidebar-offset,416px)] transition-[left] duration-300">
          <div className="pointer-events-auto relative w-full max-w-lg max-h-full overflow-y-auto overscroll-contain bg-card/95 backdrop-blur-md border border-border/90 shadow-2xl rounded-3xl p-5 sm:p-7 text-center space-y-4">
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
                  <span className="sm:hidden">Upgrade to unlock</span>
                  <span className="hidden sm:inline">Upgrade to Unlock Full Mistake Bank</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <p className="text-[11px] text-muted-foreground font-medium">
                  Plans start at NPR 99 · Instant access to all premium features
                </p>
              </div>

              {/* Value Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-left pt-3 sm:pt-2 border-t border-border/60">
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
