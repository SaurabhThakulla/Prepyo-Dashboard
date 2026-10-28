import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CircleCheck, Coins, Download, Loader2, Printer, ReceiptText, Trash2, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { errorMessage } from '@/lib/api';
import {
  addPayment,
  Batch,
  deletePayment,
  fetchBatches,
  fetchFees,
  fetchPayments,
  FeeTotals,
  InstitutionAccount,
  Payment,
  PAYMENT_METHODS,
  PaymentMethod,
  setStudentFee,
  StudentFee,
} from './api';
import FormField, { FormError } from './FormField';
import { examName } from './profile';
import { downloadFeeReceipt } from './feeReceipt';
import { FilterTabs, Kpi, TONES } from './ui';

/** Rupees with Nepali grouping: Rs 1,25,000. */
export const rupees = (amount: number) => `Rs ${amount.toLocaleString('en-IN')}`;

/** Today in the admin's own time zone, as YYYY-MM-DD. */
export function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const day = (value: string) => new Date(value + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const methodName = (id: PaymentMethod) => PAYMENT_METHODS.find(m => m.id === id)?.name ?? id;

/** The fee board: what each student owes, payments, and receipts. */
export default function FeesSection({ account }: { account: InstitutionAccount }) {
  const [fees, setFees] = useState<StudentFee[] | null>(null);
  const [totals, setTotals] = useState<FeeTotals | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batch, setBatch] = useState('');
  // '' is every course (exam).
  const [course, setCourse] = useState('');
  const [balance, setBalance] = useState<'all' | 'owe' | 'paid'>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  // The student whose receipt is being made.
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () =>
      Promise.all([fetchFees(), fetchBatches()])
        .then(([data, batchData]) => {
          setFees(data.students);
          setTotals(data.totals);
          setBatches(batchData.batches);
          setError(null);
        })
        .catch(err => setError(errorMessage(err))),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const inFilters = (f: StudentFee) =>
    (!batch || (batch === 'none' ? !f.batchId : f.batchId === batch)) && (!course || f.exam === course);
  const shown = (fees ?? []).filter(inFilters);
  // Paid in full: the student has paid and owes nothing, fee set or not.
  const isPaid = (f: StudentFee) => f.paidNpr > 0 && f.balanceNpr <= 0;
  const list = shown.filter(f => (balance === 'owe' ? f.balanceNpr > 0 : balance === 'paid' ? isPaid(f) : true));
  // The courses the institution's students are on, in a stable order.
  const courses = [...new Set((fees ?? []).map(f => f.exam).filter(Boolean))].sort();
  const open = fees?.find(f => f.studentId === openId) ?? null;
  const batchName = (id: string | null) => batches.find(b => b.id === id)?.name ?? '';

  const downloadReceipt = async (f: StudentFee) => {
    setDownloadingId(f.studentId);
    setError(null);
    try {
      const { payments } = await fetchPayments(f.studentId);
      const last = [...payments].sort((a, b) => b.paidOn.localeCompare(a.paidOn) || b.receiptNo - a.receiptNo)[0];
      await downloadFeeReceipt({
        institution: {
          name: account.institution.name,
          code: account.institution.code,
          logoUrl: account.institution.logoUrl,
          brandColor: account.institution.profile.brandColor,
        },
        student: { name: f.name, username: f.username, course: f.exam ? examName(f.exam) : '', batch: batchName(f.batchId) },
        fee: f,
        lastPayment: last ? { receiptNo: last.receiptNo, paidOn: last.paidOn, method: methodName(last.method) } : null,
        rupees,
      });
    } catch (err) {
      setError(`The receipt for ${f.name} could not be made: ${errorMessage(err)}`);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {totals && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={ReceiptText} tone="blue" label="Fees after discounts" value={rupees(totals.billedNpr)} note="What your students owe in total" />
          <Kpi
            icon={CircleCheck}
            tone="green"
            label="Collected"
            value={rupees(totals.collectedNpr)}
            note={`${totals.billedNpr ? Math.round((Math.min(totals.collectedNpr, totals.billedNpr) / totals.billedNpr) * 100) : 0}% of the fees`}
            progress={totals.billedNpr ? (totals.collectedNpr / totals.billedNpr) * 100 : 0}
          />
          <Kpi icon={Coins} tone="amber" label="Still to collect" value={rupees(totals.outstandingNpr)} note="Balances not yet paid" />
          <Kpi
            icon={AlertTriangle}
            tone="rose"
            label="Past due date"
            value={totals.overdue}
            note={totals.overdue === 1 ? '1 student owes past the due date' : `${totals.overdue} students owe past the due date`}
            action={totals.overdue > 0 ? 'Show' : undefined}
            onClick={totals.overdue > 0 ? () => setBalance('owe') : undefined}
          />
        </div>
      )}

    <Card className="space-y-5 p-4 sm:p-6">
      <h2 className="text-base font-semibold text-foreground">Fees</h2>

      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto max-w-full">
          <FilterTabs
            label="Filter by balance"
            value={balance}
            onChange={setBalance}
            options={[
              { id: 'all', label: 'Everyone', count: shown.length },
              { id: 'owe', label: 'Students who owe', count: shown.filter(f => f.balanceNpr > 0).length },
              { id: 'paid', label: 'Paid in full', count: shown.filter(isPaid).length },
            ]}
          />
        </div>
        {courses.length > 1 && (
          <select
            aria-label="Show course"
            value={course}
            onChange={event => setCourse(event.target.value)}
            className="h-9 max-w-[14rem] rounded-lg border border-input bg-card px-2.5 text-sm text-foreground"
          >
            <option value="">All courses</option>
            {courses.map(exam => (
              <option key={exam} value={exam}>
                {examName(exam)}
              </option>
            ))}
          </select>
        )}
        {batches.length > 0 && (
          <select
            aria-label="Show batch"
            value={batch}
            onChange={event => setBatch(event.target.value)}
            className="h-9 max-w-[14rem] rounded-lg border border-input bg-card px-2.5 text-sm text-foreground"
          >
            <option value="">All batches</option>
            <option value="none">No batch</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {fees === null && !error && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading fees…
        </p>
      )}
      {fees?.length === 0 && <p className="text-xs text-muted-foreground">Add students first, then set their fees here.</p>}
      {fees && fees.length > 0 && list.length === 0 && <p className="text-xs text-muted-foreground">No students match.</p>}

      {list.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[780px] text-sm">
            <caption className="sr-only">Fees by student</caption>
            <thead>
              <tr className="whitespace-nowrap bg-muted/60 text-left text-xs font-medium text-muted-foreground">
                <th className="w-full px-4 py-3">Student</th>
                <th className="px-5 py-3">Course</th>
                {batches.length > 0 && <th className="px-5 py-3">Batch</th>}
                <th className="px-5 py-3">Fee</th>
                <th className="px-5 py-3">Paid</th>
                <th className="px-5 py-3">Balance</th>
                <th className="px-5 py-3">Due</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map(f => (
                <tr key={f.studentId} className="transition-colors hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <span className="block font-medium text-foreground">{f.name}</span>
                    <span className="block font-mono text-xs text-foreground/60">{f.username}</span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-foreground/75">{f.exam ? examName(f.exam) : '—'}</td>
                  {batches.length > 0 && <td className="whitespace-nowrap px-5 py-3 text-foreground/75">{batchName(f.batchId) || '—'}</td>}
                  <td className="whitespace-nowrap px-5 py-3 tabular-nums">
                    {f.set ? rupees(f.totalNpr - f.discountNpr) : <span className="text-muted-foreground">Not set</span>}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 tabular-nums">{rupees(f.paidNpr)}</td>
                  <td className="whitespace-nowrap px-5 py-3 tabular-nums">
                    <BalanceText fee={f} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3">
                    {f.dueOn ? (
                      f.overdue ? (
                        <Badge variant="outline" className={`normal-case tracking-normal text-xs font-medium ${TONES.rose.soft}`}>
                          {day(f.dueOn)} · overdue
                        </Badge>
                      ) : (
                        <span className="text-foreground/75">{day(f.dueOn)}</span>
                      )
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => setOpenId(f.studentId)}>
                        <Wallet className="mr-1.5 h-3.5 w-3.5" /> Manage
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void downloadReceipt(f)}
                        disabled={downloadingId !== null}
                        aria-label={`Download the fee receipt for ${f.name}`}
                        title="Download receipt (PDF)"
                      >
                        {downloadingId === f.studentId ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
                        Receipt
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FormError message={error} />

      <Dialog open={!!open} onOpenChange={isOpen => !isOpen && setOpenId(null)}>
        {open && <StudentFeeDialog key={open.studentId} fee={open} account={account} onChanged={load} />}
      </Dialog>
    </Card>
    </div>
  );
}

function BalanceText({ fee }: { fee: StudentFee }) {
  if (!fee.set && fee.paidNpr === 0) return <span className="text-muted-foreground">—</span>;
  if (fee.balanceNpr > 0) return <span className={fee.overdue ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}>{rupees(fee.balanceNpr)}</span>;
  // Paid with no fee entered: nothing is owed, and nothing is really extra yet.
  if (!fee.set) return <span className="text-muted-foreground">No fee set</span>;
  if (fee.balanceNpr < 0) return <span className="text-sky-600 dark:text-sky-400">{rupees(-fee.balanceNpr)} extra</span>;
  return (
    <Badge variant="outline" className={`normal-case tracking-normal text-xs font-medium ${TONES.green.soft}`}>
      Paid in full
    </Badge>
  );
}

/** One student's fee, a form to record a payment, and their payments with receipts. */
function StudentFeeDialog({ fee, account, onChanged }: { fee: StudentFee; account: InstitutionAccount; onChanged: () => Promise<void> }) {
  const [total, setTotal] = useState(fee.set ? String(fee.totalNpr) : '');
  const [discount, setDiscount] = useState(fee.discountNpr ? String(fee.discountNpr) : '');
  const [dueOn, setDueOn] = useState(fee.dueOn ?? '');
  const [amount, setAmount] = useState(fee.balanceNpr > 0 ? String(fee.balanceNpr) : '');
  const [paidOn, setPaidOn] = useState(today());
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [note, setNote] = useState('');
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const loadPayments = useCallback(
    () =>
      fetchPayments(fee.studentId)
        .then(data => setPayments(data.payments))
        .catch(err => setError(errorMessage(err))),
    [fee.studentId],
  );

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  const run = async (change: () => Promise<string>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const message = await change();
      await Promise.all([onChanged(), loadPayments()]);
      setSaved(message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const wholeRupees = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value.trim()) : NaN);

  const saveFee = (event: FormEvent) => {
    event.preventDefault();
    const totalNpr = wholeRupees(total);
    const discountNpr = discount.trim() ? wholeRupees(discount) : 0;
    if (Number.isNaN(totalNpr)) return setError('Enter the fee in whole rupees.');
    if (Number.isNaN(discountNpr) || discountNpr > totalNpr) return setError('The discount must be between 0 and the fee.');
    void run(async () => {
      await setStudentFee(fee.studentId, { totalNpr, discountNpr, dueOn });
      return 'Fee saved.';
    });
  };

  const recordPayment = (event: FormEvent) => {
    event.preventDefault();
    const amountNpr = wholeRupees(amount);
    if (Number.isNaN(amountNpr) || amountNpr < 1) return setError('Enter the amount paid in whole rupees.');
    void run(async () => {
      const { payment } = await addPayment(fee.studentId, { amountNpr, paidOn, method, note });
      setAmount('');
      setNote('');
      return `Payment recorded. Receipt no. ${payment.receiptNo}.`;
    });
  };

  const remove = (payment: Payment) => {
    if (!window.confirm(`Delete receipt no. ${payment.receiptNo} for ${rupees(payment.amountNpr)}? Its number is not used again.`)) return;
    void run(async () => {
      await deletePayment(payment.id);
      return 'Payment deleted.';
    });
  };

  return (
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader className="text-left">
        <DialogTitle className="pr-8">{fee.name}</DialogTitle>
        <DialogDescription>
          Paid {rupees(fee.paidNpr)}
          {fee.set && <> of {rupees(fee.totalNpr - fee.discountNpr)}</>} · <BalanceText fee={fee} />
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={saveFee} className="space-y-2 rounded-xl border border-border p-3">
        <p className="text-sm font-medium text-foreground">Course fee</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="Fee (Rs)" inputMode="numeric" value={total} onChange={setTotal} placeholder="25000" />
          <FormField label="Discount (Rs)" inputMode="numeric" value={discount} onChange={setDiscount} placeholder="0" />
          <FormField label="Due date (optional)" type="date" value={dueOn} onChange={setDueOn} />
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={busy} className="rounded-xl text-xs font-medium">
          Save fee
        </Button>
      </form>

      <form onSubmit={recordPayment} className="space-y-2 rounded-xl border border-border p-3">
        <p className="text-sm font-medium text-foreground">Record a payment</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="Amount (Rs)" inputMode="numeric" value={amount} onChange={setAmount} />
          <FormField label="Paid on" type="date" value={paidOn} max={today()} onChange={setPaidOn} />
          <div className="space-y-1.5">
            <label htmlFor="payment-method" className="text-xs font-semibold text-foreground">
              Method
            </label>
            <select
              id="payment-method"
              value={method}
              onChange={event => setMethod(event.target.value as PaymentMethod)}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground"
            >
              {PAYMENT_METHODS.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <FormField label="Note (optional)" value={note} onChange={setNote} maxLength={200} placeholder="Second instalment" />
        <Button type="submit" size="sm" disabled={busy} className="rounded-xl text-xs font-medium">
          {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Record payment
        </Button>
      </form>

      <FormError message={error} />
      {saved && <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{saved}</p>}

      <div className="space-y-1.5 text-xs">
        <p className="text-sm font-medium text-foreground">Payments</p>
        {payments === null ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : payments.length === 0 ? (
          <p className="text-muted-foreground">No payments yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {payments.map(p => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <div className="font-semibold text-foreground">
                    {rupees(p.amountNpr)}{' '}
                    <Badge variant="outline" className="normal-case tracking-normal ml-1 align-middle">
                      {methodName(p.method)}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    Receipt no. {p.receiptNo} · {day(p.paidOn)}
                    {p.note && ` · ${p.note}`}
                  </p>
                </div>
                <div className="flex gap-0.5">
                  <Button type="button" variant="ghost" size="sm" title="Print receipt" aria-label={`Print receipt ${p.receiptNo}`} onClick={() => printReceipt(account, fee, p)} className="h-8 w-8 p-0">
                    <Printer className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    title="Delete payment"
                    aria-label={`Delete receipt ${p.receiptNo}`}
                    disabled={busy}
                    onClick={() => remove(p)}
                    className="h-8 w-8 p-0 text-rose-600 dark:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DialogContent>
  );
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

/** Opens a printable receipt in the institution's colours, with its logo when it has one. */
function printReceipt(account: InstitutionAccount, fee: StudentFee, payment: Payment) {
  const { institution } = account;
  const color = /^#[0-9a-f]{6}$/i.test(institution.profile.brandColor) ? institution.profile.brandColor : '#1d4ed8';
  const logo = institution.logoUrl ? `<img src="${escapeHtml(new URL(institution.logoUrl, window.location.origin).href)}" alt="" />` : '';
  const rows: [string, string][] = [
    ['Receipt no.', String(payment.receiptNo)],
    ['Date', day(payment.paidOn)],
    ['Student', `${fee.name} (${fee.username})`],
    ['Amount', rupees(payment.amountNpr)],
    ['Method', methodName(payment.method)],
  ];
  if (payment.note) rows.push(['Note', payment.note]);

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${payment.receiptNo} · ${escapeHtml(institution.name)}</title>
<style>
  body { font-family: system-ui, sans-serif; color: #0f172a; margin: 40px; }
  header { display: flex; align-items: center; gap: 16px; border-bottom: 4px solid ${color}; padding-bottom: 16px; }
  header img { width: 56px; height: 56px; object-fit: contain; }
  h1 { margin: 0; font-size: 22px; } h2 { margin: 24px 0 8px; font-size: 16px; color: ${color}; letter-spacing: .05em; text-transform: uppercase; }
  table { border-collapse: collapse; width: 100%; max-width: 520px; } td { padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
  td:first-child { color: #64748b; width: 40%; } footer { margin-top: 48px; font-size: 12px; color: #64748b; }
</style></head><body>
<header>${logo}<div><h1>${escapeHtml(institution.name)}</h1></div></header>
<h2>Payment receipt</h2>
<table>${rows.map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td><strong>${escapeHtml(v)}</strong></td></tr>`).join('')}</table>
<footer>Received with thanks.</footer>
<script>window.onload = () => { window.print(); };</script>
</body></html>`;

  const win = window.open('', '_blank', 'width=720,height=800');
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
}
