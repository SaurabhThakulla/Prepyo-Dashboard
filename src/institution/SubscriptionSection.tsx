import { useEffect, useState } from 'react';
import { BadgeCheck, BookOpen, ClipboardList, Coins, Layers, LucideIcon, Mail, Package, Palette, SpellCheck, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatExamDate } from '@/lib/dates';
import { ACCESS_DAYS, AI_GRADINGS_PER_MONTH, CREDIT_GROUPS, CREDIT_TIERS, CreditEntry, creditGroupOf, fetchCreditLog, InstitutionAccount, MIN_CREDITS } from './api';
import { rupees } from './FeesSection';

// Each pack's own colour, so the three read apart at a glance.
const PACK_LOOK = [
  { card: 'border-sky-500/25 bg-gradient-to-b from-sky-500/10 to-transparent', tile: 'bg-sky-500 text-white', price: 'text-sky-700 dark:text-sky-300', button: 'bg-sky-600 text-white hover:bg-sky-600/90' },
  { card: 'border-violet-500/25 bg-gradient-to-b from-violet-500/10 to-transparent', tile: 'bg-violet-500 text-white', price: 'text-violet-700 dark:text-violet-300', button: 'bg-violet-600 text-white hover:bg-violet-600/90' },
  { card: 'border-emerald-500/25 bg-gradient-to-b from-emerald-500/10 to-transparent', tile: 'bg-emerald-500 text-white', price: 'text-emerald-700 dark:text-emerald-300', button: 'bg-emerald-600 text-white hover:bg-emerald-600/90' },
];

