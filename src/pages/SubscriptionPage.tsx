import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  Check,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { SubscriptionPageSkeleton } from '@/components/layout/PageSkeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { SubscriptionPlan, SubscriptionTier } from '@/lib/types';
import { errorMessage } from '@/lib/api';
import { formatExamDate } from '@/lib/dates';
import { useSubscriptionPlans } from '@/lib/hooks/useResources';
import { DEFAULT_PLANS, formatPlanName, isPaidTier } from '@/lib/subscriptions';
import QRPaymentCheckoutDialog from '@/components/subscription/QRPaymentCheckoutDialog';
import QueuedPlansCard from '@/components/subscription/QueuedPlansCard';

interface ComparisonRow {
  label: string;
  free: string | React.ReactNode;
  weekly: string | React.ReactNode;
  pro: string | React.ReactNode;
  elite: string | React.ReactNode;
}

export default function SubscriptionPage() {
  const { user } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);

  const currentPlanId = user?.subscription?.planId;

  const plansQuery = useSubscriptionPlans();
  const plans = plansQuery.data?.plans ?? [];
  const loading = plansQuery.isPending;
  const loadError = plansQuery.error
    ? errorMessage(plansQuery.error, 'Could not load plans.')
    : null;

  const planFor = (id: SubscriptionTier) =>
    plans.find(p => p.id === id) ?? DEFAULT_PLANS.find(p => p.id === id)!;

  const freePlan = planFor('free');
  const weeklyPlan = planFor('weekly');
  const proPlan = planFor('pro');
  const elitePlan = planFor('elite');

  const handleOpenCheckout = (plan: SubscriptionPlan) => {
    setSelectedPlan({ ...plan, name: formatPlanName(plan.name || plan.id) });
    setCheckoutModalOpen(true);
  };

  const requestedPlan = searchParams.get('plan');
  useEffect(() => {
    if (!requestedPlan || loading) return;
    if (isPaidTier(requestedPlan) && requestedPlan !== currentPlanId) {
      handleOpenCheckout(planFor(requestedPlan));
    }
    setSearchParams({}, { replace: true });
  }, [requestedPlan, loading]);

  const checkMark = (
    <Check className="w-5 h-5 text-emerald-500 inline-block stroke-[2.5]" />
  );
  const dashMark = (
    <span className="text-muted-foreground/35 font-bold text-base">—</span>
  );

  const rows: ComparisonRow[] = [
    {
      label: 'Practice sub-tests per day',
      free: String(freePlan.subTestsPerDay),
      weekly: String(weeklyPlan.subTestsPerDay),
      pro: String(proPlan.subTestsPerDay),
      elite: String(elitePlan.subTestsPerDay),
    },
    {
      label: 'Full mock exams',
      free: `${freePlan.mockTestsIncluded} lifetime`,
      weekly: String(weeklyPlan.mockTestsIncluded),
      pro: `${proPlan.mockTestsIncluded} / calendar month`,
      elite: `${elitePlan.mockTestsIncluded} / calendar month`,
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
      elite: `+${elitePlan.bonusDays || 7} days`,
    },
    {
      label: 'Access duration',
      free: 'Lifetime',
      weekly: `${weeklyPlan.durationDays || 7} days`,
      pro: `${(proPlan.durationDays || 30) + (proPlan.bonusDays || 3)} days`,
      elite: `${(elitePlan.durationDays || 90) + (elitePlan.bonusDays || 7)} days`,
    },
  ];

  if (loading && plans.length === 0) {
    return <SubscriptionPageSkeleton />;
  }

  return (
    <div className="w-full pb-20 space-y-8">
      {/* Full width edge-to-edge Header Banner matching ProfilePage */}
      <div className="w-full bg-card border-b border-border/80 overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-12 py-8 sm:py-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="bg-primary/10 text-primary border border-primary/20 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md">
                Nepal Pricing · NPR
              </span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Flexible Plans
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
              Subscription &amp; Plans
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
              Upgrade your PTE &amp; IELTS preparation with AI scoring, full-length scored mocks, and instant feedback.
            </p>
          </div>

          {user?.subscription && (
            <div className="flex items-center gap-5 bg-muted/40 border border-border/80 rounded-2xl p-4 sm:px-6 shrink-0 shadow-sm">
              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Your plan</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-foreground">{formatPlanName(user.subscription.planName)}</span>
                  <Badge variant={user.subscription.isActive ? 'success' : 'destructive'} className="text-xs font-bold">
                    {user.subscription.isActive ? 'Active' : 'Expired'}
                  </Badge>
                </div>
                {user.planValidUntil ? (
                  <p className="text-xs text-muted-foreground font-medium">
                    {formatExamDate(user.planStartedAt)} – {formatExamDate(user.planValidUntil)}
                    {user.paidPlanActive && ` · ${user.daysRemaining} ${user.daysRemaining === 1 ? 'day' : 'days'} left`}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground font-medium">
                    Active since {formatExamDate(user.planStartedAt)}
                  </p>
                )}
              </div>
              <div className="border-l border-border/80 pl-5 flex gap-6 text-sm font-semibold">
                <div>
                  <span className="text-xs text-muted-foreground block uppercase font-bold">Sub-tests today</span>
                  <span className="font-bold text-foreground text-base">
                    {user.subscription.dailySubTestsUsed} / {user.subscription.dailySubTestsLimit}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block uppercase font-bold">Mocks used</span>
                  <span className="font-bold text-foreground text-base">
                    {user.subscription.mockTestsUsed} / {user.subscription.totalMockTestsAllowed}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <QueuedPlansCard />
      </div>

      {/* Accepted payment methods */}
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-12 flex flex-col items-center gap-4 py-2">
        <span className="text-sm sm:text-base font-bold uppercase tracking-wider text-muted-foreground">Supported Payment Methods</span>
        <div className="flex flex-wrap items-center justify-center gap-x-10 sm:gap-x-14 gap-y-4">
          <img src="/images/esewa-logo.png" alt="eSewa" className="h-10 w-auto dark:hidden" />
          <img src="/images/esewa-logo-dark.png" alt="eSewa" className="h-10 w-auto hidden dark:block" />
          <img src="/images/khalti-logo.svg" alt="Khalti" className="h-10 sm:h-11 w-auto dark:brightness-125" />
          <span className="flex items-center gap-2 text-[#1B3A6B] dark:text-[#7FA9E6]">
            <svg viewBox="0 0 32 32" className="h-9 w-9" fill="currentColor" aria-hidden="true"><path d="M16 3 3 10v2.4h26V10L16 3Z" /><rect x="6" y="14.5" width="3" height="9" rx=".6" /><rect x="11.6" y="14.5" width="3" height="9" rx=".6" /><rect x="17.2" y="14.5" width="3" height="9" rx=".6" /><rect x="22.8" y="14.5" width="3" height="9" rx=".6" /><rect x="3" y="25.4" width="26" height="3.2" rx=".8" /></svg>
            <span className="leading-none">
              <span className="block font-bold text-xl tracking-tight">All Banks</span>
              <span className="block text-[10px] font-semibold text-muted-foreground -mt-0.5">Supported via QR</span>
            </span>
          </span>
        </div>
      </div>

      {/* Main Content: Comparison Matrix stretching full width */}
      <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-12 space-y-8">
        {loadError ? (
          <Card className="p-12 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <CardTitle className="text-base">Plans unavailable</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </Card>
        ) : (
          /* Comparison Table Matrix matching requested full-width design */
          <div className="w-full overflow-x-auto pb-12 pt-6 no-scrollbar">
            <div className="min-w-[1120px] w-full grid grid-cols-5 items-stretch">
              {/* Column 1: Feature Labels */}
              <div className="flex flex-col">
                <div className="h-56 flex flex-col justify-end pb-6 pl-4 border-b border-border/70">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90">
                    Plan Comparison
                  </span>
                </div>
                {rows.map((row) => (
                  <div
                    key={row.label}
                    className="h-18 flex items-center pl-4 text-sm sm:text-[15px] font-semibold text-foreground/90 border-b border-border/60"
                  >
                    {row.label}
                  </div>
                ))}
                <div className="h-28" />
              </div>

              {/* Column 2: Suru (START) */}
              <div className="flex flex-col text-center">
                <div className="h-56 flex flex-col justify-end pb-6 px-3 border-b border-border/70 space-y-1.5">
                  <div className="font-bold text-blue-600 dark:text-blue-400 text-lg sm:text-xl">Suru</div>
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">START</div>
                  <div className="font-display text-4xl sm:text-5xl font-black text-foreground pt-1">
                    NPR 0
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground font-medium">Free forever</div>
                </div>
                {rows.map((row, idx) => (
                  <div
                    key={`suru-${idx}`}
                    className="h-18 flex items-center justify-center text-sm sm:text-base font-semibold text-foreground border-b border-border/60"
                  >
                    {row.free}
                  </div>
                ))}
                <div className="h-28 flex items-center justify-center">
                  <button
                    type="button"
                    disabled={currentPlanId === 'free' || !currentPlanId}
                    onClick={() => handleOpenCheckout(freePlan)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold text-sm sm:text-base flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-default"
                  >
                    <span>{currentPlanId === 'free' || !currentPlanId ? 'Default Plan' : 'Get Started'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Column 3: Abhyas (PRACTICE) */}
              <div className="flex flex-col text-center">
                <div className="h-56 flex flex-col justify-end pb-6 px-3 border-b border-border/70 space-y-1.5">
                  <div className="font-bold text-blue-600 dark:text-blue-400 text-lg sm:text-xl">Abhyas</div>
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">PRACTICE</div>
                  <div className="font-display text-4xl sm:text-5xl font-black text-foreground pt-1">
                    NPR 99
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground font-medium">One-time · 7 days</div>
                </div>
                {rows.map((row, idx) => (
                  <div
                    key={`abhyas-${idx}`}
                    className="h-18 flex items-center justify-center text-sm sm:text-base font-semibold text-foreground border-b border-border/60"
                  >
                    {row.weekly}
                  </div>
                ))}
                <div className="h-28 flex items-center justify-center">
                  <button
                    type="button"
                    disabled={currentPlanId === 'weekly'}
                    onClick={() => handleOpenCheckout(weeklyPlan)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold text-sm sm:text-base flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-default"
                  >
                    <span>{currentPlanId === 'weekly' ? 'Current Plan' : 'Get Started'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Column 4: Taiyari (PREPARATION) - Featured Elevated Adaptive Card */}
              <div className="flex flex-col text-center bg-card dark:bg-card/90 text-foreground rounded-3xl px-6 py-8 shadow-2xl shadow-primary/15 border-2 border-primary dark:border-primary/80 ring-4 ring-primary/10 relative -my-6 z-10 transition-all">
                <div className="h-56 flex flex-col justify-end pb-6 px-3 border-b border-primary/20 dark:border-slate-800 space-y-1.5">
                  <div>
                    <span className="bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-sm inline-block">
                      Most popular
                    </span>
                  </div>
                  <div className="font-bold text-foreground text-lg sm:text-xl pt-0.5">Taiyari</div>
                  <div className="text-xs font-bold uppercase tracking-widest text-primary">PREPARATION</div>
                  <div className="font-display text-4xl sm:text-5xl font-black text-foreground pt-1">
                    NPR 299
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground font-medium">One-time · 33 days</div>
                </div>
                {rows.map((row, idx) => (
                  <div
                    key={`taiyari-${idx}`}
                    className="h-18 flex items-center justify-center text-sm sm:text-base font-semibold text-foreground border-b border-primary/15 dark:border-slate-800"
                  >
                    {row.pro}
                  </div>
                ))}
                <div className="h-28 flex items-center justify-center pt-2">
                  <button
                    type="button"
                    disabled={currentPlanId === 'pro'}
                    onClick={() => handleOpenCheckout(proPlan)}
                    className="w-full bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm sm:text-base py-3.5 px-6 rounded-2xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                  >
                    <span>{currentPlanId === 'pro' ? 'Current Plan' : 'Get Started'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Column 5: Udaan (TAKE-OFF) */}
              <div className="flex flex-col text-center">
                <div className="h-56 flex flex-col justify-end pb-6 px-3 border-b border-border/70 space-y-1.5">
                  <div className="font-bold text-blue-600 dark:text-blue-400 text-lg sm:text-xl">Udaan</div>
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">TAKE-OFF</div>
                  <div className="font-display text-4xl sm:text-5xl font-black text-foreground pt-1">
                    NPR 999
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground font-medium">One-time · 97 days</div>
                </div>
                {rows.map((row, idx) => (
                  <div
                    key={`udaan-${idx}`}
                    className="h-18 flex items-center justify-center text-sm sm:text-base font-semibold text-foreground border-b border-border/60"
                  >
                    {row.elite}
                  </div>
                ))}
                <div className="h-28 flex items-center justify-center">
                  <button
                    type="button"
                    disabled={currentPlanId === 'elite'}
                    onClick={() => handleOpenCheckout(elitePlan)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold text-sm sm:text-base flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-default"
                  >
                    <span>{currentPlanId === 'elite' ? 'Current Plan' : 'Get Started'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
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
