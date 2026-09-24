import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Check,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { SubscriptionPageSkeleton } from '@/components/layout/PageSkeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { SubscriptionPlan } from '@/lib/types';
import { errorMessage } from '@/lib/api';
import { formatExamDate } from '@/lib/dates';
import { useSubscriptionPlans } from '@/lib/hooks/useResources';
import { formatPlanName, limitLabel } from '@/lib/subscriptions';
import QRPaymentCheckoutDialog from '@/components/subscription/QRPaymentCheckoutDialog';
import QueuedPlansCard from '@/components/subscription/QueuedPlansCard';

interface ComparisonRow {
  label: string | React.ReactNode;
  rowKey?: string;
  free: string | React.ReactNode;
  weekly: string | React.ReactNode;
  pro: string | React.ReactNode;
  elite: string | React.ReactNode;
}

export default function SubscriptionPage() {
  const { user } = useApp();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);

  const currentPlanId = user?.subscription?.planId;

  const plansQuery = useSubscriptionPlans();
  const plans = plansQuery.data?.plans ?? [];
  const loading = plansQuery.isPending;
  const loadError = plansQuery.error
    ? errorMessage(plansQuery.error, 'Could not load plans.')
    : null;

  const freePlan = plans.find(p => p.id === 'free') ?? {
    id: 'free' as const,
    name: 'Suru',
    priceNPR: 0,
    durationMonths: 0,
    durationDays: 0,
    bonusDays: 0,
    features: ['Core practice tasks', '5 practice sub-tests per day', '1 full mock exam'],
    subTestsPerDay: 5,
    mockTestsIncluded: 1,
    isPopular: false,
  };

  const weeklyPlan = plans.find(p => p.id === 'weekly') ?? {
    id: 'weekly' as const,
    name: 'Abhyas',
    priceNPR: 99,
    durationMonths: 0,
    durationDays: 7,
    bonusDays: 0,
    features: ['7 days access', '40 practice sub-tests per day', '10 section mock tests / week', '2 full mock exams'],
    subTestsPerDay: 40,
    mockTestsIncluded: 2,
    isPopular: false,
  };

  const proPlan = plans.find(p => p.id === 'pro') ?? {
    id: 'pro' as const,
    name: 'Taiyari',
    priceNPR: 299,
    durationMonths: 1,
    durationDays: 30,
    bonusDays: 3,
    features: ['33 days access', '50 practice sub-tests per day', '20 section mock tests / month', '5 full mock exams'],
    subTestsPerDay: 50,
    mockTestsIncluded: 5,
    isPopular: true,
  };

  const elitePlan = plans.find(p => p.id === 'elite') ?? {
    id: 'elite' as const,
    name: 'Udaan',
    priceNPR: 999,
    durationMonths: 1,
    durationDays: 30,
    bonusDays: 3,
    features: ['33 days full access', 'Unlimited practice sub-tests', 'Unlimited full mock exams', 'Unlimited AI tutor', 'Priority evaluation queue'],
    subTestsPerDay: 60,
    mockTestsIncluded: 10,
    isPopular: false,
    unlimited: true,
  };

  const handleOpenCheckout = (plan: SubscriptionPlan) => {
    setSelectedPlan({ ...plan, name: formatPlanName(plan.name || plan.id) });
    setCheckoutModalOpen(true);
  };

  const checkMark = (
    <Check className="w-4 h-4 text-emerald-500 inline-block stroke-[2.5]" />
  );
  const dashMark = (
    <span className="text-muted-foreground/35 font-bold text-sm">—</span>
  );

  const rows: ComparisonRow[] = [
    {
      label: 'Practice sub-tests per day',
      free: limitLabel(freePlan.subTestsPerDay, freePlan.unlimited),
      weekly: limitLabel(weeklyPlan.subTestsPerDay, weeklyPlan.unlimited),
      pro: limitLabel(proPlan.subTestsPerDay, proPlan.unlimited),
      elite: limitLabel(elitePlan.subTestsPerDay, elitePlan.unlimited),
    },
    {
      label: 'Section mock tests',
      free: dashMark,
      weekly: '10 / week',
      pro: '20 / calendar month',
      elite: elitePlan.unlimited ? 'Unlimited' : '40 / calendar month',
    },
    {
      label: 'Full mock exams',
      free: `${freePlan.mockTestsIncluded} lifetime`,
      weekly: String(weeklyPlan.mockTestsIncluded),
      pro: `${proPlan.mockTestsIncluded} / calendar month`,
      elite: elitePlan.unlimited ? 'Unlimited' : `${elitePlan.mockTestsIncluded} / calendar month`,
    },
    {
      label: 'AI tutor messages',
      free: '10 / day',
      weekly: '100 / day',
      pro: '100 / day',
      elite: elitePlan.unlimited ? 'Unlimited' : '100 / day',
    },
    {
      label: 'Sentence-level rewrites',
      free: dashMark,
      weekly: checkMark,
      pro: checkMark,
      elite: checkMark,
    },
    {
      label: 'AI score breakdown',
      free: 'Basic',
      weekly: 'Standard',
      pro: checkMark,
      elite: checkMark,
    },
    {
      label: 'Bonus prep days',
      free: dashMark,
      weekly: dashMark,
      pro: `+${proPlan.bonusDays || 3} days`,
      elite: `+${elitePlan.bonusDays} days`,
    },
    {
      label: 'Access duration',
      free: 'Lifetime',
      weekly: `${weeklyPlan.durationDays || 7} days`,
      pro: `${(proPlan.durationDays || 30) + (proPlan.bonusDays || 3)} days`,
      elite: `${(elitePlan.durationDays || elitePlan.durationMonths * 30) + elitePlan.bonusDays} days`,
    },
  ];

  if (loading && plans.length === 0) {
    return <SubscriptionPageSkeleton />;
  }

  return (
    <div className="w-full pb-16 space-y-4 sm:space-y-6">
      {/* Full width edge-to-edge Header Banner matching ProfilePage */}
      <div className="w-full bg-card border-b border-border/80 overflow-hidden">
        <div className="px-4 sm:px-6 lg:px-8 py-3.5 sm:py-5 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1 sm:space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md">
                Nepal Pricing · NPR
              </span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                Flexible Plans
              </span>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Subscription &amp; Plans
            </h1>
            <p className="text-[11px] leading-snug sm:text-sm text-muted-foreground">
              Upgrade your PTE &amp; IELTS preparation with AI scoring, full-length scored mocks, and instant feedback.
            </p>
          </div>

          {user?.subscription && (
            <div className="flex flex-row items-center justify-between gap-3 sm:gap-4 bg-muted/40 border border-border/80 rounded-xl sm:rounded-2xl p-3 sm:p-3.5 sm:px-4 shrink-0 shadow-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Your plan</span>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-foreground">{formatPlanName(user.subscription.planName)}</span>
                  <Badge variant={user.subscription.isActive ? 'success' : 'destructive'} className="text-[10px] font-bold">
                    {user.subscription.isActive ? 'Active' : 'Expired'}
                  </Badge>
                </div>
                {user.planValidUntil ? (
                  <p className="text-[11px] text-muted-foreground font-medium">
                    {formatExamDate(user.planStartedAt)} – {formatExamDate(user.planValidUntil)}
                    {user.paidPlanActive && ` · ${user.daysRemaining} ${user.daysRemaining === 1 ? 'day' : 'days'} left`}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Active since {formatExamDate(user.planStartedAt)}
                  </p>
                )}
              </div>
              <div className="border-l border-border/80 pl-3 sm:pl-4 flex gap-3 sm:gap-5 text-xs font-semibold shrink-0">
                <div>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground block uppercase font-bold">Sub-tests today</span>
                  <span className="font-extrabold text-foreground text-sm">
                    {user.subscription.unlimited
                      ? `${user.subscription.dailySubTestsUsed} · Unlimited`
                      : `${user.subscription.dailySubTestsUsed} / ${user.subscription.dailySubTestsLimit}`}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground block uppercase font-bold">Mocks used</span>
                  <span className="font-extrabold text-foreground text-sm">
                    {user.subscription.unlimited
                      ? `${user.subscription.mockTestsUsed} · Unlimited`
                      : `${user.subscription.mockTestsUsed} / ${user.subscription.totalMockTestsAllowed}`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <QueuedPlansCard />
      </div>

      {/* Accepted payment methods */}
      <div className="px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-2 sm:gap-3">
        <span className="text-[10px] sm:text-[15px] font-bold uppercase tracking-wider text-muted-foreground">Supported Payment Methods</span>
        <div className="flex flex-nowrap sm:flex-wrap items-center justify-center gap-x-5 sm:gap-x-10 gap-y-4">
          <img src="/images/esewa-logo.png" alt="eSewa" className="h-5 sm:h-8 w-auto dark:hidden" />
          <img src="/images/esewa-logo-dark.png" alt="eSewa" className="h-5 sm:h-8 w-auto hidden dark:block" />
          <img src="/images/khalti-logo.svg" alt="Khalti" className="h-6 sm:h-9 w-auto dark:brightness-125" />
          <span className="flex items-center gap-1 sm:gap-1.5 text-[#1B3A6B] dark:text-[#7FA9E6]">
            <svg viewBox="0 0 32 32" className="h-5 w-5 sm:h-8 sm:w-8" fill="currentColor" aria-hidden="true"><path d="M16 3 3 10v2.4h26V10L16 3Z" /><rect x="6" y="14.5" width="3" height="9" rx=".6" /><rect x="11.6" y="14.5" width="3" height="9" rx=".6" /><rect x="17.2" y="14.5" width="3" height="9" rx=".6" /><rect x="22.8" y="14.5" width="3" height="9" rx=".6" /><rect x="3" y="25.4" width="26" height="3.2" rx=".8" /></svg>
            <span className="leading-none">
              <span className="block font-extrabold text-sm sm:text-lg tracking-tight">All Banks</span>
              <span className="hidden sm:block text-[9px] font-semibold text-muted-foreground -mt-0.5">Supported</span>
            </span>
          </span>
        </div>
      </div>

      {/* Main Content: Comparison Matrix stretching full width */}
      <div className="w-full px-3 sm:px-6 lg:px-8 space-y-6">
        {loadError ? (
          <Card className="p-12 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <CardTitle className="text-base">Plans unavailable</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </Card>
        ) : (
          /* Comparison Table Matrix matching requested full-width design */
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:hidden" aria-label="Subscription plans">
            {[freePlan, weeklyPlan, proPlan, elitePlan].map(plan => (
              <Card key={plan.id} className="p-3 sm:p-4 space-y-2.5 sm:space-y-4">
                {/* Name and price on one line on phones, so each card stays short. */}
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-bold text-sm sm:text-lg leading-tight">{formatPlanName(plan.name)}</h2>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">
                      {plan.id === 'free' ? 'Free forever' : `One-time · ${(plan.durationDays || plan.durationMonths * 30) + plan.bonusDays} days`}
                    </p>
                  </div>
                  <p className="shrink-0 text-lg sm:text-2xl font-black text-primary">NPR {plan.priceNPR}</p>
                </div>
                <dl className="divide-y divide-border/60 border-y border-border/60">
                  {rows.map((row, index) => (
                    <div key={row.rowKey ?? index} className="flex items-center justify-between gap-3 py-1.5 sm:py-2 text-[11px] sm:text-xs">
                      <dt className="flex-1 text-muted-foreground">{row.label}</dt>
                      <dd className="max-w-[50%] text-right font-semibold">{row[plan.id]}</dd>
                    </div>
                  ))}
                </dl>
                <button
                  type="button"
                  disabled={currentPlanId === plan.id || (plan.id === 'free' && !currentPlanId)}
                  onClick={() => handleOpenCheckout(plan)}
                  className="w-full rounded-lg sm:rounded-xl bg-primary px-4 py-2 sm:py-3 font-bold text-xs sm:text-sm text-primary-foreground disabled:opacity-50"
                >
                  {currentPlanId === plan.id ? 'Current Plan' : plan.id === 'free' && !currentPlanId ? 'Default Plan' : `Choose ${formatPlanName(plan.name)}`}
                </button>
              </Card>
            ))}
          </div>
          <div className="hidden lg:block w-full overflow-x-auto pb-8 pt-4" tabIndex={0} role="region" aria-label="Plan comparison, scroll horizontally">
            <div className="min-w-[860px] w-full grid grid-cols-5 items-stretch">
              {/* Column 1: Feature Labels */}
              <div className="flex flex-col">
                <div className="h-44 flex flex-col justify-end pb-5 pl-4 border-b border-border/70">
                  <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground/90">
                    Plan Comparison
                  </span>
                </div>
                {rows.map((row, idx) => (
                  <div
                    key={row.rowKey ?? (typeof row.label === 'string' ? row.label : String(idx))}
                    className="h-14 flex items-center pl-4 text-xs sm:text-[13px] font-semibold text-foreground/90 border-b border-border/60"
                  >
                    {row.label}
                  </div>
                ))}
                <div className="h-20" />
              </div>

              {/* Column 2: Suru (START) */}
              <div className="flex flex-col text-center">
                <div className="h-44 flex flex-col justify-end pb-5 px-2 border-b border-border/70 space-y-1">
                  <div className="font-bold text-blue-600 dark:text-blue-400 text-base">Suru</div>
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">START</div>
                  <div className="font-display text-3xl sm:text-4xl font-black text-foreground pt-1">
                    NPR 0
                  </div>
                  <div className="text-[11px] text-muted-foreground font-medium">Free forever</div>
                </div>
                {rows.map((row, idx) => (
                  <div
                    key={`suru-${idx}`}
                    className="h-14 flex items-center justify-center text-xs sm:text-sm font-semibold text-foreground border-b border-border/60"
                  >
                    {row.free}
                  </div>
                ))}
                <div className="h-20 flex items-center justify-center">
                  <button
                    type="button"
                    disabled={currentPlanId === 'free' || !currentPlanId}
                    onClick={() => handleOpenCheckout(freePlan)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-default"
                  >
                    <span>{currentPlanId === 'free' || !currentPlanId ? 'Default Plan' : 'Get Started'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Column 3: Abhyas (PRACTICE) */}
              <div className="flex flex-col text-center">
                <div className="h-44 flex flex-col justify-end pb-5 px-2 border-b border-border/70 space-y-1">
                  <div className="font-bold text-blue-600 dark:text-blue-400 text-base">Abhyas</div>
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">PRACTICE</div>
                  <div className="font-display text-3xl sm:text-4xl font-black text-foreground pt-1">
                    NPR 99
                  </div>
                  <div className="text-[11px] text-muted-foreground font-medium">One-time · 7 days</div>
                </div>
                {rows.map((row, idx) => (
                  <div
                    key={`abhyas-${idx}`}
                    className="h-14 flex items-center justify-center text-xs sm:text-sm font-semibold text-foreground border-b border-border/60"
                  >
                    {row.weekly}
                  </div>
                ))}
                <div className="h-20 flex items-center justify-center">
                  <button
                    type="button"
                    disabled={currentPlanId === 'weekly'}
                    onClick={() => handleOpenCheckout(weeklyPlan)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-default"
                  >
                    <span>{currentPlanId === 'weekly' ? 'Current Plan' : 'Get Started'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Column 4: Taiyari (PREPARATION) */}
              <div className="flex flex-col text-center">
                <div className="h-44 flex flex-col justify-end pb-5 px-2 border-b border-border/70 space-y-1">
                  <div>
                    <span className="bg-primary text-primary-foreground text-[10px] font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs inline-block">
                      Most popular
                    </span>
                  </div>
                  <div className="font-bold text-foreground text-base pt-0.5">Taiyari</div>
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-primary">PREPARATION</div>
                  <div className="font-display text-3xl sm:text-4xl font-black text-foreground pt-1">
                    NPR 299
                  </div>
                  <div className="text-[11px] text-muted-foreground font-medium">One-time · 33 days</div>
                </div>
                {rows.map((row, idx) => (
                  <div
                    key={`taiyari-${idx}`}
                    className="h-14 flex items-center justify-center text-xs sm:text-sm font-semibold text-foreground border-b border-border/60"
                  >
                    {row.pro}
                  </div>
                ))}
                <div className="h-20 flex items-center justify-center">
                  <button
                    type="button"
                    disabled={currentPlanId === 'pro'}
                    onClick={() => handleOpenCheckout(proPlan)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-default"
                  >
                    <span>{currentPlanId === 'pro' ? 'Current Plan' : 'Get Started'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Column 5: Udaan (TAKE-OFF) */}
              <div className="flex flex-col text-center">
                <div className="h-44 flex flex-col justify-end pb-5 px-2 border-b border-border/70 space-y-1">
                  <div className="font-bold text-blue-600 dark:text-blue-400 text-base">Udaan</div>
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">TAKE-OFF</div>
                  <div className="font-display text-3xl sm:text-4xl font-black text-foreground pt-1">
                    NPR 999
                  </div>
                  <div className="text-[11px] text-muted-foreground font-medium">One-time · 33 days</div>
                </div>
                {rows.map((row, idx) => (
                  <div
                    key={`udaan-${idx}`}
                    className="h-14 flex items-center justify-center text-xs sm:text-sm font-semibold text-foreground border-b border-border/60"
                  >
                    {row.elite}
                  </div>
                ))}
                <div className="h-20 flex items-center justify-center">
                  <button
                    type="button"
                    disabled={currentPlanId === 'elite'}
                    onClick={() => handleOpenCheckout(elitePlan)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-default"
                  >
                    <span>{currentPlanId === 'elite' ? 'Current Plan' : 'Get Started'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          </>
        )}
      </div>

      {/* QR Payment Checkout */}
      <QRPaymentCheckoutDialog
        open={checkoutModalOpen}
        onOpenChange={setCheckoutModalOpen}
        selectedPlan={selectedPlan}
      />
    </div>
  );
}
