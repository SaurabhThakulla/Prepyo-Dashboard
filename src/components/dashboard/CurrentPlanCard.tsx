import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Gift } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserProfile } from '@/lib/types';
import { formatExamDate } from '@/lib/dates';
import { formatPlanName, usagePercent } from '@/lib/subscriptions';

interface CurrentPlanCardProps {
  user?: UserProfile | null;
}

/** "2026-09-23" → "Sep 23, 2026", and whole days from today (null if unparseable). */
function describeValidUntil(value?: string): { label: string; daysLeft: number | null } | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return { label: value, daysLeft: null };
  const end = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return {
    label: end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    daysLeft: Math.round((end.getTime() - today.getTime()) / 86_400_000),
  };
}

type Tone = 'ok' | 'low' | 'out';

/** Low from 80% used, out at 100%. */
function toneFor(percentUsed: number): Tone {
  if (percentUsed >= 100) return 'out';
  if (percentUsed >= 80) return 'low';
  return 'ok';
}

export default function CurrentPlanCard({ user }: CurrentPlanCardProps) {
  const sub = user?.subscription;
  if (!sub) return <CurrentPlanCardSkeleton />;

  const planName = formatPlanName(sub.planName || sub.planId);
  const isActive = sub.isActive;
  const isFree = sub.planId === 'free';
  const validity = describeValidUntil(sub.validUntil);

  // Usage is shown as a share of the allowance, never as counts.
  const subTestsPercent = usagePercent(
    sub.dailySubTestsUsed ?? sub.dailyEvaluationsUsed ?? 0,
    sub.dailySubTestsLimit ?? sub.dailyEvaluationsLimit ?? 0,
  );
  const mocksPercent = usagePercent(sub.mockTestsUsed, sub.totalMockTestsAllowed);
  const gradingsPercent = usagePercent(sub.aiGradingsUsed ?? 0, sub.aiGradingsLimit ?? 0);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-xs transition-shadow duration-300 hover:shadow-md dark:border-white/10 dark:bg-[#12161c] sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gradient-to-br from-primary/10 via-indigo-500/10 to-transparent blur-3xl" />

      <div className="relative z-10 space-y-4">
        {/* Header: Plan Information + Action Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3.5 sm:gap-4">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-white shadow-md shadow-primary/20">
              <PlanBadgeIcon className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Your plan
                </span>
                {isActive ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:border-emerald-700/50 dark:bg-emerald-950/50 dark:text-emerald-300">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </span>
                    Active
                  </span>
                ) : (
                  <Badge variant="destructive" className="px-2 py-0.5 text-[10px]">
                    Expired
                  </Badge>
                )}
                {sub.bonusDays > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-200/60 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-400">
                    <Gift className="h-3 w-3" />+{sub.bonusDays} bonus days
                  </span>
                )}
              </div>
              <h3 className="truncate font-display text-xl sm:text-2xl font-black tracking-tight text-foreground">{planName}</h3>
              <p className="text-xs font-medium text-muted-foreground">
                {validity ? (
                  <>
                    Until {validity.label}
                    {validity.daysLeft !== null && validity.daysLeft >= 0 && (
                      <span
                        className={`ml-1.5 font-bold ${
                          validity.daysLeft <= 5 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground/70'
                        }`}
                      >
                        · {validity.daysLeft === 0 ? 'ends today' : `${validity.daysLeft} day${validity.daysLeft === 1 ? '' : 's'} left`}
                      </span>
                    )}
                  </>
                ) : isFree ? (
                  'Free forever'
                ) : (
                  'Active subscription'
                )}
              </p>
            </div>
          </div>

          <Button
            asChild
            variant={isFree ? 'nepal' : 'outline'}
            className="group/btn h-10 rounded-xl px-5 text-xs sm:text-sm font-bold shadow-xs shrink-0 self-start sm:self-auto"
          >
            <Link to="/subscription">
              {isFree ? 'Upgrade plan' : 'Manage plan'}
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform group-hover/btn:translate-x-1 ml-1.5" />
            </Link>
          </Button>
        </div>

        {/* Quota Gauges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-border/60">
          <QuotaGauge
            title="Practice sub-tests"
            percentUsed={subTestsPercent}
            unlimited={sub.unlimited}
            period="today"
            hint="Resets at midnight"
            accent="text-indigo-500"
          />

          <QuotaGauge
            title="AI gradings"
            percentUsed={gradingsPercent}
            period={sub.aiGradingsPeriod === 'day' ? 'today' : sub.aiGradingsPeriod === 'month' ? 'this month' : 'this plan'}
            hint={
              sub.aiGradingsPeriod === 'day'
                ? 'Speaking & writing · resets at midnight'
                : sub.aiGradingsRenewOn
                  ? `Speaking & writing · renews ${formatExamDate(sub.aiGradingsRenewOn)}`
                  : 'Speaking & writing'
            }
            accent="text-emerald-500"
          />

          <QuotaGauge
            title="Full mock tests"
            percentUsed={mocksPercent}
            period={isFree ? 'in total' : 'this month'}
            hint={isFree ? 'Included with your account' : 'Renews on the 1st'}
            accent="text-violet-500"
          />
        </div>
      </div>
    </div>
  );
}

interface QuotaGaugeProps {
  title: string;
  /** Share of the allowance used, 0-100. */
  percentUsed: number;
  period: string;
  hint: string;
  /** Text colour class for the ring while there is plenty left. */
  accent: string;
  /** No limit: shown as ∞ and never "running low". */
  unlimited?: boolean;
}

/** The share used, as the headline, with a ring that fills as it is used. */
function QuotaGauge({ title, percentUsed, period, hint, accent, unlimited = false }: QuotaGaugeProps) {
  const tone = unlimited ? 'ok' : toneFor(percentUsed);
  // An unlimited allowance is drawn as a full ring that never runs out.
  const fraction = unlimited ? 1 : percentUsed / 100;
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const ring = tone === 'out' ? 'text-rose-500' : tone === 'low' ? 'text-amber-500' : accent;

  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-border/70 bg-muted/40 p-3 dark:bg-zinc-900/50">
      <div className="relative h-12 w-12 sm:h-14 sm:w-14 shrink-0">
        <svg viewBox="0 0 48 48" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="24" cy="24" r={radius} fill="none" strokeWidth="5" className="stroke-muted-foreground/15 dark:stroke-zinc-800" />
          <circle
            cx="24"
            cy="24"
            r={radius}
            fill="none"
            strokeWidth="5"
            strokeLinecap="round"
            stroke="currentColor"
            strokeDasharray={`${Math.max(0, Math.min(1, fraction)) * circumference} ${circumference}`}
            className={`${ring} transition-[stroke-dasharray] duration-500 ease-out`}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-display text-xs sm:text-sm font-extrabold text-foreground">
          {unlimited ? '∞' : `${percentUsed}%`}
        </span>
      </div>

      <div className="min-w-0">
        <p className="text-xs font-bold text-foreground truncate">{title}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
          {unlimited ? (
            <span className="font-bold text-foreground">Unlimited</span>
          ) : (
            <>
              <span className="font-bold text-foreground">{percentUsed}%</span> used {period}
            </>
          )}
        </p>
        <p
          className={`mt-0.5 text-[10px] sm:text-[11px] font-semibold truncate ${
            tone === 'out'
              ? 'text-rose-600 dark:text-rose-400'
              : tone === 'low'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-muted-foreground/80'
          }`}
        >
          {unlimited ? 'No daily limit on your plan' : tone === 'out' ? `All used · ${hint.toLowerCase()}` : tone === 'low' ? `Running low · ${hint.toLowerCase()}` : hint}
        </p>
      </div>
    </div>
  );
}

/** A rosette: the plan as something earned, not a sparkle. */
function PlanBadgeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="m8.5 13.5-2 7 5.5-2.5 5.5 2.5-2-7" fill="currentColor" fillOpacity={0.25} />
      <circle cx="12" cy="9" r="6" fill="currentColor" fillOpacity={0.25} />
      <path d="m12 6.2.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L9.1 8.3l2-.3Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CurrentPlanCardSkeleton() {
  return (
    <div className="relative w-full animate-pulse overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-xs dark:border-white/10 dark:bg-[#12161c] sm:p-6">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-muted shrink-0" />
            <div className="space-y-2">
              <div className="h-2.5 w-24 rounded bg-muted" />
              <div className="h-5 w-32 rounded bg-muted" />
              <div className="h-3 w-28 rounded bg-muted" />
            </div>
          </div>
          <div className="h-10 w-28 rounded-xl bg-muted" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-border/60">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-center gap-4 rounded-xl bg-muted/30 p-3.5">
              <div className="h-14 w-14 rounded-full bg-muted shrink-0" />
              <div className="space-y-2 min-w-0 flex-1">
                <div className="h-3 w-28 rounded bg-muted" />
                <div className="h-2.5 w-20 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
