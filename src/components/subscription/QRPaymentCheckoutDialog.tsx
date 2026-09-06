import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useApp } from '@/context/AppContext';
import { SubscriptionPlan, SubscriptionState } from '@/lib/types';
import { api, errorMessage } from '@/lib/api';
import { formatPlanName } from '@/lib/subscriptions';
import { useToast } from '@/components/ui/toast';
import { QrCode, Copy, Check, Download, Upload, CheckCircle2, ShieldCheck, Sparkles, Smartphone, Info, X, RefreshCw } from 'lucide-react';

export type PaymentGateway = 'fonepay' | 'esewa' | 'khalti' | 'banking';

const GATEWAYS = [
  { id: 'fonepay' as const, name: 'Fonepay QR', badge: 'Interoperable', tag: '50+ Banks & Wallets', active: 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 ring-2 ring-red-500/30', instr: 'Open any Mobile Banking app (NIC Asia, Nabil, Global IME, etc.), tap Scan to Pay, and scan this QR code.' },
  { id: 'esewa' as const, name: 'eSewa', badge: 'Direct QR', tag: 'Scan & Pay via eSewa', active: 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/30', instr: 'Open your eSewa App, tap the central QR Scanner icon at the bottom, scan this code, and confirm merchant payment.' },
  { id: 'khalti' as const, name: 'Khalti', badge: 'Wallet QR', tag: 'Khalti Digital Wallet', active: 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400 ring-2 ring-purple-500/30', instr: 'Open your Khalti App, tap the Scanner icon on the home screen, scan this QR code, and verify payment.' },
  { id: 'banking' as const, name: 'Mobile Banking', badge: 'Direct Bank', tag: 'All Commercial Banks', active: 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/30', instr: 'Log into your bank app (Class A, B, or C bank in Nepal), select QR Payment / Fonepay, and scan this code.' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlan: SubscriptionPlan | null;
  onSuccess?: () => void;
}

export default function QRPaymentCheckoutDialog({ open, onOpenChange, selectedPlan, onSuccess }: Props) {
  const { user, refreshUser } = useApp();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway>('fonepay');
  const [transactionId, setTransactionId] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedAmt, setCopiedAmt] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  if (!selectedPlan) return null;

  const planTitle = formatPlanName(selectedPlan.name || selectedPlan.id);
  const totalDays = (selectedPlan.durationDays || selectedPlan.durationMonths * 30) + selectedPlan.bonusDays;
  const remarksCode = `PREPYO-${selectedPlan.id.toUpperCase()}-${user?.id ? user.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() : 'LEARNER'}`;
  const gw = GATEWAYS.find(g => g.id === selectedGateway) || GATEWAYS[0];


  const copy = async (text: string, setFn: (v: boolean) => void, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setFn(true);
      toast.success('Copied', `${label} copied to clipboard.`);
      setTimeout(() => setFn(false), 2000);
    } catch { toast.error('Copy failed', 'Please select and copy manually.'); }
  };

  const handleProcessPayment = async () => {
    if (processing) return;
    setProcessing(true);
    try {
      const data = await api.post<{ subscription: SubscriptionState; message: string }>('/subscriptions/confirm', {
        planId: selectedPlan.id, paymentGateway: selectedGateway.toUpperCase(), transactionId: transactionId.trim() || undefined,
      });
      setSuccess(data.message || 'Payment recorded successfully! Your plan is now active.');
      await refreshUser();
      onSuccess?.();
    } catch (err) { toast.error('Confirmation Failed', errorMessage(err)); }
    finally { setProcessing(false); }
  };

  const handleClose = (v: boolean) => {
    if (!v) { setSuccess(null); setTransactionId(''); setReceiptFile(null); setReceiptPreview(null); }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-border bg-card shadow-2xl">
        {success ? (
          <div className="p-8 sm:p-10 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="relative w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500"><CheckCircle2 className="w-10 h-10" /></div>
            </div>
            <div className="space-y-2">
              <Badge variant="success" className="text-xs px-3 py-1 font-bold">Subscription Activated</Badge>
              <h3 className="text-2xl font-black text-foreground tracking-tight font-display">Welcome to {planTitle.startsWith('Prepyo') ? planTitle : `Prepyo ${planTitle}`}!</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">{success}</p>
            </div>
            <div className="bg-muted/40 border border-border/80 rounded-2xl p-4 max-w-md mx-auto grid grid-cols-2 gap-4 text-left">
              <div><span className="text-[10px] uppercase font-bold text-muted-foreground block">Plan</span><span className="text-sm font-bold text-foreground">{planTitle}</span></div>
              <div><span className="text-[10px] uppercase font-bold text-muted-foreground block">Validity</span><span className="text-sm font-bold text-foreground">{totalDays} Days {selectedPlan.bonusDays > 0 ? `(+${selectedPlan.bonusDays} bonus)` : ''}</span></div>
              <div><span className="text-[10px] uppercase font-bold text-muted-foreground block">Sub-Tests / Day</span><span className="text-sm font-bold text-primary">{selectedPlan.subTestsPerDay} sets</span></div>
              <div><span className="text-[10px] uppercase font-bold text-muted-foreground block">Mock Tests</span><span className="text-sm font-bold text-primary">{selectedPlan.mockTestsIncluded} full mocks</span></div>
            </div>
            <Button onClick={() => handleClose(false)} className="w-full sm:w-auto px-8 font-bold text-sm shadow-md">Start Practicing Now</Button>
          </div>
        ) : (
          <div className="flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-5 border-b border-border/70 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary"><QrCode className="w-4 h-4" /></div>
                <div><DialogTitle className="text-base sm:text-lg font-black tracking-tight font-display">Scan to Pay</DialogTitle><DialogDescription className="text-xs text-muted-foreground">Complete upgrade via Nepali Mobile Banking or digital wallet app</DialogDescription></div>
              </div>
              <div className="text-right flex items-center sm:block justify-between bg-card sm:bg-transparent p-2 sm:p-0 rounded-xl border sm:border-0 border-border">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Amount Due</span>
                <span className="text-xl font-black text-primary font-display">NPR {selectedPlan.priceNPR.toLocaleString()}</span>
              </div>
            </div>
            <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              <div className="md:col-span-6 flex flex-col items-center space-y-3">
                <div className="relative w-full max-w-[250px] p-2.5 rounded-2xl bg-gradient-to-b from-card to-muted/30 border border-border shadow-md">
                  <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-primary rounded-tl" /><div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-primary rounded-tr" /><div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-primary rounded-bl" /><div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-primary rounded-br" />
                  <div className="relative overflow-hidden rounded-xl bg-white p-2.5 shadow-inner flex items-center justify-center">
                    <img src="/images/payment-qr.png" alt="Prepyo Payment QR Code" className="w-full h-auto object-contain select-none transition-transform duration-300 hover:scale-[1.02]" />
                    <div className="absolute left-2 right-2 h-1 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full shadow-[0_0_12px_rgba(38,80,197,0.9)] animate-qr-laser pointer-events-none" />
                  </div>
                  <div className="mt-2.5 flex items-center justify-between px-1 text-[11px]">
                    <span className="inline-flex items-center gap-1 font-bold text-muted-foreground"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />Official Prepyo QR</span>
                    <Badge variant="outline" className="text-[9px] font-bold uppercase">Nepali NPR</Badge>
                  </div>
                </div>
                <div className="w-full max-w-[250px] space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => copy(selectedPlan.priceNPR.toString(), setCopiedAmt, 'Amount')} className="h-8 text-[11px] font-bold gap-1.5">
                      {copiedAmt ? <><Check className="w-3.5 h-3.5 text-emerald-500" /><span>Copied!</span></> : <><Copy className="w-3.5 h-3.5" /><span>Copy NPR</span></>}
                    </Button>
                    <a href="/images/payment-qr.png" download="prepyo-payment-qr.png" className="inline-flex items-center justify-center h-8 rounded-xl border border-input bg-background hover:bg-accent text-foreground text-[11px] font-bold gap-1.5 transition-colors shadow-2xs"><Download className="w-3.5 h-3.5" /><span>Save QR</span></a>
                  </div>
                  <div className="p-2 rounded-xl bg-muted/40 border border-border/70 flex items-center justify-between gap-2">
                    <div className="min-w-0"><span className="text-[9px] font-bold uppercase text-muted-foreground block">Remarks / Ref</span><span className="text-[11px] font-mono font-bold text-foreground truncate block">{remarksCode}</span></div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => copy(remarksCode, setCopiedRef, 'Remarks')} className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-foreground">{copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}</Button>
                  </div>
                </div>
              </div>
              <div className="md:col-span-6 space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between"><span className="text-xs font-bold text-foreground">Choose Payment Method</span><span className="text-[10px] text-muted-foreground">All support this QR</span></div>
                  <div className="grid grid-cols-2 gap-2">
                    {GATEWAYS.map(g => (
                      <button key={g.id} type="button" onClick={() => setSelectedGateway(g.id)} className={`p-2 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between ${selectedGateway === g.id ? g.active : 'bg-card border-border/80 hover:border-border text-foreground hover:bg-muted/30'}`}>
                        <div className="flex items-center justify-between w-full"><span className="text-xs font-bold">{g.name}</span><span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${selectedGateway === g.id ? 'bg-foreground/10 text-foreground' : 'bg-muted text-muted-foreground'}`}>{g.badge}</span></div>
                        <span className="text-[10px] text-muted-foreground mt-0.5">{g.tag}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 text-xs flex items-start gap-2">
                  <Smartphone className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-0.5"><span className="font-bold text-foreground block text-[11px]">Instructions for {gw.name}</span><p className="text-[10px] text-muted-foreground leading-relaxed">{gw.instr}</p></div>
                </div>
                <div className="space-y-2 pt-0.5">
                  <div className="space-y-1">
                    <label htmlFor="txn-input" className="text-xs font-bold text-foreground flex items-center justify-between"><span>Transaction ID / Ref Code</span><span className="text-[10px] font-normal text-muted-foreground">From SMS or receipt</span></label>
                    <Input id="txn-input" value={transactionId} onChange={e => setTransactionId(e.target.value)} placeholder="e.g. TXN-198421 or 980XXXX" className="text-xs font-mono h-8" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-foreground flex items-center justify-between"><span>Payment Screenshot (Optional)</span><span className="text-[10px] font-normal text-muted-foreground">JPG, PNG, WEBP</span></span>
                    {receiptPreview ? (
                      <div className="relative p-2 rounded-xl border border-border bg-muted/30 flex items-center gap-3">
                        <img src={receiptPreview} alt="Receipt Preview" className="w-10 h-10 rounded-lg object-cover border border-border" />
                        <div className="min-w-0 flex-1"><span className="text-xs font-bold text-foreground truncate block">{receiptFile?.name}</span><span className="text-[10px] text-muted-foreground">{receiptFile && `${Math.round(receiptFile.size / 1024)} KB`}</span></div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => { setReceiptFile(null); setReceiptPreview(null); }} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></Button>
                      </div>
                    ) : (
                      <div onClick={() => fileInputRef.current?.click()} className="p-2 border border-dashed border-border rounded-xl text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-all flex items-center justify-center gap-2">
                        <Upload className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-[11px] font-medium text-foreground">Upload payment receipt screenshot</span>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={e => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setReceiptFile(f);
                          const r = new FileReader();
                          r.onload = () => setReceiptPreview(r.result as string);
                          r.readAsDataURL(f);
                        }} className="hidden" />
                      </div>
                    )}
                  </div>
                </div>
                {selectedPlan.bonusDays > 0 && (
                  <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-center text-primary text-[10px] font-bold flex items-center justify-center gap-1.5"><Sparkles className="w-3 h-3" /><span>Includes +{selectedPlan.bonusDays} bonus days on activation</span></div>
                )}
                <div className="pt-1 space-y-1.5">
                  <Button onClick={handleProcessPayment} disabled={processing} className="w-full font-bold text-xs h-9 shadow-md">
                    {processing ? <><RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />Verifying Payment…</> : <><ShieldCheck className="w-4 h-4 mr-1.5" />Confirm & Activate {planTitle}</>}
                  </Button>
                  <p className="text-[9px] text-center text-muted-foreground flex items-center justify-center gap-1"><Info className="w-3 h-3 text-muted-foreground shrink-0" /><span>Instant activation upon confirmation. Safe & secure.</span></p>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
