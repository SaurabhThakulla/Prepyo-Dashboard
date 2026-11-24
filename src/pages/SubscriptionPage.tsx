import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Check, AlertCircle } from 'lucide-react';
import { SubscriptionPageSkeleton } from '@/components/layout/PageSkeleton';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { isInstitutionStudent, SubscriptionPlan } from '@/lib/types';
import { errorMessage } from '@/lib/api';
import { useSubscriptionPlans } from '@/lib/hooks/useResources';
import { DEFAULT_PLANS, formatGradings, formatPlanName, gradingsPeriodLabel, planAccessDays, premiumPlanIdFor } from '@/lib/subscriptions';
import QRPaymentCheckoutDialog from '@/components/subscription/QRPaymentCheckoutDialog';
import QueuedPlansCard from '@/components/subscription/QueuedPlansCard';

interface PlanCard {
  plan: SubscriptionPlan;
  title: string;
  blurb: string;
  price: string;
  per?: string;
  note: string;
  features: string[];
}

/** A consultancy's students are on its plan: they never see this page. */
export default function SubscriptionPage() {
  const { user } = useApp();
  if (isInstitutionStudent(user)) return <Navigate to="/dashboard" replace />;
  return <SubscriptionPlans />;
}

function SubscriptionPlans() {
  const { user, activeExam } = useApp();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);

  const currentPlanId = user?.subscription?.planId;

  const plansQuery = useSubscriptionPlans();
  const plans = plansQuery.data?.plans ?? [];
  const loading = plansQuery.isPending;
  const loadError = plansQuery.error
    ? errorMessage(plansQuery.error, 'Could not load plans.')
    : null;

  // Shown only until the server's plans arrive; the server's are what checkout charges.
  const planFor = (id: SubscriptionPlan['id']) =>
    plans.find(p => p.id === id) ?? DEFAULT_PLANS.find(p => p.id === id)!;
  const freePlan = planFor('free');
  // EPS-TOPIK and JLPT learners are offered their own NPR 249 plan; IELTS and PTE need Premium.
  const premiumPlan = planFor(premiumPlanIdFor(activeExam, user?.paidPlanActive ? user.planId : null));
  const examsOnly = premiumPlan.id === 'elite_asia';

  const handleOpenCheckout = (plan: SubscriptionPlan) => {
    setSelectedPlan({ ...plan, name: formatPlanName(plan.name || plan.id) });
    setCheckoutModalOpen(true);
  };

  const gradings = (plan: SubscriptionPlan) =>
    `${formatGradings(plan.aiGradingsPerPeriod ?? 0)} AI gradings per ${gradingsPeriodLabel(plan)}`;
  const mocks = (n: number) => `${n} full mock ${n === 1 ? 'exam' : 'exams'}`;

  const cards: PlanCard[] = [
    {
      plan: freePlan,
      title: formatPlanName(freePlan.name),
      blurb: 'Everything you need to get started',
      price: 'Free',
      note: 'Included with every account, forever. Nothing to buy.',
      features: [
        `${freePlan.subTestsPerDay} practice sub-tests per day`,
        gradings(freePlan),
        mocks(freePlan.mockTestsIncluded),
        'Limited AI tutor',
        'Basic AI score breakdown',
      ],
    },
    {
      plan: premiumPlan,
      title: formatPlanName(premiumPlan.name),
      blurb: examsOnly ? 'Premium for EPS-TOPIK and JLPT' : 'For learners aiming for their target score',
      price: `NPR ${premiumPlan.priceNPR.toLocaleString('en-US')}`,
      per: '/ month',
      note: `Paid monthly · ${planAccessDays(premiumPlan)} days access`,
      features: examsOnly ? [
        'Everything in Basic',
        'Unlimited EPS-TOPIK and JLPT practice',
        'Help in English on every item',
        'AI tutor',
        'IELTS and PTE need Premium (NPR 499)',
      ] : [
        'Everything in Basic',
        'Unlimited practice sub-tests',
        gradings(premiumPlan),
        `${mocks(premiumPlan.mockTestsIncluded)} per month`,
        'Section mock tests',
        'Maximum AI tutor',
        'Sentence-level rewrites',
        'Full AI score breakdown',
        'Priority evaluation',
      ],
    },
  ];
  // Everyone has the free plan without paying, so it is never bought.
  const buttonLabel = (plan: SubscriptionPlan) =>
    currentPlanId === plan.id ? 'Current Plan' : plan.id === 'free' ? 'Continue for free' : `Get ${formatPlanName(plan.name)}`;
  const buttonDisabled = (plan: SubscriptionPlan) => plan.id === 'free' || currentPlanId === plan.id;

  if (loading && plans.length === 0) {
    return <SubscriptionPageSkeleton />;
  }

  return (
    <div className="w-full pt-5 sm:pt-8 pb-16 space-y-4 sm:space-y-6">
      <QueuedPlansCard />

      {/* Accepted payment methods */}
      <div className="px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-2 sm:gap-3">
        <span className="text-xs sm:text-[15px] font-bold uppercase tracking-wider text-muted-foreground">Supported Payment Methods</span>
        <div className="flex flex-nowrap sm:flex-wrap items-center justify-center gap-x-5 sm:gap-x-10 gap-y-4">
          <img src="/images/esewa-logo.png" alt="eSewa" className="h-5 sm:h-8 w-auto dark:hidden" />
          <img src="/images/esewa-logo-dark.png" alt="eSewa" className="h-5 sm:h-8 w-auto hidden dark:block" />
          <img src="/images/khalti-logo.svg" alt="Khalti" className="h-6 sm:h-9 w-auto dark:brightness-125" />
          <span className="flex items-center gap-1 sm:gap-1.5 text-[#1B3A6B] dark:text-[#7FA9E6]">
            <svg viewBox="0 0 32 32" className="h-5 w-5 sm:h-8 sm:w-8" fill="currentColor" aria-hidden="true"><path d="M16 3 3 10v2.4h26V10L16 3Z" /><rect x="6" y="14.5" width="3" height="9" rx=".6" /><rect x="11.6" y="14.5" width="3" height="9" rx=".6" /><rect x="17.2" y="14.5" width="3" height="9" rx=".6" /><rect x="22.8" y="14.5" width="3" height="9" rx=".6" /><rect x="3" y="25.4" width="26" height="3.2" rx=".8" /></svg>
            <span className="leading-none">
              <span className="block font-extrabold text-sm sm:text-lg tracking-tight">All Banks</span>
              <span className="hidden sm:block text-xs font-semibold text-muted-foreground -mt-0.5">Supported</span>
            </span>
          </span>
        </div>
      </div>

      {/* The two plans */}
      <div className="w-full px-3 sm:px-6 lg:px-8 space-y-6">
        {loadError ? (
          <Card className="p-12 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <CardTitle className="text-base">Plans unavailable</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </Card>
        ) : (
          /* Basic and Premium, side by side */
          <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2" aria-label="Subscription plans">
            {cards.map(({ plan, title, blurb, price, per, note, features }) => (
              <Card
                key={plan.id}
                className={`relative flex flex-col p-5 sm:p-7 ${plan.isPopular ? 'border-primary/40 shadow-md' : ''}`}
              >
                {plan.isPopular && (
                  <span className="absolute -top-3 left-5 rounded-full bg-primary px-3 py-0.5 text-xs font-extrabold uppercase tracking-wider text-primary-foreground shadow-xs">
                    Recommended
                  </span>
                )}
                <h2 className="text-lg sm:text-xl font-extrabold text-foreground">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>
                <p className="mt-5 flex items-baseline gap-1.5">
                  <span className="font-display text-4xl sm:text-5xl font-black text-foreground">{price}</span>
                  {per && <span className="text-sm font-bold text-muted-foreground">{per}</span>}
                </p>
                <p className="mt-4 text-xs font-semibold text-foreground/80">{note}</p>
                <ul className="mt-4 flex-1 space-y-3">
                  {features.map(feature => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-foreground/90">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500 stroke-[2.5]" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={buttonDisabled(plan)}
                  onClick={() => handleOpenCheckout(plan)}
                  className={`mt-6 w-full rounded-xl px-4 py-3 text-sm font-bold transition-colors disabled:cursor-default disabled:opacity-60 ${
                    plan.id === 'free'
                      ? 'border border-border bg-background text-foreground'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {buttonLabel(plan)}
                </button>
              </Card>
            ))}
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
