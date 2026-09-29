import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BookOpen,
  Bot,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Crown,
  Flame,
  Globe,
  Headphones,
  Lightbulb,
  Lock,
  LucideIcon,
  MapPin,
  Minus,
  Mic,
  PenTool,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';
import AU from 'country-flag-icons/react/3x2/AU';
import GB from 'country-flag-icons/react/3x2/GB';
import CA from 'country-flag-icons/react/3x2/CA';
import US from 'country-flag-icons/react/3x2/US';
import NZ from 'country-flag-icons/react/3x2/NZ';
import KR from 'country-flag-icons/react/3x2/KR';
import JP from 'country-flag-icons/react/3x2/JP';
import DE from 'country-flag-icons/react/3x2/DE';
import { Button } from '@/components/ui/button';
import {
  OnboardingNavigation,
  OnboardingLayout,
  OnboardingProgress,
  OnboardingSidebar,
  OptionCard,
  QuestionHeader,
} from '@/components/onboarding/OnboardingChrome';
import { useToast } from '@/components/ui/toast';
import { useApp } from '@/context/AppContext';
import { errorMessage } from '@/lib/api';
import { useSubscriptionPlans } from '@/lib/hooks/useResources';
import QRPaymentCheckoutDialog from '@/components/subscription/QRPaymentCheckoutDialog';
import {
  DEFAULT_PLANS,
  PLAN_TAGLINES,
  SUBSCRIPTION_TIERS,
  formatPlanName,
  isPaidTier,
  planAccessDays,
  planUsageTier,
} from '@/lib/subscriptions';
import { ExamType, SkillType, SubscriptionPlan, SubscriptionTier, UserProfile, IELTSModule, IELTS_MODULE_LABEL, ieltsModuleOf } from '@/lib/types';
import {
  DAILY_MINUTES,
  DESTINATIONS,
  Destination,
  FOCUS_SKILLS,
  SCORE_SCALE,
  STUDY_GOALS,
  StudyGoal,
  clampScore,
  dailyLabel,
  daysUntil,
  formatExamDate,
  formatScore,
  isoDateAfterMonths,
  practiceHours,
  runwayAdvice,
  scoreLabel,
  skillLabel,
  toIsoDate,
} from '@/components/onboarding/onboarding';
import {
  BriefcaseIcon,
  FlagIcon,
  ListeningIcon,
  PassportIcon,
  ReadingIcon,
  RetakeIcon,
  SpeakingIcon,
  SproutIcon,
  UniversityIcon,
  WritingIcon,
} from '@/components/onboarding/GoalIcons';

const IELTS_MODULE_CHOICES: { id: IELTSModule; blurb: string }[] = [
  { id: 'academic', blurb: 'For university study and professional registration.' },
  { id: 'general_training', blurb: 'For work, migration and training below degree level.' },
];

const STEPS = [
  { id: 'welcome', pill: 'Your IELTS & PTE Copilot', label: 'Welcome', tagline: "Let's build a plan that fits you." },
  { id: 'exam', pill: 'Your Target', label: 'Your exam', tagline: 'Everything in Prepyo adapts to your exam.' },
  { id: 'goal', pill: 'Your Target', label: 'Your goal', tagline: 'Knowing why keeps you going on the hard days.' },
  { id: 'destination', pill: 'Your Target', label: 'Destination', tagline: 'Your score is a ticket somewhere. Where to?' },
  { id: 'experience', pill: 'Experience', label: 'Experience', tagline: 'First try or a comeback, we start where you are.' },
  { id: 'target', pill: 'Target Score', label: 'Target score', tagline: 'A clear target makes progress measurable.' },
  { id: 'date', pill: 'Exam Date', label: 'Exam date', tagline: 'A deadline turns a plan into a habit.' },
  { id: 'focus', pill: 'Focus Skill', label: 'Focus skill', tagline: 'Your hardest skill is your biggest opportunity.' },
  { id: 'daily', pill: 'Daily Routine', label: 'Daily time', tagline: 'Small daily sessions beat weekend cramming.' },
  { id: 'plan', pill: 'Your Plan', label: 'Choose a plan', tagline: 'Start free, or unlock more practice and mocks.' },
  { id: 'tour', pill: 'Your Toolkit', label: 'Your toolkit', tagline: 'Everything you need, in one place.' },
  { id: 'ready', pill: 'All Set', label: 'All set', tagline: "You're ready. Let the practice begin." },
] as const;

type StepId = (typeof STEPS)[number]['id'];

const QUESTION_COUNT = 9;

const EXAMS: { id: ExamType; name: string; scale: string; blurb: string }[] = [
  {
    id: 'IELTS',
    name: 'IELTS',
    scale: 'Bands 0–9',
    blurb: 'Academic & General test modules with authentic Cambridge scoring.',
  },
  {
    id: 'PTE',
    name: 'PTE Academic',
    scale: 'Scores 10–90',
    blurb: 'Computer-based exam with fast, consistent scoring.',
  },
];

/** Exam-step look, and what Prepyo gives you for each exam (not claims about the exam itself). */
const EXAM_STYLE: Record<
  ExamType,
  { facts: string[]; tile: string; soft: string; ring: string; wash: string; bar: string }
> = {
  IELTS: {
    facts: ['All 4 skills', 'Band feedback in seconds'],
    tile: 'bg-rose-600 text-white',
    soft: 'bg-rose-50 text-rose-700',
    ring: 'border-rose-600 ring-rose-600/20',
    wash: 'from-rose-50',
    bar: 'bg-rose-500',
  },
  PTE: {
    facts: ['Every task type', 'Scored in seconds'],
    tile: 'bg-blue-600 text-white',
    soft: 'bg-blue-50 text-blue-700',
    ring: 'border-blue-600 ring-blue-600/20',
    wash: 'from-blue-50',
    bar: 'bg-blue-600',
  },
  // Not offered at onboarding yet (EXAMS lists IELTS and PTE); it stays under
  // "coming soon" until the question bank is ready. Styled for when it moves.
  EPS_TOPIK: {
    facts: ['All 16 official task types', 'Reading & listening'],
    tile: 'bg-emerald-600 text-white',
    soft: 'bg-emerald-50 text-emerald-700',
    ring: 'border-emerald-600 ring-emerald-600/20',
    wash: 'from-emerald-50',
    bar: 'bg-emerald-600',
  },
};

const UPCOMING_PREPARATIONS: {
  id: string;
  name: string;
  scale: string;
  blurb: string;
  flagCode: 'KR' | 'JP' | 'DE';
}[] = [
  {
    id: 'korean',
    name: 'Korean',
    scale: 'EPS-TOPIK',
    blurb: 'EPS employment permit test & TOPIK preparation for South Korea.',
    flagCode: 'KR',
  },
  {
    id: 'japanese',
    name: 'Japanese',
    scale: 'JLPT · NAT-TEST',
    blurb: 'Proficiency test prep for university study and SSW work visas.',
    flagCode: 'JP',
  },
  {
    id: 'germany',
    name: 'Germany',
    scale: 'Goethe · TestDaF',
    blurb: 'German language training for Ausbildung & university study in Germany.',
    flagCode: 'DE',
  },
];

const SKILL_ICONS: Record<SkillType, LucideIcon> = {
  speaking: Mic,
  writing: PenTool,
  reading: BookOpen,
  listening: Headphones,
};

const GOAL_ICONS: Record<StudyGoal, React.ComponentType<{ className?: string }>> = {
  university: UniversityIcon,
  migration: PassportIcon,
  work: BriefcaseIcon,
  other: FlagIcon,
};

/** Per goal: examples to scan, and full class strings so Tailwind keeps them. */
const GOAL_STYLE: Record<StudyGoal, { examples: string[]; tile: string; soft: string; ring: string; wash: string }> = {
  university: {
    examples: ["Bachelor's", "Master's", 'PhD'],
    tile: 'bg-blue-600 text-white',
    soft: 'bg-blue-50 text-blue-600',
    ring: 'border-blue-600 ring-blue-600/20',
    wash: 'from-blue-50',
  },
  migration: {
    examples: ['PR', 'Skilled visa', 'Partner visa'],
    tile: 'bg-emerald-600 text-white',
    soft: 'bg-emerald-50 text-emerald-600',
    ring: 'border-emerald-600 ring-emerald-600/20',
    wash: 'from-emerald-50',
  },
  work: {
    examples: ['Nursing', 'Engineering', 'Teaching'],
    tile: 'bg-violet-600 text-white',
    soft: 'bg-violet-50 text-violet-600',
    ring: 'border-violet-600 ring-violet-600/20',
    wash: 'from-violet-50',
  },
  other: {
    examples: ['Personal goal', 'Not sure yet'],
    tile: 'bg-amber-500 text-white',
    soft: 'bg-amber-50 text-amber-600',
    ring: 'border-amber-500 ring-amber-500/20',
    wash: 'from-amber-50',
  },
};

