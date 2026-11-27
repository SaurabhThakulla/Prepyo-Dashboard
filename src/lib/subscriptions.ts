import { ExamType, PaidTier, SubscriptionPlan, SubscriptionState, SubscriptionTier } from './types';

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = ['free', 'weekly', 'pro', 'elite', 'elite_asia', 'cds_monthly', 'cds_annual', 'ncc_monthly'];

/** Tiers checkout accepts. Kept in one place so routes can't drift apart —
 *  the weekly plan was previously rejected by one route and allowed by another. */
export const PAID_TIERS: PaidTier[] = ['weekly', 'pro', 'elite', 'elite_asia', 'cds_monthly', 'cds_annual', 'ncc_monthly'];

/** Plans a learner can pick: Basic (free), Premium (elite, every exam) and
 *  EPS-TOPIK & JLPT Premium (elite_asia). The others are no longer sold;
 *  learners already on them keep them until they end. */
export const PLANS_ON_SALE: SubscriptionTier[] = ['free', 'elite', 'elite_asia', 'cds_monthly', 'cds_annual', 'ncc_monthly'];

/**
 * The primary paid plan offered on an exam: CDS offers CDS Monthly (or CDS
 * 1-Year Pass if already on it), NCC offers NCC Monthly, EPS-TOPIK and JLPT
 * offer NPR 249 (unless already on global Premium), and IELTS and PTE offer
 * Premium.
 */
export function premiumPlanIdFor(exam: ExamType, currentPlanId?: string | null): PaidTier {
  if (exam === 'CDS') return currentPlanId === 'cds_annual' ? 'cds_annual' : 'cds_monthly';
  if (exam === 'NCC') return 'ncc_monthly';
  if (currentPlanId === 'elite') return 'elite';
  return exam === 'EPS_TOPIK' || exam === 'JLPT' ? 'elite_asia' : 'elite';
}

const INR_TIERS = new Set<string>(['cds_monthly', 'cds_annual', 'ncc_monthly']);

/** Currency shown for an exam or plan tier: INR for CDS and NCC, NPR otherwise. */
export function planCurrency(planIdOrExam?: string | null): 'INR' | 'NPR' {
  if (planIdOrExam === 'CDS' || planIdOrExam === 'NCC' || (planIdOrExam && INR_TIERS.has(planIdOrExam))) {
    return 'INR';
  }
  return 'NPR';
}

/** Formats a plan price with its currency (e.g. "INR 199", "NPR 499", or "Free"). */
export function formatPlanPrice(plan: Pick<SubscriptionPlan, 'id' | 'priceNPR'>, exam?: ExamType): string {
  if (plan.priceNPR === 0) return 'Free';
  const currency = exam ? planCurrency(exam) : planCurrency(plan.id);
  return `${currency} ${plan.priceNPR.toLocaleString('en-US')}`;
}

/** Short upgrade banner subtitle matching what an active exam actually unlocks. */
export function upgradeSummaryFor(exam: ExamType): string {
  if (exam === 'CDS') return 'Unlimited CDS mock tests, full papers & analytics';
  if (exam === 'NCC') return "Unlimited NCC 'B' and 'C' mock tests & all wing subjects";
  if (exam === 'EPS_TOPIK' || exam === 'JLPT') return 'Unlimited practice, full mocks and Help in English';
  return 'More AI gradings, full mocks and Help in English';
}

export interface SubscriptionPlanCard {
  plan: SubscriptionPlan;
  title: string;
  blurb: string;
  price: string;
  per?: string;
  note: string;
  badge?: string;
  highlight?: boolean;
  features: string[];
}

