import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, ShieldCheck, Zap, Gift } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserProfile } from '@/lib/types';
import { formatPlanName } from '@/lib/subscriptions';

interface CurrentPlanCardProps {
  user?: UserProfile | null;
}

export default function CurrentPlanCard({ user }: CurrentPlanCardProps) {
  const sub = user?.subscription;
  if (!sub) return <CurrentPlanCardSkeleton />;

  const planName = formatPlanName(sub.planName || sub.planId);
  const isActive = sub.isActive;
  const isFree = sub.planId === 'free';
  const validUntil = sub.validUntil;

  const subTestsUsed = sub.dailySubTestsUsed ?? sub.dailyEvaluationsUsed ?? 0;
  const subTestsLimit = sub.dailySubTestsLimit ?? sub.dailyEvaluationsLimit ?? 0;
  const subTestsRemaining = Math.max(0, subTestsLimit - subTestsUsed);
  const subTestsPercent = Math.min(100, Math.round((subTestsUsed / Math.max(1, subTestsLimit)) * 100));

  const mocksUsed = sub.mockTestsUsed;
  const mocksLimit = sub.totalMockTestsAllowed;
  const mocksRemaining = Math.max(0, mocksLimit - mocksUsed);
  const mocksPercent = Math.min(100, Math.round((mocksUsed / Math.max(1, mocksLimit)) * 100));

  return (
    <div className="w-full relative overflow-hidden bg-card dark:bg-[#12161c] border border-border/80 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-300">
      {/* Decorative ambient gradient backdrop */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-gradient-to-br from-primary/10 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 -mb-12 w-48 h-48 bg-gradient-to-tr from-blue-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Plan details */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-[240px] shrink-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/15 to-indigo-500/15 dark:from-primary/25 dark:to-indigo-500/25 border border-primary/25 flex items-center justify-center text-primary shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Your Current Plan
              </span>
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
              {sub && sub.bonusDays > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/40">
                  <Gift className="w-3 h-3" />
                  <span>+{sub.bonusDays} bonus days</span>
                </span>
              )}
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              {planName}
            </h3>
            <p className="text-xs text-muted-foreground font-medium">
              {validUntil ? `Valid until ${validUntil}` : isFree ? 'Standard starter tier' : 'Active subscription'}
            </p>
          </div>
        </div>

        {/* Middle: Quota Progress Meters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 lg:max-w-xl xl:max-w-2xl">
          {/* Sub-test Meter Card */}
          <div className="p-3.5 rounded-xl bg-muted/40 dark:bg-zinc-900/50 border border-border/70 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                <Zap className="w-4 h-4 text-indigo-500" />
                Sub-tests today
              </span>
              <span className="font-mono font-extrabold text-foreground text-sm">
                {subTestsUsed} <span className="text-muted-foreground font-normal text-xs">/ {subTestsLimit}</span>
              </span>
            </div>
            <div className="w-full h-2.5 bg-muted-foreground/15 dark:bg-zinc-800 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${subTestsPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
              <span>{subTestsRemaining} practice sub-tests left today</span>
              <span className="font-semibold">{subTestsPercent}%</span>
            </div>
          </div>

          {/* Mock Exams Meter Card */}
          <div className="p-3.5 rounded-xl bg-muted/40 dark:bg-zinc-900/50 border border-border/70 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                <ShieldCheck className="w-4 h-4 text-violet-500" />
                Mock tests used
              </span>
              <span className="font-mono font-extrabold text-foreground text-sm">
                {mocksUsed} <span className="text-muted-foreground font-normal text-xs">/ {mocksLimit}</span>
              </span>
            </div>
            <div className="w-full h-2.5 bg-muted-foreground/15 dark:bg-zinc-800 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${mocksPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
              <span>{mocksRemaining} full mock tests left</span>
              <span className="font-semibold">{mocksPercent}%</span>
            </div>
          </div>
        </div>

        {/* Right: Action Button */}
        <div className="flex items-center lg:justify-end shrink-0">
          <Button
            asChild
            variant={isFree ? 'nepal' : 'outline'}
            size="default"
            className="w-full sm:w-auto font-bold px-5 h-10 rounded-xl group/btn shadow-xs text-xs sm:text-sm"
          >
            <Link to="/subscription">
              <span className="flex items-center gap-2">
                {isFree ? 'Upgrade' : 'Manage Subscription & Quotas'}
              </span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function CurrentPlanCardSkeleton() {
  return (
    <div className="w-full relative overflow-hidden bg-card dark:bg-[#12161c] border border-border/80 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs animate-pulse">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-3.5 min-w-[240px]">
          <div className="w-11 h-11 rounded-2xl bg-muted" />
          <div className="space-y-2">
            <div className="h-2.5 w-24 rounded bg-muted" />
            <div className="h-5 w-32 rounded bg-muted" />
            <div className="h-3 w-28 rounded bg-muted" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
          <div className="p-3.5 rounded-xl bg-muted/30 space-y-2">
            <div className="h-3.5 w-28 rounded bg-muted" />
            <div className="h-2.5 w-full rounded-full bg-muted" />
          </div>
          <div className="p-3.5 rounded-xl bg-muted/30 space-y-2">
            <div className="h-3.5 w-28 rounded bg-muted" />
            <div className="h-2.5 w-full rounded-full bg-muted" />
          </div>
        </div>
        <div className="w-full sm:w-32 h-10 rounded-xl bg-muted" />
      </div>
    </div>
  );
}
