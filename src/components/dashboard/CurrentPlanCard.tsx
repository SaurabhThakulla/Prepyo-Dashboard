import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, ShieldCheck, Zap, Gift, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserProfile } from '@/lib/types';
import { formatPlanName } from '@/lib/subscriptions';

interface CurrentPlanCardProps {
  user?: UserProfile | null;
}

/**
 * Learner's "Your Current Plan" widget on the Home screen.
 *
 * Shows real-time plan status, today's sub-test quota, mock tests remaining, and
 * a way through to the subscription page.
 *
 * Nothing here is invented. An earlier version filled in a plan name and quota
 * numbers while the subscription was still loading, which meant the card could
 * state a limit no plan actually has. Quotas are money: the page that sells them
 * refuses to guess (see SubscriptionPage and lib/fixtures.ts) and so does this.
 */
export default function CurrentPlanCard({ user }: CurrentPlanCardProps) {
  const sub = user?.subscription;
  if (!sub) return <CurrentPlanCardSkeleton />;

  const planName = formatPlanName(sub.planName || sub.planId);
  const isActive = sub.isActive;
  const isFree = sub.planId === 'free';
  const validUntil = sub.validUntil;

  // The server serves both names during the rename; prefer the current one.
  const subTestsUsed = sub.dailySubTestsUsed ?? sub.dailyEvaluationsUsed ?? 0;
  const subTestsLimit = sub.dailySubTestsLimit ?? sub.dailyEvaluationsLimit ?? 0;
  const subTestsRemaining = Math.max(0, subTestsLimit - subTestsUsed);
  const subTestsPercent = Math.min(100, Math.round((subTestsUsed / Math.max(1, subTestsLimit)) * 100));

  const mocksUsed = sub.mockTestsUsed;
  const mocksLimit = sub.totalMockTestsAllowed;
  const mocksRemaining = Math.max(0, mocksLimit - mocksUsed);
  const mocksPercent = Math.min(100, Math.round((mocksUsed / Math.max(1, mocksLimit)) * 100));

  return (
    <div className="relative overflow-hidden bg-card dark:bg-[#12161c] border border-border/80 dark:border-white/10 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
      {/* Decorative ambient gradient backdrop */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-36 h-36 bg-gradient-to-br from-primary/10 via-indigo-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* Top bar: Title & Plan Status */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 dark:bg-primary/20 border border-primary/25 flex items-center justify-center text-primary shrink-0 shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Your Current Plan
              </span>
              <h3 className="text-base font-bold text-foreground leading-snug">
                {planName}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isActive ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/50">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                Active
              </span>
            ) : (
              <Badge variant="destructive" className="text-[10px] px-2 py-0.5">
                Expired
              </Badge>
            )}
          </div>
        </div>

        {/* Validity & Bonus Days note */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
          <span>
            {validUntil ? `Valid until ${validUntil}` : isFree ? 'Standard starter tier' : 'Active subscription'}
          </span>
          {sub && sub.bonusDays > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/40">
              <Gift className="w-3 h-3" />
              <span>+{sub.bonusDays} bonus days</span>
            </span>
          )}
        </div>

        {/* Quota Progress Meters */}
        <div className="space-y-3 pt-1">
          {/* Sub-test Meter */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5 text-[11px]">
                <Zap className="w-3.5 h-3.5 text-indigo-500" />
                Sub-tests today
              </span>
              <span className="font-mono font-bold text-foreground text-xs">
                {subTestsUsed} <span className="text-muted-foreground font-normal">/ {subTestsLimit}</span>
              </span>
            </div>
            <div className="w-full h-2 bg-muted/80 dark:bg-zinc-800/80 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${subTestsPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{subTestsRemaining} practice sub-tests left today</span>
              <span>{subTestsPercent}%</span>
            </div>
          </div>

          {/* Mock Exams Meter */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-violet-500" />
                Mock tests used
              </span>
              <span className="font-mono font-bold text-foreground text-xs">
                {mocksUsed} <span className="text-muted-foreground font-normal">/ {mocksLimit}</span>
              </span>
            </div>
            <div className="w-full h-2 bg-muted/80 dark:bg-zinc-800/80 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${mocksPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{mocksRemaining} full mock tests left</span>
              <span>{mocksPercent}%</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Button
            asChild
            variant={isFree ? 'nepal' : 'outline'}
            size="sm"
            className="w-full font-bold justify-between group/btn shadow-xs text-xs"
          >
            <Link to="/subscription">
              <span className="flex items-center gap-1.5">
                {isFree ? 'Upgrade' : 'Manage Subscription & Quotas'}
              </span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * What the card shows before the subscription has arrived: the same shape, no
 * numbers. Better an empty meter for a moment than a wrong limit.
 */
function CurrentPlanCardSkeleton() {
  return (
    <div className="relative overflow-hidden bg-card dark:bg-[#12161c] border border-border/80 dark:border-white/10 rounded-2xl p-5 shadow-sm">
      <div className="space-y-4 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-muted" />
          <div className="space-y-1.5">
            <div className="h-2 w-24 rounded bg-muted" />
            <div className="h-3.5 w-32 rounded bg-muted" />
          </div>
        </div>
        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <div className="h-3 w-28 rounded bg-muted" />
            <div className="h-2 w-full rounded-full bg-muted" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-28 rounded bg-muted" />
            <div className="h-2 w-full rounded-full bg-muted" />
          </div>
        </div>
        <div className="h-8 w-full rounded-lg bg-muted" />
      </div>
    </div>
  );
}
