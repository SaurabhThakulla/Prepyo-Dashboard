// The building blocks the institution pages share, in the admin dashboard's style.
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, LucideIcon } from 'lucide-react';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import type { ExamCode } from './api';

/** One colour family per meaning, used the same way in every card. */
export const TONES = {
  blue: {
    card: 'border-sky-500/25 bg-gradient-to-br from-sky-500/10 to-transparent',
    icon: 'bg-sky-500 text-white',
    text: 'text-sky-700 dark:text-sky-300',
    bar: 'bg-sky-500',
    soft: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  },
  green: {
    card: 'border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-transparent',
    icon: 'bg-emerald-500 text-white',
    text: 'text-emerald-700 dark:text-emerald-300',
    bar: 'bg-emerald-500',
    soft: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  violet: {
    card: 'border-violet-500/25 bg-gradient-to-br from-violet-500/10 to-transparent',
    icon: 'bg-violet-500 text-white',
    text: 'text-violet-700 dark:text-violet-300',
    bar: 'bg-violet-500',
    soft: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  },
  amber: {
    card: 'border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-transparent',
    icon: 'bg-amber-500 text-white',
    text: 'text-amber-700 dark:text-amber-300',
    bar: 'bg-amber-500',
    soft: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  rose: {
    card: 'border-rose-500/25 bg-gradient-to-br from-rose-500/10 to-transparent',
    icon: 'bg-rose-500 text-white',
    text: 'text-rose-700 dark:text-rose-300',
    bar: 'bg-rose-500',
    soft: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  },
} as const;
export type Tone = keyof typeof TONES;

/** Each exam keeps one colour everywhere, as on the admin dashboard. */
export const EXAM_TONE: Record<ExamCode, Tone> = { PTE: 'blue', IELTS: 'violet', EPS_TOPIK: 'green', JLPT: 'rose' };

/** The page's banner: what it is, and the actions that apply to the whole page. */
export function PageHero({
  eyebrow,
  eyebrowIcon: EyebrowIcon,
  title,
  subtitle,
  actions,
  children,
}: {
  eyebrow: string;
  eyebrowIcon: LucideIcon;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-indigo-600 p-5 text-primary-foreground shadow-lg sm:p-7">
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-sky-400/20 blur-2xl" />
      <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div className="min-w-0 space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide">
            <EyebrowIcon className="h-3.5 w-3.5" /> {eyebrow}
          </span>
          <h1 className="break-words font-display text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <div className="text-sm text-white/80">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="relative mt-6">{children}</div>}
    </header>
  );
}

/** A big number with its meaning, coloured by tone, as on the admin overview. */
export function Kpi({
  icon: Icon,
  tone,
  label,
  value,
  note,
  progress,
  action,
  onClick,
  to,
  pressed,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: React.ReactNode;
  note: React.ReactNode;
  progress?: number;
  action?: string;
  onClick?: () => void;
  to?: string;
  pressed?: boolean;
}) {
  const t = TONES[tone];
  const actionClass = `inline-flex items-center gap-1 whitespace-nowrap text-sm font-bold hover:underline ${t.text}`;
  return (
    <Card className={`flex flex-col gap-3 border p-5 ${t.card} ${pressed ? 'ring-2 ring-current ring-offset-2 ring-offset-background' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-foreground">{label}</span>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${t.icon}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className={`font-display text-3xl font-black tabular-nums sm:text-4xl ${t.text}`}>{value}</div>
      {progress !== undefined && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/10">
          <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }} />
        </div>
      )}
      <div className="mt-auto flex items-center justify-between gap-2">
        <span className="text-sm text-foreground/70">{note}</span>
        {action && to && (
          <Link to={to} className={actionClass}>
            {action} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
        {action && onClick && !to && (
          <button type="button" onClick={onClick} aria-pressed={pressed} className={actionClass}>
            {action} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </Card>
  );
}

/** A section's heading with its icon tile. */
export function SectionTitle({
  icon: Icon,
  title,
  description,
  tone = 'blue',
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TONES[tone].icon}`}>
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <div className="min-w-0">
        <CardTitle className="text-lg font-bold text-foreground">{title}</CardTitle>
        {description && <CardDescription className="text-sm text-foreground/60">{description}</CardDescription>}
      </div>
    </div>
  );
}

/** Pill tabs with counts, like the admin dashboard's tab bar. */
export function FilterTabs<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { id: T; label: string; count?: number; icon?: LucideIcon }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1.5">
      {options.map(option => {
        const selected = option.id === value;
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all ${
              selected ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {option.label}
            {option.count !== undefined && (
              <span className="rounded-full bg-foreground/10 px-1.5 text-[11px] font-bold tabular-nums">{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** White button for the banner. */
export const heroButton = 'font-bold bg-white text-primary hover:bg-white/90';
/** See-through button for the banner. */
export const heroGhostButton = 'font-bold bg-white/15 text-white hover:bg-white/25 border border-white/25';
