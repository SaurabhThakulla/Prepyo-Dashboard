import { describe, expect, it } from 'vitest';
import { limitLabel, planAccessDays, subTestsLeft, DEFAULT_PLANS } from '@/lib/subscriptions';
import type { SubscriptionState } from '@/lib/types';

const state = (over: Partial<SubscriptionState>): SubscriptionState => ({
  planId: 'pro', planName: 'Taiyari', isActive: true,
  dailySubTestsUsed: 3, dailySubTestsLimit: 50,
  dailyEvaluationsUsed: 3, dailyEvaluationsLimit: 50,
  mockTestsIncluded: 5, bonusMockTests: 0, totalMockTestsAllowed: 5, mockTestsUsed: 1, bonusDays: 3,
  ...over,
} as SubscriptionState);

describe('unlimited plans', () => {
  it('never run out of sub-tests', () => {
    expect(subTestsLeft(state({}))).toBe(47);
    expect(subTestsLeft(state({ dailySubTestsUsed: 60, unlimited: true }))).toBe(Number.POSITIVE_INFINITY);
    expect(subTestsLeft(undefined)).toBe(0);
  });

  it('are labelled Unlimited instead of a number', () => {
    expect(limitLabel(50)).toBe('50');
    expect(limitLabel(60, true)).toBe('Unlimited');
  });

  it('Udaan is 30 days plus 3 bonus, unlimited', () => {
    const udaan = DEFAULT_PLANS.find(p => p.id === 'elite')!;
    expect(planAccessDays(udaan)).toBe(33);
    expect(udaan.unlimited).toBe(true);
  });
});
