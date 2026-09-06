import { PaidTier, SubscriptionTier } from './types';

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

