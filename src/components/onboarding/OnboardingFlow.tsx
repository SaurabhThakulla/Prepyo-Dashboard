import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  Crown,
  Globe,
  GraduationCap,
  Lock,
  LucideIcon,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Video,
  Zap,
} from 'lucide-react';
import DE from 'country-flag-icons/react/3x2/DE';
import { Button } from '@/components/ui/button';
import {
  ChoiceCard,
  OnboardingNavigation,
  OnboardingLayout,
  OnboardingProgress,
  OnboardingSidebar,
  OptionCard,
  PlanLine,
  QuestionHeader,
} from '@/components/onboarding/OnboardingChrome';
import { useToast } from '@/components/ui/toast';
import { useApp } from '@/context/AppContext';
import { CdsTrack, cdsApi, type NccWing } from '@/cds/cdsApi';
import { CDS_TRACKS, NCC_WINGS } from '@/cds/cdsShared';
import { errorMessage } from '@/lib/api';
import { useSubscriptionPlans } from '@/lib/hooks/useResources';
import QRPaymentCheckoutDialog from '@/components/subscription/QRPaymentCheckoutDialog';
import {
  DEFAULT_PLANS,
  PLAN_TAGLINES,
  PLANS_ON_SALE,
  formatGradings,
  formatPlanName,
  premiumPlanIdFor,
  gradingsPeriodLabel,
  isPaidTier,
  planAccessDays,
  planUsageTier,
} from '@/lib/subscriptions';
import { EXAM_LABELS, ExamType, SubscriptionPlan, SubscriptionTier, UserProfile, IELTSModule, ieltsModuleOf, skillsFor } from '@/lib/types';
import {
  SCORE_SCALE,
  formatExamDate,
  inIndia,
} from '@/components/onboarding/onboarding';

const STEPS = [
  { id: 'welcome', pill: 'Your Exam Copilot', label: 'Welcome', tagline: "Let's build a plan that fits you." },
  { id: 'exam', pill: 'Your Target', label: 'Your exam', tagline: 'Everything in Prepyo adapts to your exam.' },
  { id: 'referral', pill: 'Discovery', label: 'How you found us', tagline: 'Help us learn how you discovered Prepyo.' },
  { id: 'plan', pill: 'Your Plan', label: 'Choose a plan', tagline: 'Start free, and unlock more whenever you need it.' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

const STEP_ICONS: Record<StepId, LucideIcon> = {
  welcome: Sparkles,
  exam: GraduationCap,
  referral: Globe,
  plan: Crown,
};

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
  {
    id: 'EPS_TOPIK',
    name: 'EPS-TOPIK',
    scale: 'Scores 0–100',
    blurb: 'The Korean test for work in South Korea under the Employment Permit System.',
  },
  {
    id: 'JLPT',
    name: 'JLPT / NAT N5 · N4',
    scale: 'Scores 0–180',
    blurb: 'The Japanese test for study and work in Japan. Pick N5 or N4 on Home; NAT-TEST 5Q and 4Q have the same sections.',
  },
  {
    id: 'CDS',
    name: 'UPSC CDS',
    scale: 'Scores 0–300',
    blurb: 'English, General Knowledge and Maths.',
  },
  {
    id: 'NCC',
    name: "NCC 'B' & 'C'",
    scale: 'Written paper, 350 marks',
    blurb: "The NCC 'B' and 'C' certificate written paper (Army Wing): common and Army subjects. The practical is done at camp.",
  },
];

/** The ends of each exam's scale, drawn under its card. */
const SCALE_ENDS: Record<ExamType, [string, string]> = {
  IELTS: ['0', '9'],
  PTE: ['10', '90'],
  EPS_TOPIK: ['0', '100'],
  JLPT: ['0', '180'],
  CDS: ['0', '300'],
  NCC: ['0', '350'],
};

/** Exam-step look, and what Prepyo gives you for each exam. */
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
  EPS_TOPIK: {
    facts: ['All 16 official task types', 'Reading & listening'],
    tile: 'bg-emerald-600 text-white',
    soft: 'bg-emerald-50 text-emerald-700',
    ring: 'border-emerald-600 ring-emerald-600/20',
    wash: 'from-emerald-50',
    bar: 'bg-emerald-600',
  },
  JLPT: {
    facts: ['Every N5 and N4 task type', 'Learn Japanese from kana'],
    tile: 'bg-red-600 text-white',
    soft: 'bg-red-50 text-red-700',
    ring: 'border-red-600 ring-red-600/20',
    wash: 'from-red-50',
    bar: 'bg-red-600',
  },
  CDS: {
    facts: ['UPSC marking'],
    tile: 'bg-emerald-600 text-white',
    soft: 'bg-emerald-50 text-emerald-700',
    ring: 'border-emerald-600 ring-emerald-600/20',
    wash: 'from-emerald-50',
    bar: 'bg-emerald-600',
  },
  NCC: {
    facts: ['Written paper'],
    tile: 'bg-indigo-600 text-white',
    soft: 'bg-indigo-50 text-indigo-700',
    ring: 'border-indigo-600 ring-indigo-600/20',
    wash: 'from-indigo-50',
    bar: 'bg-indigo-600',
  },
};

