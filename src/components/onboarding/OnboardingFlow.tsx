import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  BookOpen,
  Bot,
  Briefcase,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Crown,
  Flame,
  Globe,
  GraduationCap,
  Headphones,
  Lock,
  LucideIcon,
  Mic,
  PenTool,
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
} from '@/lib/subscriptions';
import { ExamType, SkillType, SubscriptionPlan, SubscriptionTier, UserProfile } from '@/lib/types';
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
    blurb: 'Computer-based exam with speech recognition & instant scoring engines.',
  },
];

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

const GOAL_ICONS: Record<StudyGoal, LucideIcon> = {
  university: GraduationCap,
  migration: Compass,
  work: Briefcase,
  other: Sparkles,
};

const FEATURES: { icon: LucideIcon; title: string; text: string; where?: string }[] = [
  {
    icon: PenTool,
    title: 'Practice Studio',
    text: 'Every task type for all four skills. Reading and listening are marked instantly; writing and speaking get rubric feedback.',
    where: 'Practice, in the sidebar',
  },
  {
    icon: Award,
    title: 'Mock tests',
    text: 'Timed papers under exam conditions, with a full score report at the end.',
    where: 'Mock Exam, in the sidebar',
  },
  {
    icon: Bot,
    title: 'AI Coach',
    text: 'Stuck on a question? Ask the coach to explain it, right where you are.',
    where: 'AI Coach, in the sidebar',
  },
  {
    icon: RotateCcw,
    title: 'Mistake bank',
    text: 'Questions you miss are saved, so you can retry them until they stick.',
    where: 'Home → Mistake Bank',
  },
  {
    icon: Flame,
    title: 'Streaks & XP',
    text: 'Practise a little every day to keep your streak alive and climb the levels.',
  },
  {
    icon: Trophy,
    title: 'Nepal Study Challenge',
    text: 'See how your practice stacks up against learners across Nepal.',
    where: 'Home → Nepal Study Challenge',
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
      <div className="flex flex-1 flex-col justify-between overflow-y-auto">
        <OnboardingProgress current={stepIndex + 1} total={STEPS.length} progress={progress} />

        {/* Content Body: Centered Container */}
        <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
          <div className="flex w-full flex-col items-center justify-center py-4">
            <div
              key={step.id}
              className={`flex w-full justify-center motion-safe:animate-in motion-safe:fade-in duration-300 ${slide}`}
            >


                {/* Step 1: Welcome Screen */}
                {step.id === 'welcome' && (
                  <div className="w-full max-w-2xl space-y-6">
                    <div>
                      <h2
                        ref={headingRef}
                        id="onboarding-title"
                        tabIndex={-1}
                        className="mt-3 font-display text-2xl font-bold tracking-tight text-slate-900 outline-none sm:text-3xl"
                      >
                        Namaste,{' '}
                        <span className="block text-blue-600 sm:inline">{firstName}!</span>
                      </h2>
                      <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-500 sm:text-base">
                        Welcome to Prepyo. Answer {QUESTION_COUNT} quick questions and we&apos;ll build a study plan
                        around your exam, your goals and your schedule.
                      </p>
                    </div>

                    {/* 4 Feature Cards as in Screenshot */}
                    <div className="grid grid-cols-2 gap-3.5 pt-2 sm:grid-cols-4">
                      {[
                        { icon: Target, bg: 'bg-blue-100 text-blue-600', title: '9 quick questions', sub: 'Just a few minutes' },
                        { icon: CalendarDays, bg: 'bg-purple-100 text-purple-600', title: 'A plan made for you', sub: 'Personalized & smart' },
                        { icon: Zap, bg: 'bg-emerald-100 text-emerald-600', title: 'Your goal, our focus', sub: 'IELTS or PTE' },
                        { icon: Clock, bg: 'bg-amber-100 text-amber-600', title: 'About 2 minutes', sub: 'Super quick' },
                      ].map(item => (
                        <div
                          key={item.title}
                          className="flex flex-col space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
                        >
                          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.bg}`}>
                            <item.icon className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                            <p className="mt-0.5 text-[11px] text-slate-400">{item.sub}</p>
                          </div>
                        </div>
                      ))}
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

                    <div className="space-y-4">
                      <div className="grid max-w-2xl gap-3.5 sm:grid-cols-2">
                        {EXAMS.map(option => {
                          const selected = option.id === exam;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => chooseExam(option.id)}
                              className={`relative flex flex-col justify-between rounded-2xl border p-5 text-left transition-all duration-200 ${
                                selected
                                  ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-600/20'
                                  : 'border-slate-200/80 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)]'
                              }`}
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-display text-2xl font-bold text-slate-900">{option.name}</span>
                                  <span
                                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                                      selected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'
                                    }`}
                                  >
                                    {selected && <div className="h-2 w-2 rounded-full bg-white" />}
                                  </span>
                                </div>

                                <div className="flex">
                                  <span
                                    className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-bold transition-colors ${
                                      selected
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {option.scale}
                                  </span>
                                </div>
                              </div>

                              <p className="mt-3 text-xs leading-relaxed text-slate-500">{option.blurb}</p>
                            </button>
                          );
                        })}
                      </div>

                      {/* Coming Soon Tracks: Korean, Japanese, Germany */}
                      <div className="pt-2">
                        <div className="flex items-center gap-2.5 mb-3">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Upcoming Language Preparations
                          </span>
                          <div className="h-px flex-1 bg-slate-200/80" />
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-0.5 rounded-full">
                            <Sparkles className="h-3 w-3 text-amber-500" />
                            Coming soon
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          {UPCOMING_PREPARATIONS.map(option => {
                            const FlagComponent =
                              option.flagCode === 'KR' ? KR : option.flagCode === 'JP' ? JP : DE;
                            return (
                              <button
                                key={option.id}
                                type="button"
                                disabled
                                aria-disabled="true"
                                className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-left opacity-75 cursor-not-allowed select-none transition-all hover:border-slate-300"
                              >
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <div className="flex items-center gap-2">
                                      <span className="flex h-5 w-7 shrink-0 items-center justify-center overflow-hidden rounded-[4px] border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                                        <FlagComponent className="h-full w-full object-cover" />
                                      </span>
                                      <span className="font-display text-sm font-bold text-slate-800 leading-tight">
                                        {option.name}
                                      </span>
                                    </div>
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100/70 px-1.5 py-0.5 rounded-md shrink-0">
                                      Soon
                                    </span>
                                  </div>

                                  <div className="flex">
                                    <span className="inline-flex items-center rounded-md bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                      {option.scale}
                                    </span>
                                  </div>
                                </div>

                                <p className="mt-2.5 text-[11px] leading-relaxed text-slate-500">{option.blurb}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex max-w-2xl items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-xs text-slate-600 shadow-sm">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <Lock className="h-3.5 w-3.5" />
                      </div>
                      <p>Your exam can&apos;t be changed after setup, so pick the one you&apos;re sitting.</p>
                    </div>
                  </div>
                )}

                {/* Step 3: Goal */}
                {step.id === 'goal' && (
                  <div className="w-full max-w-xl space-y-6">
                    <QuestionHeader
                      badge={step.pill}
                      headingRef={headingRef}
                      title={`What's your ${examName(chosen)} for?`}
                      subtitle="We'll keep your end goal in view on your dashboard."
                    />

                    <div className="grid max-w-xl gap-3.5 sm:grid-cols-2">
                      {STUDY_GOALS.map(option => {
                        const Icon = GOAL_ICONS[option.id] || Sparkles;
                        const selected = goal === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setGoal(option.id)}
                            className={`flex items-start justify-between rounded-2xl border p-4 text-left transition-all duration-200 ${
                              selected
                                ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-600/20'
                                : 'border-slate-200/80 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)]'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                                  selected ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'
                                }`}
                              >
                                <Icon className="h-5 w-5" />
                              </div>
                              <div>
                                <span className="block text-sm font-bold text-slate-900">{option.label}</span>
                                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                                  {option.detail}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
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
                  <div className="w-full max-w-xl space-y-6">
                    <QuestionHeader
                      badge={step.pill}
                      headingRef={headingRef}
                      title={`Have you taken ${examName(chosen)} before?`}
                      subtitle="First try or a comeback, we'll plan from where you are."
                    />

                    <div className="grid max-w-xl gap-3.5 sm:grid-cols-2">
                      {[
                        {
                          key: 'first',
                          title: 'This is my first attempt',
                          desc: "We'll start with the fundamentals of every task.",
                          icon: Target,
                        },
                        {
                          key: 'retake',
                          title: "I've taken it before",
                          desc: "We'll help you beat your last result.",
                          icon: RotateCcw,
                        },
                      ].map(opt => {
                        const selected = prior === opt.key;
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setPrior(opt.key as 'first' | 'retake')}
                            className={`flex items-start justify-between rounded-2xl border p-4 text-left transition-all duration-200 ${
                              selected
                                ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-600/20'
                                : 'border-slate-200/80 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)]'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                  selected ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'
                                }`}
                              >
                                <opt.icon className="h-5 w-5" />
                              </div>
                              <div>
                                <span className="block text-sm font-bold text-slate-900">{opt.title}</span>
                                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{opt.desc}</span>
                              </div>
                            </div>
                            <span
                              className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                                selected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'
                              }`}
                            >
                              {selected && <div className="h-2 w-2 rounded-full bg-white" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {prior === 'retake' && (
                      <div className="max-w-xl space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm motion-safe:animate-in motion-safe:fade-in">
                        <div className="flex items-end justify-between">
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              Your last {unit}
                            </span>
                            <span className="block font-display text-4xl font-extrabold text-slate-900">
                              {formatScore(chosen, previousScore)}
                            </span>
                          </div>
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <RotateCcw className="h-5 w-5" />
                          </div>
                        </div>
                        <input
                          type="range"
                          min={scale.min}
                          max={scale.max}
                          step={scale.step}
                          value={previousScore}
                          onChange={event => setPreviousScore(Number(event.target.value))}
                          aria-label={`Your last ${unit}`}
                          className="w-full cursor-pointer accent-blue-600"
                        />
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

                    <div className="max-w-xl space-y-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                      <div className="flex items-end justify-between">
                        <div>
                          <span className="block font-display text-6xl font-extrabold tracking-tight text-blue-600">
                            {formatScore(chosen, score)}
                          </span>
                          <span className="text-xs font-bold text-slate-500">{scoreLabel(chosen, score)}</span>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                          <Target className="h-6 w-6" />
                        </div>
                      </div>

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

                      <div className="flex justify-between text-[10px] font-bold text-slate-400">
                        <span>{formatScore(chosen, scale.min)}</span>
                        <span>{formatScore(chosen, scale.max)}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        <span className="mr-1 text-[11px] font-bold text-slate-400">Quick picks:</span>
                        {scale.presets.map(preset => (
                          <button
                            key={preset}
                            type="button"
                            aria-pressed={score === preset}
                            onClick={() => setScore(preset)}
                            className={`h-9 rounded-full px-4 text-xs font-bold transition-all ${
                              score === preset
                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                                : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {formatScore(chosen, preset)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {prior === 'retake' && (
                      <p className="max-w-xl rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-xs font-semibold text-blue-800">
                        {score > previousScore
                          ? `That's ${formatScore(chosen, score - previousScore)} higher than last time. Let's get you there.`
                          : `That's no higher than your last ${unit} of ${formatScore(chosen, previousScore)}. Aim a little higher?`}
                      </p>
                    )}
                  </div>
                )}

                {/* Step 7: Exam Date */}
                {step.id === 'date' && (
                  <div className="w-full max-w-xl space-y-6">
                    <QuestionHeader
                      badge={step.pill}
                      headingRef={headingRef}
                      title="When is your exam?"
                      subtitle="Knowing your runway helps you pace your practice."
                    />

                    <div className="flex flex-wrap gap-2 max-w-xl">
                      {[1, 3, 6].map(months => {
                        const value = isoDateAfterMonths(months);
                        const selected = !notBooked && examDate === value;
                        return (
                          <button
                            key={months}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => {
                              setExamDate(value);
                              setNotBooked(false);
                            }}
                            className={`h-9 rounded-full px-4 text-xs font-bold transition-all ${
                              selected
                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            In {months} month{months === 1 ? '' : 's'}
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
                        className={`h-9 rounded-full px-4 text-xs font-bold transition-all ${
                          notBooked
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Not booked yet
                      </button>
                    </div>

                    <label className="block max-w-xl space-y-1.5">
                      <span className="text-xs font-bold text-slate-700">Or pick the exact date</span>
                      <input
                        type="date"
                        min={toIsoDate(new Date())}
                        value={examDate}
                        onChange={event => {
                          setExamDate(event.target.value);
                          setNotBooked(false);
                        }}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 sm:w-64"
                      />
                    </label>

                    <div className="flex max-w-xl items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                        <CalendarDays className="h-6 w-6" />
                      </div>
                      {notBooked ? (
                        <p className="text-sm font-medium text-slate-700">
                          No problem. You can add the date in Profile once it&apos;s booked.
                        </p>
                      ) : days === null ? (
                        <p className="text-sm text-slate-500">Pick a date to see your countdown.</p>
                      ) : days < 0 ? (
                        <p className="text-sm font-semibold text-rose-600">That date has passed. Pick an upcoming one.</p>
                      ) : (
                        <div aria-live="polite">
                          <p className="text-sm text-slate-900">
                            <span className="font-display text-4xl font-extrabold text-blue-600">{days}</span>{' '}
                            <span className="font-bold">day{days === 1 ? '' : 's'} to go</span>
                          </p>
                          <p className="text-xs text-slate-400">{runwayAdvice(days)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 8: Focus Skill */}
                {step.id === 'focus' && (
                  <div className="w-full max-w-xl space-y-6">
                    <QuestionHeader
                      badge={step.pill}
                      headingRef={headingRef}
                      title="Which skill feels hardest right now?"
                      subtitle="We'll put it front and centre on your dashboard."
                    />

                    <div className="grid max-w-xl gap-3.5 sm:grid-cols-2">
                      {FOCUS_SKILLS.map(option => {
                        const Icon = SKILL_ICONS[option.id];
                        const selected = focus === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setFocus(option.id)}
                            className={`flex items-start justify-between rounded-2xl border p-4 text-left transition-all duration-200 ${
                              selected
                                ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-600/20'
                                : 'border-slate-200/80 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)]'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                  selected ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'
                                }`}
                              >
                                <Icon className="h-5 w-5" />
                              </div>
                              <div>
                                <span className="block text-sm font-bold text-slate-900">{option.label}</span>
                                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                                  {option.detail}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
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

                {/* Step 9: Daily Routine */}
                {step.id === 'daily' && (
                  <div className="w-full max-w-xl space-y-6">
                    <QuestionHeader
                      badge={step.pill}
                      headingRef={headingRef}
                      title="How much time can you practise each day?"
                      subtitle="Pick what you can keep up, even on busy days."
                    />

                    <div className="grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-3">
                      {DAILY_MINUTES.map(value => {
                        const selected = minutes === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setMinutes(value)}
                            className={`rounded-2xl border p-4 text-left transition-all duration-200 ${
                              selected
                                ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-600/20'
                                : 'border-slate-200/80 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)]'
                            }`}
                          >
                            <span className="block font-display text-2xl font-bold text-slate-900">
                              {dailyLabel(value)}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400">a day</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex max-w-xl items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-sm">
                      <Clock className="h-5 w-5 shrink-0 text-blue-600" />
                      <p className="text-xs text-slate-600">
                        {minutes === null
                          ? 'Twenty focused minutes a day adds up faster than you think.'
                          : practiceHours(minutes, days)}
                      </p>
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
                  <div className="w-full max-w-2xl space-y-6">
                    <QuestionHeader
                      badge={step.pill}
                      headingRef={headingRef}
                      title="Here's what you can do on Prepyo"
                      subtitle="Tap a card to learn more."
                    />

                    <div className="grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
                      {FEATURES.map((item, index) => {
                        const Icon = item.icon;
                        const selected = index === feature;
                        return (
                          <button
                            key={item.title}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setFeature(index)}
                            className={`rounded-2xl border p-4 text-left transition-all duration-200 ${
                              selected
                                ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-600/20'
                                : 'border-slate-200/80 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)]'
                            }`}
                          >
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                                selected ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="mt-3 block text-xs font-bold text-slate-900">{item.title}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="max-w-2xl rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                      <p className="text-xs leading-relaxed text-slate-700">{FEATURES[feature].text}</p>
                      {FEATURES[feature].where && (
                        <p className="mt-1.5 text-[11px] font-bold text-blue-600">Find it: {FEATURES[feature].where}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 12: All Set */}
                {step.id === 'ready' && (
                  <div className="w-full max-w-xl space-y-6">
                    <Confetti />
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/30">
                      <Check className="h-8 w-8" strokeWidth={3} />
                    </div>

                    <div>
                      <h2
                        ref={headingRef}
                        id="onboarding-title"
                        tabIndex={-1}
                        className="mt-3 font-display text-2xl font-bold tracking-tight text-slate-900 outline-none sm:text-3xl"
                      >
                        You&apos;re all set,{' '}
                        <span className="block text-blue-600 sm:inline">{firstName}!</span>
                      </h2>
                      <p className="mt-2 text-sm text-slate-500 sm:text-base">
                        {needsPayment && selectedPlan
                          ? `One last step: pay for ${formatPlanName(selectedPlan.id)} and your plan is ready on your dashboard.`
                          : "Here's your plan. It's waiting on your dashboard."}
                      </p>
                    </div>

                    <div className="grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-3">
                      {[
                        { label: 'Exam', value: chosen === 'PTE' ? 'PTE' : 'IELTS' },
                        { label: 'Target', value: formatScore(chosen, score) },
                        { label: 'Exam date', value: dateValid ? formatExamDate(examDate) : 'Not booked' },
                        { label: 'Focus', value: skillLabel(focus ?? undefined) ?? '—' },
                        { label: 'Daily', value: minutes ? dailyLabel(minutes) : '—' },
                        { label: 'Plan', value: selectedPlan ? formatPlanName(selectedPlan.id) : '—' },
                      ].map(item => (
                        <div
                          key={item.label}
                          className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm"
                        >
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {item.label}
                          </span>
                          <span className="mt-1 block font-display text-base font-bold text-slate-900">{item.value}</span>
                        </div>
                      ))}
                    </div>

                    {saveError && (
                      <div
                        role="alert"
                        className="max-w-xl rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-800"
                      >
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

                    <div className="pt-2">
                      {needsPayment && selectedPlan ? (
                        paymentSubmitted ? (
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-800 max-w-xl">
                              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                              <div>
                                <p className="font-bold">Payment proof submitted</p>
                                <p className="text-[11px] text-emerald-700">
                                  Your payment is being verified. You can start practicing right away.
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row">
                              <Button
                                onClick={() => void finish('/diagnostic')}
                                disabled={saving}
                                className="h-12 rounded-full bg-blue-600 px-8 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 gap-2"
                              >
                                <Sparkles className="h-4 w-4" />
                                Take the diagnostic test
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => void finish('/dashboard')}
                                disabled={saving}
                                className="h-12 rounded-full border-slate-200 bg-white px-7 text-sm font-bold text-slate-700 hover:bg-slate-50"
                              >
                                Go to my dashboard
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3 sm:flex-row">
                            <Button
                              type="button"
                              onClick={() => setCheckoutModalOpen(true)}
                              disabled={saving}
                              className="h-12 rounded-full bg-blue-600 px-7 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 gap-2"
                            >
                              <Crown className="h-4 w-4" />
                              Pay now with QR · NPR {selectedPlan.priceNPR.toLocaleString()}
                            </Button>
                            <Button
                              onClick={() => void finish(`/subscription?plan=${selectedPlan.id}`)}
                              disabled={saving}
                              variant="outline"
                              className="h-12 rounded-full border-slate-200 bg-white px-7 text-sm font-bold text-slate-700 hover:bg-slate-50"
                            >
                              Continue to payment · NPR {selectedPlan.priceNPR.toLocaleString()}
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => void finish('/dashboard')}
                              disabled={saving}
                              className="h-12 text-slate-500 hover:text-slate-900"
                            >
                              Pay later, go to my dashboard
                            </Button>
                          </div>
                        )
                      ) : (
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <Button
                            onClick={() => void finish('/diagnostic')}
                            disabled={saving}
                            className="h-12 rounded-full bg-blue-600 px-8 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 gap-2"
                          >
                            <Sparkles className="h-4 w-4" />
                            Take the diagnostic test
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => void finish('/dashboard')}
                            disabled={saving}
                            className="h-12 rounded-full border-slate-200 bg-white px-7 text-sm font-bold text-slate-700 hover:bg-slate-50"
                          >
                            Go to my dashboard
                          </Button>
                        </div>
                      )}
                    </div>
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
  const perks = [
    `${plan.subTestsPerDay} practice sub-tests a day`,
    `${plan.mockTestsIncluded} full mock exam${plan.mockTestsIncluded === 1 ? '' : 's'}${free ? '' : ` included`}`,
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
