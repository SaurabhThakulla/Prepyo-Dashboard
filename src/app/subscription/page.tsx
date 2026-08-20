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
  RefreshCw,
  Gift,
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
    fetch('/api/v1/subscriptions/plans')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.plans && data.plans.length > 0) {
          setPlans(data.plans);
        } else {
          // Fallback to standard 4 tiers
          setPlans([
            {
              id: 'free',
              name: 'Free Learner',
              priceNPR: 0,
              durationMonths: 0,
              durationDays: 0,
              bonusDays: 0,
              features: [
                '1 Free Full Mock Exam on signup',
                '3 AI evaluations per day',
                'Access to mistake bank',
                'Daily study missions',
              ],
              aiEvaluationsPerDay: 3,
              mockTestsIncluded: 1,
            },
            {
              id: 'weekly',
              name: 'Weekly Sprint',
              priceNPR: 499,
              durationMonths: 0,
              durationDays: 7,
              bonusDays: 0,
              features: [
                '7 days intensive practice',
                '20 AI evaluations per day',
                '2 Full AI Mock Exams',
                'Instant score diagnostics',
              ],
              aiEvaluationsPerDay: 20,
              mockTestsIncluded: 2,
            },
            {
              id: 'pro',
              name: 'Pro Prep (Normal)',
              priceNPR: 1499,
              durationMonths: 1,
              durationDays: 30,
              bonusDays: 3,
              popular: true,
              features: [
                '30 + 3 Bonus Days (33 Days total)',
                '30 AI evaluations per day',
                '5 Full AI Mock Exams',
                'Sentence-level AI rewrites',
              ],
              aiEvaluationsPerDay: 30,
              mockTestsIncluded: 5,
            },
            {
              id: 'elite',
              name: 'Elite Master (Max)',
              priceNPR: 2999,
              durationMonths: 3,
              durationDays: 90,
              bonusDays: 7,
              features: [
                '90 + 7 Bonus Days (97 Days total)',
                '100 AI evaluations per day',
                '15 Full AI Mock Exams',
                'Priority evaluation queue',
              ],
              aiEvaluationsPerDay: 100,
              mockTestsIncluded: 15,
            },
          ]);
        }
      })
      .catch(() => {
        setPlans([
          {
            id: 'free',
            name: 'Free Learner',
            priceNPR: 0,
            durationMonths: 0,
            durationDays: 0,
            bonusDays: 0,
            features: [
              '1 Free Full Mock Exam on signup',
              '3 AI evaluations per day',
              'Access to mistake bank',
              'Daily study missions',
            ],
            aiEvaluationsPerDay: 3,
            mockTestsIncluded: 1,
          },
          {
            id: 'weekly',
            name: 'Weekly Sprint',
            priceNPR: 499,
            durationMonths: 0,
            durationDays: 7,
            bonusDays: 0,
            features: [
              '7 days intensive practice',
              '20 AI evaluations per day',
              '2 Full AI Mock Exams',
              'Instant score diagnostics',
            ],
            aiEvaluationsPerDay: 20,
            mockTestsIncluded: 2,
          },
          {
            id: 'pro',
            name: 'Pro Prep (Normal)',
            priceNPR: 1499,
            durationMonths: 1,
            durationDays: 30,
            bonusDays: 3,
            popular: true,
            features: [
              '30 + 3 Bonus Days (33 Days total)',
              '30 AI evaluations per day',
              '5 Full AI Mock Exams',
              'Sentence-level AI rewrites',
            ],
            aiEvaluationsPerDay: 30,
            mockTestsIncluded: 5,
          },
          {
            id: 'elite',
            name: 'Elite Master (Max)',
            priceNPR: 2999,
            durationMonths: 3,
            durationDays: 90,
            bonusDays: 7,
            features: [
              '90 + 7 Bonus Days (97 Days total)',
              '100 AI evaluations per day',
              '15 Full AI Mock Exams',
              'Priority evaluation queue',
            ],
            aiEvaluationsPerDay: 100,
            mockTestsIncluded: 15,
          },
        ]);
      })
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
      const res = await fetch('/api/v1/subscriptions/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          paymentGateway: selectedGateway.toUpperCase(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message || 'Payment confirmed and plan activated!');
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
    <div className="space-y-8 max-w-6xl mx-auto py-4">
      
      <div className="text-center space-y-2">
        <Badge variant="indigo" className="px-3 py-1">🇳🇵 Local Nepal Pricing</Badge>
        <h1 className="font-display text-3xl sm:text-4xl font-black text-foreground">
          Affordable Preparation for Every Student
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
          Instant activation via eSewa, Khalti, or Fonepay QR. Every paid purchase automatically includes bonus days!
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map(plan => {
            const isCurrent = user?.subscriptionTier === plan.id;
            const hasBonus = (plan.bonusDays && plan.bonusDays > 0) || plan.id === 'pro' || plan.id === 'elite';
            const bonusDays = plan.bonusDays || (plan.id === 'pro' ? 3 : plan.id === 'elite' ? 7 : 0);
            const totalDays = (plan.durationDays || (plan.durationMonths * 30)) + bonusDays;

            return (
              <Card
                key={plan.id}
                className={`p-6 flex flex-col justify-between space-y-6 relative transition-all ${
                  plan.popular ? 'border-primary/60 shadow-xl shadow-primary/10 bg-card/90 ring-1 ring-primary/40' : 'border-border'
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
                    <CardDescription className="text-xs">
                      {plan.priceNPR === 0
                        ? '1 free AI mock on signup'
                        : plan.id === 'weekly'
                        ? '7 days sprint duration'
                        : `${totalDays} Days total (${totalDays - bonusDays} + ${bonusDays} bonus)`}
                    </CardDescription>
                  </div>

                  <div className="pt-2">
                    <span className="font-display text-2xl sm:text-3xl font-black text-foreground">
                      NPR {plan.priceNPR.toLocaleString()}
                    </span>
                    {plan.priceNPR > 0 && (
                      <span className="text-xs text-muted-foreground font-semibold">
                        {' '}/ {plan.id === 'weekly' ? '7 days' : plan.durationMonths === 1 ? 'month' : `${plan.durationMonths || 3} months`}
                      </span>
                    )}
                  </div>

                  {/* Bonus Tag */}
                  {hasBonus && bonusDays > 0 && (
                    <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                      <Gift className="w-3.5 h-3.5" />
                      <span>+{bonusDays} Purchase Bonus Days</span>
                    </div>
                  )}

                  <div className="space-y-2.5 pt-2 border-t border-border">
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-foreground/90 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
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
                  {isCurrent ? 'Current Plan' : plan.priceNPR === 0 ? 'Free Starter' : 'Upgrade Plan'}
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
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
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
                        : 'bg-background border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {gw}
                  </button>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-background border border-border text-center space-y-2">
                <QrCode className="w-28 h-28 mx-auto text-foreground p-1 bg-white rounded-lg" />
                <p className="text-[11px] text-muted-foreground">
                  Scan with your {selectedGateway.toUpperCase()} App to authorize NPR {selectedPlan?.priceNPR}.
                </p>
                {selectedPlan && (selectedPlan.bonusDays || 0) > 0 && (
                  <p className="text-[11px] text-emerald-400 font-bold">
                    🎁 Includes +{selectedPlan.bonusDays} bonus days upon confirmation!
                  </p>
                )}
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
