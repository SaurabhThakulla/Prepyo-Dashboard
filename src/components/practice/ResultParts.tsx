import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { SentenceFeedback } from '@/lib/types';
import { markTranscript, type SpokenMark } from '@/lib/transcriptMarks';

/** The building blocks every practice result is laid out with, so all sections read the same. */

export type Tone = 'good' | 'fair' | 'poor' | 'none';

export const TONE: Record<Tone, { ring: string; text: string; bar: string; badge: string }> = {
  good: { ring: 'text-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', bar: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  fair: { ring: 'text-amber-500', text: 'text-amber-700 dark:text-amber-400', bar: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-800 dark:text-amber-300' },
  poor: { ring: 'text-rose-500', text: 'text-rose-700 dark:text-rose-400', bar: 'bg-rose-500', badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
  none: { ring: 'text-muted-foreground', text: 'text-foreground', bar: 'bg-muted-foreground', badge: 'bg-muted text-muted-foreground' },
};

export function toneFor(fraction: number | null): Tone {
  if (fraction === null) return 'none';
  if (fraction >= 0.75) return 'good';
  if (fraction >= 0.45) return 'fair';
  return 'poor';
}

/** A progress ring with the headline number in the middle; no arc at all for zero. */
export function ScoreRing({ fraction, tone, children }: { fraction: number; tone: Tone; children: ReactNode }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, fraction));
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="8" className="stroke-muted" />
        {clamped > 0 && (
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            stroke="currentColor"
            className={cn(TONE[tone].ring, 'transition-[stroke-dasharray] duration-700 ease-out')}
            strokeDasharray={`${clamped * circumference} ${circumference}`}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

interface SummaryProps {
  /** Small label above the score line, e.g. "PTE score estimate". */
  label: string;
  score: number | string;
  outOf: number | string;
  fraction: number;
  tone: Tone;
  /** Short verdict shown as a badge, e.g. "Correct". */
  verdict?: string;
  /** Muted facts after the verdict: confidence, accuracy, XP. */
  meta?: ReactNode[];
  summary?: string;
  notes?: string[];
}

/** The top of every result: the score against its scale and what it means. */
export function ResultSummary({ label, score, outOf, fraction, tone, verdict, meta = [], summary, notes = [] }: SummaryProps) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <ScoreRing fraction={fraction} tone={tone}>
        <span className="font-display text-2xl font-semibold leading-none text-foreground">{score}</span>
        <span className="mt-1 text-xs text-muted-foreground">of {outOf}</span>
      </ScoreRing>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
          {verdict && <span className={cn('rounded-md px-2 py-0.5 text-xs font-semibold', TONE[tone].badge)}>{verdict}</span>}
          {meta.filter(Boolean).map((m, i) => <span key={i}>{m}</span>)}
        </div>
        {summary && <p className="text-sm leading-relaxed text-foreground">{summary}</p>}
        {notes.map(n => <p key={n} className="text-xs text-muted-foreground">{n}</p>)}
      </div>
    </div>
  );
}

/** A titled block of the result. Every section uses the same heading. */
export function ResultSection({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** What worked and what to work on next, side by side. */
export function FeedbackLists({ strengths, weaknesses }: { strengths: string[]; weaknesses: string[] }) {
  if (strengths.length === 0 && weaknesses.length === 0) return null;
  return (
    <ResultSection title="Feedback">
      <div className="grid gap-3 sm:grid-cols-2">
        {strengths.length > 0 && <FeedbackList title="What worked" dot="bg-emerald-500" items={strengths} />}
        {weaknesses.length > 0 && <FeedbackList title="Work on next" dot="bg-amber-500" items={weaknesses} />}
      </div>
    </ResultSection>
  );
}

function FeedbackList({ title, dot, items }: { title: string; dot: string; items: string[] }) {
  return (
    <div className="space-y-2 rounded-xl border border-border p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="space-y-1.5">
        {items.map(item => (
          <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-foreground">
            <span className={cn('mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full', dot)} aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** XP as a plain meta fact. */
export function xpMeta(xp: number): ReactNode {
  return xp > 0 ? <span className="font-medium text-amber-700 dark:text-amber-400">+{xp} XP</span> : null;
}

const SPOKEN_CLASS: Record<SpokenMark, string> = {
  error: 'cursor-help text-rose-700 underline decoration-dotted underline-offset-4 dark:text-rose-400',
  filler: 'cursor-help text-amber-700 dark:text-amber-400',
  good: 'text-emerald-700 dark:text-emerald-400',
};

/** Legend for an answer coloured by markTranscript; writing calls fillers repeated words. */
export function MarkedAnswerLegend({ writing = false }: { writing?: boolean }) {
  return (
    <span className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <LegendDot dot="bg-emerald-500">Good</LegendDot>
      <LegendDot dot="bg-amber-500">{writing ? 'Repeated word' : 'Repetition or filler'}</LegendDot>
      <LegendDot dot="bg-rose-500">Grammar or word choice</LegendDot>
    </span>
  );
}

/** A learner's own words, coloured: what the grader corrected, what was repeated, the rest. Paragraphs are kept. */
export function MarkedAnswer({ text, fixes, rated = true }: { text: string; fixes: SentenceFeedback[]; rated?: boolean }) {
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  // Colours only mean something once the grader could rate the answer.
  if (!rated) {
    return (
      <div className="space-y-2">
        {paragraphs.map((p, i) => <p key={i} className="text-[15px] leading-8 text-foreground/80">{p}</p>)}
        <p className="text-xs text-muted-foreground">Not marked word by word: this answer could not be rated.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3 text-[15px] leading-8" data-testid="marked-transcript">
      {paragraphs.map((p, i) => (
        <p key={i}>
          {markTranscript(p, fixes).map((w, j) => (
            <span key={j}>
              <span className={SPOKEN_CLASS[w.mark]} title={w.note}>{w.text}</span>{' '}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

export function LegendDot({ dot, children }: { dot: string; children: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('h-2 w-2 rounded-full', dot)} aria-hidden /> {children}
    </span>
  );
}
