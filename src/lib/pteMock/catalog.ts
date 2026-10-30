import { BookOpenCheck, ClipboardCheck, Headphones, LucideIcon, Mic, PenTool } from 'lucide-react';
import { PteCatalogEntry, PteMockKind, PtePart } from './types';

/**
 * How each kind of PTE mock is presented: its route, icon and short label.
 *
 * Presentation only. What a kind is made of — tasks, counts, timings — comes
 * from GET /pte/mocks/catalog, so it is never written down twice. The sidebar
 * reads this list too, which is why it has no React in it.
 */
export interface PteMockKindMeta {
  kind: PteMockKind;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  /** One line for the sidebar, before the catalog has loaded. */
  blurb: string;
  /** The Tailwind accent the kind is drawn in. */
  accent: string;
}

export const PTE_MOCK_KINDS: PteMockKindMeta[] = [
  {
    kind: 'full',
    label: 'Full Mock Test',
    shortLabel: 'Full test',
    icon: ClipboardCheck,
    blurb: 'All three parts, about 2 hours, scored 10-90',
    accent: 'from-primary to-indigo-600',
  },
  {
    kind: 'speaking',
    label: 'Speaking Sectional',
    shortLabel: 'Speaking',
    icon: Mic,
    blurb: 'RA, RS, DI, RL, ASQ, SGD, RTS in test order',
    accent: 'from-blue-500 to-blue-700',
  },
  {
    kind: 'writing',
    label: 'Writing Sectional',
    shortLabel: 'Writing',
    icon: PenTool,
    blurb: 'Summarize Written Text and Essay, timed',
    accent: 'from-emerald-500 to-emerald-700',
  },
  {
    kind: 'reading',
    label: 'Reading Sectional',
    shortLabel: 'Reading',
    icon: BookOpenCheck,
    blurb: 'Five task types on one shared clock',
    accent: 'from-amber-500 to-orange-600',
  },
  {
    kind: 'listening',
    label: 'Listening Sectional',
    shortLabel: 'Listening',
    icon: Headphones,
    blurb: 'Every recording plays once',
    accent: 'from-slate-500 to-slate-700',
  },
];

export const PTE_MOCK_KIND_IDS = PTE_MOCK_KINDS.map(k => k.kind);

export function pteMockMeta(kind: PteMockKind): PteMockKindMeta {
  return PTE_MOCK_KINDS.find(k => k.kind === kind) ?? PTE_MOCK_KINDS[0];
}

export function isPteMockKind(value: string | undefined | null): value is PteMockKind {
  return !!value && (PTE_MOCK_KIND_IDS as string[]).includes(value);
}

/** The page that runs a kind of test. */
export const pteMockHref = (kind: PteMockKind) => `/mocks/pte/${kind}`;
/** A finished test's score report. */
export const pteReportHref = (sessionId: string) => `/mocks/pte/report/${sessionId}`;

export const PART_LABELS: Record<PtePart, string> = {
  speaking_writing: 'Speaking & Writing',
  reading: 'Reading',
  listening: 'Listening',
};

/** mm:ss, or h:mm:ss for an hour or more. */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "2 h 5 min", "35 min". */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** What starting a test costs the learner, in one sentence. */
export function costLabel(cost: PteCatalogEntry['cost']): string {
  if (cost.kind === 'full_mock') return 'Uses one full mock test from your plan.';
  if (cost.kind === 'ai_gradings') {
    return cost.gradings
      ? `Uses ${cost.gradings} AI credits from your monthly pool.`
      : 'Uses no AI credits: it is marked against the answer key.';
  }
  return `Uses ${cost.credits} of your daily practice sub-tests${cost.gradings ? ` and ${cost.gradings} AI gradings` : ''}.`;
}
