import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApp } from '@/context/AppContext';
import { SubscriptionPlan, SubscriptionState } from '@/lib/types';
import { api, errorMessage } from '@/lib/api';
import { formatPlanName } from '@/lib/subscriptions';
import { useToast } from '@/components/ui/toast';
import { QrCode, Copy, Check, CheckCircle2, RefreshCw } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlan: SubscriptionPlan | null;
  onSuccess?: () => void;
}

export default function QRPaymentCheckoutDialog({ open, onOpenChange, selectedPlan, onSuccess }: Props) {
  const { user, refreshUser } = useApp();
  const toast = useToast();

  const [transactionId, setTransactionId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  if (!selectedPlan) return null;

  const planTitle = formatPlanName(selectedPlan.name || selectedPlan.id);
  const totalDays = (selectedPlan.durationDays || selectedPlan.durationMonths * 30) + selectedPlan.bonusDays;
  const remarksCode = `PREPYO-${selectedPlan.id.toUpperCase()}-${user?.id ? user.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() : 'LEARNER'}`;

  const copyRemarks = async () => {
    try {
      await navigator.clipboard.writeText(remarksCode);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch {
      toast.error('Copy failed', 'Please select and copy it manually.');
    }
  };

  const handleProcessPayment = async () => {
    if (processing) return;

    if (!transactionId.trim()) {
      toast.error('Transaction ID required', 'Paste the ID from your payment receipt.');
      return;
    }

    setProcessing(true);
    try {
      const data = await api.post<{ subscription: SubscriptionState; message: string }>('/subscriptions/confirm', {
        planId: selectedPlan.id,
        paymentGateway: 'QR',
        transactionId: transactionId.trim(),
      });
      setSuccess(data.message || 'Your plan is now active.');
      await refreshUser();
      onSuccess?.();
    } catch (err) {
      toast.error('Could not confirm payment', errorMessage(err));
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setSuccess(null);
      setTransactionId('');
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-border bg-card shadow-2xl">
        {success ? (
          <div className="p-8 text-center space-y-5">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <DialogTitle className="text-xl font-black text-foreground tracking-tight font-display">
                {planTitle} is active
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {totalDays} days · {selectedPlan.subTestsPerDay} sub-tests a day ·{' '}
                {selectedPlan.mockTestsIncluded} full mocks
              </DialogDescription>
            </div>
            <Button onClick={() => handleClose(false)} className="w-full sm:w-auto px-8 font-bold text-xs h-9">
              Start practising
            </Button>
          </div>
        ) : (
          <div className="flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-5 pr-14 sm:pr-16 border-b border-border/70 bg-muted/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <QrCode className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-base sm:text-lg font-black tracking-tight font-display truncate">
                    Scan &amp; Pay
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground truncate">
                    {planTitle} · {totalDays} days
                  </DialogDescription>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Pay
                </span>
                <span className="text-lg sm:text-xl font-black text-primary font-display">
                  NPR {selectedPlan.priceNPR.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex flex-col items-center gap-2">
                <div className="w-full max-w-[210px] rounded-2xl bg-white p-3 border border-border shadow-sm">
                  <img
                    src="/images/payment-qr.png"
                    alt="Prepyo payment QR code"
                    className="w-full h-auto object-contain select-none"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground text-center">
                  Works with eSewa, Khalti, Fonepay and mobile banking.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <StepNumber n={1} />
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-xs text-foreground">
                      Add this in the <span className="font-bold">Remarks</span> field:
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 p-2 rounded-xl bg-muted/40 border border-border/70">
                      <span className="flex-1 min-w-0 text-[11px] font-mono font-bold text-foreground truncate">
                        {remarksCode}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={copyRemarks}
                        className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                        aria-label="Copy remarks code"
                      >
                        {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <StepNumber n={2} />
                  <div className="flex-1 min-w-0 pt-0.5">
                    <label htmlFor="txn-input" className="text-xs text-foreground">
                      Paste the <span className="font-bold">Transaction ID</span> from your receipt:
                    </label>
                    <Input
                      id="txn-input"
                      value={transactionId}
                      onChange={e => setTransactionId(e.target.value)}
                      placeholder="e.g. TXN-198421"
                      className="mt-1.5 h-9 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleProcessPayment}
                disabled={processing}
                className="w-full font-bold text-xs h-10 shadow-md"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Confirming…
                  </>
                ) : (
                  'Confirm payment'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">
      {n}
    </span>
  );
}