// What every credit gives a student.
const INCLUDED: { text: string; icon: LucideIcon; tile: string }[] = [
  { text: 'Unlimited reading and listening questions', icon: BookOpen, tile: 'bg-sky-500/15 text-sky-600 dark:text-sky-300' },
  { text: `${AI_GRADINGS_PER_MONTH.toLocaleString('en-US')} AI credits a month per student`, icon: SpellCheck, tile: 'bg-violet-500/15 text-violet-600 dark:text-violet-300' },
  { text: 'Full and sectional mock tests', icon: ClipboardList, tile: 'bg-amber-500/15 text-amber-600 dark:text-amber-300' },
  { text: 'Ready-to-book status and booking targets', icon: BadgeCheck, tile: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' },
  { text: 'Batches, fees and receipts', icon: Layers, tile: 'bg-rose-500/15 text-rose-600 dark:text-rose-300' },
  { text: 'Your logo and colour on the sign-in page', icon: Palette, tile: 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300' },
];

const contactLink = (institution: string, subject: string) =>
  `mailto:contact@prepyo.online?subject=${encodeURIComponent(`${subject}: ${institution}`)}`;

const groupLabel = (api: CreditEntry['group']) => CREDIT_GROUPS.find(g => g.api === api)?.label ?? api;

/** What the institution pays Prepyo: its credits left, the packs it can buy, and where each credit went. */
export default function SubscriptionSection({ account }: { account: InstitutionAccount }) {
  const { institution } = account;
  // Only the credit groups of the institution's exams (Prepyo's plan, else its own
  // choice in Settings), and any group it still has credits in.
  const exams = institution.planExams?.length ? institution.planExams : institution.profile?.exams ?? [];
  const groups = CREDIT_GROUPS.filter(
    g => exams.length === 0 || exams.some(exam => creditGroupOf(exam) === g.key) || (institution.credits?.[g.key] ?? 0) > 0,
  );
  const [log, setLog] = useState<CreditEntry[] | null>(null);

  useEffect(() => {
    fetchCreditLog()
      .then(data => setLog(data.credits))
      .catch(() => setLog([]));
  }, []);

  const status =
    institution.status === 'active'
      ? { label: 'Active', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' }
      : institution.status === 'expired'
        ? { label: 'Credits used up', className: 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400' }
        : { label: 'No credits yet', className: 'border-border bg-muted text-muted-foreground' };

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground">Credits</h2>
              <Badge variant="outline" className={`normal-case tracking-normal text-xs font-medium ${status.className}`}>
                {status.label}
              </Badge>
            </div>
          </div>
          <Button asChild size="sm">
            <a href={contactLink(institution.name, 'Buy credits')}>
              <Mail className="mr-1.5 h-4 w-4" /> Buy credits
            </a>
          </Button>
        </div>

        <div className={`mt-5 grid gap-3 ${groups.length === 1 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
          {groups.map(({ key, label }) => {
            const left = institution.credits?.[key] ?? 0;
            return (
              <div key={key} className="rounded-lg border border-border p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Coins className="h-3.5 w-3.5" /> {label}
                </p>
                <p className={`mt-1 text-2xl font-semibold tabular-nums ${left === 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>
                  {left} <span className="text-sm font-normal text-muted-foreground">{left === 1 ? 'credit left' : 'credits left'}</span>
                </p>
              </div>
            );
          })}
          <div className="rounded-lg border border-border p-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> Students with access now
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{institution.studentsWithAccess ?? 0}</p>
          </div>
        </div>
      </Card>

      <Card className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Credit prices</h2>
            <p className="text-sm text-muted-foreground">
              Buy as many credits as you need, from {MIN_CREDITS}. One credit is one student for {ACCESS_DAYS} days; the more you buy at once, the less each costs.
            </p>
          </div>
          <Button asChild size="sm">
            <a href={contactLink(institution.name, 'Buy credits')}>
              <Mail className="mr-1.5 h-4 w-4" /> Buy credits
            </a>
          </Button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Credits bought at once</th>
                {groups.map(({ key, label }) => (
                  <th key={key} className="px-4 py-2.5 text-right font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {CREDIT_TIERS.map(({ from, to, perCredit }, i) => (
                <tr key={from}>
                  <td className="px-4 py-3 text-foreground">
                    <span className="flex items-center gap-2">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${PACK_LOOK[i % PACK_LOOK.length].tile}`}>
                        <Package className="h-3.5 w-3.5" />
                      </span>
                      {to ? `${String(from).padStart(2, '0')} to ${to} credits` : `${from - 1}+ credits`}
                    </span>
                  </td>
                  {groups.map(({ key }) => (
                    <td key={key} className={`whitespace-nowrap px-4 py-3 text-right text-base font-semibold tabular-nums ${PACK_LOOK[i % PACK_LOOK.length].price}`}>
                      {rupees(perCredit[key])}
                      <span className="text-xs font-normal text-muted-foreground"> / student</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-primary/15 bg-gradient-to-br from-primary/10 via-sky-500/5 to-violet-500/10 p-4 sm:p-5">
          <p className="mb-3 text-sm font-medium text-foreground">Every credit includes</p>
          <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {INCLUDED.map(({ text, icon: Icon, tile }) => (
              <li key={text} className="flex items-center gap-3 rounded-lg bg-card/80 p-2.5 text-sm text-foreground shadow-sm">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tile}`}>
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          Credits are paid in advance and added by Prepyo. To buy, write to contact@prepyo.online with how many and for which exams.
        </p>
      </Card>

      <Card className="space-y-3 p-4 sm:p-6">
        <h2 className="text-base font-semibold text-foreground">Credit history</h2>
        {log === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : log.length === 0 ? (
          <p className="text-sm text-muted-foreground">No credits yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {log.map((entry, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="text-foreground">
                  {entry.change > 0
                    ? `${entry.change} ${groupLabel(entry.group)} credits bought${entry.priceNpr ? ` · ${rupees(entry.priceNpr)}` : ''}`
                    : `${entry.studentName} · ${groupLabel(entry.group)}`}
                </span>
                <span className="flex items-center gap-3 text-xs text-muted-foreground">
                  {formatExamDate(entry.at.slice(0, 10))}
                  <span className={`w-10 text-right font-semibold tabular-nums ${entry.change > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                    {entry.change > 0 ? `+${entry.change}` : entry.change}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
