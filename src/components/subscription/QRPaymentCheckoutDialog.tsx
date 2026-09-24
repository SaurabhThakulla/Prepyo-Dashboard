import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import ReferralRedeem from './ReferralRedeem';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApp } from '@/context/AppContext';
import { SubscriptionPlan, SubscriptionState } from '@/lib/types';
import { api, errorMessage } from '@/lib/api';
import { formatPlanName } from '@/lib/subscriptions';
import { useToast } from '@/components/ui/toast';
import { PAYMENT_METHODS, PaymentMethod } from '@/lib/paymentMethods';
import {
  Check,
  CheckCircle2,
  RefreshCw,
  Download,
  ImageOff,
  ShieldCheck,
  Clock3,
  X,
} from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlan: SubscriptionPlan | null;
  onSuccess?: () => void;
}

const MAX_PROOF_BYTES = 4 * 1024 * 1024;

export default function QRPaymentCheckoutDialog({ open, onOpenChange, selectedPlan, onSuccess }: Props) {
  const { refreshUser } = useApp();
  const toast = useToast();

  const [methodId, setMethodId] = useState<string>(PAYMENT_METHODS[0].id);
  const [transactionId, setTransactionId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [proofImage, setProofImage] = useState<string>('');
  const [proofName, setProofName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [brokenQr, setBrokenQr] = useState<Record<string, boolean>>({});

  const method = useMemo(
    () => PAYMENT_METHODS.find(m => m.id === methodId) ?? PAYMENT_METHODS[0],
    [methodId],
  );

  const [generatedQr, setGeneratedQr] = useState<Record<string, string>>({});
  const amountNPR = selectedPlan?.priceNPR ?? 0;
  const qrKey = `${method.id}:${amountNPR}`;

  useEffect(() => {
    if (!method.buildQrPayload || !amountNPR || generatedQr[qrKey]) return;

    let cancelled = false;
    QRCode.toDataURL(method.buildQrPayload(amountNPR), {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 512,
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then(url => {
        if (!cancelled) setGeneratedQr(prev => ({ ...prev, [qrKey]: url }));
      })
      .catch(() => {
        if (!cancelled) setBrokenQr(prev => ({ ...prev, [method.id]: true }));
      });

    return () => {
      cancelled = true;
    };
  }, [method, amountNPR, qrKey, generatedQr]);

  if (!selectedPlan) return null;

  const qrSource = generatedQr[qrKey] || method.qrImage || '';

  const planTitle = formatPlanName(selectedPlan.name || selectedPlan.id);
  const totalDays = (selectedPlan.durationDays || selectedPlan.durationMonths * 30) + selectedPlan.bonusDays;
  const amount = selectedPlan.priceNPR.toLocaleString();

  const pickProof = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_PROOF_BYTES) {
      toast.error('That image is too large', 'Please attach a screenshot under 4 MB.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProofImage(typeof reader.result === 'string' ? reader.result : '');
      setProofName(file.name);
    };
    reader.onerror = () => toast.error('Could not read that file', 'Try another screenshot.');
    reader.readAsDataURL(file);
  };

  const clearProof = () => {
    setProofImage('');
    setProofName('');
  };

  const handleProcessPayment = async () => {
    if (processing) return;

    const phone = phoneNumber.trim();
    if (!phone || phone.length < 7) {
      toast.error('Phone number required', 'Please enter your contact or wallet phone number.');
      return;
    }

    const txn = transactionId.trim();
    if (txn.length < 4) {
      toast.error('Transaction ID required', `Paste the ID shown on your ${method.label} receipt.`);
      return;
    }

    if (!proofImage) {
      toast.error('Payment screenshot required', 'Screenshot proof is mandatory. Please attach your payment screenshot.');
      return;
    }

    setProcessing(true);
    try {
      const data = await api.post<{ subscription: SubscriptionState; message: string }>('/subscriptions/confirm', {
        planId: selectedPlan.id,
        paymentGateway: method.gateway,
        transactionId: txn,
        phoneNumber: phone,
        proofImage,
      });
      setSuccess(data.message || 'Payment submitted. We will activate your plan once it is checked.');
      await refreshUser();
      onSuccess?.();
    } catch (err) {
      toast.error('Could not confirm payment', errorMessage(err));
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setSuccess(null);
      setTransactionId('');
      setPhoneNumber('');
      clearProof();
      setProcessing(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-border bg-card shadow-2xl">
        {success ? (
          <div className="p-6 sm:p-8 text-center space-y-5">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <DialogTitle className="text-xl font-black text-foreground tracking-tight font-display">
                Payment submitted
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">{success}</DialogDescription>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/30 p-3 text-left space-y-1.5">
              <SummaryRow label="Plan" value={`${planTitle} · ${totalDays} days`} />
              <SummaryRow label="Paid with" value={`${method.label} · NPR ${amount}`} />
              <SummaryRow label="Phone" value={phoneNumber.trim()} />
              <SummaryRow label="Txn ID" value={transactionId.trim()} mono />
            </div>
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock3 className="w-3.5 h-3.5" />
              Usually checked within a few hours.
            </p>
            <Button onClick={() => handleClose(false)} className="w-full sm:w-auto px-8 font-bold text-xs h-9">
              Done
            </Button>
          </div>
        ) : (
          <div className="flex flex-col max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div className="p-4 sm:p-5 pr-14 sm:pr-16 border-b border-border/70 bg-muted/20">
              <DialogTitle className="text-base sm:text-lg font-black tracking-tight font-display">
                Complete your payment
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {planTitle} · {totalDays} days ·{' '}
                {selectedPlan.unlimited ? 'unlimited sub-tests' : `${selectedPlan.subTestsPerDay} sub-tests a day`} ·{' '}
                {(selectedPlan.aiGradingsPerPeriod ?? 0).toLocaleString('en-US')} AI gradings
                {selectedPlan.aiGradingsPeriod === 'day' ? ' a day' : ''} ·{' '}
                {selectedPlan.mockTestsIncluded} full mocks
              </DialogDescription>
              <div className="mt-3 flex items-end justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pb-0.5">
                  Amount to pay
                </span>
                <span className="text-2xl font-black text-primary font-display leading-none">NPR {amount}</span>
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              <ReferralRedeem />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Pay with
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <MethodTab
                      key={m.id}
                      method={m}
                      active={m.id === method.id}
                      onSelect={() => setMethodId(m.id)}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 flex flex-col items-center gap-3">
                <div className="w-full max-w-[240px] rounded-xl bg-white p-3 border border-border shadow-sm">
                  {brokenQr[method.id] || !qrSource ? (
                    <div className="aspect-square flex flex-col items-center justify-center gap-1.5 px-3 text-center text-neutral-500">
                      <ImageOff className="w-6 h-6" />
                      <span className="text-[10px] font-semibold leading-tight">
                        {method.label} QR unavailable right now
                      </span>
                    </div>
                  ) : (
                    <img
                      src={qrSource}
                      alt={`${method.label} payment QR code`}
                      className="w-full h-auto object-contain select-none"
                      onError={() => setBrokenQr(prev => ({ ...prev, [method.id]: true }))}
                    />
                  )}
                </div>

                {!brokenQr[method.id] && qrSource && (
                  <a
                    href={qrSource}
                    download={`prepyo-${method.id}-qr.png`}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Save QR to scan from your gallery
                  </a>
                )}
              </div>

              <div className="space-y-3">
                <Step n={1} title={`Send NPR ${amount} from ${method.label}`}>
                  <p className="text-[11px] text-muted-foreground">{method.hint}</p>
                </Step>

                <Step n={2} title="Enter your payment details">
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="phone-input" className="block text-[11px] font-bold text-foreground mb-1">
                        Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        id="phone-input"
                        type="tel"
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)}
                        placeholder="eSewa / Khalti / Contact number · e.g. 98XXXXXXXX"
                        className="h-9 text-xs"
                        autoComplete="tel"
                      />
                    </div>

                    <div>
                      <label htmlFor="txn-input" className="block text-[11px] font-bold text-foreground mb-1">
                        Transaction ID <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        id="txn-input"
                        value={transactionId}
                        onChange={e => setTransactionId(e.target.value)}
                        placeholder="Transaction ID · e.g. TXN-198421"
                        className="h-9 text-xs font-mono"
                        autoComplete="off"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-foreground">
                          Payment Screenshot <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                          Required
                        </span>
                      </div>
                      {proofImage ? (
                        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/40 border border-border/70">
                          <img
                            src={proofImage}
                            alt="Payment screenshot preview"
                            className="w-10 h-10 rounded-lg object-cover border border-border"
                          />
                          <span className="flex-1 min-w-0 text-[11px] text-foreground truncate">{proofName}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={clearProof}
                            className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                            aria-label="Remove screenshot"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <label
                            htmlFor="paymentProof"
                            className="flex items-center justify-center gap-2 h-10 rounded-xl border border-dashed border-rose-300 dark:border-rose-800 bg-rose-50/20 dark:bg-rose-950/20 text-[11px] font-bold text-foreground hover:border-primary/50 cursor-pointer transition-colors"
                          >
                            Attach payment screenshot (required)
                          </label>
                          <input
                            id="paymentProof"
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={pickProof}
                            className="sr-only"
                          />
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            Required to verify your payment. Max 4 MB.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Step>
              </div>
            </div>

            <div className="sticky bottom-0 p-4 sm:p-5 pt-3 border-t border-border/70 bg-card/95 backdrop-blur space-y-2">
              <Button
                onClick={handleProcessPayment}
                disabled={processing || !transactionId.trim() || !phoneNumber.trim() || !proofImage}
                className="w-full font-bold text-xs h-10 shadow-md disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Submitting…
                  </>
                ) : (
                  `I have paid NPR ${amount}`
                )}
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-center text-[10px] text-muted-foreground">
                <ShieldCheck className="w-3 h-3 shrink-0" />
                Your plan starts once we match the payment — usually within a few hours.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MethodTab({
  method,
  active,
  onSelect,
}: {
  method: PaymentMethod;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`relative flex items-center gap-2.5 p-2.5 rounded-xl border-2 text-left transition-all ${
        active
          ? 'border-primary bg-primary/10 shadow-sm'
          : 'border-transparent bg-muted/40 hover:bg-muted/60'
      }`}
    >
      <span
        className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0"
        style={{ backgroundColor: method.accent }}
      >
        {method.short}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-bold text-foreground truncate">{method.label}</span>
        <span className="block text-[10px] text-muted-foreground truncate">Scan QR</span>
      </span>
      {active && (
        <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
          <Check className="w-2.5 h-2.5" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="shrink-0 w-5 h-5 mt-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">
        {n}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground mb-1.5">{title}</p>
        {children}
      </div>
    </div>
  );
}

function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={`text-xs font-semibold text-foreground truncate ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}
