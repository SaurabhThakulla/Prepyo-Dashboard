import { ArrowLeft, ArrowRight, Check, X, type LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';

export type OnboardingStep = {
  id: string;
  label: string;
  pill: string;
  tagline: string;
};

/** One answer in the sidebar's plan summary; value is null until it is answered. */
export type PlanLine = { label: string; value: string | null; icon: LucideIcon };

/**
 * Portalled to <body> so it always covers the app. The admin preview mounts it
 * inside the admin page, where an ancestor's stacking context capped its
 * z-index below the app header and sidebar, leaving them showing over the top.
 */
export function OnboardingLayout({ children }: { children: ReactNode }) {
  const overlay = (
    <div
      className="fixed inset-0 z-[80] flex overflow-hidden bg-[#f6f8fe] text-slate-900 motion-safe:animate-in motion-safe:fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      {children}
    </div>
  );
  return typeof document === 'undefined' ? overlay : createPortal(overlay, document.body);
}

const STAGES = [
  { label: 'Your Target', steps: ['welcome', 'exam', 'goal', 'destination'] },
  { label: 'Benchmark', steps: ['experience', 'target', 'date'] },
  { label: 'Study Routine', steps: ['focus', 'daily'] },
  { label: 'Plan & Launch', steps: ['plan', 'tour', 'ready'] },
];

/** The blue brand panel: stages on top, the learner's plan filling in underneath. */
export function OnboardingSidebar({
  steps,
  stepIndex,
  plan = [],
}: {
  steps: readonly OnboardingStep[];
  stepIndex: number;
  plan?: PlanLine[];
}) {
  const active = steps[stepIndex];
  const answered = plan.filter(line => line.value).length;
  return (
    <aside className="relative hidden w-[300px] shrink-0 flex-col overflow-hidden bg-gradient-to-b from-[#1d3fae] via-[#16328c] to-[#0d1f5c] px-6 py-7 text-white lg:flex">
      <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full border-[28px] border-white/[0.06]" />
      <span aria-hidden className="pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />

      <div className="relative flex items-center gap-2.5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-white shadow-lg shadow-black/20">
          <img src="/prepyo-mark.webp" alt="" className="h-5 w-5 object-contain" />
        </div>
        <span className="font-display text-xl font-extrabold tracking-tight">
          prep<span className="text-sky-300">yo</span>
        </span>
      </div>

      <ol className="relative mt-10 space-y-1">
        {STAGES.map((stage, stageIndex) => {
          const indexes = stage.steps.map(id => steps.findIndex(step => step.id === id)).filter(index => index >= 0);
          const current = indexes.includes(stepIndex);
          const complete = indexes.every(index => index < stepIndex);
          return (
            <li
              key={stage.label}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors ${current ? 'bg-white/[0.12] ring-1 ring-white/15' : ''}`}
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold transition-all duration-300 ${
                  complete
                    ? 'bg-sky-300 text-[#0d1f5c]'
                    : current
                      ? 'bg-white text-[#16328c] shadow-[0_0_0_4px_rgba(255,255,255,0.15)]'
                      : 'border border-white/25 text-white/60'
                }`}
              >
                {complete ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : stageIndex + 1}
              </span>
              <span className="min-w-0">
                <span className={`block text-sm font-bold ${current || complete ? 'text-white' : 'text-white/60'}`}>{stage.label}</span>
                {current && <span className="block truncate text-[11px] font-medium text-sky-200">{active.label}</span>}
              </span>
            </li>
          );
        })}
      </ol>

      {plan.length > 0 && (
        <div className="relative mt-8 rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sky-200">Your plan</p>
            <span className="text-[11px] font-semibold tabular-nums text-white/60">
              {answered}/{plan.length}
            </span>
          </div>
          <ul className="mt-3 space-y-2">
            {plan.map(line => (
              <li key={line.label} className="flex items-center gap-2.5 text-xs">
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg transition-colors ${
                    line.value ? 'bg-sky-300/20 text-sky-200' : 'bg-white/5 text-white/30'
                  }`}
                >
                  <line.icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-white/55">{line.label}</span>
                <span
                  className={`ml-auto max-w-[9rem] truncate text-right font-semibold ${
                    line.value ? 'text-white motion-safe:animate-in motion-safe:fade-in' : 'text-white/25'
                  }`}
                >
                  {line.value ?? '—'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="relative mt-auto pt-6 text-xs leading-relaxed text-white/60">{active.tagline}</p>
    </aside>
  );
}

export function OnboardingProgress({
  current,
  total,
  onExit,
}: {
  current: number;
  total: number;
  /** Superseded by the per-step segments; kept so callers need not change. */
  progress?: string;
  /** Shown only in admin preview mode, so the flow can be left mid-way. */
  onExit?: () => void;
}) {
  // One segment per step, grouped by stage; STAGES lists the steps in flow order.
  const index = current - 1;
  let offset = 0;
  const stages = STAGES.map(stage => {
    const start = offset;
    offset += stage.steps.length;
    return { ...stage, start };
  });
  const activeStage =
    stages.find(stage => index >= stage.start && index < stage.start + stage.steps.length) ?? stages[0];
  const percent = Math.round((current / total) * 100);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 px-5 py-3 backdrop-blur-xl sm:px-10 lg:px-12">
      <div className="mx-auto flex max-w-5xl items-center gap-4">
        <img src="/prepyo-mark.webp" alt="" className="h-7 w-7 shrink-0 rounded-lg bg-white object-contain p-1 shadow-sm ring-1 ring-slate-200 lg:hidden" />
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="truncate text-xs font-bold text-slate-900">
              {activeStage.label}
              <span className="font-semibold text-slate-400"> · Step {current} of {total}</span>
            </span>
            <span className="shrink-0 text-xs font-bold tabular-nums text-blue-600">{percent}%</span>
          </div>

          <div
            className="flex gap-2"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={current}
            aria-valuetext={`Step ${current} of ${total}: ${activeStage.label}`}
          >
            {stages.map(stage => (
              <div key={stage.label} className="flex gap-1" style={{ flex: stage.steps.length }}>
                {stage.steps.map((stepId, i) => {
                  const position = stage.start + i;
                  return (
                    <span
                      key={stepId}
                      className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
                        position <= index ? 'bg-gradient-to-r from-blue-600 to-indigo-500' : 'bg-slate-200/80'
                      }`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        {onExit && (
          <button
            type="button"
            onClick={onExit}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <X className="h-3.5 w-3.5" />
            Exit preview
          </button>
        )}
      </div>
    </header>
  );
}

export function QuestionHeader({
  title,
  subtitle,
  badge,
  icon: Icon,
  headingRef,
}: {
  title: string;
  subtitle?: string;
  /** A short eyebrow above the title, e.g. the step's name. */
  badge?: string;
  icon?: LucideIcon;
  headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  return (
    <div className="space-y-3">
      {badge && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-700 shadow-sm">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {badge}
        </span>
      )}
      <h2
        ref={headingRef}
        id="onboarding-title"
        tabIndex={-1}
        className="font-display text-[1.75rem] font-extrabold leading-tight tracking-tight text-slate-900 outline-none sm:text-4xl"
      >
        {title}
      </h2>
      {subtitle && <p className="max-w-xl text-sm leading-relaxed text-slate-500 sm:text-base">{subtitle}</p>}
    </div>
  );
}

export function OptionGrid({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`grid gap-3.5 ${className}`}>{children}</div>;
}

export function OptionCard({ selected, className = '', children, ...props }: { selected: boolean; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`group relative rounded-3xl border bg-white p-4 text-left outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 active:scale-[0.99] ${
        selected
          ? 'border-blue-600 shadow-[0_18px_40px_-24px_rgba(37,99,235,0.7)] ring-2 ring-blue-600/15'
          : 'border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_16px_32px_-22px_rgba(15,23,42,0.4)]'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/** Full class strings per colour, so Tailwind keeps them. */
export type ChoiceTone = { tile: string; soft: string; ring: string; wash: string };

/**
 * The card most steps choose from: icon tile, title, detail and chips, with a
 * check in the corner. The title comes first in the DOM so the button's
 * accessible name starts with it.
 */
export function ChoiceCard({
  selected,
  onSelect,
  tone,
  title,
  detail,
  chips = [],
  icon,
  titleClassName = 'text-base',
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  tone: ChoiceTone;
  title: string;
  detail?: string;
  chips?: string[];
  icon?: ReactNode;
  titleClassName?: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`group relative flex flex-col overflow-hidden rounded-3xl border bg-white p-5 text-left outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 active:scale-[0.99] ${
        selected
          ? `${tone.ring} ring-2 shadow-[0_20px_44px_-26px_rgba(15,23,42,0.55)]`
          : 'border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_18px_36px_-24px_rgba(15,23,42,0.45)]'
      }`}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone.wash} via-transparent to-transparent transition-opacity duration-300 ${
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-70'
        }`}
      />
      <span className={`relative order-2 block font-bold text-slate-900 ${icon ? 'mt-4' : ''} ${titleClassName}`}>{title}</span>
      <span className={icon ? 'relative order-1 flex items-start justify-between gap-3' : 'absolute right-5 top-5'}>
        {icon && (
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200 ${
              selected ? `${tone.tile} shadow-md` : `${tone.soft} group-hover:scale-105`
            }`}
          >
            {icon}
          </span>
        )}
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
            selected ? `${tone.tile} scale-110 border-transparent` : 'border-slate-200 bg-white'
          }`}
        >
          {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
      </span>
      {detail && <span className="relative order-3 mt-1 block pr-6 text-xs leading-relaxed text-slate-500">{detail}</span>}
      {children && <span className="relative order-4 block">{children}</span>}
      {chips.length > 0 && (
        <span className="relative order-5 mt-4 flex flex-wrap gap-1.5">
          {chips.map(chip => (
            <span
              key={chip}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                selected ? tone.soft : 'bg-slate-100 text-slate-500'
              }`}
            >
              {chip}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}

export function SectionIllustration({ src, alt, icon: Icon }: { src: string; alt: string; icon: LucideIcon }) {
  return (
    <div className="relative hidden items-center justify-center lg:flex">
      <div aria-hidden className="absolute h-[430px] w-[430px] rounded-full bg-gradient-to-tr from-blue-100 via-indigo-50 to-sky-100 blur-3xl" />
      <div className="relative flex w-full max-w-[540px] items-center justify-center rounded-[2rem] border border-white/80 bg-white/35 p-6 shadow-[0_24px_70px_-42px_rgba(30,64,175,0.45)]">
        <img key={src} src={src} alt={alt} width={1024} height={1024} className="w-full max-h-[540px] object-contain motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 duration-500" />
        <span aria-hidden className="absolute bottom-8 right-6 grid h-12 w-12 place-items-center rounded-2xl bg-white text-blue-600 shadow-lg shadow-blue-900/10">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

export function OnboardingNavigation({
  showBack,
  onBack,
  onContinue,
  disabled,
  label,
}: {
  showBack: boolean;
  onBack: () => void;
  onContinue: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <footer className="sticky bottom-0 z-30 border-t border-slate-200/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-5 py-3.5 sm:px-10 lg:px-12">
        {showBack ? (
          <Button variant="ghost" onClick={onBack} className="h-11 gap-1.5 rounded-full px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        ) : <span aria-hidden />}
        <div className="flex items-center gap-3">
          <span className={`hidden text-[11px] font-semibold text-slate-400 transition-opacity lg:inline ${disabled ? 'opacity-0' : ''}`}>
            or press <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] text-slate-500">→</kbd>
          </span>
          <Button
            onClick={onContinue}
            disabled={disabled}
            className="h-11 gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-7 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:brightness-110 active:scale-[0.98] disabled:from-slate-300 disabled:to-slate-300 disabled:opacity-100 disabled:shadow-none"
          >
            {label} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </footer>
  );
}