type Feature = {
  icon: LucideIcon;
  title: string;
  tag: string;
  text: string;
  highlights: string[];
  where?: string;
  /** Full class strings so Tailwind keeps them: solid tile, soft tint, glow. */
  accent: { tile: string; soft: string; glow: string };
};

/** Focus-step look per skill, echoing the skill colours used on the practice hub. */
const SKILL_STYLE: Record<
  SkillType,
  { icon: React.ComponentType<{ className?: string }>; tile: string; soft: string; ring: string; wash: string }
> = {
  speaking: {
    icon: SpeakingIcon,
    tile: 'bg-rose-500 text-white',
    soft: 'bg-rose-50 text-rose-600',
    ring: 'border-rose-500 ring-rose-500/20',
    wash: 'from-rose-50',
  },
  writing: {
    icon: WritingIcon,
    tile: 'bg-emerald-600 text-white',
    soft: 'bg-emerald-50 text-emerald-600',
    ring: 'border-emerald-600 ring-emerald-600/20',
    wash: 'from-emerald-50',
  },
  reading: {
    icon: ReadingIcon,
    tile: 'bg-amber-500 text-white',
    soft: 'bg-amber-50 text-amber-600',
    ring: 'border-amber-500 ring-amber-500/20',
    wash: 'from-amber-50',
  },
  listening: {
    icon: ListeningIcon,
    tile: 'bg-sky-600 text-white',
    soft: 'bg-sky-50 text-sky-600',
    ring: 'border-sky-600 ring-sky-600/20',
    wash: 'from-sky-50',
  },
};

/** A few real tasks per skill, so the choice is concrete for the learner's exam. */
const SKILL_TASKS: Record<ExamType, Record<SkillType, string[]>> = {
  PTE: {
    speaking: ['Read Aloud', 'Describe Image'],
    writing: ['Write Essay', 'Summarize Written Text'],
    reading: ['Fill in the Blanks', 'Reorder Paragraph'],
    listening: ['Write from Dictation', 'Summarize Spoken Text'],
  },
  IELTS: {
    speaking: ['Part 2 cue card', 'Part 3 discussion'],
    writing: ['Task 1 report', 'Task 2 essay'],
    reading: ['True / False / Not Given', 'Matching headings'],
    listening: ['Form completion', 'Multiple choice'],
  },
  // No speaking or writing section; the focus step offers only the two below.
  EPS_TOPIK: {
    speaking: [],
    writing: [],
    reading: ['Signs & safety notices', 'Fill in the blank'],
    listening: ['Choose the picture', 'Workplace dialogues'],
  },
};

/** How each daily amount feels, shown under the time. */
const DAILY_PACE: Record<number, string> = {
  15: 'Light',
  30: 'Steady',
  45: 'Focused',
  60: 'Serious',
  90: 'Intensive',
  120: 'Full sprint',
};

const FEATURES: Feature[] = [
  {
    icon: PenTool,
    title: 'Practice Studio',
    tag: 'All four skills',
    text: 'Drill every task type, one question at a time.',
    highlights: [
      'Every task type for speaking, writing, reading and listening',
      'Reading and listening are marked instantly',
      'Writing and speaking get rubric-based feedback',
    ],
    where: 'Practice, in the sidebar',
    accent: { tile: 'bg-blue-600 text-white', soft: 'bg-blue-50 text-blue-600', glow: 'from-blue-100' },
  },
  {
    icon: Award,
    title: 'Mock tests',
    tag: 'Exam conditions',
    text: 'Sit a full paper before the real thing.',
    highlights: ['Timed papers under real exam conditions', 'A full score report at the end'],
    where: 'Mock Exam, in the sidebar',
    accent: { tile: 'bg-violet-600 text-white', soft: 'bg-violet-50 text-violet-600', glow: 'from-violet-100' },
  },
  {
    icon: Bot,
    title: 'AI Coach',
    tag: 'Help on demand',
    text: 'Stuck on a question? Ask, right where you are.',
    highlights: ['Explains any question in plain language', 'Opens alongside your practice, no tab switching'],
    where: 'AI Coach, in the sidebar',
    accent: { tile: 'bg-sky-600 text-white', soft: 'bg-sky-50 text-sky-600', glow: 'from-sky-100' },
  },
  {
    icon: RotateCcw,
    title: 'Mistake bank',
    tag: 'Learn from misses',
    text: 'Turn every wrong answer into practice.',
    highlights: ['Questions you miss are saved automatically', 'Retry them until they stick'],
    where: 'Home → Mistake Bank',
    accent: { tile: 'bg-rose-600 text-white', soft: 'bg-rose-50 text-rose-600', glow: 'from-rose-100' },
  },
  {
    icon: Flame,
    title: 'Streaks & XP',
    tag: 'Daily habit',
    text: 'Small daily sessions, rewarded.',
    highlights: ['Practise a little every day to keep your streak alive', 'Earn XP and climb the levels'],
    accent: { tile: 'bg-amber-500 text-white', soft: 'bg-amber-50 text-amber-600', glow: 'from-amber-100' },
  },
  {
    icon: Trophy,
    title: 'Nepal Study Challenge',
    tag: 'Nationwide ranking',
    text: 'See where you stand among learners across Nepal.',
    highlights: ['Compare your practice with learners nationwide', 'A friendly push to keep going'],
    where: 'Home → Nepal Study Challenge',
    accent: { tile: 'bg-emerald-600 text-white', soft: 'bg-emerald-50 text-emerald-600', glow: 'from-emerald-100' },
  },
];

