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

/**
 * Portalled to <body> so it always covers the app. The admin preview mounts it
 * inside the admin page, where an ancestor's stacking context capped its
 * z-index below the app header and sidebar, leaving them showing over the top.
 */
export function OnboardingLayout({ children }: { children: ReactNode }) {
  const overlay = (
    <div
      className="fixed inset-0 z-[80] flex overflow-hidden bg-[#fbfcff] text-slate-900 motion-safe:animate-in motion-safe:fade-in duration-300"
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

export function OnboardingSidebar({
  steps,
  stepIndex,
}: {
  steps: readonly OnboardingStep[];
  stepIndex: number;
}) {
  const active = steps[stepIndex];
  return (
    <aside className="hidden w-[280px] shrink-0 flex-col border-r border-slate-200/80 bg-white px-6 py-7 lg:flex">
      <div className="flex items-center gap-2.5">
        <div className="grid h-9 w-9 place-items-center rounded-xl border border-blue-100 bg-blue-50">
          <img src="/prepyo-mark.webp" alt="" className="h-5 w-5 object-contain" />
        </div>
        <span className="font-display text-xl font-extrabold tracking-tight text-slate-900">
          prep<span className="text-blue-600">yo</span>
        </span>
      </div>

      <div className="mt-12 space-y-7">
        {STAGES.map((stage, stageIndex) => {
          const indexes = stage.steps.map(id => steps.findIndex(step => step.id === id)).filter(index => index >= 0);
          const currentIndex = indexes.find(index => index === stepIndex);
          const complete = indexes.every(index => index < stepIndex);
          const currentLabel = currentIndex === undefined ? undefined : steps[currentIndex]?.label;
          return (
            <div key={stage.label} className="relative pl-11">
              {stageIndex < STAGES.length - 1 && (
                <span aria-hidden className="absolute left-[15px] top-8 h-[calc(100%+20px)] w-px bg-slate-200" />
              )}
              <span
                className={`absolute left-0 top-0 grid h-8 w-8 place-items-center rounded-full border text-xs font-bold transition-all duration-300 ${
                  complete
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : currentIndex !== undefined
                      ? 'border-blue-600 bg-blue-50 text-blue-700 ring-4 ring-blue-50'
                      : 'border-slate-200 bg-white text-slate-400'
                }`}
              >
                {complete ? <Check className="h-4 w-4" strokeWidth={3} /> : stageIndex + 1}
              </span>
              <p className={`text-sm font-bold ${currentIndex !== undefined ? 'text-slate-900' : 'text-slate-500'}`}>
                {stage.label}
              </p>
              {currentLabel && <p className="mt-1 text-xs font-medium text-blue-600">{currentLabel}</p>}
              {complete && <p className="mt-1 text-xs text-slate-400">Complete</p>}
            </div>
          );
        })}
      </div>

      <div className="mt-auto rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700">Personalised for you</p>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{active.tagline}</p>
      </div>
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
  // One segment per step, grouped by stage, so the bar reads as "where am I
  // in this section" as well as "how far overall". STAGES lists the steps in
  // flow order, so the flat index lines up with `current`.
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
    <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 px-5 py-3.5 backdrop-blur sm:px-10 lg:px-12">
      {/* Three columns on wider screens so the bar sits dead centre whatever the
          right-hand slot holds; on phones it just takes the free width. */}
      <div className="mx-auto flex max-w-6xl items-center gap-4 sm:grid sm:grid-cols-[1fr_minmax(0,38rem)_1fr] sm:gap-6">
        <div aria-hidden className="hidden sm:block" />
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-baseline justify-between gap-3">
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
                  const done = position < index;
                  const now = position === index;
                  return (
                    <span
                      key={stepId}
                      className={`relative h-2 flex-1 overflow-hidden rounded-full transition-colors duration-500 ${
                        done ? 'bg-gradient-to-r from-blue-600 to-indigo-500' : now ? 'bg-blue-100' : 'bg-slate-100'
                      }`}
                    >
                      {now && (
                        <span className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 motion-safe:animate-pulse" />
                      )}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 justify-end">
        {onExit ? (
          <button
            type="button"
            onClick={onExit}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <X className="h-3.5 w-3.5" />
            Exit preview
          </button>
        ) : (
          <span className="hidden text-xs font-medium text-slate-400 lg:block">Your personal prep plan</span>
        )}
        </div>
      </div>
    </header>
  );
}

export function QuestionHeader({
  title,
  subtitle,
  badge: _badge,
  headingRef,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  return (
    <div className="space-y-2">
      <h2
        ref={headingRef}
        id="onboarding-title"
        tabIndex={-1}
        className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 outline-none"
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
      className={`group relative rounded-2xl border p-4 text-left outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 active:scale-[0.99] ${
        selected
          ? 'border-blue-600 bg-blue-50/70 shadow-[0_8px_24px_-16px_rgba(37,99,235,0.6)] ring-1 ring-blue-600/20'
          : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)]'
      } ${className}`}
      {...props}
    >
      {children}
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
    <footer className="sticky bottom-0 z-30 border-t border-slate-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-10 lg:px-12">
        {showBack ? (
          <Button variant="ghost" onClick={onBack} className="h-11 gap-1.5 rounded-full px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        ) : <span aria-hidden />}
        <Button onClick={onContinue} disabled={disabled} className="h-11 gap-2 rounded-full bg-blue-600 px-7 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-transform hover:bg-blue-700 active:scale-[0.98] disabled:opacity-45">
          {label} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </footer>
  );
}
