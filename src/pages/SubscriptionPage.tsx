import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  CheckCircle2,
  RefreshCw,
  Gift,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { SubscriptionPlan } from '@/lib/types';
import { errorMessage } from '@/lib/api';
import { useSubscriptionPlans } from '@/lib/hooks/useResources';
import { formatPlanName } from '@/lib/subscriptions';
import QRPaymentCheckoutDialog from '@/components/subscription/QRPaymentCheckoutDialog';

export default function SubscriptionPage() {
  const { user } = useApp();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);

  const currentPlanId = user?.subscription?.planId;

  // No fixture fallback here on purpose. Prices and quotas must come from the
  // same source checkout charges from, so if the fetch fails the page says so
  // rather than advertising a price we might not honour.
  const plansQuery = useSubscriptionPlans();
  const plans = plansQuery.data?.plans ?? [];
  const loading = plansQuery.isPending;
  const loadError = plansQuery.error
    ? errorMessage(plansQuery.error, 'Could not load plans.')
    : null;

  const handleOpenCheckout = (plan: SubscriptionPlan) => {
    setSelectedPlan({ ...plan, name: formatPlanName(plan.name || plan.id) });
    setCheckoutModalOpen(true);
  };


  return (
    <div className="space-y-8 max-w-6xl mx-auto py-4">
      {/* Current plan */}
      {user?.subscription && (
        <Card className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Your current plan</span>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{formatPlanName(user.subscription.planName)}</CardTitle>
              <Badge variant={user.subscription.isActive ? 'success' : 'destructive'} className="text-[9px]">
                {user.subscription.isActive ? 'Active' : 'Expired'}
              </Badge>
            </div>
            {user.subscription.validUntil && (
              <p className="text-[11px] text-muted-foreground">Valid until {user.subscription.validUntil}</p>
            )}
          </div>
          <div className="flex gap-6 text-xs">
            <div>
              <span className="text-[10px] text-muted-foreground block">Sub-tests today</span>
              <span className="font-bold text-foreground">
                {user.subscription.dailySubTestsUsed} / {user.subscription.dailySubTestsLimit}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Mocks used</span>
              <span className="font-bold text-foreground">
                {user.subscription.mockTestsUsed} / {user.subscription.totalMockTestsAllowed}
              </span>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
        </div>
      ) : loadError ? (
        <Card className="p-12 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <CardTitle className="text-base">Plans unavailable</CardTitle>
          <CardDescription>{loadError}</CardDescription>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map(plan => {
            const isCurrent = currentPlanId === plan.id;
            const baseDays = plan.durationDays || plan.durationMonths * 30;
            const totalDays = baseDays + plan.bonusDays;

            return (
              <Card
                key={plan.id}
                className={`p-6 flex flex-col justify-between space-y-6 relative transition-all ${plan.isPopular ? 'border-primary/60 shadow-xl shadow-primary/10 bg-card/90 ring-1 ring-primary/40' : 'border-border'
                  }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md">
                    Most Popular
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{formatPlanName(plan.name || plan.id)}</CardTitle>
                    <CardDescription className="text-xs">
                      {plan.priceNPR === 0
                        ? 'Free starter plan'
                        : plan.bonusDays > 0
                          ? `${totalDays} days (${baseDays} + ${plan.bonusDays} bonus)`
                          : `${totalDays} days`}
                    </CardDescription>
                  </div>

                  <div className="pt-2">
                    <span className="font-display text-3xl font-black text-foreground">
                      NPR {plan.priceNPR.toLocaleString()}
                    </span>
                  </div>

                  {plan.bonusDays > 0 && (
                    <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/30 text-primary text-[11px] font-bold px-2.5 py-1 rounded-lg">
                      <Gift className="w-3.5 h-3.5" />
                      <span>+{plan.bonusDays} bonus days</span>
                    </div>
                  )}

                  <div className="space-y-2.5 pt-2 border-t border-border">
                    {plan.features.map(f => (
                      <div key={f} className="flex items-center gap-2 text-xs text-foreground font-medium">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => handleOpenCheckout(plan)}
                  disabled={isCurrent || plan.priceNPR === 0}
                  variant={isCurrent ? 'outline' : plan.isPopular ? 'default' : 'secondary'}
                  className="w-full font-bold text-xs shadow-md"
                >
                  {isCurrent ? 'Current Plan' : plan.priceNPR === 0 ? 'Default Plan' : 'Choose Plan'}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* QR Payment Checkout */}
      <QRPaymentCheckoutDialog
        open={checkoutModalOpen}
        onOpenChange={setCheckoutModalOpen}
        selectedPlan={selectedPlan}
      />
    </div>
  );
}