const CONFETTI_COLORS = ['#1b40a7', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8'];

const examName = (exam: ExamType) => (exam === 'PTE' ? 'PTE Academic' : 'IELTS');

export default function OnboardingFlow({
  user,
  onDone,
  preview = false,
}: {
  user: UserProfile;
  onDone: () => void;
  preview?: boolean;
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const { completeOnboarding } = useApp();
  const plansQuery = useSubscriptionPlans();

  const plans = useMemo(() => {
    const served = plansQuery.data?.plans ?? [];
    return SUBSCRIPTION_TIERS.map(
      tier => served.find(plan => plan.id === tier) ?? DEFAULT_PLANS.find(plan => plan.id === tier)!,
    );
  }, [plansQuery.data]);

  const currentPaidPlan: SubscriptionTier | null = user.paidPlanActive ? user.planId : null;

  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [exam, setExam] = useState<ExamType | null>(null);
  // IELTS comes in two modules with different Reading texts and Writing Task 1.
  const [ieltsModule, setIeltsModule] = useState<IELTSModule>(() => ieltsModuleOf(user));
  const [goal, setGoal] = useState<StudyGoal | null>(null);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [prior, setPrior] = useState<'first' | 'retake' | null>(null);
  const [previousScore, setPreviousScore] = useState(() => SCORE_SCALE[user.targetExam ?? 'PTE'].presets[0]);
  const [score, setScore] = useState(() => SCORE_SCALE[user.targetExam ?? 'PTE'].fallback);
  const [examDate, setExamDate] = useState(user.examDate ?? '');
  const [notBooked, setNotBooked] = useState(false);
  const [focus, setFocus] = useState<SkillType | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [planId, setPlanId] = useState<SubscriptionTier | null>(currentPaidPlan);
  const [feature, setFeature] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const step = STEPS[stepIndex];
  const firstName = user.name?.trim().split(/\s+/)[0] || 'there';
  const chosen: ExamType = exam ?? 'PTE';
  const scale = SCORE_SCALE[chosen];
  const unit = chosen === 'IELTS' ? 'band' : 'score';
  const days = examDate && !notBooked ? daysUntil(examDate) : null;
  const dateValid = days !== null && days >= 0;
  const selectedPlan = plans.find(plan => plan.id === planId) ?? null;
  const needsPayment = selectedPlan !== null && isPaidTier(selectedPlan.id) && selectedPlan.id !== currentPaidPlan;

  const canContinue = (() => {
    switch (step.id) {
      case 'exam':
        return exam !== null;
      case 'goal':
        return goal !== null;
      case 'destination':
        return destination !== null;
      case 'experience':
        return prior !== null;
      case 'date':
        return notBooked || dateValid;
      case 'focus':
        return focus !== null;
      case 'daily':
        return minutes !== null;
      case 'plan':
        return planId !== null;
      default:
        return true;
    }
  })();

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [stepIndex]);

  const go = (next: number) => {
    if (next < 0 || next >= STEPS.length || next === stepIndex) return;
    setDirection(next > stepIndex ? 1 : -1);
    setStepIndex(next);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (step.id === 'ready') return;
      if (event.key === 'ArrowRight' && canContinue) go(stepIndex + 1);
      if (event.key === 'ArrowLeft' && stepIndex > 0) go(stepIndex - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const chooseExam = (next: ExamType) => {
    if (next === exam) return;
    setExam(next);
    setScore(
      next === user.targetExam && user.targetScore != null
        ? clampScore(next, user.targetScore)
        : SCORE_SCALE[next].fallback,
    );
    setPreviousScore(SCORE_SCALE[next].presets[0]);
  };

  const finish = async (path: string) => {
    if (preview) {
      toast.success('Preview complete', 'Onboarding preview closed.');
      onDone();
      return;
    }
    if (saving || !exam || !goal || !destination || !prior || !focus || minutes === null || !planId) return;
    setSaving(true);
    setSaveError(null);
    try {
      await completeOnboarding({
        targetExam: exam,
        ...(exam === 'IELTS' ? { targetModule: ieltsModule } : {}),
        targetScore: score,
        ...(dateValid ? { examDate } : {}),
        studyGoal: goal,
        destination,
        priorAttempt: prior,
        ...(prior === 'retake' ? { previousScore } : {}),
        focusSkill: focus,
        dailyMinutes: minutes,
      });
      toast.success(`You're set for ${examName(exam)}`, 'Your plan is on your dashboard.');
      onDone();
      navigate(path);
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const progress = `${((stepIndex + 1) / STEPS.length) * 100}%`;
  const slide = direction === 1 ? 'motion-safe:slide-in-from-right-8' : 'motion-safe:slide-in-from-left-8';

  return (
    <OnboardingLayout>
      <OnboardingSidebar steps={STEPS} stepIndex={stepIndex} />

      {/* Main Flow Content Container */}
      <div className="flex min-w-0 flex-1 flex-col justify-between overflow-y-auto">
        <OnboardingProgress
          current={stepIndex + 1}
          total={STEPS.length}
          progress={progress}
          onExit={preview ? onDone : undefined}
        />

        {/* Content Body: Centered Container */}
        <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
          <div className="flex w-full flex-col items-center justify-center py-4">
            <div
              key={step.id}
              className={`flex w-full justify-center motion-safe:animate-in motion-safe:fade-in duration-300 ${slide}`}
            >


                {/* Step 1: Welcome Screen */}
                {step.id === 'welcome' && (
                  <div className="grid w-full max-w-4xl items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-12">
                    <div>
                      <h2
                        ref={headingRef}
                        id="onboarding-title"
                        tabIndex={-1}
                        className="font-display text-3xl font-bold tracking-tight text-slate-900 outline-none sm:text-4xl"
                      >
                        Namaste,{' '}
                        <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
                          {firstName}!
                        </span>
                      </h2>
                      <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500 sm:text-base">
                        Welcome to Prepyo. Answer {QUESTION_COUNT} quick questions and we&apos;ll build a study plan
                        around your exam, your goals and your schedule.
                      </p>

                      <div className="mt-6 flex flex-wrap gap-2">
                        {[
                          { icon: Target, label: `${QUESTION_COUNT} questions` },
                          { icon: Clock, label: 'About 2 minutes' },
                          { icon: ShieldCheck, label: 'Free to start' },
                        ].map(item => (
                          <span
                            key={item.label}
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm"
                          >
                            <item.icon className="h-3.5 w-3.5 text-blue-600" />
                            {item.label}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">How it works</span>
                      <ol className="mt-4 space-y-5">
                        {[
                          { icon: Target, title: 'Tell us your goal', text: 'Your exam, target score and exam date.' },
                          { icon: CalendarDays, title: 'Get your plan', text: 'Built around your weakest skill and your daily time.' },
                          { icon: Zap, title: 'Start practising', text: 'Take a diagnostic test or jump straight into your dashboard.' },
                        ].map((item, index, all) => (
                          <li key={item.title} className="relative flex gap-3.5">
                            {index < all.length - 1 && (
                              <span aria-hidden className="absolute left-[19px] top-11 h-[calc(100%-1.75rem)] w-px bg-slate-200" />
                            )}
                            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                              <item.icon className="h-[18px] w-[18px]" />
                              <span className="absolute -right-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white ring-2 ring-white">
                                {index + 1}
                              </span>
                            </span>
                            <div className="pt-0.5">
                              <span className="block text-sm font-bold text-slate-900">{item.title}</span>
                              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{item.text}</span>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                )}

                {/* Step 2: Exam */}
                {step.id === 'exam' && (
                  <div className="w-full max-w-2xl space-y-6">
                    <QuestionHeader
                      badge={step.pill}
                      headingRef={headingRef}
                      title="Which exam are you preparing for?"
                      subtitle="Your practice, mock tests and scoring are all built around it."
                    />

                    <div className="grid gap-3.5 sm:grid-cols-2">
                      {EXAMS.map(option => {
                        const style = EXAM_STYLE[option.id];
                        const selected = option.id === exam;
                        const ielts = option.id === 'IELTS';
                        return (
                          <button
                            key={option.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => chooseExam(option.id)}
                            className={`group relative flex flex-col overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200 ${
                              selected
                                ? `${style.ring} bg-white shadow-md ring-2`
                                : 'border-slate-200/80 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_28px_-18px_rgba(15,23,42,0.45)]'
                            }`}
                          >
                            <span
                              aria-hidden
                              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${style.wash} to-transparent transition-opacity duration-300 ${
                                selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
                              }`}
                            />

                            {/* Name first in the DOM, so the button's name starts with the exam. */}
                            <span className="relative flex items-start justify-between gap-3">
                              <span className="font-display text-2xl font-bold text-slate-900">{option.name}</span>
                              <span
                                className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                                  selected ? `${style.tile} border-transparent` : 'border-slate-200 bg-white'
                                }`}
                              >
                                {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                              </span>
                            </span>

                            <span className="relative mt-1 text-xs leading-relaxed text-slate-500">{option.blurb}</span>

                            {/* The scoring scale, drawn as rising steps and lit in the exam's colour once chosen. */}
                            <span aria-hidden className="relative mt-5 block">
                              <span className="flex items-end gap-[3px]">
                                {(ielts ? Array.from({ length: 11 }) : Array.from({ length: 17 })).map((_, i, all) => (
                                  <span
                                    key={i}
                                    style={{ height: `${6 + (i / (all.length - 1)) * 14}px` }}
                                    className={`flex-1 rounded-sm transition-colors ${selected ? style.bar : 'bg-slate-200'} ${
                                      selected ? '' : 'group-hover:bg-slate-300'
                                    }`}
                                  />
                                ))}
                              </span>
                              <span className="mt-1.5 flex justify-between text-[10px] font-bold text-slate-400">
                                <span>{ielts ? '0' : '10'}</span>
                                <span className={selected ? 'text-slate-700' : ''}>{option.scale}</span>
                                <span>{ielts ? '9' : '90'}</span>
                              </span>
                            </span>

                            <span className="relative mt-4 flex flex-wrap gap-1.5">
                              {style.facts.map(fact => (
                                <span
                                  key={fact}
                                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                                    selected ? style.soft : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {fact}
                                </span>
                              ))}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {exam === 'IELTS' && (
                      <fieldset className="space-y-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <legend className="px-1 text-xs font-bold text-slate-700">Which IELTS test?</legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {IELTS_MODULE_CHOICES.map(choice => (
                            <button
                              key={choice.id}
                              type="button"
                              aria-pressed={ieltsModule === choice.id}
                              onClick={() => setIeltsModule(choice.id)}
                              className={`rounded-xl border px-3 py-2 text-left transition ${
                                ieltsModule === choice.id
                                  ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                                  : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <span className="block text-sm font-bold text-slate-900">{IELTS_MODULE_LABEL[choice.id]}</span>
                              <span className="block text-[11px] leading-snug text-slate-500">{choice.blurb}</span>
                            </button>
                          ))}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Listening, Speaking and Writing Task 2 are the same in both. You can change this later in your profile.
                        </p>
                      </fieldset>
                    )}

                    {/* Coming soon, kept small so it never competes with the real choice. */}
                    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-slate-200 px-4 py-3">
                      <span className="mr-1 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        Coming soon
                      </span>
                      {UPCOMING_PREPARATIONS.map(option => {
                        const FlagComponent = option.flagCode === 'KR' ? KR : option.flagCode === 'JP' ? JP : DE;
                        return (
                          <span
                            key={option.id}
                            title={option.blurb}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600"
                          >
                            <span className="flex h-3.5 w-5 overflow-hidden rounded-[3px] ring-1 ring-black/5">
                              <FlagComponent className="h-full w-full object-cover" />
                            </span>
                            {option.name}
                            <span className="text-[10px] font-medium text-slate-400">{option.scale}</span>
                          </span>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/60 px-4 py-3 text-xs text-amber-900">
                      <Lock className="h-4 w-4 shrink-0 text-amber-600" />
                      <p>
                        <span className="font-bold">Choose carefully:</span> your exam can&apos;t be changed after setup, so
                        pick the one you&apos;re sitting.
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 3: Goal */}
                {step.id === 'goal' && (
                  <div className="w-full max-w-2xl space-y-6">
                    <QuestionHeader
                      badge={step.pill}
                      headingRef={headingRef}
                      title={`What's your ${examName(chosen)} for?`}
                      subtitle="Knowing why keeps you going on the hard days. Pick the one that fits best."
                    />

                    <div className="grid gap-3.5 sm:grid-cols-2">
                      {STUDY_GOALS.map(option => {
                        const Icon = GOAL_ICONS[option.id];
                        const style = GOAL_STYLE[option.id];
                        const selected = goal === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setGoal(option.id)}
                            className={`group relative flex flex-col overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200 ${
                              selected
                                ? `${style.ring} bg-white shadow-md ring-2`
                                : 'border-slate-200/80 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_28px_-18px_rgba(15,23,42,0.45)]'
                            }`}
                          >
                            <span
                              aria-hidden
                              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${style.wash} to-transparent transition-opacity duration-300 ${
                                selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
                              }`}
                            />

                            <span className="relative flex items-start justify-between gap-3">
                              <span
                                className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200 ${
                                  selected ? `${style.tile} shadow-sm` : style.soft
                                }`}
                              >
                                <Icon className="h-7 w-7" />
                              </span>
                              <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                                  selected ? `${style.tile} border-transparent` : 'border-slate-200 bg-white'
                                }`}
                              >
                                {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                              </span>
                            </span>

                            <span className="relative mt-4 block text-base font-bold text-slate-900">{option.label}</span>
                            <span className="relative mt-1 block text-xs leading-relaxed text-slate-500">{option.detail}</span>

                            <span className="relative mt-4 flex flex-wrap gap-1.5">
                              {style.examples.map(example => (
                                <span
                                  key={example}
                                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                                    selected ? style.soft : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {example}
                                </span>
                              ))}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div
                      aria-live="polite"
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-xs transition-colors ${
                        goal ? 'border-slate-200/80 bg-white text-slate-600 shadow-sm' : 'border-dashed border-slate-200 text-slate-400'
                      }`}
                    >
                      <Target className={`h-4 w-4 shrink-0 ${goal ? 'text-blue-600' : 'text-slate-300'}`} />
                      <p>
                        {goal
                          ? <>We&apos;ll keep <span className="font-bold text-slate-900">{STUDY_GOALS.find(item => item.id === goal)?.short}</span> on your dashboard as a daily reminder of why you&apos;re practising.</>
                          : 'Your goal shows on your dashboard, so the reason you started is always in view.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 4: Destination - Matching User Screenshot */}
                {step.id === 'destination' && (
                  <div className="w-full max-w-xl space-y-6">
                    <QuestionHeader
                      badge={step.pill}
                      headingRef={headingRef}
                      title="Where are you headed?"
                      subtitle="Pick the country your score is for. This helps us personalize your study plan, content and goals."
                    />

                    <div className="grid max-w-xl grid-cols-1 gap-3.5 sm:grid-cols-2">
                      {DESTINATIONS.map(option => {
                        const selected = destination === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setDestination(option.id)}
                            className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all duration-200 ${
                              selected
                                ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-600/20'
                                : 'border-slate-200/80 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)]'
                            }`}
                          >
                            <div className="flex items-center gap-3.5">
                              <DestinationFlag id={option.id} />
                              <span className={`text-sm font-bold ${selected ? 'text-blue-950' : 'text-slate-800'}`}>
                                {option.label}
                              </span>
                            </div>
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                                selected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'
                              }`}
                            >
                              {selected && <div className="h-2 w-2 rounded-full bg-white" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Step 5: Experience */}
                {step.id === 'experience' && (
                  <div className="w-full max-w-2xl space-y-6">
                    <QuestionHeader
                      badge={step.pill}
                      headingRef={headingRef}
                      title={`Have you taken ${examName(chosen)} before?`}
                      subtitle="First try or a comeback, we'll plan from where you are."
                    />

                    <div className="grid gap-3.5 sm:grid-cols-2">
                      {[
                        {
                          key: 'first' as const,
                          title: 'This is my first attempt',
                          desc: "We'll start with the fundamentals of every task.",
                          icon: SproutIcon,
                          tile: 'bg-emerald-600 text-white',
                          soft: 'bg-emerald-50 text-emerald-600',
                          ring: 'border-emerald-600 ring-emerald-600/20',
                          wash: 'from-emerald-50',
                        },
                        {
                          key: 'retake' as const,
                          title: "I've taken it before",
                          desc: "We'll help you beat your last result.",
                          icon: RetakeIcon,
                          tile: 'bg-blue-600 text-white',
                          soft: 'bg-blue-50 text-blue-600',
                          ring: 'border-blue-600 ring-blue-600/20',
                          wash: 'from-blue-50',
                        },
                      ].map(opt => {
                        const selected = prior === opt.key;
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setPrior(opt.key)}
                            className={`group relative flex flex-col overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200 ${
                              selected
                                ? `${opt.ring} bg-white shadow-md ring-2`
                                : 'border-slate-200/80 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_28px_-18px_rgba(15,23,42,0.45)]'
                            }`}
                          >
                            <span
                              aria-hidden
                              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${opt.wash} to-transparent transition-opacity duration-300 ${
                                selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
                              }`}
                            />
                            <span className="relative flex items-start justify-between gap-3">
                              <span
                                className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200 ${
                                  selected ? `${opt.tile} shadow-sm` : opt.soft
                                }`}
                              >
                                <Icon className="h-7 w-7" />
                              </span>
                              <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                                  selected ? `${opt.tile} border-transparent` : 'border-slate-200 bg-white'
                                }`}
                              >
                                {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                              </span>
                            </span>
                            <span className="relative mt-4 block text-base font-bold text-slate-900">{opt.title}</span>
                            <span className="relative mt-1 block text-xs leading-relaxed text-slate-500">{opt.desc}</span>
                          </button>
                        );
                      })}
                    </div>

                    {prior === 'retake' && (
                      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2">
                        <span className="block text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Your last {unit}
                        </span>

                        <div className="mt-2 flex items-center justify-center gap-6">
                          <button
                            type="button"
                            onClick={() => setPreviousScore(clampScore(chosen, previousScore - scale.step))}
                            disabled={previousScore <= scale.min}
                            aria-label={`Lower your last ${unit}`}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-blue-200 hover:text-blue-600 active:scale-95 disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-600"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="min-w-[5ch] text-center font-display text-5xl font-extrabold tracking-tight text-slate-900">
                            {formatScore(chosen, previousScore)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPreviousScore(clampScore(chosen, previousScore + scale.step))}
                            disabled={previousScore >= scale.max}
                            aria-label={`Raise your last ${unit}`}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-blue-200 hover:text-blue-600 active:scale-95 disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-600"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        <p className="mt-1 text-center text-sm font-semibold text-slate-500" aria-live="polite">
                          {scoreLabel(chosen, previousScore)}
                        </p>

                        <input
                          type="range"
                          min={scale.min}
                          max={scale.max}
                          step={scale.step}
                          value={previousScore}
                          onChange={event => setPreviousScore(Number(event.target.value))}
                          aria-label={`Your last ${unit}`}
                          className="mt-5 w-full cursor-pointer accent-blue-600"
                        />
                        <div className="mt-1 flex justify-between text-[10px] font-bold text-slate-400">
                          <span>{formatScore(chosen, scale.min)}</span>
                          <span>{formatScore(chosen, scale.max)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 6: Target Score */}
                {step.id === 'target' && (
                  <div className="w-full max-w-xl space-y-6">
                    <QuestionHeader
                      badge={step.pill}
                      headingRef={headingRef}
                      title={`What ${unit} are you aiming for?`}
                      subtitle="Your dashboard measures your progress against this target."
                    />

                    <div className="max-w-xl rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7">
                      {/* The ring shows where the target sits on the scale; minus and plus fine-tune it. */}
                      <div className="flex items-center justify-center gap-5 sm:gap-8">
                        <button
                          type="button"
                          onClick={() => setScore(clampScore(chosen, score - scale.step))}
                          disabled={score <= scale.min}
                          aria-label={`Lower target ${unit}`}
                          className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-blue-200 hover:text-blue-600 active:scale-95 disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-600"
                        >
                          <Minus className="h-4 w-4" />
                        </button>

                        <ScoreRing
                          fraction={(score - scale.min) / (scale.max - scale.min)}
                          value={formatScore(chosen, score)}
                          caption={chosen === 'IELTS' ? 'Target band' : 'Target score'}
                        />

                        <button
                          type="button"
                          onClick={() => setScore(clampScore(chosen, score + scale.step))}
                          disabled={score >= scale.max}
                          aria-label={`Raise target ${unit}`}
                          className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-blue-200 hover:text-blue-600 active:scale-95 disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-600"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <p className="mt-3 text-center text-sm font-semibold text-slate-600" aria-live="polite">
                        {scoreLabel(chosen, score)}
                      </p>

                      <div className="mt-6">
                        <input
                          type="range"
                          min={scale.min}
                          max={scale.max}
                          step={scale.step}
                          value={score}
                          onChange={event => setScore(Number(event.target.value))}
                          aria-label="Target score"
                          aria-valuetext={scoreLabel(chosen, score)}
                          className="w-full cursor-pointer accent-blue-600"
                        />

                        <div className="mt-1 flex justify-between text-[10px] font-bold text-slate-400">
                          <span>{formatScore(chosen, scale.min)}</span>
                          <span>{formatScore(chosen, scale.max)}</span>
                        </div>

                        {/* A row, not marks placed on the track: IELTS targets sit half a band
                            apart, which is too close to label on a phone-width slider. */}
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                          <span className="mr-1 text-[11px] font-semibold text-slate-400">Popular targets</span>
                          {scale.presets.map(preset => {
                            const active = score === preset;
                            return (
                              <button
                                key={preset}
                                type="button"
                                aria-pressed={active}
                                onClick={() => setScore(preset)}
                                className={`h-8 rounded-full px-3.5 text-xs font-bold transition-all ${
                                  active
                                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                                    : 'border border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:bg-white hover:text-blue-700'
                                }`}
                              >
                                {formatScore(chosen, preset)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {prior === 'retake' && (
                      <p className="max-w-xl rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-xs font-semibold text-blue-800">
                        {score > previousScore
                          ? `That's ${formatScore(chosen, score - previousScore)} higher than last time. Let's get you there.`
                          : `That's no higher than your last ${unit} of ${formatScore(chosen, previousScore)}. Aim a little higher?`}
                      </p>
                    )}
                    <div className="flex max-w-xl items-start gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <p className="text-xs leading-relaxed text-slate-600">
                        Not sure? Aim for the {unit} your university, visa or registration body asks for. You can
                        change it any time in Profile.
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 7: Exam Date */}
                {step.id === 'date' && (
                  <div className="w-full max-w-2xl space-y-6">
                    <QuestionHeader
                      badge={step.pill}
                      headingRef={headingRef}
                      title="When is your exam?"
                      subtitle="Knowing your runway helps you pace your practice."
                    />

                    <div className="grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
                      {[1, 3, 6].map(months => {
                        const value = isoDateAfterMonths(months);
                        const selected = !notBooked && examDate === value;
                        const when = new Date(`${value}T00:00:00`);
                        const weeks = Math.round((daysUntil(value) ?? 0) / 7);
                        return (
                          <button
                            key={months}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => {
                              setExamDate(value);
                              setNotBooked(false);
                            }}
                            className={`relative flex flex-col rounded-2xl border p-4 text-left transition-all duration-200 ${selected ? 'border-blue-600 bg-white shadow-md ring-2 ring-blue-600/20' : 'border-slate-200/80 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_12px_28px_-18px_rgba(15,23,42,0.45)]'}`}
                          >
                            <span className="flex items-start justify-between">
                              <MiniCalendar
                                month={when.toLocaleDateString('en-US', { month: 'short' })}
                                day={when.getDate()}
                                active={selected}
                              />
                              <SelectedCheck on={selected} />
                            </span>
                            <span className={`mt-3 whitespace-nowrap font-display text-base font-bold ${selected ? 'text-blue-700' : 'text-slate-900'}`}>
                              In {months} month{months === 1 ? '' : 's'}
                            </span>
                            <span className="mt-0.5 text-[11px] font-semibold text-slate-400">{weeks} weeks to prepare</span>
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        aria-pressed={notBooked}
                        onClick={() => {
                          setNotBooked(true);
                          setExamDate('');
                        }}
                        className={`relative flex flex-col rounded-2xl border p-4 text-left transition-all duration-200 ${notBooked ? 'border-blue-600 bg-white shadow-md ring-2 ring-blue-600/20' : 'border-slate-200/80 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_12px_28px_-18px_rgba(15,23,42,0.45)]'}`}
                      >
                        <span className="flex items-start justify-between">
                          <span
                            className={`flex h-12 w-11 items-center justify-center rounded-xl border transition-colors ${
                              notBooked ? 'border-blue-600 bg-blue-600 text-white' : 'border-dashed border-slate-300 bg-slate-50 text-slate-400'
                            }`}
                          >
                            <CalendarClock className="h-5 w-5" />
                          </span>
                          <SelectedCheck on={notBooked} />
                        </span>
                        <span className={`mt-3 whitespace-nowrap font-display text-base font-bold ${notBooked ? 'text-blue-700' : 'text-slate-900'}`}>
                          Not booked yet
                        </span>
                        <span className="mt-0.5 text-[11px] font-semibold text-slate-400">Add it later</span>
                      </button>
                    </div>

                    <div className="flex max-w-2xl items-center gap-3">
                      <div className="h-px flex-1 bg-slate-200/80" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">or pick the exact date</span>
                      <div className="h-px flex-1 bg-slate-200/80" />
                    </div>

                    <label className="relative block max-w-2xl">
                      <span className="sr-only">Exam date</span>
                      <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-600" />
                      <input
                        type="date"
                        min={toIsoDate(new Date())}
                        value={examDate}
                        onChange={event => {
                          setExamDate(event.target.value);
                          setNotBooked(false);
                        }}
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                      />
                    </label>

                    <div aria-live="polite">
                      {notBooked ? (
                        <div className="flex max-w-2xl items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                            <CalendarClock className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">No problem, start practising now</p>
                            <p className="mt-0.5 text-xs text-slate-500">Add your date in Profile once it&apos;s booked and we&apos;ll start the countdown.</p>
                          </div>
                        </div>
                      ) : days === null ? (
                        <div className="flex max-w-2xl items-center gap-4 rounded-2xl border border-dashed border-slate-200 p-5">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                            <CalendarDays className="h-6 w-6" />
                          </div>
                          <p className="text-sm text-slate-400">Pick a date to see your countdown.</p>
                        </div>
                      ) : days < 0 ? (
                        <div className="max-w-2xl rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-sm font-semibold text-rose-700">
                          That date has passed. Pick an upcoming one.
                        </div>
                      ) : (
                        <div className="max-w-2xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                          <div className="flex items-center gap-5 bg-gradient-to-br from-blue-600 to-indigo-600 px-5 py-4 text-white">
                            <div>
                              <span className="block font-display text-4xl font-extrabold leading-none">{days}</span>
                              <span className="mt-1 block text-[11px] font-semibold text-white/80">
                                day{days === 1 ? '' : 's'} to go
                              </span>
                            </div>
                            <div className="h-10 w-px bg-white/25" />
                            <div className="min-w-0">
                              <span className="block text-[11px] font-bold uppercase tracking-wider text-white/70">Exam day</span>
                              <span className="block truncate text-sm font-bold">{formatExamDate(examDate)}</span>
                            </div>
                            {days >= 7 && (
                              <span className="ml-auto hidden rounded-full bg-white/15 px-3 py-1 text-xs font-bold sm:inline">
                                {Math.floor(days / 7)} week{Math.floor(days / 7) === 1 ? '' : 's'}
                              </span>
                            )}
                          </div>
                          <p className="px-5 py-3 text-xs text-slate-600">{runwayAdvice(days)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 8: Focus Skill */}
                {step.id === 'focus' && (
                  <div className="w-full max-w-2xl space-y-6">
                    <QuestionHeader
                      badge={step.pill}
                      headingRef={headingRef}
                      title="Which skill feels hardest right now?"
                      subtitle="We'll put it front and centre on your dashboard."
                    />

                    <div className="grid gap-3.5 sm:grid-cols-2">
                      {FOCUS_SKILLS.map(option => {
                        const style = SKILL_STYLE[option.id];
                        const Icon = style.icon;
                        const selected = focus === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setFocus(option.id)}
                            className={`group relative flex flex-col overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200 ${
                              selected
                                ? `${style.ring} bg-white shadow-md ring-2`
                                : 'border-slate-200/80 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_28px_-18px_rgba(15,23,42,0.45)]'
                            }`}
                          >
                            <span
                              aria-hidden
                              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${style.wash} to-transparent transition-opacity duration-300 ${
                                selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
                              }`}
                            />

                            {/* Label first in the DOM so the button's name starts with the skill. */}
                            <span className="relative order-2 mt-4 block text-base font-bold text-slate-900">{option.label}</span>
                            <span className="relative order-1 flex items-start justify-between gap-3">
                              <span
                                className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200 ${
                                  selected ? `${style.tile} shadow-sm` : style.soft
                                }`}
                              >
                                <Icon className="h-7 w-7" />
                              </span>
                              <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                                  selected ? `${style.tile} border-transparent` : 'border-slate-200 bg-white'
                                }`}
                              >
                                {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                              </span>
                            </span>
                            <span className="relative order-3 mt-1 block text-xs leading-relaxed text-slate-500">{option.detail}</span>

                            <span className="relative order-4 mt-4 flex flex-wrap gap-1.5">
                              {SKILL_TASKS[chosen][option.id].map(task => (
                                <span
                                  key={task}
                                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                                    selected ? style.soft : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {task}
                                </span>
                              ))}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Step 9: Daily Routine */}
                {step.id === 'daily' && (
                  <div className="w-full max-w-2xl space-y-6">
                    <QuestionHeader
                      badge={step.pill}
                      headingRef={headingRef}
                      title="How much time can you practise each day?"
                      subtitle="Pick what you can keep up, even on busy days."
                    />

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {DAILY_MINUTES.map((value, level) => {
                        const selected = minutes === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setMinutes(value)}
                            className={`relative flex flex-col rounded-2xl border p-4 text-left transition-all duration-200 ${
                              selected
                                ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-600/20'
                                : 'border-slate-200/80 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_12px_28px_-18px_rgba(15,23,42,0.45)]'
                            }`}
                          >
                            <span className={`block font-display text-2xl font-bold ${selected ? 'text-blue-700' : 'text-slate-900'}`}>
                              {dailyLabel(value)}
                            </span>
                            <span className="mt-0.5 text-[11px] font-semibold text-slate-400">
                              {DAILY_PACE[value] ?? 'a day'} · a day
                            </span>

                            {/* Intensity meter: one more bar lit per step up. */}
                            <span aria-hidden className="mt-3 flex items-end gap-1">
                              {DAILY_MINUTES.map((_, bar) => (
                                <span
                                  key={bar}
                                  style={{ height: `${6 + bar * 3}px` }}
                                  className={`w-2 rounded-sm transition-colors ${
                                    bar <= level
                                      ? selected
                                        ? 'bg-blue-600'
                                        : 'bg-blue-300'
                                      : 'bg-slate-100'
                                  }`}
                                />
                              ))}
                            </span>

                            {selected && (
                              <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div
                      aria-live="polite"
                      className={`flex items-center gap-4 rounded-2xl border px-4 py-3.5 transition-colors ${
                        minutes === null ? 'border-dashed border-slate-200' : 'border-slate-200/80 bg-white shadow-sm'
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          minutes === null ? 'bg-slate-50 text-slate-300' : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        <Clock className="h-5 w-5" />
                      </div>
                      {minutes === null ? (
                        <p className="text-xs text-slate-500">Twenty focused minutes a day adds up faster than you think.</p>
                      ) : (
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {Math.round(((minutes * 7) / 60) * 10) / 10} hours a week
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">{practiceHours(minutes, days)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 10: Plan Selection */}
                {step.id === 'plan' && (
                  <div className="w-full max-w-5xl space-y-8">
                    <QuestionHeader
                      badge={step.pill}
                      headingRef={headingRef}
                      title="Choose how you want to prepare"
                      subtitle="Start free, or unlock more daily practice and full mock tests. You can upgrade any time."
                    />

                    <div className="grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {plans.map((plan, index) => (
                        <PlanCard
                          key={plan.id}
                          plan={plan}
                          index={index}
                          selected={planId === plan.id}
                          current={plan.id === currentPaidPlan}
                          currentUntil={plan.id === currentPaidPlan ? user.planValidUntil : undefined}
                          onSelect={() => setPlanId(plan.id)}
                        />
                      ))}
                    </div>

                    {selectedPlan && isPaidTier(selectedPlan.id) && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl border border-blue-200 bg-blue-50/60 max-w-5xl">
                        <div className="flex items-center gap-3.5">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                            <Crown className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {paymentSubmitted
                                ? `Payment proof submitted for ${formatPlanName(selectedPlan.id)} · NPR ${selectedPlan.priceNPR.toLocaleString()}`
                                : `Pay with QR for ${formatPlanName(selectedPlan.id)} · NPR ${selectedPlan.priceNPR.toLocaleString()}`}
                            </p>
                            <p className="text-xs text-slate-500">
                              {paymentSubmitted
                                ? 'Your screenshot was received. Verification is in progress.'
                                : 'Scan with eSewa, Khalti, or your bank app right here.'}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          onClick={() => setCheckoutModalOpen(true)}
                          className="w-full sm:w-auto h-11 rounded-full bg-blue-600 px-6 font-bold text-sm text-white shadow-md shadow-blue-500/20 hover:bg-blue-700"
                        >
                          {paymentSubmitted ? 'View payment status' : 'Pay now with QR'}
                        </Button>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400 max-w-5xl pt-2">
                      <div className="flex items-center gap-3.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Accepted methods:
                        </span>
                        <img src="/images/esewa-logo.png" alt="eSewa" className="h-6 w-auto object-contain" />
                        <img src="/images/khalti-logo.svg" alt="Khalti" className="h-6 w-auto object-contain" />
                        <span className="font-bold text-slate-600">All Banks</span>
                      </div>
                      <span className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                        <ShieldCheck className="h-4 w-4 text-blue-600" />
                        Pay once · No auto-renewal
                      </span>
                    </div>
                  </div>
                )}

                {/* Step 11: Tour */}
                {step.id === 'tour' && (
                  <div className="w-full max-w-4xl space-y-6">
                    <QuestionHeader
                      badge={step.pill}
                      headingRef={headingRef}
                      title="Your Prepyo toolkit"
                      subtitle="Six tools that work together to get you to your target. Pick one to see how it helps."
                    />

                    <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                      <div
                        role="tablist"
                        aria-label="Prepyo tools"
                        aria-orientation="vertical"
                        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1"
                      >
                        {FEATURES.map((item, index) => {
                          const Icon = item.icon;
                          const selected = index === feature;
                          return (
                            <button
                              key={item.title}
                              type="button"
                              role="tab"
                              id={`tour-tab-${index}`}
                              aria-selected={selected}
                              aria-controls="tour-panel"
                              onClick={() => setFeature(index)}
                              className={`group flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all duration-200 ${
                                selected
                                  ? 'border-blue-600/40 bg-white shadow-sm ring-1 ring-blue-600/20'
                                  : 'border-slate-200/60 bg-white/50 hover:border-slate-200 hover:bg-white lg:border-transparent lg:bg-transparent'
                              }`}
                            >
                              <span
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                                  selected ? item.accent.tile : item.accent.soft
                                }`}
                              >
                                <Icon className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-bold text-slate-900">{item.title}</span>
                                <span className="hidden truncate text-[11px] text-slate-400 sm:block">{item.tag}</span>
                              </span>
                              <ArrowRight
                                className={`hidden h-3.5 w-3.5 shrink-0 transition-all lg:block ${
                                  selected
                                    ? 'translate-x-0 text-blue-600'
                                    : '-translate-x-1 text-transparent group-hover:text-slate-300'
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>

                      <ToolkitPanel index={feature} onNext={() => setFeature((feature + 1) % FEATURES.length)} />
                    </div>
                  </div>
                )}

                {/* Step 12: All Set */}
                {step.id === 'ready' && (
                  <div className="relative grid w-full max-w-4xl items-center gap-8 lg:grid-cols-2 lg:gap-12">
                    <Confetti />

                    <div className="space-y-6">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-500 text-white shadow-md shadow-blue-500/30">
                        <Check className="h-7 w-7" strokeWidth={3} />
                      </div>

                      <div>
                        <h2
                          ref={headingRef}
                          id="onboarding-title"
                          tabIndex={-1}
                          className="font-display text-3xl font-bold tracking-tight text-slate-900 outline-none sm:text-4xl"
                        >
                          You&apos;re all set,{' '}
                          <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
                            {firstName}!
                          </span>
                        </h2>
                        <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500 sm:text-base">
                          {needsPayment && selectedPlan && !paymentSubmitted
                            ? `One last step: pay for ${formatPlanName(selectedPlan.id)} and your plan is ready on your dashboard.`
                            : "Your plan is ready and waiting on your dashboard. A quick diagnostic test is the best place to start."}
                        </p>
                      </div>

                      {saveError && (
                        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-800">
                          <p className="font-bold">We couldn&apos;t save your plan.</p>
                          <p className="mt-0.5">{saveError}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => void finish('/dashboard')} disabled={saving}>
                              Try again
                            </Button>
                            <Button size="sm" variant="ghost" onClick={onDone} disabled={saving}>
                              Continue for now
                            </Button>
                          </div>
                        </div>
                      )}

                      {needsPayment && selectedPlan && paymentSubmitted && (
                        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-800">
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                          <div>
                            <p className="font-bold">Payment proof submitted</p>
                            <p className="text-[11px] text-emerald-700">
                              Your payment is being verified. You can start practising right away.
                            </p>
                          </div>
                        </div>
                      )}

                      {needsPayment && selectedPlan && !paymentSubmitted ? (
                        <div className="space-y-3">
                          <div className="flex flex-col gap-2.5 sm:flex-row">
                            <Button
                              type="button"
                              onClick={() => setCheckoutModalOpen(true)}
                              disabled={saving}
                              className="h-12 gap-2 rounded-full bg-blue-600 px-7 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700"
                            >
                              <Crown className="h-4 w-4" />
                              Pay now with QR
                            </Button>
                            <Button
                              onClick={() => void finish(`/subscription?plan=${selectedPlan.id}`)}
                              disabled={saving}
                              variant="outline"
                              className="h-12 rounded-full border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 hover:bg-slate-50"
                            >
                              Continue to payment
                            </Button>
                          </div>
                          <button
                            type="button"
                            onClick={() => void finish('/dashboard')}
                            disabled={saving}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900 disabled:opacity-50"
                          >
                            Pay later, go to my dashboard
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2.5 sm:flex-row">
                          <Button
                            onClick={() => void finish('/diagnostic')}
                            disabled={saving}
                            className="h-12 gap-2 rounded-full bg-blue-600 px-7 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700"
                          >
                            <Sparkles className="h-4 w-4" />
                            Take the diagnostic test
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => void finish('/dashboard')}
                            disabled={saving}
                            className="h-12 rounded-full border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 hover:bg-slate-50"
                          >
                            Go to my dashboard
                          </Button>
                        </div>
                      )}
                    </div>

                    <PlanSummary
                      exam={chosen}
                      score={score}
                      days={dateValid ? days : null}
                      examDate={dateValid ? examDate : null}
                      focus={focus}
                      minutes={minutes}
                      plan={selectedPlan}
                      awaitingPayment={needsPayment && !paymentSubmitted}
                    />
                  </div>
                )}
              </div>
            </div>
        </main>

        {step.id !== 'ready' && (
          <OnboardingNavigation
            showBack={stepIndex > 0}
            onBack={() => go(stepIndex - 1)}
            onContinue={() => go(stepIndex + 1)}
            disabled={!canContinue}
            label={step.id === 'welcome' ? "Let's go" : step.id === 'tour' ? 'See my plan' : 'Continue'}
          />
        )}

        {/* In-onboarding QR Checkout Modal */}
        {selectedPlan && isPaidTier(selectedPlan.id) && (
          <QRPaymentCheckoutDialog
            open={checkoutModalOpen}
            onOpenChange={setCheckoutModalOpen}
            selectedPlan={selectedPlan}
            onSuccess={() => {
              setPaymentSubmitted(true);
              toast.success('Payment submitted', 'Your proof has been received.');
            }}
          />
        )}
      </div>
    </OnboardingLayout>
  );
}

function PlanCard({
  plan,
  index,
  selected,
  current,
  currentUntil,
  onSelect,
}: {
  plan: SubscriptionPlan;
  index: number;
  selected: boolean;
  current: boolean;
  currentUntil?: string;
  onSelect: () => void;
}) {
  const free = plan.priceNPR === 0;
  const days = planAccessDays(plan);
  const brand = formatPlanName(plan.id);
  const tier = planUsageTier(plan.id);
  const perks = [
    plan.unlimited ? 'Unlimited practice sub-tests' : `${tier} daily practice`,
    `${tier} AI gradings for speaking & writing`,
    `${tier} full mock exams`,
    free ? 'Free forever' : `${days} days of access${plan.bonusDays ? ` (incl. ${plan.bonusDays} bonus)` : ''}`,
  ];

  return (
    <OptionCard
      selected={selected}
      onClick={onSelect}
      style={{ animationDelay: `${index * 50}ms` }}
      className="relative flex flex-col justify-between p-5 sm:p-6 min-h-[340px]"
    >
      {(plan.isPopular || current) && (
        <span className="absolute -top-3 left-5 rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
          {current ? 'Current plan' : 'Most popular'}
        </span>
      )}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-widest text-blue-600">
              {PLAN_TAGLINES[plan.id]}
            </span>{' '}
            <span className="mt-1 block font-display text-lg font-bold text-slate-900">{brand}</span>
          </div>
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
              selected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'
            }`}
          >
            {selected && <div className="h-2 w-2 rounded-full bg-white" />}
          </span>
        </div>

        <span className="mt-4 block font-display text-3xl font-black text-slate-900">
          {free ? 'Free' : `NPR ${plan.priceNPR.toLocaleString()}`}
        </span>
        <span className="mt-0.5 block text-xs font-semibold text-slate-400">
          {current && currentUntil
            ? `Active until ${formatExamDate(currentUntil)}`
            : free
              ? 'No payment needed'
              : `One-time · ${days} days`}
        </span>
      </div>

      <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
        {perks.map(perk => (
          <div key={perk} className="flex items-start gap-2 text-xs text-slate-600">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
            <span>{perk}</span>
          </div>
        ))}
      </div>
    </OptionCard>
  );
}

/** A tear-off calendar page: month strip on top, day underneath. */
function MiniCalendar({ month, day, active }: { month: string; day: number; active: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-12 w-11 flex-col overflow-hidden rounded-xl border text-center shadow-sm transition-colors ${
        active ? 'border-blue-600' : 'border-slate-200'
      }`}
    >
      <span
        className={`py-0.5 text-[9px] font-bold uppercase tracking-wider transition-colors ${
          active ? 'bg-blue-600 text-white' : 'bg-rose-500 text-white'
        }`}
      >
        {month}
      </span>
      <span className="flex flex-1 items-center justify-center bg-white font-display text-lg font-extrabold leading-none text-slate-900">
        {day}
      </span>
    </span>
  );
}

function SelectedCheck({ on }: { on: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
        on ? 'border-transparent bg-blue-600 text-white' : 'border-slate-200 bg-white'
      }`}
    >
      {on && <Check className="h-3 w-3" strokeWidth={3} />}
    </span>
  );
}

function ScoreRing({ fraction, value, caption }: { fraction: number; value: string; caption: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.min(1, Math.max(0, fraction)) * circumference;

  return (
    <div className="relative h-36 w-36 shrink-0 sm:h-40 sm:w-40">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id="score-ring-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <circle cx="64" cy="64" r={radius} fill="none" stroke="#eef2ff" strokeWidth="10" />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="url(#score-ring-gradient)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          className="transition-[stroke-dasharray] duration-300 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">{value}</span>
        <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{caption}</span>
      </div>
    </div>
  );
}

function PlanSummary({
  exam,
  score,
  days,
  examDate,
  focus,
  minutes,
  plan,
  awaitingPayment,
}: {
  exam: ExamType;
  score: number;
  days: number | null;
  examDate: string | null;
  focus: SkillType | null;
  minutes: number | null;
  plan: SubscriptionPlan | null;
  awaitingPayment: boolean;
}) {
  const FocusIcon = focus ? SKILL_ICONS[focus] : Target;
  const rows: { icon: LucideIcon; label: string; value: string; note?: string }[] = [
    { icon: CalendarDays, label: 'Exam date', value: examDate ? formatExamDate(examDate) : 'Not booked yet' },
    { icon: FocusIcon, label: 'Focus skill', value: skillLabel(focus ?? undefined) ?? '—' },
    { icon: Clock, label: 'Daily practice', value: minutes ? dailyLabel(minutes) : '—' },
    {
      icon: Crown,
      label: 'Plan',
      value: plan ? formatPlanName(plan.id) : '—',
      note: plan && awaitingPayment ? `NPR ${plan.priceNPR.toLocaleString()} · awaiting payment` : undefined,
    },
  ];

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 p-6 text-white">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-xl" />
        <span className="relative text-[11px] font-bold uppercase tracking-wider text-white/70">
          Your {examName(exam)} plan
        </span>
        <div className="relative mt-3 flex items-end justify-between gap-4">
          <div>
            <span className="block font-display text-5xl font-extrabold leading-none tracking-tight">
              {formatScore(exam, score)}
            </span>
            <span className="mt-1.5 block text-xs font-semibold text-white/75">Target {exam === 'IELTS' ? 'band' : 'score'}</span>
          </div>
          {days !== null && (
            <div className="rounded-2xl bg-white/15 px-4 py-2.5 text-right backdrop-blur-sm">
              <span className="block font-display text-2xl font-bold leading-none">{days}</span>
              <span className="mt-1 block text-[11px] font-semibold text-white/80">day{days === 1 ? '' : 's'} to go</span>
            </div>
          )}
        </div>
      </div>

      <dl className="divide-y divide-slate-100 px-6">
        {rows.map(row => (
          <div key={row.label} className="flex items-center gap-3 py-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <row.icon className="h-4 w-4" />
            </span>
            <dt className="flex-1 text-xs font-semibold text-slate-500">{row.label}</dt>
            <dd className="text-right">
              <span className="block text-sm font-bold text-slate-900">{row.value}</span>
              {row.note && <span className="block text-[11px] font-semibold text-amber-600">{row.note}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ToolkitPanel({ index, onNext }: { index: number; onNext: () => void }) {
  const active = FEATURES[index];
  const next = FEATURES[(index + 1) % FEATURES.length];
  const Icon = active.icon;
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div
      key={index}
      id="tour-panel"
      role="tabpanel"
      aria-labelledby={`tour-tab-${index}`}
      className="relative flex min-h-[320px] flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm motion-safe:animate-in motion-safe:fade-in duration-300 sm:p-7"
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-gradient-to-br ${active.accent.glow} to-transparent blur-2xl`}
      />

      <div className="relative flex items-start justify-between gap-4">
        <span className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm ${active.accent.tile}`}>
          <Icon className="h-7 w-7" />
        </span>
        <span className="font-display text-xs font-bold tabular-nums text-slate-300">
          {pad(index + 1)} / {pad(FEATURES.length)}
        </span>
      </div>

      <div className="relative mt-5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{active.tag}</span>
        <h3 className="mt-1 font-display text-xl font-bold text-slate-900">{active.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{active.text}</p>
      </div>

      <ul className="relative mb-6 mt-5 space-y-2.5">
        {active.highlights.map(point => (
          <li key={point} className="flex items-start gap-2.5 text-sm text-slate-700">
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${active.accent.soft}`}>
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span>{point}</span>
          </li>
        ))}
      </ul>

      <div className="relative mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        {active.where ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
            <MapPin className="h-3.5 w-3.5 text-blue-600" />
            {active.where}
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-slate-400">Tracks itself as you practise</span>
        )}
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 transition-colors hover:text-blue-800"
        >
          Next: {next.title}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function DestinationFlag({ id, className }: { id: string; className?: string }) {
  const containerClass =
    className ??
    'flex h-6 w-8.5 shrink-0 items-center justify-center overflow-hidden rounded-[5px] border border-slate-200/90 bg-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-black/5';

  switch (id) {
    case 'australia':
      return (
        <span className={containerClass} title="Australia">
          <AU className="h-full w-full object-cover" />
        </span>
      );
    case 'uk':
      return (
        <span className={containerClass} title="United Kingdom">
          <GB className="h-full w-full object-cover" />
        </span>
      );
    case 'canada':
      return (
        <span className={containerClass} title="Canada">
          <CA className="h-full w-full object-cover" />
        </span>
      );
    case 'usa':
      return (
        <span className={containerClass} title="United States">
          <US className="h-full w-full object-cover" />
        </span>
      );
    case 'new-zealand':
      return (
        <span className={containerClass} title="New Zealand">
          <NZ className="h-full w-full object-cover" />
        </span>
      );
    case 'korea':
    case 'south-korea':
      return (
        <span className={containerClass} title="South Korea">
          <KR className="h-full w-full object-cover" />
        </span>
      );
    case 'japan':
      return (
        <span className={containerClass} title="Japan">
          <JP className="h-full w-full object-cover" />
        </span>
      );
    case 'germany':
      return (
        <span className={containerClass} title="Germany">
          <DE className="h-full w-full object-cover" />
        </span>
      );
    default:
      return (
        <span
          className={
            className ??
            'flex h-6 w-8.5 shrink-0 items-center justify-center overflow-hidden rounded-[5px] border border-slate-200/90 bg-slate-100 text-slate-500 shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
          }
          title="Somewhere else"
        >
          <Globe className="h-4 w-4" />
        </span>
      );
  }
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 40 }, (_, index) => ({
        left: (index * 37) % 100,
        delay: (index % 10) * 0.09,
        duration: 2.1 + ((index * 7) % 10) / 10,
        drift: ((index * 53) % 140) - 70,
        color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
        size: 6 + (index % 4) * 2,
        round: index % 3 === 0,
      })),
    [],
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-16 h-0 motion-reduce:hidden">
      {pieces.map((piece, index) => (
        <span
          key={index}
          className="absolute top-0 animate-onboarding-confetti"
          style={
            {
              left: `${piece.left}%`,
              width: piece.size,
              height: piece.round ? piece.size : piece.size * 0.45,
              background: piece.color,
              borderRadius: piece.round ? '9999px' : '2px',
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              '--drift': `${piece.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
