import { PaidTier, SubscriptionPlan, SubscriptionState, SubscriptionTier } from './types';

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = ['free', 'weekly', 'pro', 'elite'];

/** Tiers checkout accepts. Kept in one place so routes can't drift apart —
 *  the weekly plan was previously rejected by one route and allowed by another. */
export const PAID_TIERS: PaidTier[] = ['weekly', 'pro', 'elite'];

export function isPaidTier(value: unknown): value is PaidTier {
  return typeof value === 'string' && (PAID_TIERS as string[]).includes(value);
}

/**
 * Maps raw backend plan names/tiers to customer-facing brand plan names:
 * - Suru / free -> Normal
 * - Abhyas / weekly -> Prepyo Go
 * - Taiyari / pro -> Prepyo Plus
 * - Udaan / elite -> Prepyo Pro
 */
export function formatPlanName(nameOrTier?: string | null): string {
  if (!nameOrTier) return 'Normal';
  const key = nameOrTier.toLowerCase().trim();
  if (key === 'free') return 'Normal';
  if (key === 'weekly') return 'Prepyo Go';
  if (key === 'pro') return 'Prepyo Plus';
  if (key === 'elite') return 'Prepyo Pro';
  return nameOrTier;
}

export const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Suru',
    priceNPR: 0,
    durationMonths: 0,
    durationDays: 0,
    bonusDays: 0,
    features: ['Core practice tasks', 'Limited AI gradings for speaking & writing', 'Limited full mock exams', 'Limited AI tutor'],
    subTestsPerDay: 5,
    mockTestsIncluded: 1,
    aiGradingsPerPeriod: 5,
    aiGradingsPeriod: 'month',
    isPopular: false,
  },
  {
    id: 'weekly',
    name: 'Abhyas',
    priceNPR: 99,
    durationMonths: 0,
    durationDays: 7,
    bonusDays: 0,
    features: [
      '7 days access',
      'Standard daily practice',
      'Standard AI gradings for speaking & writing',
      'Standard full mock exams',
      'Standard AI tutor',
    ],
    subTestsPerDay: 40,
    mockTestsIncluded: 2,
    aiGradingsPerPeriod: 70,
    aiGradingsPeriod: 'plan',
    isPopular: false,
  },
  {
    id: 'pro',
    name: 'Taiyari',
    priceNPR: 299,
    durationMonths: 1,
    durationDays: 30,
    bonusDays: 3,
    features: [
      '33 days access',
      'Extended daily practice',
      'Extended AI gradings for speaking & writing',
      'Extended full mock exams',
      'Extended AI tutor',
    ],
    subTestsPerDay: 50,
    mockTestsIncluded: 4,
    aiGradingsPerPeriod: 8,
    aiGradingsPeriod: 'day',
    isPopular: true,
  },
  {
    id: 'elite',
    name: 'Udaan',
    priceNPR: 999,
    durationMonths: 1,
    durationDays: 30,
    bonusDays: 3,
    features: [
      '33 days full access',
      'Unlimited practice sub-tests',
      'Maximum AI gradings for speaking & writing',
      'Maximum full mock exams',
      'Maximum AI tutor',
      'Priority evaluation queue',
    ],
    subTestsPerDay: 60,
    mockTestsIncluded: 12,
    aiGradingsPerPeriod: 600,
    aiGradingsPeriod: 'plan',
    isPopular: false,
    unlimited: true,
  },
];

/**
 * How much of an allowance a plan has, as a word rather than a number:
 * learners compare plans by tier, and exact limits can change without
 * rewriting what they read.
 */
export const PLAN_USAGE_TIERS: Record<SubscriptionTier, string> = {
  free: 'Limited',
  weekly: 'Standard',
  pro: 'Extended',
  elite: 'Maximum',
};

export function planUsageTier(planId?: string | null): string {
  return PLAN_USAGE_TIERS[(planId ?? 'free') as SubscriptionTier] ?? 'Limited';
}

/** Share of an allowance used, 0-100 and whole. An empty allowance counts as used up. */
export function usagePercent(used: number, limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((used / limit) * 100)));
}

export const PLAN_TAGLINES: Record<SubscriptionTier, string> = {
  free: 'Start',
  weekly: 'Practice',
  pro: 'Preparation',
  elite: 'Take-off',
};

/**
 * Sub-tests the learner can still start today. Infinity on an unlimited plan,
 * so "have I got enough?" comparisons keep working unchanged.
 */
export function subTestsLeft(sub?: SubscriptionState | null): number {
  if (!sub) return 0;
  if (sub.unlimited) return Number.POSITIVE_INFINITY;
  return Math.max(0, (sub.dailySubTestsLimit ?? 0) - (sub.dailySubTestsUsed ?? 0));
}

/**
 * AI gradings left in the plan period. Kept to one decimal: a word-matched
 * Read Aloud or Repeat Sentence answer costs a fifth of a grading.
 */
export function gradingsLeft(sub?: SubscriptionState | null): number {
  if (!sub) return 0;
  return Math.max(0, Math.round(((sub.aiGradingsLimit ?? 0) - (sub.aiGradingsUsed ?? 0)) * 10) / 10);
}

/** "12", "12.4", "1,100": a count of gradings as learners read it. */
export function formatGradings(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

/** How a plan's AI gradings are counted: "day", "month", "week" or "33 days". */
export function gradingsPeriodLabel(
  plan: Pick<SubscriptionPlan, 'id' | 'durationDays' | 'durationMonths' | 'bonusDays' | 'aiGradingsPeriod'>,
): string {
  if (plan.aiGradingsPeriod === 'day') return 'day';
  if (plan.aiGradingsPeriod === 'month' || plan.id === 'free') return 'month';
  const days = (plan.durationDays || plan.durationMonths * 30) + plan.bonusDays;
  return days === 7 ? 'week' : `${days} days`;
}

/** A limit as learners read it: "Unlimited" instead of a number when there is none. */
export function limitLabel(count: number, unlimited?: boolean): string {
  return unlimited || !Number.isFinite(count) ? 'Unlimited' : String(count);
}

export const planAccessDays = (plan: SubscriptionPlan) =>
  (plan.durationDays || plan.durationMonths * 30) + plan.bonusDays;
