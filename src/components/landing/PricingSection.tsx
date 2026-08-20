'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, CreditCard, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubscriptionPlan } from '@/lib/types';
import SectionHeading from './SectionHeading';

/**
 * The "Subscription" entry in the nav, as a section on the page.
 *
 * Plans are fetched rather than hardcoded so the prices a visitor sees here are
 * the same ones checkout charges. If the request fails the section hides itself
 * instead of showing a price that might be wrong.
 */
export default function PricingSection() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    let active = true;

    fetch('/api/v1/subscriptions')
      .then(res => res.json())
      .then(data => {
        if (!active) return;
        if (data.success && Array.isArray(data.plans)) {
          setPlans(data.plans);
          setStatus('ready');
        } else {
          setStatus('failed');
        }
      })
      .catch(() => {
        if (active) setStatus('failed');
      });

    // Guards against setting state after the visitor has navigated away.
    return () => {
      active = false;
    };
  }, []);

  if (status === 'failed') return null;

  return (
    <section id="pricing" className="py-20 border-t border-border">
      <SectionHeading
        eyebrow="Nepal pricing"
        eyebrowIcon={Wallet}
        title="Plans priced for Nepali students"
        description="Pay in rupees through eSewa, Khalti or Fonepay. No international credit card, no subscription traps — every plan can be cancelled from your profile."
      />

      {status === 'loading' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0, 1, 2].map(i => (
            <div key={i} className="rounded-2xl border border-border bg-card p-6 h-[420px] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map(plan => {
            const isFree = plan.priceNPR === 0;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border bg-card p-6 space-y-5 transition-all hover:-translate-y-1 duration-200 ${
                  plan.popular ? 'border-primary/60 shadow-card md:-mt-3 md:pb-8' : 'border-border'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-md">
                    Most popular
                  </span>
                )}

                <div className="space-y-1">
                  <h3 className="font-display text-base font-bold text-foreground">{plan.name}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {plan.durationMonths === 0
                      ? 'Free forever'
                      : `${plan.durationMonths} month${plan.durationMonths > 1 ? 's' : ''} of full access`}
                  </p>
                </div>

                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-3xl font-black text-foreground">
                    {isFree ? 'Free' : `NPR ${plan.priceNPR.toLocaleString()}`}
                  </span>
                  {!isFree && <span className="text-xs font-semibold text-muted-foreground">/ term</span>}
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-muted/50 border border-border p-3 text-center">
                  <div className="flex-1">
                    <div className="font-display text-sm font-black text-foreground">{plan.aiEvaluationsPerDay}</div>
                    <div className="text-[10px] text-muted-foreground font-semibold">AI evals / day</div>
                  </div>
                  <div className="w-px self-stretch bg-border" />
                  <div className="flex-1">
                    <div className="font-display text-sm font-black text-foreground">{plan.mockTestsIncluded}</div>
                    <div className="text-[10px] text-muted-foreground font-semibold">Full mock exams</div>
                  </div>
                </div>

                <ul className="space-y-2 pt-1 border-t border-border">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-start gap-2 text-xs text-foreground font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  variant={plan.popular ? 'default' : 'outline'}
                  className="w-full rounded-xl font-bold text-xs h-10"
                >
                  {/* Free tier starts straight away; paid plans go to checkout. */}
                  <Link href={isFree ? '/dashboard' : '/subscription'}>
                    {isFree ? 'Start free' : `Choose ${plan.name.split(' ')[0]}`}
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-muted-foreground">
        <CreditCard className="w-3.5 h-3.5 text-primary" />
        <span>Accepted here:</span>
        {['eSewa', 'Khalti', 'Fonepay'].map(gateway => (
          <span key={gateway} className="rounded-full border border-border bg-card px-3 py-1 text-foreground">
            {gateway}
          </span>
        ))}
      </div>
    </section>
  );
}
