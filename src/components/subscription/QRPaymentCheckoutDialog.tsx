import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import ReferralRedeem from './ReferralRedeem';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApp } from '@/context/AppContext';
import { SubscriptionPlan, SubscriptionState } from '@/lib/types';
import { api, errorMessage } from '@/lib/api';
import { formatPlanName, planUsageTier } from '@/lib/subscriptions';
import { useToast } from '@/components/ui/toast';
import { PAYMENT_ACCOUNT, PAYMENT_METHODS, PaymentMethod } from '@/lib/paymentMethods';
import { localPhone } from '@/lib/phone';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  RefreshCw,
  Download,
  ImageOff,
  ImagePlus,
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

// Payments are reviewed as they arrive, so the wait is short. Said in one
// place so the footer and the confirmation cannot drift apart.
const REVIEW_TIME = 'usually within minutes';

// On a phone this dialog is a card in the middle of the screen, like on desktop,
// rather than the bottom sheet other dialogs rise as: each class here undoes one
// of the sheet's phone-only rules in ui/dialog.
const PHONE_CENTERED = [
  'max-sm:inset-x-auto max-sm:bottom-auto max-sm:left-[50%] max-sm:top-[50%]',
  'max-sm:translate-x-[-50%] max-sm:translate-y-[-50%]',
  'max-sm:w-[calc(100%-1.5rem)] max-sm:max-h-[calc(100dvh-1.5rem)]',
  'max-sm:rounded-2xl max-sm:border max-sm:pt-0 max-sm:pb-0 max-sm:before:hidden',
  'max-sm:data-[state=open]:slide-in-from-bottom-0 max-sm:data-[state=closed]:slide-out-to-bottom-0',
  'max-sm:data-[state=open]:zoom-in-95 max-sm:data-[state=closed]:zoom-out-95',
].join(' ');

// 16px on phones: anything smaller makes iOS zoom the page when a field is tapped.
const FIELD_CLASS = 'h-11 text-base sm:h-10 sm:text-sm';

