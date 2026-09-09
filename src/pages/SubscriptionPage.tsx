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
import { formatPlanName } from '@/lib/subscriptions';
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
    features: ['7 days access', '40 practice sub-tests per day', '2 full mock exams'],
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
    features: ['33 days access', '50 practice sub-tests per day', '5 full mock exams'],
    subTestsPerDay: 50,
    mockTestsIncluded: 5,
    isPopular: true,
  };

  const elitePlan = plans.find(p => p.id === 'elite') ?? {
    id: 'elite' as const,
    name: 'Udaan',
    priceNPR: 999,
    durationMonths: 3,
    durationDays: 90,
    bonusDays: 7,
    features: ['97 days access', '60 practice sub-tests per day', '10 full mock exams'],
    subTestsPerDay: 60,
    mockTestsIncluded: 10,
    isPopular: false,
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
    <div className="w-full pb-16 space-y-6">
      {/* Full width edge-to-edge Header Banner matching ProfilePage */}
      <div className="w-full bg-card border-b border-border/80 overflow-hidden">
        <div className="px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md">
                Nepal Pricing · NPR
              </span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                Flexible Plans
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Subscription &amp; Plans
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Upgrade your PTE &amp; IELTS preparation with AI scoring, full-length scored mocks, and instant feedback.
            </p>
          </div>

          {user?.subscription && (
            <div className="flex items-center gap-4 bg-muted/40 border border-border/80 rounded-2xl p-3.5 sm:px-4 shrink-0 shadow-xs">
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
              <div className="border-l border-border/80 pl-4 flex gap-5 text-xs font-semibold">
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold">Sub-tests today</span>
                  <span className="font-extrabold text-foreground text-sm">
                    {user.subscription.dailySubTestsUsed} / {user.subscription.dailySubTestsLimit}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold">Mocks used</span>
                  <span className="font-extrabold text-foreground text-sm">
                    {user.subscription.mockTestsUsed} / {user.subscription.totalMockTestsAllowed}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <QueuedPlansCard />
      </div>

      {/* Main Content: Comparison Matrix stretching full width */}
      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-6">
        {loadError ? (
          <Card className="p-12 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <CardTitle className="text-base">Plans unavailable</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </Card>
        ) : (
          /* Comparison Table Matrix matching requested full-width design */
          <div className="w-full overflow-x-auto pb-8 pt-4 no-scrollbar">
            <div className="min-w-[860px] w-full grid grid-cols-5 items-stretch">
              {/* Column 1: Feature Labels */}
              <div className="flex flex-col">
                <div className="h-44 flex flex-col justify-end pb-5 pl-4 border-b border-border/70">
                  <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground/90">
                    Plan Comparison
                  </span>
                </div>
                {rows.map((row) => (
                  <div
                    key={row.label}
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

              {/* Column 4: Taiyari (PREPARATION) - Featured Elevated Adaptive Card */}
              <div className="flex flex-col text-center bg-card dark:bg-card/90 text-foreground rounded-3xl px-4 py-6 shadow-xl shadow-primary/10 border-2 border-primary dark:border-primary/80 ring-2 ring-primary/20 relative -my-4 z-10 transition-all">
                <div className="h-44 flex flex-col justify-end pb-5 px-2 border-b border-primary/20 dark:border-slate-800 space-y-1">
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
                    className="h-14 flex items-center justify-center text-xs sm:text-sm font-semibold text-foreground border-b border-primary/15 dark:border-slate-800"
                  >
                    {row.pro}
                  </div>
                ))}
                <div className="h-20 flex items-center justify-center pt-2">
                  <button
                    type="button"
                    disabled={currentPlanId === 'pro'}
                    onClick={() => handleOpenCheckout(proPlan)}
                    className="w-full bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-1.5"
                  >
                    <span>{currentPlanId === 'pro' ? 'Current Plan' : 'Get Started'}</span>
                    <ArrowRight className="w-4 h-4" />
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
                  <div className="text-[11px] text-muted-foreground font-medium">One-time · 97 days</div>
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