const UPCOMING_PREPARATIONS: {
  id: string;
  name: string;
  scale: string;
  blurb: string;
  flagCode: 'DE';
}[] = [
  {
    id: 'germany',
    name: 'Germany',
    scale: 'Goethe · TestDaF',
    blurb: 'German language training for Ausbildung & university study in Germany.',
    flagCode: 'DE',
  },
];

const REFERRAL_OPTIONS: { id: string; label: string; icon: LucideIcon; blurb: string }[] = [
  { id: 'youtube', label: 'YouTube', icon: Video, blurb: 'Videos, tutorials, or student reviews' },
  { id: 'instagram', label: 'Instagram', icon: Camera, blurb: 'Posts, reels, or stories' },
  { id: 'tiktok', label: 'TikTok', icon: Smartphone, blurb: 'Short videos or creator recommendations' },
  { id: 'friends', label: 'Friends & Family', icon: Users, blurb: 'Word of mouth from friends or fellow aspirants' },
  { id: 'search', label: 'Google Search', icon: Globe, blurb: 'Searching for exam prep or mock tests' },
  { id: 'other', label: 'Other', icon: Sparkles, blurb: 'Community groups, blogs, or events' },
];

const examName = (exam: ExamType) => (exam === 'PTE' ? 'PTE Academic' : EXAM_LABELS[exam]);

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
  const { completeOnboarding, setActiveExam } = useApp();
  const plansQuery = useSubscriptionPlans();

  const plans = useMemo(() => {
    const served = plansQuery.data?.plans ?? [];
    return PLANS_ON_SALE.map(
      tier => served.find(plan => plan.id === tier) ?? DEFAULT_PLANS.find(plan => plan.id === tier),
    ).filter((p): p is SubscriptionPlan => p !== undefined);
  }, [plansQuery.data]);

  const currentPaidPlan: SubscriptionTier | null = user.paidPlanActive ? user.planId : null;

  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [exam, setExam] = useState<ExamType | null>(null);
  // IMA, INA and AFA sit three CDS papers; OTA two. Changeable later on Home.
  const [cdsTrack, setCdsTrack] = useState<CdsTrack>('ima');
  const [nccWing, setNccWing] = useState<NccWing>('army');
  const ieltsModule: IELTSModule = ieltsModuleOf(user);
  const [referralSource, setReferralSource] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(currentPaidPlan ?? 'free');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const steps = STEPS;
  // India is offered UPSC CDS and NCC; everywhere else, every exam but those two.
  const exams = useMemo(() => EXAMS.filter(option => (option.id === 'CDS' || option.id === 'NCC') === inIndia()), []);
  // With one exam on offer (UPSC CDS in India) it is chosen already, so its academy question shows at once.
  useEffect(() => {
    if (exams.length === 1 && !exam) chooseExam(exams[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exams]);
  const step = steps[stepIndex];
  const firstName = user.name?.trim().split(/\s+/)[0] || 'there';
  const chosen: ExamType = exam ?? 'PTE';

  // Plans logic
  const isCds = chosen === 'CDS';
  const isNcc = chosen === 'NCC';
  const premiumId = premiumPlanIdFor(chosen, currentPaidPlan);
  const standardExamPlans = plans.filter(plan => plan.id === 'free' || plan.id === premiumId);

  // CDS specific plans
  const cdsPlans: SubscriptionPlan[] = [
    {
      id: 'free',
      name: 'Basic',
      priceNPR: 0,
      durationMonths: 0,
      durationDays: 0,
      bonusDays: 0,
      features: ['Official 2024 sample tests', 'Authentic UPSC 1/3 negative marking', 'Standard timer simulation'],
      subTestsPerDay: 5,
      mockTestsIncluded: 1,
      isPopular: false,
    },
    {
      id: 'cds_monthly',
      name: 'CDS Monthly',
      priceNPR: 199,
      durationMonths: 1,
      durationDays: 30,
      bonusDays: 0,
      features: [
        'Complete UPSC CDS test bank (English, GK, Maths)',
        'Full 2-hour official exam simulation',
        'Detailed answer keys & explanations',
        'Automatic Mistake Notebook tracking',
      ],
      subTestsPerDay: 100,
      mockTestsIncluded: 20,
      isPopular: true,
      unlimited: true,
    },
    {
      id: 'cds_annual',
      name: 'CDS 1-Year Pass',
      priceNPR: 1199,
      durationMonths: 12,
      durationDays: 365,
      bonusDays: 0,
      features: [
        '365 days unlimited CDS & defence exam access',
        'All upcoming CDS (I & II) mock papers',
        'Complete sectional cutoffs & academy rank predictors',
        'Priority mistake analysis & doubt clearing',
      ],
      subTestsPerDay: 100,
      mockTestsIncluded: 100,
      isPopular: false,
      unlimited: true,
    },
  ];

  // NCC: free, or NCC Monthly at INR 199 (000226).
  const nccPlans: SubscriptionPlan[] = [
    { ...cdsPlans[0], features: ['Practice sets in every subject', '1 full mock test', 'Answer keys'] },
    {
      id: 'ncc_monthly',
      name: 'NCC Monthly',
      priceNPR: 199,
      durationMonths: 1,
      durationDays: 30,
      bonusDays: 0,
      features: [
        'Practice in all 17 subjects of the written paper',
        "Full 'B' and 'C' certificate mock tests",
        'Answer keys and explanations',
        'Mistake Notebook',
      ],
      subTestsPerDay: 100,
      mockTestsIncluded: 20,
      isPopular: true,
      unlimited: true,
    },
  ];

  const displayPlans = isCds ? cdsPlans : isNcc ? nccPlans : standardExamPlans;
  const selectedPlan = displayPlans.find(plan => plan.id === planId) ?? null;
  const needsPayment = selectedPlan !== null && selectedPlan.priceNPR > 0 && selectedPlan.id !== currentPaidPlan;

  const canContinue = (() => {
    switch (step.id) {
      case 'welcome':
        return true;
      case 'exam':
        return exam !== null;
      case 'referral':
        return referralSource !== null;
      case 'plan':
        return selectedPlan !== null;
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
    if (next < 0 || next >= steps.length || next === stepIndex) return;
    setDirection(next > stepIndex ? 1 : -1);
    setStepIndex(next);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.key === 'ArrowRight' && canContinue) {
        if (stepIndex === steps.length - 1) {
          void finish('/dashboard');
        } else {
          go(stepIndex + 1);
        }
      }
      if (event.key === 'ArrowLeft' && stepIndex > 0) go(stepIndex - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const chooseExam = (next: ExamType) => {
    if (next === exam) return;
    setExam(next);
    if (next === 'CDS') {
      setPlanId('cds_monthly');
    } else if (next === 'NCC') {
      setPlanId('ncc_monthly');
    } else {
      setPlanId(premiumPlanIdFor(next, currentPaidPlan));
    }
  };

  const finish = async (path: string) => {
    if (exam && typeof setActiveExam === 'function') {
      void setActiveExam(exam);
    }
    if (preview) {
      toast.success('Preview complete', 'Onboarding preview closed.');
      onDone();
      return;
    }
    if (saving || !exam) return;
    setSaving(true);
    setSaveError(null);
    try {
      await completeOnboarding({
        targetExam: exam,
        ...(exam === 'IELTS' ? { targetModule: ieltsModule } : {}),
        targetScore: SCORE_SCALE[exam]?.fallback ?? 65,
        studyGoal: exam === 'CDS' || exam === 'NCC' ? 'work' : 'other',
        destination: exam === 'EPS_TOPIK' ? 'south-korea' : exam === 'JLPT' ? 'japan' : 'other',
        priorAttempt: 'first',
        focusSkill: skillsFor(exam)[0] ?? 'reading',
        dailyMinutes: 30,
        ...(referralSource ? { referralSource } : {}),
      });
      if (exam === 'NCC') {
        await cdsApi.setWing(nccWing).catch(() =>
          toast.warning('Your NCC wing was not saved', 'Choose Army, Naval or Air Wing on Home.'),
        );
      }
      if (exam === 'CDS') {
        await cdsApi.setTrack(cdsTrack).catch(() =>
          toast.warning('Your CDS route was not saved', 'Choose IMA · INA · AFA or OTA on Home.'),
        );
      }
      toast.success(`You're set for ${examName(exam)}`, 'Your plan is on your dashboard.');
      onDone();
      navigate(path);
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const progress = `${((stepIndex + 1) / steps.length) * 100}%`;
  const selectedReferralLabel = REFERRAL_OPTIONS.find(o => o.id === referralSource)?.label ?? null;

  const planLines: PlanLine[] = [
    { label: 'Exam', icon: GraduationCap, value: exam ? examName(exam) : null },
    { label: 'Found via', icon: Globe, value: selectedReferralLabel },
    { label: 'Plan', icon: Crown, value: selectedPlan ? selectedPlan.name : null },
  ];
  const slide = direction === 1 ? 'motion-safe:slide-in-from-right-8' : 'motion-safe:slide-in-from-left-8';

  return (
    <OnboardingLayout>
      <OnboardingSidebar steps={steps} stepIndex={stepIndex} plan={planLines} />

      {/* Main Flow Content Container */}
      <div
        className="flex min-w-0 flex-1 flex-col justify-between overflow-y-auto"
        style={{
          backgroundImage:
            'radial-gradient(60rem 28rem at 50% -8rem, rgba(59,130,246,0.13), transparent 70%), radial-gradient(#d9e2f5 1px, transparent 1px)',
          backgroundSize: 'auto, 22px 22px',
        }}
      >
        <OnboardingProgress
          current={stepIndex + 1}
          total={steps.length}
          progress={progress}
          onExit={preview ? onDone : undefined}
        />

        {/* Content Body: Centered Container */}
        <main className="mx-auto flex w-full max-w-5xl flex-1 justify-center px-4 py-8 sm:px-8 lg:px-12">
          <div className="my-auto flex w-full flex-col items-center justify-center py-4">
            <div
              key={step.id}
              className={`flex w-full justify-center motion-safe:animate-in motion-safe:fade-in duration-300 ${slide}`}
            >
              {/* Step 1: Welcome Screen */}
              {step.id === 'welcome' && (
                <div className="grid w-full max-w-4xl items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-12">
                  <div>
                    <span className="mb-5 grid h-16 w-16 place-items-center rounded-3xl bg-white shadow-[0_18px_40px_-20px_rgba(37,99,235,0.6)] ring-1 ring-blue-100 motion-safe:animate-onboarding-pop">
                      <img src="/prepyo-mark.webp" alt="" className="h-9 w-9 object-contain" />
                    </span>
                    <h2
                      ref={headingRef}
                      id="onboarding-title"
                      tabIndex={-1}
                      className="font-display text-4xl font-extrabold tracking-tight text-slate-900 outline-none sm:text-5xl"
                    >
                      Namaste,{' '}
                      <span className="text-blue-600">
                        {firstName}!
                      </span>
                    </h2>
                    <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500 sm:text-base">
                      Welcome to Prepyo. Just 3 quick questions and your personalized study workspace and practice hub will be ready.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-2">
                      {[
                        { icon: GraduationCap, label: 'Choose exam' },
                        { icon: Globe, label: 'Where you found us' },
                        { icon: ShieldCheck, label: 'Start free' },
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

                  <div className="relative overflow-hidden rounded-[2rem] bg-blue-800 bg-gradient-to-br from-[#2a56cf] via-blue-700 to-[#132e7d] p-7 text-white shadow-[0_30px_60px_-30px_rgba(29,78,216,0.8)]">
                    <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border-[26px] border-white/10" />
                    <span className="relative text-[11px] font-bold uppercase tracking-wider text-sky-200">How it works</span>
                    <ol className="relative mt-5 space-y-5">
                      {[
                        { icon: GraduationCap, title: 'Pick your exam', text: exams.map(option => option.name).join(', ') + '.' },
                        { icon: Globe, title: 'Tell us how you found us', text: 'YouTube, Instagram, TikTok, friends or search.' },
                        { icon: Zap, title: 'Start your practice', text: 'Unlock daily sub-tests, official mocks and instant feedback.' },
                      ].map((item, index, all) => (
                        <li key={item.title} className="relative flex gap-3.5">
                          {index < all.length - 1 && (
                            <span aria-hidden className="absolute left-[19px] top-11 h-[calc(100%-1.75rem)] w-px bg-white/20" />
                          )}
                          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.12] text-white ring-1 ring-white/15">
                            <item.icon className="h-[18px] w-[18px]" />
                            <span className="absolute -right-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-sky-300 text-xs font-bold text-[#0d1f5c] ring-2 ring-blue-700">
                              {index + 1}
                            </span>
                          </span>
                          <div className="pt-0.5">
                            <span className="block text-sm font-bold text-white">{item.title}</span>
                            <span className="mt-0.5 block text-xs leading-relaxed text-white/70">{item.text}</span>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}

              {/* Step 2: Choose Exam */}
              {step.id === 'exam' && (
                <div className="w-full max-w-4xl space-y-6">
                  <QuestionHeader
                    badge={step.label}
                    icon={STEP_ICONS[step.id]}
                    headingRef={headingRef}
                    title="Which exam are you preparing for?"
                    subtitle="Your practice, mock tests and scoring are all built around it."
                  />

                  <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                    {exams.map(option => {
                      const style = EXAM_STYLE[option.id];
                      const selected = option.id === exam;
                      const ielts = option.id === 'IELTS';
                      return (
                        <ChoiceCard
                          key={option.id}
                          selected={selected}
                          onSelect={() => chooseExam(option.id)}
                          tone={style}
                          title={option.name}
                          titleClassName="pr-8 font-display text-2xl"
                          detail={option.blurb}
                          chips={style.facts}
                        >
                          <span aria-hidden className="mt-5 block">
                            <span className="flex items-end gap-[3px]">
                              {(ielts ? Array.from({ length: 11 }) : Array.from({ length: 17 })).map((_, i, all) => (
                                <span
                                  key={i}
                                  style={{ height: `${6 + (i / (all.length - 1)) * 14}px` }}
                                  className={`flex-1 rounded-sm transition-colors ${selected ? style.bar : 'bg-slate-200 group-hover:bg-slate-300'}`}
                                />
                              ))}
                            </span>
                            <span className="mt-1.5 flex justify-between text-xs font-bold text-slate-400">
                              <span>{SCALE_ENDS[option.id][0]}</span>
                              <span className={selected ? 'text-slate-700' : ''}>{option.scale}</span>
                              <span>{SCALE_ENDS[option.id][1]}</span>
                            </span>
                          </span>
                        </ChoiceCard>
                      );
                    })}
                  </div>

                  {exam === 'CDS' && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                      <ChoiceRow
                        label="Academy"
                        value={cdsTrack}
                        onChange={setCdsTrack}
                        options={CDS_TRACKS.map(track => ({ id: track.id, label: track.label, note: track.detail }))}
                      />
                    </div>
                  )}

                  {exam === 'NCC' && (
                    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4">
                      <ChoiceRow
                        label="Wing"
                        value={nccWing}
                        onChange={setNccWing}
                        options={NCC_WINGS.map(wing => ({ id: wing.id, label: wing.label, note: wing.detail }))}
                      />
                    </div>
                  )}

                  {exam === 'IELTS' && (
                    <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
                      <span className="font-bold text-slate-900">IELTS Academic</span>: the test universities and student visas ask for.
                    </p>
                  )}

                  {/* Coming soon: not for India, where the onboarding offers UPSC CDS alone. */}
                  {!exams.some(option => option.id === 'CDS') && (
                  <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-slate-200 px-4 py-3">
                    <span className="mr-1 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      Coming soon
                    </span>
                    {UPCOMING_PREPARATIONS.map(option => (
                      <span
                        key={option.id}
                        title={option.blurb}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600"
                      >
                        <span className="flex h-3.5 w-5 overflow-hidden rounded-[3px] ring-1 ring-black/5">
                          <DE className="h-full w-full object-cover" />
                        </span>
                        {option.name}
                        <span className="text-xs font-medium text-slate-400">{option.scale}</span>
                      </span>
                    ))}
                  </div>
                  )}

                  <div className="flex items-center gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/60 px-4 py-3 text-xs text-amber-900">
                    <Lock className="h-4 w-4 shrink-0 text-amber-600" />
                    <p>
                      <span className="font-bold">Choose carefully:</span> your exam can&apos;t be changed after setup, so pick the one you&apos;re sitting.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Referral / How you found us */}
              {step.id === 'referral' && (
                <div className="w-full max-w-2xl space-y-6">
                  <QuestionHeader
                    badge={step.label}
                    icon={STEP_ICONS[step.id]}
                    headingRef={headingRef}
                    title="Where did you hear about us?"
                    subtitle="Help us understand how students and aspirants discover Prepyo."
                  />

                  <div className="grid gap-3.5 sm:grid-cols-2">
                    {REFERRAL_OPTIONS.map(option => {
                      const Icon = option.icon;
                      const selected = referralSource === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setReferralSource(option.id)}
                          className={`group relative flex items-start gap-4 rounded-2xl border p-4 text-left transition-all duration-200 ${
                            selected
                              ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-600/20'
                              : 'border-slate-200/80 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md'
                          }`}
                        >
                          <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                              selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600'
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="block font-display text-base font-bold text-slate-900">{option.label}</span>
                            <span className="mt-0.5 block text-xs text-slate-500">{option.blurb}</span>
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

              {/* Step 4: Plan Selection & Pricing */}
              {step.id === 'plan' && (
                <div className="w-full max-w-5xl space-y-6">
                  <QuestionHeader
                    badge={step.label}
                    icon={STEP_ICONS[step.id]}
                    headingRef={headingRef}
                    title="Choose your preparation plan"
                    subtitle={
                      isCds || isNcc
                        ? 'Affordable passes for defence aspirants and cadets. Start free anytime.'
                        : 'Start free, or unlock unlimited practice and full mock tests. Upgrade anytime.'
                    }
                  />

                  <div className={`grid gap-4 sm:grid-cols-2 ${displayPlans.length >= 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
                    {displayPlans.map((plan, index) => {
                      const free = plan.priceNPR === 0;
                      const isSelected = planId === plan.id;
                      const currency = (isCds || isNcc) && !free ? 'INR' : 'NPR';
                      const period = isCds || isNcc
                        ? plan.id === 'cds_annual'
                          ? 'per year · 365 days access'
                          : free
                            ? 'No payment needed'
                            : 'per month · 30 days access'
                        : free
                          ? 'No payment needed'
                          : `per month · ${planAccessDays(plan)} days access`;

                      return (
                        <OptionCard
                          key={plan.id}
                          selected={isSelected}
                          onClick={() => setPlanId(plan.id)}
                          style={{ animationDelay: `${index * 50}ms` }}
                          className="relative flex flex-col justify-between p-5 sm:p-6 min-h-[340px]"
                        >
                          {plan.isPopular && (
                            <span className="absolute -top-3 left-5 rounded-full bg-blue-600 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm">
                              Most popular
                            </span>
                          )}
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="block text-[11px] font-bold uppercase tracking-widest text-blue-600">
                                  {free ? 'Free Starter' : isCds || isNcc ? (plan.id === 'cds_annual' ? 'Best Value' : 'Monthly Pass') : 'Premium'}
                                </span>
                                <span className="mt-1 block font-display text-lg font-bold text-slate-900">{plan.name}</span>
                              </div>
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                                  isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                              </span>
                            </div>

                            <span className="mt-4 block font-display text-3xl font-black text-slate-900">
                              {free ? 'Free' : `${currency} ${plan.priceNPR.toLocaleString('en-US')}`}
                            </span>
                            <span className="mt-0.5 block text-xs font-semibold text-slate-400">{period}</span>
                          </div>

                          <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                            {plan.features.map(perk => (
                              <div key={perk} className="flex items-start gap-2 text-xs text-slate-600">
                                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                                <span>{perk}</span>
                              </div>
                            ))}
                          </div>
                        </OptionCard>
                      );
                    })}
                  </div>

                  {saveError && (
                    <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-800">
                      <p className="font-bold">We couldn&apos;t save your plan.</p>
                      <p className="mt-0.5">{saveError}</p>
                    </div>
                  )}

                  {needsPayment && selectedPlan && !isCds && !isNcc && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl border border-blue-200 bg-blue-50/60 max-w-5xl">
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                          <Crown className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {paymentSubmitted
                              ? `Payment proof submitted for ${formatPlanName(selectedPlan.id)} · NPR ${selectedPlan.priceNPR.toLocaleString('en-US')}`
                              : `Pay with QR for ${formatPlanName(selectedPlan.id)} · NPR ${selectedPlan.priceNPR.toLocaleString('en-US')}`}
                          </p>
                          <p className="text-xs text-slate-500">
                            {paymentSubmitted
                              ? 'Your screenshot was received. Verification is in progress.'
                              : 'Scan with eSewa, Khalti, or your bank app right here.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <Button
                          type="button"
                          onClick={() => setCheckoutModalOpen(true)}
                          className="h-10 rounded-full bg-blue-600 px-5 text-xs font-bold text-white hover:bg-blue-700"
                        >
                          <Crown className="mr-1.5 h-4 w-4" />
                          Pay with QR
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <span className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                      <ShieldCheck className="h-4 w-4 text-blue-600" />
                      Instant activation · No hidden fees
                    </span>
                    <Button
                      type="button"
                      onClick={() => void finish('/dashboard')}
                      disabled={saving || !selectedPlan}
                      className="h-12 rounded-full bg-blue-600 px-8 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700"
                    >
                      {saving ? 'Setting up...' : selectedPlan?.priceNPR === 0 ? 'Start Free' : 'Continue to Dashboard'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        <OnboardingNavigation
          showBack={stepIndex > 0}
          onBack={() => go(stepIndex - 1)}
          onContinue={() => {
            if (stepIndex === steps.length - 1) {
              void finish('/dashboard');
            } else {
              go(stepIndex + 1);
            }
          }}
          disabled={!canContinue || saving}
          label={stepIndex === steps.length - 1 ? (selectedPlan?.priceNPR === 0 ? 'Start Free' : 'Finish Setup') : step.id === 'welcome' ? "Let's go" : 'Continue'}
        />

        {/* QR Checkout Modal */}
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

/** One labelled row of pill choices, as the CDS academy is asked. */
function ChoiceRow<T extends string>({ label, value, onChange, options }: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { id: T; label: string; note?: string }[];
}) {
  return (
    <div role="group" aria-label={label} className="space-y-2">
      <p className="text-sm font-bold text-slate-900">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(option => (
          <button
            key={option.id}
            type="button"
            aria-pressed={value === option.id}
            onClick={() => onChange(option.id)}
            className={`rounded-full border-2 px-4 py-2 text-sm font-semibold transition-colors ${
              value === option.id
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-slate-200 bg-white text-slate-800 hover:border-emerald-400'
            }`}
          >
            {option.label}
            {option.note && <span className={`ml-1.5 font-normal ${value === option.id ? 'text-white/85' : 'text-slate-500'}`}>· {option.note}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
