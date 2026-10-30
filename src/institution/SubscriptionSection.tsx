import { useEffect, useState } from 'react';
import { BadgeCheck, BookOpen, Building, Building2, CalendarClock, ClipboardList, Home, Layers, LucideIcon, Mail, Palette, SlidersHorizontal, SpellCheck, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatExamDate } from '@/lib/dates';
import { AI_GRADINGS_PER_MONTH, fetchStudents, InstitutionAccount, InstitutionPlan, PLANS, PRICE_PER_STUDENT_NPR } from './api';
import { rupees } from './FeesSection';
import { examName } from './profile';

// Plans are sold for at least this many months at a time.
export const MIN_MONTHS = 6;

const PLAN_ORDER: InstitutionPlan[] = ['basic', 'extended', 'ultimate', 'custom'];

// Each plan's own colour, so the four read apart at a glance.
const PLAN_LOOK: Record<InstitutionPlan, { icon: LucideIcon; card: string; tile: string; price: string; button: string }> = {
  basic: {
    icon: Home,
    card: 'border-sky-500/25 bg-gradient-to-b from-sky-500/10 to-transparent',
    tile: 'bg-sky-500 text-white',
    price: 'text-sky-700 dark:text-sky-300',
    button: 'bg-sky-600 text-white hover:bg-sky-600/90',
  },
  extended: {
    icon: Building,
    card: 'border-violet-500/25 bg-gradient-to-b from-violet-500/10 to-transparent',
    tile: 'bg-violet-500 text-white',
    price: 'text-violet-700 dark:text-violet-300',
    button: 'bg-violet-600 text-white hover:bg-violet-600/90',
  },
  ultimate: {
    icon: Building2,
    card: 'border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-transparent',
    tile: 'bg-amber-500 text-white',
    price: 'text-amber-700 dark:text-amber-300',
    button: 'bg-amber-600 text-white hover:bg-amber-600/90',
  },
  custom: {
    icon: SlidersHorizontal,
    card: 'border-emerald-500/25 bg-gradient-to-b from-emerald-500/10 to-transparent',
    tile: 'bg-emerald-500 text-white',
    price: 'text-emerald-700 dark:text-emerald-300',
    button: 'bg-emerald-600 text-white hover:bg-emerald-600/90',
  },
};

const BEST_FOR: Record<InstitutionPlan, string> = {
  basic: 'A small class or a new centre',
  extended: 'A centre with a few batches',
  ultimate: 'A busy centre or several branches',
  custom: 'Any number of students',
};

