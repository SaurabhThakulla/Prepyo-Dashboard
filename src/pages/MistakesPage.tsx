import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { mistakePracticeHref } from '@/lib/mistakePractice';
import { useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle2,
  History,
  Sparkles,
  Search,
  AlertTriangle,
  RotateCcw,
  BarChart3,
  Lock,
  Crown,
  ArrowRight,
  Flame,
  BookOpen,
  Headphones,
  SquarePen,
  Mic,
  Layers,
  X,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { MistakesPageSkeleton } from '@/components/layout/PageSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { errorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { useMistakes, useMistakeAnalytics, usePracticeAttempts, useEvaluationHistory } from '@/lib/hooks/useResources';
import { SCALE } from '@/components/practice/PracticeResultCard';
import { matchesTypeKey, SYLLABUS, typeKey } from '@/lib/syllabus';
import { SkillType, ExamType, Evaluation, Mistake, MistakeAnalytics, PracticeAttempt, isAdmin } from '@/lib/types';
import PracticeResultDialog from '@/components/practice/PracticeResultDialog';

const PAGE = 10;

const SKILL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  all: Layers,
  reading: BookOpen,
  listening: Headphones,
  writing: SquarePen,
  speaking: Mic,
};

const SKILL_TILES: Record<string, string> = {
  reading: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  listening: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  writing: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  speaking: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
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

/** `embedded` shows it as a section of another page (the profile) instead of a page of its own. */
export default function MistakesPage({ embedded = false }: { embedded?: boolean }) {
  const { user, activeExam } = useApp();
  const navigate = useNavigate();
  const toast = useToast();
  const [selectedSkill, setSelectedSkill] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [opened, setOpened] = useState<HistoryItem | null>(null);
  // Render the newest PAGE rows only; "Show more" adds another page.
  const [visible, setVisible] = useState(PAGE);
  useEffect(() => setVisible(PAGE), [selectedSkill, statusFilter, searchQuery, period, activeExam]);

  // Queries for mistakes, analytics, and all practice attempts
  const { data, isPending, error } = useMistakes(activeExam, selectedSkill, false, period);
  const { data: attemptsData, isPending: attemptsPending } = usePracticeAttempts(activeExam, selectedSkill);
  // Speaking and writing are AI-scored, so they live in evaluations, not practice attempts.
  const { data: evaluationsData } = useEvaluationHistory(100);
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
  const rawAttempts = attemptsData?.attempts ?? [];

  const mistakesByQuestion = React.useMemo(() => {
    const map = new Map<string, Mistake>();
    for (const m of rawMistakes) {
      map.set(m.questionId, m);
    }
    return map;
  }, [rawMistakes]);

  // Combine practice attempts and mistakes into comprehensive history items
  const practiceItems = React.useMemo((): HistoryItem[] => {
    if (isSuru) return rawMistakes.map(m => ({ ...m, isCorrect: m.resolved }));
    if (rawAttempts.length > 0) {
      const seen = new Set<string>();
      const items: HistoryItem[] = rawAttempts.map(att => {
        seen.add(att.questionId);
        const matchingMistake = mistakesByQuestion.get(att.questionId);
        return {
          id: matchingMistake?.id || att.id,
          questionId: att.questionId,
          questionTitle: att.questionTitle || matchingMistake?.questionTitle || `Question ${att.questionId}`,
          exam: att.exam,
          skill: att.skill || matchingMistake?.skill || 'reading',
          typeName: att.typeName || matchingMistake?.typeName || 'Practice Task',
          prompt: att.prompt || matchingMistake?.prompt || '',
          userResponse: att.userResponse || matchingMistake?.userResponse || '',
          correctResponse: att.isCorrect ? (att.userResponse || 'Correct') : (matchingMistake?.correctResponse || ''),
          explanation: matchingMistake?.explanation || att.feedback || '',
          errorTag: matchingMistake?.errorTag || '',
          failedCount: matchingMistake?.failedCount || (att.isCorrect ? 0 : 1),
          resolved: att.isCorrect || matchingMistake?.resolved || false,
          isCorrect: att.isCorrect,
          score: att.score,
          maxScore: att.maxScore,
          attempt: att,
          lastAttemptedAt: att.createdAt,
        };
      });

      for (const m of rawMistakes) {
        if (!seen.has(m.questionId)) {
          items.push({
            ...m,
            isCorrect: false,
          });
        }
      }
      return items;
    }
    return rawMistakes.map(m => ({ ...m, isCorrect: m.resolved }));
  }, [isSuru, rawAttempts, rawMistakes, mistakesByQuestion]);

  const historyItems = React.useMemo(() => {
    if (isSuru) return practiceItems;
    const scored = (evaluationsData?.evaluations ?? [])
      .filter(e => e.exam === activeExam && (selectedSkill === 'all' || e.skill === selectedSkill))
      .map(evaluationItem);
    return [...scored, ...practiceItems].sort((a, b) => (b.lastAttemptedAt ?? '').localeCompare(a.lastAttemptedAt ?? ''));
  }, [isSuru, practiceItems, evaluationsData, activeExam, selectedSkill]);

  const analytics = isSuru
    ? (DUMMY_ANALYTICS[activeExam] ?? DUMMY_ANALYTICS.PTE)
    : analyticsData?.analytics;
  const loading = isSuru ? false : (isPending && attemptsPending);

  useEffect(() => {
    if (error && !isForbidden && !isSuru) {
      toast.error('Could not load your history bank', errorMessage(error));
    }
  }, [error, isForbidden, isSuru]);

  const skillFilters = ['all', 'reading', 'listening', 'writing', 'speaking'];

  const filteredMistakes = historyItems.filter(item => {
    if (selectedSkill !== 'all' && item.skill !== selectedSkill) return false;
    if (statusFilter === 'unresolved' && (item.resolved || item.isCorrect)) return false;
    if (statusFilter === 'resolved' && !(item.resolved || item.isCorrect)) return false;
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

  const totalPracticed = historyItems.length || analytics?.total || 0;
  const unresolvedCount = historyItems.filter(i => !i.resolved && !i.isCorrect).length || analytics?.unresolved || 0;
  const resolvedCount = historyItems.filter(i => i.resolved || i.isCorrect).length || analytics?.resolved || 0;
  const accuracyRate = totalPracticed > 0
    ? Math.round((resolvedCount / totalPracticed) * 100)
    : (analytics?.total && analytics.total > 0 ? Math.round((analytics.resolved / analytics.total) * 100) : 0);

  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'unresolved', label: 'To review' },
    { value: 'resolved', label: 'Mastered' },
  ] as const;

  const groups = groupByDay(filteredMistakes.slice(0, visible));
  const remaining = filteredMistakes.length - visible;

  return (
    <div className={`relative w-full overflow-hidden ${embedded ? 'min-h-[28rem]' : 'pb-16'}`}>
      {/* Paid users see their own history; Suru sees blurred sample data under the upgrade card. */}
      <div
        className={`mx-auto w-full space-y-6 sm:space-y-8 ${embedded ? '' : 'max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8'} ${
          isSuru ? 'filter blur-[5px] opacity-60 pointer-events-none select-none transition-all' : ''
        }`}
        aria-hidden={isSuru ? 'true' : undefined}
      >
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <History className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {embedded
                  ? <h2 className="font-display text-lg font-bold tracking-tight text-foreground">Practice history</h2>
                  : <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Practice history</h1>}
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">{activeExam}</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Your answers from the {periodLabel.toLowerCase()}, with the right answer and why.
              </p>
            </div>
          </div>
          <Segmented
            label="Time period"
            value={period}
            onChange={setPeriod}
            options={[{ value: 'weekly', label: '7 days' }, { value: 'monthly', label: '4 weeks' }]}
          />
        </header>

        <section aria-label="Summary" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat icon={Layers} tone="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" label="Practiced" value={totalPracticed} hint="questions answered" />
          <Stat icon={Flame} tone="bg-rose-500/10 text-rose-600 dark:text-rose-400" label="To review" value={unresolvedCount} hint="still to get right" />
          <Stat icon={CheckCircle2} tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" label="Mastered" value={resolvedCount} hint={`${accuracyRate}% of answers`}>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-emerald-500/15">
              <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${accuracyRate}%` }} />
            </div>
          </Stat>
          <Stat icon={RotateCcw} tone="bg-amber-500/10 text-amber-600 dark:text-amber-400" label="Repeat traps" value={analytics?.repeatCount ?? 0} hint="missed more than once" />
        </section>

        <section aria-label="Filters" className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/30 p-2.5 xl:flex-row-reverse xl:items-center">
          <div className="relative xl:w-72 xl:shrink-0">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search titles, topics, types"
              aria-label="Search your history"
              className="h-9 pl-10 pr-10 text-sm bg-card rounded-xl border-border/80 shadow-2xs focus-visible:ring-1 focus-visible:ring-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-full"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 max-w-full items-center gap-1.5 overflow-x-auto no-scrollbar">
              {skillFilters.map(t => {
                const Icon = SKILL_ICONS[t] || Layers;
                const isSelected = selectedSkill === t;
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedSkill(t)}
                    className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium capitalize whitespace-nowrap transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                        : 'border-border/80 bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t}
                  </button>
                );
              })}
            </div>
            <Segmented label="Status" value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
          </div>
        </section>

        {loading ? (
          <MistakesPageSkeleton bare />
        ) : filteredMistakes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 px-6 py-14 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {historyItems.length === 0 ? <History className="w-6 h-6" /> : <Search className="w-6 h-6" />}
            </div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              {historyItems.length === 0 ? `Nothing practiced in the ${periodLabel.toLowerCase()}` : 'No questions match'}
            </h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {historyItems.length === 0
                ? 'Questions you answer in practice and mock exams show up here automatically.'
                : 'Try another search, skill or status.'}
            </p>
            {searchQuery && (
              <Button variant="outline" size="sm" onClick={() => setSearchQuery('')} className="mt-5 rounded-xl">
                Clear search
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map(group => (
              <section key={group.label} aria-label={group.label} className="space-y-3">
                <h2 className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span className="shrink-0">{group.label}</span>
                  <span className="h-px flex-1 bg-border/70" aria-hidden="true" />
                </h2>
                <div className="space-y-3">
                  {group.items.map((item, i) => (
                    // Several attempts can share one mistake id, so the index keeps keys unique.
                    <HistoryCard key={`${item.id}-${i}`} item={item} onOpen={isSuru ? undefined : () => setOpened(item)} />
                  ))}
                </div>
              </section>
            ))}
            {remaining > 0 && (
              <div className="flex flex-col items-center gap-1.5 pt-1">
                <Button variant="outline" onClick={() => setVisible(v => v + PAGE)} className="rounded-xl px-5 font-semibold hover:border-primary/40 hover:bg-primary/5">
                  Show {Math.min(PAGE, remaining)} more
                  <ChevronDown className="w-4 h-4" />
                </Button>
                <p className="text-xs text-muted-foreground tabular-nums">Showing {visible} of {filteredMistakes.length}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {opened && (
        <PracticeResultDialog
          title={opened.questionTitle}
          result={opened.evaluation
            ? { evaluation: opened.evaluation, xpAwarded: 0 }
            : { attempt: opened.attempt ?? attemptFromMistake(opened), xpAwarded: 0 }}
          recording={null}
          open
          onOpenChange={o => !o && setOpened(null)}
          onRedo={() => navigate(redoHref(opened))}
        />
      )}

      {/* ======================================================================= */}
      {/* Premium Upgrade Modal Overlay for Suru Users (Fixed & Non-movable) */}
      {/* ======================================================================= */}
      {isSuru && (
        <div className={embedded
          ? 'absolute inset-0 z-20 flex justify-center items-start py-4 sm:pt-10 px-4 pointer-events-none'
          : 'fixed inset-x-0 top-14 lg:top-16 bottom-[var(--mobile-nav-h,0px)] z-20 flex justify-center items-start py-4 sm:pt-10 px-4 pointer-events-none lg:left-[var(--sidebar-offset,416px)] transition-[left] duration-300'}>
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
                  Unlock your practice history
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
                  <span className="hidden sm:inline">Upgrade to see your full history</span>
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
                  <p className="text-xs text-muted-foreground leading-tight">Mastery &amp; error timeline analytics</p>
                </div>

                <div className="p-2.5 rounded-xl border border-border/80 bg-background/80 space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <p className="text-[11px] font-bold text-foreground">Repeat Traps</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-tight">Catch questions missed &gt;1 time</p>
                </div>

                <div className="p-2.5 rounded-xl border border-border/80 bg-background/80 space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <p className="text-[11px] font-bold text-foreground">AI Explanations</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-tight">Deep examiner solution breakdowns</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type HistoryItem = Omit<Mistake, 'exam'> & {
  exam?: ExamType;
  isCorrect: boolean;
  score?: number;
  maxScore?: number;
  attempt?: PracticeAttempt;
  evaluation?: Evaluation;
};

// An AI-scored answer counts as mastered from 70% of its scale, the same line the result ring turns green.
function evaluationItem(e: Evaluation): HistoryItem {
  const scale = SCALE[e.exam] ?? SCALE.PTE;
  const score = e.estimatedScore;
  return {
    id: e.id,
    questionId: e.questionId ?? '',
    questionTitle: e.questionTitle || e.typeName || `${e.skill[0].toUpperCase()}${e.skill.slice(1)} answer`,
    exam: e.exam,
    skill: e.skill,
    typeName: e.typeName ?? '',
    prompt: '',
    userResponse: e.transcript ?? '',
    correctResponse: '',
    explanation: e.summary,
    errorTag: '',
    failedCount: 0,
    resolved: score !== null && (score - scale.min) / (scale.max - scale.min) >= 0.7,
    isCorrect: false,
    score: score ?? undefined,
    maxScore: scale.max,
    lastAttemptedAt: e.createdAt,
    evaluation: e,
  };
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// Buckets items by the day they were answered, newest day first.
function groupByDay(items: HistoryItem[]) {
  const today = startOfDay(new Date());
  const groups = new Map<string, { label: string; time: number; items: HistoryItem[] }>();
  for (const item of items) {
    const date = item.lastAttemptedAt ? new Date(item.lastAttemptedAt) : null;
    const time = date && !Number.isNaN(date.getTime()) ? startOfDay(date) : -Infinity;
    const days = Math.round((today - time) / 86_400_000);
    const label = !date || time === -Infinity
      ? 'Earlier'
      : days === 0
        ? 'Today'
        : days === 1
          ? 'Yesterday'
          : date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    const group = groups.get(label) ?? { label, time, items: [] };
    group.items.push(item);
    groups.set(label, group);
  }
  return [...groups.values()].sort((a, b) => b.time - a.time);
}

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex shrink-0 rounded-xl border border-border/80 bg-muted/60 p-1">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors ${
            value === o.value ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Stat({
  icon: Icon,
  tone,
  label,
  value,
  hint,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  label: string;
  value: number;
  hint: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-border/70 bg-card p-3.5 sm:p-4 shadow-card">
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-muted-foreground">{label}</p>
          <p className="font-display text-2xl font-black leading-tight tabular-nums text-foreground">{value}</p>
        </div>
      </div>
      <p className="mt-2 truncate text-xs text-muted-foreground">{hint}</p>
      {children}
    </div>
  );
}

function redoHref(item: HistoryItem): string {
  if (item.evaluation) {
    const label = SYLLABUS[item.evaluation.exam]?.[item.skill]?.find(name =>
      matchesTypeKey(name, typeKey(item.typeName))) ?? item.typeName;
    const params = new URLSearchParams({ skill: item.skill, type: typeKey(label), questionId: item.questionId, exam: item.evaluation.exam });
    return `/practice?${params}`;
  }
  return item.isCorrect ? `/practice?skill=${item.skill}` : mistakePracticeHref(item as Mistake);
}

// A mistake with no stored attempt still opens the same score card.
function attemptFromMistake(item: HistoryItem): PracticeAttempt {
  const correct = item.isCorrect || item.resolved;
  return {
    id: item.id,
    questionId: item.questionId,
    questionTitle: item.questionTitle,
    skill: item.skill,
    typeName: item.typeName,
    prompt: item.prompt,
    exam: item.exam,
    examVersionId: '',
    isCorrect: correct,
    score: item.score ?? (correct ? 1 : 0),
    maxScore: item.maxScore ?? 1,
    accuracyPercentage: correct ? 100 : 0,
    feedback: [!correct && item.correctResponse ? `Correct answer: ${item.correctResponse}.` : '', item.explanation].filter(Boolean).join(' '),
    userResponse: item.userResponse,
    timeSpentSeconds: 0,
    createdAt: item.lastAttemptedAt,
  };
}

function HistoryCard({ item, onOpen }: { item: HistoryItem; onOpen?: () => void }) {
  const SkillIcon = SKILL_ICONS[item.skill] || Layers;
  const hasScore = typeof item.score === 'number' && typeof item.maxScore === 'number' && item.maxScore > 0;
  const ratio = hasScore ? item.score! / item.maxScore! : item.isCorrect || item.resolved ? 1 : 0;
  // Outcome colour: green from 70%, amber for partial credit, rose for wrong.
  const TONE = {
    good: { bar: 'bg-emerald-500', pill: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/20' },
    mid: { bar: 'bg-amber-500', pill: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-amber-500/20' },
    bad: { bar: 'bg-rose-500', pill: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 ring-rose-500/20' },
  }[item.evaluation && !hasScore ? 'mid' : ratio >= 0.7 ? 'good' : ratio > 0 ? 'mid' : 'bad'];
  const when = item.lastAttemptedAt ? new Date(item.lastAttemptedAt) : null;
  const time = when && !Number.isNaN(when.getTime()) ? when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : null;

  const body = (
    <>
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${TONE.bar}`} />
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${SKILL_TILES[item.skill] ?? 'bg-muted text-muted-foreground'}`}>
        <SkillIcon className="w-5 h-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[15px] font-semibold leading-snug text-foreground line-clamp-2 break-words">
          {item.questionTitle}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium capitalize">{item.skill}</span>
          {item.typeName && <span className="max-w-[14rem] truncate rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium">{item.typeName}</span>}
          {time && <span className="tabular-nums">· {time}</span>}
          {item.failedCount > 1 && <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400"><RotateCcw className="w-3 h-3" />Missed {item.failedCount}×</span>}
        </span>
      </span>
      <span className={`shrink-0 rounded-xl px-2.5 py-1 font-display text-base font-bold tabular-nums ring-1 ring-inset ${TONE.pill}`}>
        {hasScore ? <>{item.score}<span className="text-xs font-semibold opacity-70">/{item.maxScore}</span></> : item.evaluation ? '—' : ratio >= 1 ? 'Correct' : 'Wrong'}
      </span>
    </>
  );

  const className = 'relative flex w-full items-center gap-3.5 overflow-hidden rounded-2xl border border-border/70 bg-card py-3.5 pl-5 pr-3.5 text-left shadow-card transition-all';
  if (!onOpen) return <div className={className}>{body}</div>;
  return (
    <button type="button" data-tour="history-item" onClick={onOpen} className={`${className} group/card hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30`}>
      {body}
      <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground transition-transform group-hover/card:translate-x-0.5" />
    </button>
  );
}
