import React, { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Receipt, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import { localPhone } from '@/lib/phone';

interface PaymentRequest {
  id: string;
  userName: string;
  userEmail: string;
  phoneNumber?: string;
  planId: string;
  planName: string;
  gateway: string;
  transactionId: string;
  amountNpr: number;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  effectiveDays: number;
  hasProof: boolean;
  reviewNote?: string;
  createdAt: string;
  reviewedAt?: string;
}

const PAGE_SIZE = 20;

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25',
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
  failed: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25',
  cancelled: 'bg-muted text-muted-foreground border-border',
};

/**
 * The purchase queue.
 *
 * A learner pays by QR, then submits the transaction id and a screenshot. The
 * plan is not granted until someone here approves it — before this, typing any
 * transaction id was enough to be given a subscription.
 */
export default function AdminPaymentsPage() {
  const toast = useToast();

  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState<string>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [proofFor, setProofFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (status) params.set('status', status);

      const data = await api.get<{
        payments: PaymentRequest[];
        pendingCount: number;
        meta: { total: number };
      }>(`/admin/payments?${params}`);

      setPayments(data.payments ?? []);
      setPendingCount(data.pendingCount ?? 0);
      setTotal(data.meta?.total ?? 0);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [offset, status]);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (payment: PaymentRequest, approve: boolean) => {
    setSavingId(payment.id);
    try {
      const data = await api.patch<{ grantedDays: number }>(`/admin/payments/${payment.id}/review`, {
        approve,
        note: notes[payment.id] ?? '',
      });

      toast.success(
        approve ? 'Subscription granted' : 'Request rejected',
        approve
          ? `${payment.userName} now has ${payment.planName} for ${data.grantedDays} days.`
          : `${payment.userName}'s request was marked failed.`,
      );
      setProofFor(null);
      load();
    } catch (err) {
      toast.error('Could not review that request', errorMessage(err));
    } finally {
      setSavingId(null);
    }
  };

  const pick = (next: string) => {
    setOffset(0);
    setStatus(next);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-5 pb-10">
      <div className="border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold text-foreground">Purchase requests</h1>
          <Badge variant="destructive">Admin</Badge>
          {pendingCount > 0 && (
            <Badge variant="outline" className="font-bold">
              {pendingCount} waiting
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Approving grants the plan for its full length, starting today. Nothing is granted until you approve it.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ['pending', 'Waiting'],
          ['success', 'Approved'],
          ['failed', 'Rejected'],
          ['', 'All'],
        ] as const).map(([value, label]) => (
          <Button
            key={label}
            type="button"
            variant={status === value ? 'default' : 'outline'}
            size="sm"
            onClick={() => pick(value)}
            className="font-bold text-xs"
          >
            {label}
          </Button>
        ))}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-[11px] font-medium text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading requests…</span>
        </div>
      )}

      {!loading && payments.length === 0 && !error && (
        <Card className="p-10 text-center space-y-2">
          <Receipt className="w-8 h-8 text-muted-foreground mx-auto" />
          <CardTitle className="text-sm">Nothing here</CardTitle>
          <CardDescription className="text-xs">No purchase requests match this filter.</CardDescription>
        </Card>
      )}

      <div className="space-y-3">
        {payments.map(payment => (
          <Card key={payment.id} className="p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground">{payment.userName}</span>
                  <Badge variant="outline" className={`text-xs font-bold ${STATUS_STYLES[payment.status]}`}>
                    {payment.status}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">{payment.userEmail}</p>
              </div>

              <div className="text-right">
                <div className="font-display text-lg font-black text-foreground">
                  NPR {payment.amountNpr.toLocaleString()}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {payment.planName} · {payment.effectiveDays} days
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
              <Detail label="Gateway" value={payment.gateway} />
              {/* Requests sent before the form dropped country codes still carry "+91…". */}
              <Detail label="Phone" value={payment.phoneNumber ? localPhone(payment.phoneNumber) : '—'} mono />
              <Detail label="Transaction" value={payment.transactionId} mono />
              <Detail label="Submitted" value={new Date(payment.createdAt).toLocaleDateString()} />
              <Detail
                label="Reviewed"
                value={payment.reviewedAt ? new Date(payment.reviewedAt).toLocaleDateString() : '—'}
              />
            </div>

            {payment.hasProof ? (
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setProofFor(proofFor === payment.id ? null : payment.id)}
                  className="font-bold text-xs"
                >
                  {proofFor === payment.id ? 'Hide payment proof' : 'View payment proof'}
                </Button>
                {proofFor === payment.id && (
                  <img
                    src={`/api/v1/admin/payments/${payment.id}/proof`}
                    alt={`Payment proof from ${payment.userName}`}
                    className="max-h-96 rounded-xl border border-border"
                  />
                )}
              </div>
            ) : (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                No screenshot attached — check the transaction id against your statement before approving.
              </p>
            )}

            {payment.status === 'pending' ? (
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <Input
                  value={notes[payment.id] ?? ''}
                  onChange={e => setNotes(current => ({ ...current, [payment.id]: e.target.value }))}
                  placeholder="Note (optional) — why you approved or rejected"
                />
                <div className="flex gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    disabled={savingId === payment.id}
                    onClick={() => review(payment, true)}
                    className="font-bold text-xs"
                  >
                    {savingId === payment.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Check className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={savingId === payment.id}
                    onClick={() => review(payment, false)}
                    className="font-bold text-xs text-rose-600 hover:text-rose-700"
                  >
                    <X className="w-3.5 h-3.5 mr-1.5" />
                    Reject
                  </Button>
                </div>
              </div>
            ) : (
              payment.reviewNote && (
                <p className="text-[11px] text-muted-foreground border-t border-border/70 pt-2">
                  <span className="font-bold text-foreground">Note:</span> {payment.reviewNote}
                </p>
              )
            )}
          </Card>
        ))}
      </div>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="font-bold text-xs"
              disabled={offset === 0 || loading}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-bold text-xs"
              disabled={offset + PAGE_SIZE >= total || loading}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="block text-xs uppercase font-bold text-muted-foreground">{label}</span>
      <span className={`text-foreground ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