// What every plan gives each student.
const INCLUDED: { text: string; icon: LucideIcon; tile: string }[] = [
  { text: 'Unlimited reading and listening questions', icon: BookOpen, tile: 'bg-sky-500/15 text-sky-600 dark:text-sky-300' },
  { text: `${AI_GRADINGS_PER_MONTH.toLocaleString()} AI credits a month per student`, icon: SpellCheck, tile: 'bg-violet-500/15 text-violet-600 dark:text-violet-300' },
  { text: 'Full and sectional mock tests', icon: ClipboardList, tile: 'bg-amber-500/15 text-amber-600 dark:text-amber-300' },
  { text: 'Ready-to-book status and booking targets', icon: BadgeCheck, tile: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' },
  { text: 'Batches, fees and receipts', icon: Layers, tile: 'bg-rose-500/15 text-rose-600 dark:text-rose-300' },
  { text: 'Your logo and colour on the sign-in page', icon: Palette, tile: 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300' },
];

const contactLink = (institution: string, subject: string) =>
  `mailto:contact@prepyo.online?subject=${encodeURIComponent(`${subject}: ${institution}`)}`;

const DAY_MS = 24 * 60 * 60 * 1000;

/** What the institution pays Prepyo: its current plan and the plans it can move to. */
export default function SubscriptionSection({ account }: { account: InstitutionAccount }) {
  const { institution } = account;
  const current = institution.plan || null;
  const [studentCount, setStudentCount] = useState<number | null>(null);

  useEffect(() => {
    fetchStudents(30)
      .then(data => setStudentCount(data.students.length))
      .catch(() => setStudentCount(null));
  }, []);

  const monthly = institution.seatLimit * PRICE_PER_STUDENT_NPR;
  const daysLeft = institution.validUntil ? Math.ceil((new Date(institution.validUntil + 'T00:00:00').getTime() - Date.now()) / DAY_MS) : null;
  const status =
    institution.status === 'active'
      ? { label: 'Active', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' }
      : institution.status === 'expired'
        ? { label: 'Ended', className: 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400' }
        : { label: 'No plan', className: 'border-border bg-muted text-muted-foreground' };
  const seatShare = studentCount !== null && institution.seatLimit ? Math.min(100, (studentCount / institution.seatLimit) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Current plan</p>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground">{current ? `${PLANS[current].name} plan` : 'No plan yet'}</h2>
              <Badge variant="outline" className={`normal-case tracking-normal text-xs font-medium ${status.className}`}>
                {status.label}
              </Badge>
            </div>
            {current && (
              <p className="text-sm text-muted-foreground">
                <span className="text-lg font-semibold text-foreground">{rupees(monthly)}</span> a month ·{' '}
                {institution.planExams?.length ? institution.planExams.map(examName).join(', ') : 'All exams'}
              </p>
            )}
          </div>
          <Button asChild size="sm">
            <a href={contactLink(institution.name, current ? 'Renew or change our plan' : 'Start a plan')}>
              <Mail className="mr-1.5 h-4 w-4" /> {current ? 'Renew or upgrade' : 'Contact Prepyo'}
            </a>
          </Button>
        </div>

        {current && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> Seats used
              </p>
              <p className="mt-1 text-base font-semibold tabular-nums text-foreground">
                {studentCount ?? '…'} <span className="text-sm font-normal text-muted-foreground">of {institution.seatLimit}</span>
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                <div className={`h-full rounded-full ${seatShare >= 100 ? 'bg-rose-500' : 'bg-primary'}`} style={{ width: `${seatShare}%` }} />
              </div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" /> {institution.status === 'expired' ? 'Ended on' : 'Valid until'}
              </p>
              <p className="mt-1 text-base font-semibold text-foreground">{institution.validUntil ? formatExamDate(institution.validUntil) : '—'}</p>
              {daysLeft !== null && daysLeft > 0 && (
                <p className={`mt-1 text-xs ${daysLeft <= 14 ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground'}`}>
                  {daysLeft === 1 ? '1 day left' : `${daysLeft} days left`}
                  {daysLeft <= 14 && ' · renew soon so students keep access'}
                </p>
              )}
            </div>
          </div>
        )}
      </Card>

      <Card className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-foreground">Plans</h2>
            <p className="text-sm text-muted-foreground">{rupees(PRICE_PER_STUDENT_NPR)} per student a month, in Nepali rupees.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" /> Minimum {MIN_MONTHS} months
          </span>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {PLAN_ORDER.map(id => {
            const plan = PLANS[id];
            const isCurrent = id === current;
            const perMonth = id === 'custom' ? PRICE_PER_STUDENT_NPR : plan.seats * PRICE_PER_STUDENT_NPR;
            const look = PLAN_LOOK[id];
            const Icon = look.icon;
            return (
              <li
                key={id}
                className={`flex flex-col rounded-xl border p-4 ${look.card} ${isCurrent ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg shadow-sm ${look.tile}`}>
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  {isCurrent && (
                    <span className="whitespace-nowrap rounded-md bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">Current</span>
                  )}
                </div>
                <p className="mt-3 whitespace-nowrap font-medium text-foreground">{plan.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{BEST_FOR[id]}</p>

                <p className={`mt-4 whitespace-nowrap text-2xl font-semibold tabular-nums ${look.price}`}>
                  {rupees(perMonth)}
                  <span className="text-sm font-normal text-muted-foreground">{id === 'custom' ? ' / student / month' : ' / month'}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {id === 'custom'
                    ? `For the number of seats you need, for ${MIN_MONTHS} months or more`
                    : `${rupees(perMonth * MIN_MONTHS)} for ${MIN_MONTHS} months`}
                </p>

                <p className="mt-4 flex items-center gap-1.5 border-t border-border/70 pt-3 text-sm text-foreground">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {id === 'custom' ? 'You choose the seats' : `Up to ${plan.seats} students`}
                </p>

                <div className="mt-4 flex-1" />
                {isCurrent ? (
                  <Button asChild variant="outline" size="sm" className="w-full bg-card">
                    <a href={contactLink(institution.name, `Renew the ${plan.name} plan`)}>Renew</a>
                  </Button>
                ) : (
                  <Button asChild size="sm" className={`w-full ${look.button}`}>
                    <a href={contactLink(institution.name, `Move to the ${plan.name} plan`)}>{id === 'custom' ? 'Talk to us' : `Choose ${plan.name}`}</a>
                  </Button>
                )}
              </li>
            );
          })}
        </ul>

        <div className="rounded-xl border border-primary/15 bg-gradient-to-br from-primary/10 via-sky-500/5 to-violet-500/10 p-4 sm:p-5">
          <p className="mb-3 text-sm font-medium text-foreground">Every plan includes</p>
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
          Plans run for at least {MIN_MONTHS} months and are paid in advance. To start, renew or change a plan, write to contact@prepyo.online.
        </p>
      </Card>
    </div>
  );
}
