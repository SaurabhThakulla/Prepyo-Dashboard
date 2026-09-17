import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, errorMessage } from '@/lib/api';
import { ReferralOverview } from '@/lib/types';

export default function ReferralRedeem({ onRedeemed }: { onRedeemed?: () => void }) {
  const [overview, setOverview] = useState<ReferralOverview | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    api.get<ReferralOverview>('/referrals/me').then(data => {
      if (!cancelled) setOverview(data);
    }).catch(err => { if (!cancelled) setError(errorMessage(err)); });
    return () => { cancelled = true; };
  }, []);

  const redeem = async () => {
    setBusy(true);
    setError('');
    try {
      await api.post('/referrals/redeem', { referralCode: code.trim() });
      setOverview(previous => previous ? { ...previous, canRedeem: false, myReferralStatus: 'pending' } : previous);
      onRedeemed?.();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return <section className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
    <h2 className="text-sm font-bold">Have a friend's referral code?</h2>
    {overview?.canRedeem && <>
      <div className="flex gap-2">
        <Input aria-label="Friend's referral code" value={code} onChange={event => setCode(event.target.value)} maxLength={64} disabled={busy} />
        <Button type="button" size="sm" disabled={busy || !code.trim()} onClick={redeem}>{busy ? 'Applying…' : 'Apply code'}</Button>
      </div>
      <p className="text-xs text-muted-foreground">Apply before submitting your first payment. The referral cannot be changed. No reward is granted until payment is confirmed.</p>
    </>}
    {overview && !overview.canRedeem && <p className="text-xs text-muted-foreground" role="status">
      {overview.myReferralStatus === 'completed' ? 'Referral rewarded after your confirmed purchase.' :
        overview.myReferralStatus === 'pending' || overview.myReferralStatus === 'legacy' ? 'Referral linked. Waiting for an eligible confirmed purchase.' :
        overview.myReferralStatus === 'cancelled' ? 'This referral is cancelled and cannot be replaced.' : 'Referral codes must be applied before your first payment request.'}
    </p>}
    {!overview && !error && <p className="text-xs">Loading referral status…</p>}
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
  </section>;
}
