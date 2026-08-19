'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Zap,
  Award,
  CreditCard,
  QrCode,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SubscriptionPlan } from '@/lib/types';

export default function SubscriptionPage() {
  const { user, awardLocalXP } = useApp();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<'esewa' | 'khalti' | 'fonepay'>('esewa');
  const [processing, setProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/subscriptions')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPlans(data.plans || []);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleOpenCheckout = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setSuccessMessage(null);
    setCheckoutModalOpen(true);
  };

  const handleProcessPayment = async () => {
    if (!selectedPlan || processing) return;
    setProcessing(true);

    try {
      const res = await fetch('/api/v1/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          paymentGateway: selectedGateway.toUpperCase(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message);
        awardLocalXP(250, `Subscribed to ${selectedPlan.name}`);
        setTimeout(() => {
          setCheckoutModalOpen(false);
          window.location.reload();
        }, 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-4">
      
      <div className="text-center space-y-2">
        <Badge variant="indigo" className="px-3 py-1">🇳🇵 Local Nepal Pricing</Badge>
        <h1 className="font-display text-3xl sm:text-4xl font-black text-white">
          Affordable Preparation for Every Student
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
          Instant activation via eSewa, Khalti, or Fonepay QR. No international credit card required.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(plan => {
            const isCurrent = user?.subscriptionTier === plan.id;
            return (
              <Card
                key={plan.id}
                className={`p-6 flex flex-col justify-between space-y-6 relative transition-all ${
                  plan.popular ? 'border-primary/60 shadow-xl shadow-primary/10 bg-card/90' : 'border-border'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md">
                    Most Popular
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    <CardDescription>
                      {plan.durationMonths === 0 ? 'Free tier access' : `${plan.durationMonths} Month Full Access`}
                    </CardDescription>
                  </div>

                  <div className="pt-2">
                    <span className="font-display text-3xl font-black text-white">NPR {plan.priceNPR.toLocaleString()}</span>
                    {plan.durationMonths > 0 && <span className="text-xs text-muted-foreground font-semibold"> / term</span>}
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-border">
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-200 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-nepal-emerald shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => handleOpenCheckout(plan)}
                  disabled={isCurrent}
                  variant={isCurrent ? 'outline' : plan.popular ? 'default' : 'secondary'}
                  className="w-full font-bold text-xs shadow-md"
                >
                  {isCurrent ? 'Current Plan' : plan.priceNPR === 0 ? 'Current Tier' : 'Upgrade Plan'}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* Checkout Dialog */}
      <Dialog open={checkoutModalOpen} onOpenChange={setCheckoutModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nepal Payment Checkout</DialogTitle>
            <DialogDescription>
              Pay NPR {selectedPlan?.priceNPR.toLocaleString()} for {selectedPlan?.name}
            </DialogDescription>
          </DialogHeader>

          {successMessage ? (
            <div className="p-4 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold text-center space-y-1">
              <CheckCircle2 className="w-8 h-8 text-nepal-emerald mx-auto" />
              <div>{successMessage}</div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-3 gap-2">
                {(['esewa', 'khalti', 'fonepay'] as const).map(gw => (
                  <button
                    key={gw}
                    type="button"
                    onClick={() => setSelectedGateway(gw)}
                    className={`p-3 rounded-xl border text-center font-bold text-xs capitalize transition-all ${
                      selectedGateway === gw
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-background border-border text-muted-foreground hover:text-white'
                    }`}
                  >
                    {gw}
                  </button>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-background border border-border text-center space-y-2">
                <QrCode className="w-28 h-28 mx-auto text-white p-1 bg-white rounded-lg" />
                <p className="text-[11px] text-muted-foreground">
                  Scan with your {selectedGateway.toUpperCase()} App to authorize NPR {selectedPlan?.priceNPR}.
                </p>
              </div>

              <Button
                onClick={handleProcessPayment}
                disabled={processing}
                className="w-full font-bold text-xs"
              >
                {processing ? 'Verifying Gateway Transaction...' : `Simulate Instant ${selectedGateway.toUpperCase()} Payment`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
