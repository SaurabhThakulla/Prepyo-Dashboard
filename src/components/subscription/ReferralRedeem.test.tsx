import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ReferralRedeem from './ReferralRedeem';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: mocks, errorMessage: (err: Error) => err.message }));
afterEach(cleanup);
beforeEach(() => { vi.resetAllMocks(); });

describe('ReferralRedeem', () => {
  it('links the code without claiming an immediate reward', async () => {
    mocks.get.mockResolvedValue({ canRedeem: true, myReferralStatus: 'none' });
    mocks.post.mockResolvedValue({});
    const onRedeemed = vi.fn();
    render(<ReferralRedeem onRedeemed={onRedeemed} />);
    const input = await screen.findByLabelText("Friend's referral code");
    fireEvent.change(input, { target: { value: '  prep-ABC234  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply code' }));
    await screen.findByText('Referral linked. Waiting for an eligible confirmed purchase.');
    expect(mocks.post).toHaveBeenCalledExactlyOnceWith('/referrals/redeem', { referralCode: 'prep-ABC234' });
    expect(onRedeemed).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Apply code' })).toBeNull();
  });

  it('shows a validation failure and permits retry', async () => {
    mocks.get.mockResolvedValue({ canRedeem: true, myReferralStatus: 'none' });
    mocks.post.mockRejectedValue(new Error('Referral code not found'));
    render(<ReferralRedeem />);
    fireEvent.change(await screen.findByLabelText("Friend's referral code"), { target: { value: 'invalid' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply code' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Referral code not found');
    await waitFor(() => expect((screen.getByRole('button', { name: 'Apply code' }) as HTMLButtonElement).disabled).toBe(false));
  });

  it.each([
    ['completed', 'Referral rewarded after your confirmed purchase.'],
    ['pending', 'Referral linked. Waiting for an eligible confirmed purchase.'],
    ['cancelled', 'This referral is cancelled and cannot be replaced.'],
    ['none', 'Referral codes must be applied before your first payment request.'],
  ])('does not offer redemption for %s', async (myReferralStatus, message) => {
    mocks.get.mockResolvedValue({ canRedeem: false, myReferralStatus });
    render(<ReferralRedeem />);
    await screen.findByText(message);
    expect(screen.queryByLabelText("Friend's referral code")).toBeNull();
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it('reports an overview load error rather than enabling redemption', async () => {
    mocks.get.mockRejectedValue(new Error('Network unavailable'));
    render(<ReferralRedeem />);
    expect((await screen.findByRole('alert')).textContent).toBe('Network unavailable');
    expect(screen.queryByLabelText("Friend's referral code")).toBeNull();
  });
});
