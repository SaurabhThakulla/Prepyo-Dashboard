import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  CheckCircle2,
  RefreshCw,
  Gift,
  AlertCircle,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SubscriptionPlan, SubscriptionState } from '@/lib/types';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { useSubscriptionPlans } from '@/lib/hooks/useResources';

type Gateway = 'esewa' | 'khalti' | 'fonepay';

export default function SubscriptionPage() {
  const { user, refreshUser } = useApp();
  const toast = useToast();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<Gateway>('esewa');
  const [processing, setProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    setSelectedPlan(plan);
    setSuccessMessage(null);
    setCheckoutModalOpen(true);
  };

  const handleProcessPayment = async () => {
    if (!selectedPlan || processing) return;
    setProcessing(true);

    try {
      const data = await api.post<{ subscription: SubscriptionState; message: string }>(
        '/subscriptions/confirm',
        {
          planId: selectedPlan.id,
          paymentGateway: selectedGateway.toUpperCase(),
        },
      );
      setSuccessMessage(data.message);
      await refreshUser();
      setTimeout(() => setCheckoutModalOpen(false), 2000);
    } catch (err) {
      toast.error('Checkout failed', errorMessage(err));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-4">
      {/* Current plan */}
      {user?.subscription && (
        <Card className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Your current plan</span>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{user.subscription.planName}</CardTitle>
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
                className={`p-6 flex flex-col justify-between space-y-6 relative transition-all ${
                  plan.isPopular ? 'border-primary/60 shadow-xl shadow-primary/10 bg-card/90 ring-1 ring-primary/40' : 'border-border'
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md">
                    Most Popular
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{plan.name}</CardTitle>
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

      {/* Checkout */}
      <Dialog open={checkoutModalOpen} onOpenChange={setCheckoutModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
            <DialogDescription>
              NPR {selectedPlan?.priceNPR.toLocaleString()} for {selectedPlan?.name}
            </DialogDescription>
          </DialogHeader>

          {successMessage ? (
            <div className="p-4 rounded-xl bg-primary/20 text-primary border border-primary/30 text-xs font-bold text-center space-y-1">
              <CheckCircle2 className="w-8 h-8 text-primary mx-auto" />
              <div>{successMessage}</div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {/* No real gateway is connected. Saying so beats a fake QR code. */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[11px] font-medium flex items-start gap-2">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  No payment gateway is connected yet. Confirming records the subscription in your account
                  without charging anything — it is a test checkout, not a real payment.
                </span>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-foreground">Gateway to record</span>
                <div className="grid grid-cols-3 gap-2">
                  {(['esewa', 'khalti', 'fonepay'] as const).map(gw => (
                    <button
                      key={gw}
                      type="button"
                      onClick={() => setSelectedGateway(gw)}
                      className={`p-3 rounded-xl border text-center font-bold text-xs capitalize transition-all ${
                        selectedGateway === gw
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-background border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {gw}
                    </button>
                  ))}
                </div>
              </div>

              {selectedPlan && selectedPlan.bonusDays > 0 && (
                <p className="text-[11px] text-primary font-bold text-center">
                  Includes +{selectedPlan.bonusDays} bonus days on confirmation.
                </p>
              )}

              <Button onClick={handleProcessPayment} disabled={processing} className="w-full font-bold text-xs">
                {processing ? 'Recording…' : 'Confirm test checkout'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