/** Builds exam-appropriate Basic and Paid plan cards for /subscription. */
export function buildSubscriptionCards(
  exam: ExamType,
  serverPlans: SubscriptionPlan[],
  currentPlanId?: string | null,
): SubscriptionPlanCard[] {
  const planFor = (id: SubscriptionPlan['id']) =>
    serverPlans.find(p => p.id === id) ?? DEFAULT_PLANS.find(p => p.id === id)!;

  const freePlan = planFor('free');

  if (exam === 'CDS') {
    const monthly = planFor('cds_monthly');
    const annual = planFor('cds_annual');
    return [
      {
        plan: freePlan,
        title: formatPlanName(freePlan.name),
        blurb: 'Everything you need to start UPSC CDS prep',
        price: 'Free',
        note: 'Included with every account, forever. Nothing to buy.',
        features: [
          'Topic-wise practice across English, GK & Maths',
          '1 free CDS full mock test',
          'Authentic UPSC 1/3 negative marking & 2-hour timer',
          'Detailed answer keys & explanations',
          'Automatic Mistake Notebook',
        ],
      },
      {
        plan: monthly,
        title: formatPlanName(monthly.name),
        badge: 'Recommended',
        highlight: true,
        blurb: 'For IMA, INA, AFA & OTA written prep',
        price: formatPlanPrice(monthly, 'CDS'),
        per: '/ month',
        note: `Paid monthly · ${planAccessDays(monthly)} days access`,
        features: [
          'Everything in Basic',
          'Unlimited full CDS mock tests (English, GK & Maths)',
          'Unlimited practice sets across every subject',
          'Full score reports & sectional breakdown',
          'UPSC CDS access only',
        ],
      },
      {
        plan: annual,
        title: formatPlanName(annual.name),
        badge: 'Best Value',
        blurb: 'Full-year coverage across both CDS (I & II) cycles',
        price: formatPlanPrice(annual, 'CDS'),
        per: '/ year',
        note: `Paid yearly · ${planAccessDays(annual)} days access`,
        features: [
          'Everything in CDS Monthly',
          '365 days unlimited CDS practice & mock tests',
          'Covers both annual UPSC CDS exam cycles',
          'Save 50% compared to monthly billing',
          'UPSC CDS access only',
        ],
      },
    ];
  }

  if (exam === 'NCC') {
    const monthly = planFor('ncc_monthly');
    return [
      {
        plan: freePlan,
        title: formatPlanName(freePlan.name),
        blurb: "Everything you need to start NCC 'B' & 'C' prep",
        price: 'Free',
        note: 'Included with every account, forever. Nothing to buy.',
        features: [
          'Practice sets across Common & Wing subjects',
          "1 free 'B' or 'C' certificate mock test",
          'DG NCC marking (+2 right, -0.5 wrong) & 3-hour timer',
          'Army, Naval & Air Wing specialised syllabi',
          'Answer keys & Mistake Notebook',
        ],
      },
      {
        plan: monthly,
        title: formatPlanName(monthly.name),
        badge: 'Recommended',
        highlight: true,
        blurb: "For NCC 'B' and 'C' certificate cadets (written paper)",
        price: formatPlanPrice(monthly, 'NCC'),
        per: '/ month',
        note: `Paid monthly · ${planAccessDays(monthly)} days access`,
        features: [
          'Everything in Basic',
          "Unlimited 'B' and 'C' certificate full mocks (175 Qs)",
          'Unlimited practice in all Common & Wing subjects',
          'Full written score report by subject',
          'NCC access only',
        ],
      },
    ];
  }

  const premiumPlan = planFor(premiumPlanIdFor(exam, currentPlanId));
  const examsOnly = premiumPlan.id === 'elite_asia';
  const gradings = (plan: SubscriptionPlan) =>
    `${formatGradings(plan.aiGradingsPerPeriod ?? 0)} AI gradings per ${gradingsPeriodLabel(plan)}`;
  const mocks = (n: number) => `${n} full mock ${n === 1 ? 'exam' : 'exams'}`;

  return [
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
      badge: premiumPlan.isPopular ? 'Recommended' : undefined,
      highlight: premiumPlan.isPopular,
      blurb: examsOnly ? 'Premium for EPS-TOPIK and JLPT' : 'For learners aiming for their target score',
      price: formatPlanPrice(premiumPlan, exam),
      per: '/ month',
      note: `Paid monthly · ${planAccessDays(premiumPlan)} days access`,
      features: examsOnly
        ? [
            'Everything in Basic',
            'Unlimited EPS-TOPIK and JLPT practice',
            'Help in English on every item',
            'AI tutor',
            'IELTS and PTE need Premium (NPR 499)',
          ]
        : [
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
}

export function isPaidTier(value: unknown): value is PaidTier {
  return typeof value === 'string' && (PAID_TIERS as string[]).includes(value);
}

/**
 * Maps raw backend plan names/tiers to customer-facing brand plan names:
 * - free (was Suru) -> Basic
 * - elite (was Udaan) -> Premium
 * - weekly / pro (no longer sold) -> Prepyo Go / Prepyo Plus
 */
export function formatPlanName(nameOrTier?: string | null): string {
  if (!nameOrTier) return 'Basic';
  const key = nameOrTier.toLowerCase().trim();
  if (key === 'free' || key === 'suru') return 'Basic';
  if (key === 'weekly' || key === 'abhyas') return 'Prepyo Go';
  if (key === 'pro' || key === 'taiyari') return 'Prepyo Plus';
  if (key === 'elite' || key === 'udaan') return 'Premium';
  if (key === 'elite_asia') return 'EPS-TOPIK & JLPT Premium';
  if (key === 'cds_monthly') return 'CDS Monthly';
  if (key === 'cds_annual') return 'CDS 1-Year Pass';
  if (key === 'ncc_monthly') return 'NCC Monthly';
  return nameOrTier;
}

export const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Basic',
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
    id: 'cds_monthly',
    name: 'CDS Monthly',
    priceNPR: 199,
    durationMonths: 1,
    durationDays: 30,
    bonusDays: 0,
    features: ['Complete UPSC CDS test bank', 'Full 2-hour official exam simulation', 'Detailed answer keys', 'Mistake Notebook'],
    subTestsPerDay: 100,
    mockTestsIncluded: 20,
    isPopular: true,
    unlimited: true,
  },
  {
    id: 'cds_annual',
    name: 'CDS 1-Year Pass',
    priceNPR: 1199,
    durationMonths: 12,
    durationDays: 365,
    bonusDays: 0,
    features: ['365 days unlimited CDS access', 'All upcoming CDS mock papers', 'Sectional cutoffs & rank predictors'],
    subTestsPerDay: 100,
    mockTestsIncluded: 100,
    isPopular: false,
    unlimited: true,
  },
  {
    id: 'ncc_monthly',
    name: 'NCC Monthly',
    priceNPR: 199,
    durationMonths: 1,
    durationDays: 30,
    bonusDays: 0,
    features: ['NCC B and C certificate practice in every subject', "Full 'B' and 'C' mock tests", 'Detailed answer keys', 'Mistake Notebook'],
    subTestsPerDay: 100,
    mockTestsIncluded: 20,
    isPopular: false,
    unlimited: true,
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
    isPopular: false,
  },
  {
    id: 'elite',
    name: 'Premium',
    priceNPR: 499,
    durationMonths: 1,
    durationDays: 30,
    bonusDays: 0,
    features: [
      '30 days full access',
      'Unlimited practice sub-tests',
      '1,100 AI gradings for speaking & writing',
      '12 full mock exams',
      'Maximum AI tutor',
      'Priority evaluation queue',
    ],
    subTestsPerDay: 60,
    mockTestsIncluded: 12,
    aiGradingsPerPeriod: 1100,
    aiGradingsPeriod: 'plan',
    isPopular: true,
    unlimited: true,
  },
  {
    id: 'elite_asia',
    name: 'EPS-TOPIK & JLPT Premium',
    priceNPR: 249,
    durationMonths: 1,
    durationDays: 30,
    bonusDays: 0,
    features: [
      '30 days of EPS-TOPIK and JLPT',
      'Unlimited EPS-TOPIK and JLPT practice',
      'Help in English on every item',
      'AI tutor',
      'IELTS and PTE need Premium',
    ],
    subTestsPerDay: 60,
    mockTestsIncluded: 0,
    aiGradingsPerPeriod: 0,
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
  elite_asia: 'Maximum',
  cds_monthly: 'Maximum',
  cds_annual: 'Maximum',
  ncc_monthly: 'Maximum',
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
  free: 'Free',
  weekly: 'Practice',
  pro: 'Preparation',
  elite: 'Monthly',
  elite_asia: 'Monthly',
  cds_monthly: 'Monthly',
  cds_annual: 'Best Value',
  ncc_monthly: 'Monthly',
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