export default function QRPaymentCheckoutDialog({ open, onOpenChange, selectedPlan, onSuccess }: Props) {
  const { refreshUser } = useApp();
  const toast = useToast();

  const [methodId, setMethodId] = useState<string>(PAYMENT_METHODS[0].id);
  const [transactionId, setTransactionId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [proofImage, setProofImage] = useState<string>('');
  const [proofName, setProofName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [brokenQr, setBrokenQr] = useState<Record<string, boolean>>({});
  const [referralOpen, setReferralOpen] = useState(false);
  const [copied, setCopied] = useState(false);

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
  const qrReady = !brokenQr[method.id] && Boolean(qrSource);

  const planTitle = formatPlanName(selectedPlan.name || selectedPlan.id);
  const totalDays = (selectedPlan.durationDays || selectedPlan.durationMonths * 30) + selectedPlan.bonusDays;
  const amount = selectedPlan.priceNPR.toLocaleString();
  const tier = planUsageTier(selectedPlan.id).toLowerCase();

  // The eSewa QR is built from this id, so paying to it by hand reaches the
  // same account. Only eSewa: the Khalti code is a fixed image, not this number.
  const payToId = method.buildQrPayload ? PAYMENT_ACCOUNT.phone : '';

  // Same rules the submit uses, so the footer and the toast never disagree with it
  const phoneValid = /^\d{7,15}$/.test(localPhone(phoneNumber).replace(/[\s-]/g, ''));
  const missing = [
    !phoneValid && (phoneNumber.trim() ? 'a valid phone number' : 'phone number'),
    transactionId.trim().length < 4 && 'transaction ID',
    !proofImage && 'screenshot',
  ].filter(Boolean) as string[];
  const missingText = missing.length > 1 ? `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}` : missing[0];

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

  const copyPayToId = async () => {
    try {
      await navigator.clipboard.writeText(payToId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy', `The ${method.label} ID is ${payToId}.`);
    }
  };

  const handleProcessPayment = async () => {
    if (processing) return;

    // Clicked with details missing: say everything that is still needed at once
    if (missing.length > 0) {
      toast.error('Some details are missing', `Still needed: ${missingText}.`);
      return;
    }

    const phone = localPhone(phoneNumber);
    const txn = transactionId.trim();

    setProcessing(true);
    try {
      await api.post<{ subscription: SubscriptionState; message: string }>('/subscriptions/confirm', {
        planId: selectedPlan.id,
        paymentGateway: method.gateway,
        transactionId: txn,
        phoneNumber: phone,
        proofImage,
      });
      setSuccess(true);
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
      setSuccess(false);
      setTransactionId('');
      setPhoneNumber('');
      clearProof();
      setProcessing(false);
      setReferralOpen(false);
      setCopied(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={`gap-0 overflow-hidden border-border bg-card p-0 shadow-2xl ${PHONE_CENTERED} ${
          success ? 'sm:max-w-md' : 'sm:max-w-3xl'
        }`}
      >
        {success ? (
          <div className="space-y-5 p-6 text-center sm:p-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 text-emerald-500">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="font-display text-2xl font-black tracking-tight text-foreground">
                Payment submitted
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                We will activate your {planTitle} plan as soon as we match the payment, {REVIEW_TIME}. You
                will get a notification here.
              </DialogDescription>
            </div>
            <div className="space-y-2.5 rounded-2xl border border-border/70 bg-muted/30 p-4 text-left">
              <SummaryRow label="Plan" value={`${planTitle} · ${totalDays} days`} />
              <SummaryRow label="Paid with" value={`${method.label} · NPR ${amount}`} />
              <SummaryRow label="Phone" value={localPhone(phoneNumber)} />
              <SummaryRow label="Txn ID" value={transactionId.trim()} mono />
            </div>
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Clock3 className="h-4 w-4" />
              Usually checked within minutes.
            </p>
            <Button onClick={() => handleClose(false)} size="lg" className="w-full font-bold">
              Done
            </Button>
          </div>
        ) : (
          // Header and action bar stay put; only the middle scrolls.
          <div className="flex max-h-[calc(100dvh-1.5rem)] flex-col sm:max-h-[calc(100dvh-2rem)]">
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/70 bg-muted/20 px-4 py-3 pr-14 sm:items-start sm:gap-4 sm:px-6 sm:py-5 sm:pr-16">
              <div className="min-w-0">
                <DialogTitle className="font-display text-base font-black tracking-tight sm:text-xl">
                  Complete your payment
                </DialogTitle>
                {/* A phone has no room for the plan's feature list; the name and length are what matter here. */}
                <DialogDescription className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:mt-1 sm:text-sm">
                  <span className="font-semibold text-foreground">{planTitle}</span> · {totalDays} days
                  <span className="max-sm:hidden">
                    {' '}
                    · {selectedPlan.unlimited ? 'unlimited sub-tests' : `${tier} practice`} · {tier} AI gradings
                    &amp; full mocks
                  </span>
                </DialogDescription>
              </div>
              <div className="shrink-0 text-right">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  To pay
                </span>
                <span className="block whitespace-nowrap font-display text-xl font-black leading-tight text-primary sm:text-3xl">
                  NPR {amount}
                </span>
              </div>
            </header>

            <div className="grid flex-1 overflow-y-auto overscroll-contain sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] sm:divide-x sm:divide-border/70">
              <section aria-labelledby="pay-step" className="space-y-4 p-4 sm:p-6">
                <StepHeading id="pay-step" n={1} title={`Pay NPR ${amount}`} />

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

                <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/70 bg-muted/20 p-3 sm:p-4">
                  <div className="w-full max-w-[168px] rounded-2xl border border-border bg-white p-2.5 shadow-sm sm:max-w-[220px] sm:p-3">
                    {qrReady ? (
                      <img
                        src={qrSource}
                        alt={`${method.label} payment QR code`}
                        className="h-auto w-full select-none object-contain"
                        onError={() => setBrokenQr(prev => ({ ...prev, [method.id]: true }))}
                      />
                    ) : (
                      <div className="flex aspect-square flex-col items-center justify-center gap-1.5 px-3 text-center text-neutral-500">
                        <ImageOff className="h-6 w-6" />
                        <span className="text-xs font-semibold leading-tight">
                          {method.label} QR unavailable right now
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-center text-xs leading-relaxed text-muted-foreground">{method.hint}</p>

                  {qrReady && (
                    <Button asChild variant="outline" className="h-10 w-full gap-2 text-xs font-bold sm:h-9">
                      <a href={qrSource} download={`prepyo-${method.id}-qr.png`}>
                        <Download className="h-4 w-4" />
                        Save QR to scan from your gallery
                      </a>
                    </Button>
                  )}
                </div>

                {payToId && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5">
                    <div className="min-w-0">
                      <span className="block text-[11px] text-muted-foreground">
                        Or send to this {method.label} ID
                      </span>
                      <span className="block font-mono text-sm font-bold text-foreground">{payToId}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{PAYMENT_ACCOUNT.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={copyPayToId}
                      className="h-9 shrink-0 gap-1.5 text-xs font-bold"
                      aria-label={`Copy ${method.label} ID`}
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                )}
              </section>

              <section
                aria-labelledby="confirm-step"
                className="space-y-4 border-t border-border/70 p-4 sm:border-t-0 sm:p-6"
              >
                <StepHeading id="confirm-step" n={2} title="Tell us you paid" />

                <Field id="phone-input" label="Your phone number" hint="The number on your wallet, or one we can reach you on.">
                  <Input
                    id="phone-input"
                    type="tel"
                    inputMode="tel"
                    value={phoneNumber}
                    // Autofill offers "+977…" or "+91…"; the country code is dropped as it lands.
                    onChange={e => setPhoneNumber(localPhone(e.target.value))}
                    placeholder="98XXXXXXXX"
                    className={FIELD_CLASS}
                    autoComplete="tel-national"
                  />
                </Field>

                <Field
                  id="txn-input"
                  label="Transaction ID"
                  hint={`Shown on your ${method.label} receipt after you pay.`}
                >
                  <Input
                    id="txn-input"
                    value={transactionId}
                    onChange={e => setTransactionId(e.target.value)}
                    placeholder="e.g. 0A1B2C3"
                    className={`${FIELD_CLASS} font-mono`}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                  />
                </Field>

                <div>
                  <span className="mb-1.5 block text-xs font-bold text-foreground sm:text-[13px]">
                    Payment screenshot
                  </span>
                  {proofImage ? (
                    <div className="flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-2.5">
                      <img
                        src={proofImage}
                        alt="Payment screenshot preview"
                        className="h-14 w-14 shrink-0 rounded-lg border border-border object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <Check className="h-3.5 w-3.5" strokeWidth={3} /> Attached
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">{proofName}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearProof}
                        className="h-9 w-9 shrink-0 p-0 text-muted-foreground hover:text-foreground"
                        aria-label="Remove screenshot"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <label
                        htmlFor="paymentProof"
                        className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-5 text-center transition-colors hover:border-primary/60 hover:bg-primary/5"
                      >
                        <ImagePlus className="h-6 w-6 text-primary" />
                        <span className="text-sm font-bold text-foreground">Attach payment screenshot</span>
                        <span className="text-xs text-muted-foreground">
                          The success screen from {method.label} · up to 4 MB
                        </span>
                      </label>
                      <input
                        id="paymentProof"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={pickProof}
                        className="sr-only"
                      />
                    </>
                  )}
                </div>

                <div className="rounded-xl border border-border/70">
                  <button
                    type="button"
                    onClick={() => setReferralOpen(value => !value)}
                    aria-expanded={referralOpen}
                    aria-controls="referral-panel"
                    className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-xs font-bold text-foreground sm:text-[13px]"
                  >
                    <span>
                      Have a friend&apos;s referral code?{' '}
                      <span className="font-medium text-muted-foreground">Optional</span>
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                        referralOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {referralOpen && (
                    <div id="referral-panel" className="border-t border-border/70 p-3">
                      <ReferralRedeem compact />
                    </div>
                  )}
                </div>
              </section>
            </div>

            <footer className="shrink-0 border-t border-border/70 bg-card px-4 py-3 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4">
              <p className="mb-2 flex items-start gap-1.5 text-xs leading-snug text-muted-foreground sm:mb-0">
                <ShieldCheck className="mt-px h-4 w-4 shrink-0 text-emerald-500" />
                <span aria-live="polite">
                  {missing.length > 0
                    ? `Still needed: ${missingText}.`
                    : `Your plan starts once we match the payment, ${REVIEW_TIME}.`}
                </span>
              </p>
              <Button
                onClick={handleProcessPayment}
                disabled={processing}
                aria-disabled={missing.length > 0}
                size="lg"
                className={`w-full shrink-0 font-bold shadow-md disabled:opacity-50 sm:w-auto sm:min-w-[13rem] ${
                  missing.length > 0 ? 'opacity-60' : ''
                }`}
              >
                {processing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  `I have paid NPR ${amount}`
                )}
              </Button>
            </footer>
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
      className={`relative flex min-h-[3.25rem] items-center gap-2.5 rounded-xl border-2 p-2.5 text-left transition-all ${
        active
          ? 'border-primary bg-primary/10 shadow-sm'
          : 'border-border/60 bg-card hover:border-border hover:bg-muted/40'
      }`}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-black text-white"
        style={{ backgroundColor: method.accent }}
      >
        {method.short}
      </span>
      <span className="min-w-0 truncate text-sm font-bold text-foreground">{method.label}</span>
      {active && (
        <span className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

function StepHeading({ id, n, title }: { id: string; n: number; title: string }) {
  return (
    <h3 id={id} className="flex items-center gap-2.5 text-sm font-black text-foreground sm:text-base">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {n}
      </span>
      {title}
    </h3>
  );
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold text-foreground sm:text-[13px]">
        {label}
      </label>
      {children}
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{hint}</p>
    </div>
  );
}

function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={`truncate text-sm font-semibold text-foreground ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}
