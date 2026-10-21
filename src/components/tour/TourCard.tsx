import React from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronUp, RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TOUR_CHECKLIST, TOUR_STAGES, TourStage } from './steps';

export interface TourCardProps {
  index: number;
  total: number;
  stage: TourStage;
  title: string;
  body: string;
  isAction: boolean;
  isLast: boolean;
  paused: boolean;
  touch: boolean;
  /** Steps the learner did, for the finish checklist. */
  did: string[];
  nextLabel?: string;
  nudge: boolean;
  position: React.CSSProperties;
  cardRef: React.Ref<HTMLDivElement>;
  onNext?: () => void;
  onBack?: () => void;
  onSkipStep: () => void;
  onEnd: () => void;
  onReturn: () => void;
  onReplay: () => void;
  onCollapse?: () => void;
}

/** The tour's step card: where you are, what to do, and the buttons to move on. */
export default function TourCard(props: TourCardProps) {
  const { index, total, stage, title, body, isAction, isLast, paused, touch, did, nextLabel, nudge, position, cardRef } = props;
  const stageIndex = stage === 'done' ? TOUR_STAGES.length : TOUR_STAGES.findIndex(s => s.id === stage);
  const fromTop = position.top !== undefined && position.bottom === undefined;

  return (
    <div
      key={paused ? 'paused' : index}
      ref={cardRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="app-tour-title"
      aria-describedby="app-tour-body"
      className={cn(
        'fixed z-[100] flex max-h-[min(70dvh,32rem)] flex-col overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-3.5 text-card-foreground shadow-2xl sm:w-[360px] sm:p-5',
        'animate-in fade-in duration-200',
        fromTop ? 'slide-in-from-top-2' : 'slide-in-from-bottom-2',
        nudge && 'prepyo-tour-nudge',
      )}
      style={{ ...position, pointerEvents: 'auto' }}
    >
      <div className="flex items-center gap-2">
        <ol aria-label="Tour progress" className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          {TOUR_STAGES.map((s, i) => {
            const finished = i < stageIndex;
            const current = i === stageIndex;
            return (
              <li key={s.id} className="flex shrink-0 items-center gap-1">
                {i > 0 && <span aria-hidden className={cn('hidden h-px w-3 shrink-0 sm:block', finished || current ? 'bg-primary' : 'bg-border')} />}
                <span
                  aria-current={current ? 'step' : undefined}
                  className={cn(
                    'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold transition-colors',
                    current && 'bg-primary text-primary-foreground',
                    finished && 'bg-primary/10 text-primary',
                    !current && !finished && 'text-muted-foreground',
                  )}
                >
                  {finished && <Check className="h-3 w-3" aria-label="done" />}
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>
        {props.onCollapse && (
          <IconButton label="Tuck the tour away" onClick={props.onCollapse}>
            {fromTop ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </IconButton>
        )}
        <IconButton label="End tour" onClick={props.onEnd}>
          <X className="h-4 w-4" />
        </IconButton>
      </div>

      <div className="mt-2.5 h-1 shrink-0 overflow-hidden rounded-full bg-muted sm:mt-3">
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>

      <h2 id="app-tour-title" className="mt-2.5 font-display text-base font-bold leading-snug text-foreground sm:mt-3 sm:text-lg">
        {title}
      </h2>
      <p id="app-tour-body" className="mt-1 text-[13px] leading-relaxed text-muted-foreground sm:mt-1.5 sm:text-sm">
        {body}
      </p>

      {isLast && !paused && (
        <ul className="mt-3 space-y-2">
          {TOUR_CHECKLIST.map(item => {
            const ticked = item.steps.some(id => did.includes(id));
            return (
              <li key={item.label} className="flex items-center gap-2.5 text-sm">
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                    ticked ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-border text-transparent',
                  )}
                >
                  <Check className="h-3 w-3" />
                </span>
                <span className={ticked ? 'font-medium text-foreground' : 'text-muted-foreground'}>{item.label}</span>
                <span className="sr-only">{ticked ? '(done)' : '(skipped)'}</span>
              </li>
            );
          })}
        </ul>
      )}

      {isAction && !paused && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">
          <span className="prepyo-tour-glow h-2 w-2 shrink-0 rounded-full bg-primary" />
          Your turn: {touch ? 'tap' : 'click'} the highlighted part of the page.
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 sm:mt-4">
        <div className="flex items-center gap-1">
          {paused ? (
            <TextButton onClick={props.onEnd}>End tour</TextButton>
          ) : isLast ? (
            <TextButton onClick={props.onReplay}>
              <RotateCcw className="h-3.5 w-3.5" /> Replay
            </TextButton>
          ) : props.onBack ? (
            <TextButton onClick={props.onBack}>
              <ChevronLeft className="h-3.5 w-3.5" /> Back
            </TextButton>
          ) : isAction ? (
            <TextButton onClick={props.onSkipStep}>Skip step</TextButton>
          ) : (
            <TextButton onClick={props.onEnd}>{index === 0 ? 'Not now' : 'Skip tour'}</TextButton>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!touch && !paused && props.onNext && !isLast && (
            <span className="hidden text-[11px] text-muted-foreground sm:inline">Enter ↵</span>
          )}
          {paused ? (
            <PrimaryButton onClick={props.onReturn}>Take me back</PrimaryButton>
          ) : (
            props.onNext && <PrimaryButton onClick={props.onNext}>{nextLabel}</PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}

/** The card tucked into a slim bar, so the page stays in view; info steps keep their Next button on it. */
export function TourPill({
  title,
  isAction,
  position,
  onExpand,
  nextLabel,
  onNext,
}: {
  title: string;
  isAction: boolean;
  position: React.CSSProperties;
  onExpand: () => void;
  nextLabel?: string;
  onNext?: () => void;
}) {
  return (
    <div
      className="fixed z-[100] flex h-11 max-w-[calc(100vw-1.5rem)] items-center gap-1 rounded-full bg-primary p-1 text-primary-foreground shadow-xl animate-in fade-in zoom-in-95 duration-200 sm:max-w-sm"
      style={{ ...position, pointerEvents: 'auto' }}
    >
      <button
        type="button"
        onClick={onExpand}
        aria-label={`Show the tour: ${title}`}
        className="flex h-9 min-w-0 items-center gap-2 rounded-full pl-3 pr-2 text-sm font-semibold hover:bg-white/10"
      >
        <span className="prepyo-tour-glow h-2 w-2 shrink-0 rounded-full bg-primary-foreground" />
        <span className="truncate">{isAction ? `Your turn: ${title}` : title}</span>
        <ChevronDown className="h-4 w-4 shrink-0" />
      </button>
      {onNext && (
        <button
          type="button"
          data-tour-primary
          onClick={onNext}
          className="h-9 shrink-0 rounded-full bg-primary-foreground px-3.5 text-xs font-bold text-primary"
        >
          {nextLabel}
        </button>
      )}
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

function TextButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      data-tour-primary
      onClick={onClick}
      className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {children}
    </button>
  );
}
