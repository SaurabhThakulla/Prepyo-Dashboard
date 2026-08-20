import { PaidTier, SubscriptionTier } from './types';

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = ['free', 'weekly', 'pro', 'elite'];

/** Tiers checkout accepts. Kept in one place so routes can't drift apart —
 *  the weekly plan was previously rejected by one route and allowed by another. */
export const PAID_TIERS: PaidTier[] = ['weekly', 'pro', 'elite'];

export function isPaidTier(value: unknown): value is PaidTier {
  return typeof value === 'string' && (PAID_TIERS as string[]).includes(value);
}
