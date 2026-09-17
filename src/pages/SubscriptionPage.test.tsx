import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import SubscriptionPage from './SubscriptionPage';

vi.mock('@/context/AppContext', () => ({ useApp: () => ({ user: { subscription: { planId: 'pro', planName: 'Taiyari', isActive: true } } }) }));
vi.mock('@/lib/hooks/useResources', () => ({ useSubscriptionPlans: () => ({ data: { plans: [] }, isPending: false }) }));
vi.mock('@/components/subscription/QueuedPlansCard', () => ({ default: () => null }));
vi.mock('@/components/subscription/QRPaymentCheckoutDialog', () => ({
  default: ({ open, selectedPlan }: { open: boolean; selectedPlan: { id: string } | null }) => open ? <div role="dialog">Checkout {selectedPlan?.id}</div> : null,
}));
afterEach(cleanup);

describe('mobile subscription cards', () => {
  it('offers all four plans with feature labels and disables the current plan', () => {
    render(<SubscriptionPage />);
    const cards = within(screen.getByLabelText('Subscription plans'));
    expect(cards.getAllByRole('heading')).toHaveLength(4);
    expect(cards.getAllByText('Practice sub-tests per day')).toHaveLength(4);
    expect((cards.getByRole('button', { name: 'Current Plan' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('region', { name: /Plan comparison/ })).toBeDefined();
  });

  it('uses the existing checkout flow when a mobile plan is selected', () => {
    render(<SubscriptionPage />);
    fireEvent.click(within(screen.getByLabelText('Subscription plans')).getByRole('button', { name: 'Choose Abhyas' }));
    expect(screen.getByRole('dialog').textContent).toBe('Checkout weekly');
  });
});
