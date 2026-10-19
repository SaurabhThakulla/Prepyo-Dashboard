import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UserProfile } from '@/lib/types';
import CurrentPlanCard from '@/components/dashboard/CurrentPlanCard';

const inDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const userWith = (subscription: Partial<NonNullable<UserProfile['subscription']>>) =>
  ({
    subscription: {
      planId: 'elite',
      planName: 'Udaan',
      isActive: true,
      dailySubTestsUsed: 0,
      dailySubTestsLimit: 10,
      mockTestsIncluded: 4,
      bonusMockTests: 0,
      totalMockTestsAllowed: 4,
      mockTestsUsed: 0,
      bonusDays: 0,
      ...subscription,
    },
  }) as UserProfile;

const renderCard = (user: UserProfile) =>
  render(
    <MemoryRouter>
      <CurrentPlanCard user={user} />
    </MemoryRouter>,
  );

// The phone card is one tappable row: plan, status, and when it ends in a line.
describe('the plan card on a phone', () => {
  it('fits the plan, its status and days left on one line each', () => {
    renderCard(userWith({ validUntil: inDays(77), bonusDays: 3, unlimited: true }));
    const card = screen.getAllByRole('link').find(link => link.className.includes('sm:hidden'))!;
    expect(card.getAttribute('href')).toBe('/subscription');
    expect(card.textContent).toContain('Udaan');
    expect(card.textContent).toContain('Active');
    expect(card.textContent).toMatch(/77 days left · until /);
    expect(card.textContent).toContain('+3 bonus days included');
    expect(card.textContent).toContain('∞');
  });

  it('invites a free learner to upgrade', () => {
    renderCard(userWith({ planId: 'free', planName: 'Free', validUntil: undefined }));
    const card = screen.getAllByRole('link').find(link => link.className.includes('sm:hidden'))!;
    expect(card.textContent).toContain('Free forever');
    expect(card.textContent).toContain('Upgrade');
  });
});
