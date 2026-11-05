import { Check, Mic, User, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** What each IELTS Speaking part is called, after the test's own format. */
export const SPEAKING_PARTS: Record<number, string> = {
  1: 'Introduction and interview',
  2: 'Long turn',
  3: 'Discussion',
};

interface PartProgressProps {
  /** The part of every step, in order. */
  parts: number[];
  /** Index of the current step; parts.length once the test is over. */
  index: number;
}

/** Three segments, one a part, filled as its questions are answered. */
export function PartProgress({ parts, index }: PartProgressProps) {
  const numbers = [...new Set(parts)].sort();
  return (
    <ol className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Test progress">
      {numbers.map(part => {
        const positions = parts.flatMap((p, i) => (p === part ? [i] : []));
        const done = positions.filter(i => i < index).length;
        const total = positions.length;
        const current = positions.includes(index);
        const complete = done === total;
        return (
          <li
            key={part}
            aria-current={current ? 'step' : undefined}
            className={cn(
              'rounded-2xl border px-3 py-2.5 transition-colors',
              current ? 'border-primary/40 bg-primary/[0.06] shadow-sm' : 'border-border bg-card',
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                  complete
                    ? 'bg-emerald-500 text-white'
                    : current
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {complete ? <Check className="h-3.5 w-3.5" /> : part}
              </span>
              <div className="min-w-0">
                <p className={cn('text-xs font-bold', current ? 'text-primary' : 'text-foreground')}>Part {part}</p>
                <p className="hidden truncate text-[11px] text-muted-foreground sm:block">{SPEAKING_PARTS[part]}</p>
              </div>
            </div>
            <div className="mt-2 flex gap-1" aria-hidden>
              {positions.map(i => (
                <span
                  key={i}
                  className={cn(
                    'h-1 flex-1 rounded-full',
                    i < index ? 'bg-emerald-500' : i === index ? 'bg-primary' : 'bg-muted',
                  )}
                />
              ))}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** The examiner's portrait; rings pulse while the examiner is speaking. */
export function ExaminerAvatar({ speaking }: { speaking: boolean }) {
  return (
    <div className="relative h-14 w-14 shrink-0">
      {speaking && (
        <>
          <span className="absolute inset-0 rounded-full bg-primary/25 animate-ping" aria-hidden />
          <span className="absolute -inset-1.5 rounded-full border-2 border-primary/30 animate-pulse" aria-hidden />
        </>
      )}
      <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md">
        <User className="h-6 w-6" />
      </div>
    </div>
  );
}

/** Three bouncing dots: the examiner is talking. */
export function SpeakingDots() {
  return (
    <span className="inline-flex items-end gap-0.5" aria-hidden>
      {[0, 150, 300].map(delay => (
        <span key={delay} className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${delay}ms` }} />
      ))}
    </span>
  );
}

interface TimerRingProps {
  seconds: number;
  total: number;
  /** Ring and digits turn this colour. */
  tone: 'primary' | 'recording' | 'idle';
  label: string;
}

/** A countdown dial: the ring empties as the time runs down. */
export function TimerRing({ seconds, total, tone, label }: TimerRingProps) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const fraction = tone === 'idle' ? 0 : total > 0 ? Math.max(0, Math.min(1, seconds / total)) : 0;
  const low = tone !== 'idle' && seconds <= 10;
  const stroke = low ? 'stroke-amber-500' : tone === 'recording' ? 'stroke-rose-500' : tone === 'primary' ? 'stroke-primary' : 'stroke-muted-foreground/30';
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const rest = String(Math.max(0, seconds) % 60).padStart(2, '0');
  return (
    <div className="relative h-24 w-24 shrink-0 lg:h-36 lg:w-36" role="timer" aria-label={tone === 'idle' ? label : `${label}: ${seconds} seconds left`}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={radius} className="fill-none stroke-muted" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          className={cn('fill-none transition-[stroke-dashoffset] duration-1000 ease-linear', stroke)}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {tone === 'idle' ? (
          <Volume2 className="mb-1 h-6 w-6 lg:h-8 lg:w-8 text-muted-foreground/60" aria-hidden />
        ) : (
          <span className={cn('font-mono text-xl font-bold tabular-nums lg:text-3xl', low ? 'text-amber-600 dark:text-amber-400' : 'text-foreground')}>
            {minutes}:{rest}
          </span>
        )}
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

/** Live input bars from recent microphone levels, newest on the right. */
export function VoiceMeter({ levels, active }: { levels: number[]; active: boolean }) {
  return (
    <div className="flex h-10 w-full items-center justify-center gap-[3px] overflow-hidden lg:h-12" aria-hidden>
      {levels.map((level, i) => (
        <span
          key={i}
          className={cn('w-1.5 rounded-full transition-[height] duration-100', active ? 'bg-rose-500/80' : 'bg-muted-foreground/25')}
          style={{ height: `${Math.max(8, Math.round((active ? level : 0) * 100))}%` }}
        />
      ))}
    </div>
  );
}

/** A big round microphone, glowing in time with the voice while recording. */
export function MicOrb({ recording, level }: { recording: boolean; level: number }) {
  return (
    <div className="relative flex h-20 w-20 items-center justify-center">
      {recording && (
        <span
          className="absolute inset-0 rounded-full bg-rose-500/20 transition-transform duration-100"
          style={{ transform: `scale(${1 + Math.min(level, 1) * 0.6})` }}
          aria-hidden
        />
      )}
      <span
        className={cn(
          'relative flex h-16 w-16 items-center justify-center rounded-full shadow-lg',
          recording ? 'bg-rose-500 text-white' : 'bg-muted text-muted-foreground',
        )}
      >
        <Mic className="h-7 w-7" />
      </span>
    </div>
  );
}

interface CueCardPaperProps {
  task: string;
  points: string[];
  explain: string;
}

/** The Part 2 task card, laid out like the printed card the candidate is handed. */
export function CueCardPaper({ task, points, explain }: CueCardPaperProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-300/60 bg-amber-50 p-5 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/[0.07]">
      <span className="absolute inset-y-0 left-0 w-1.5 bg-amber-400" aria-hidden />
      <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Candidate task card</p>
      <p className="mt-2 text-base font-bold leading-snug text-foreground sm:text-lg">{task}</p>
      <p className="mt-3 text-xs font-semibold text-muted-foreground">You should say:</p>
      <ul className="mt-1.5 space-y-1.5">
        {points.map(point => (
          <li key={point} className="flex items-start gap-2 text-sm text-foreground">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
            {point}
          </li>
        ))}
      </ul>
      {explain && <p className="mt-3 text-sm text-foreground">{explain}</p>}
    </div>
  );
}

/** Moving bars while the examiner talks, so it is clear sound is playing. */
export function ExaminerWave() {
  return (
    <div className="flex h-8 items-center gap-1" aria-hidden>
      {[0.5, 0.9, 0.6, 1, 0.7, 0.85, 0.55, 0.95, 0.65].map((height, i) => (
        <span
          key={i}
          className="w-1.5 rounded-full bg-primary/70 animate-pulse"
          style={{ height: `${height * 100}%`, animationDelay: `${i * 110}ms`, animationDuration: '0.9s' }}
        />
      ))}
    </div>
  );
}

/** Advice for each part, from what the IELTS Speaking band descriptors reward. */
export const PART_TIPS: Record<number, { title: string; detail: string }[]> = {
  1: [
    { title: 'Two or three sentences', detail: 'Answer, then add a reason or a short example.' },
    { title: 'Talk about yourself', detail: 'These questions are about your own life. There are no wrong answers.' },
    { title: 'Keep it natural', detail: 'Speak as you would to a friend. Short pauses are fine.' },
  ],
  2: [
    { title: 'Cover every point', detail: 'Use the points on the card as the plan for your talk.' },
    { title: 'Keep going for two minutes', detail: 'The examiner stops you, so you do not need to finish early.' },
    { title: 'Use your notes', detail: 'Glance at key words, but do not read sentences out.' },
  ],
  3: [
    { title: 'Give an opinion, then explain', detail: 'Say what you think and why, with an example.' },
    { title: 'Think wider', detail: 'Talk about people and society, not only your own life.' },
    { title: 'Compare and predict', detail: 'Past and present, advantages and drawbacks, what may change.' },
  ],
};

/** Ways to start or extend an answer, for each part. */
export const PART_PHRASES: Record<number, string[]> = {
  1: ["I'd say…", 'To be honest…', 'The main reason is…', 'For example…', 'It depends, but usually…'],
  2: ["I'd like to talk about…", 'The first thing to say is…', 'What I remember most is…', 'It mattered because…', 'Looking back, I feel…'],
  3: ['From my point of view…', 'On the other hand…', 'One reason could be…', 'Compared with the past…', 'In the future, I expect…'],
};

/** Minutes and seconds, as 2:05. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

interface OverviewStep {
  key: string;
  part: number;
  question: string;
  cueCard?: { task: string };
}

interface TestOverviewProps {
  steps: OverviewStep[];
  /** Index of the current step; steps.length once the test is over. */
  index: number;
  /** Seconds spoken for each answered step, by key. */
  spoken: Record<string, number>;
}

/** Every question of the test by part: answered (with its length), now, or still to come. */
export function TestOverview({ steps, index, spoken }: TestOverviewProps) {
  const numbers = [...new Set(steps.map(s => s.part))].sort();
  const answered = Object.keys(spoken).length;
  const total = Object.values(spoken).reduce((sum, s) => sum + s, 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Answered</p>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">
            {answered}
            <span className="text-sm font-semibold text-muted-foreground">/{steps.length}</span>
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">You spoke</p>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">{clock(total)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-bold text-foreground">Your test</p>
        <div className="mt-3 space-y-4">
          {numbers.map(part => (
            <div key={part} className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Part {part} · {SPEAKING_PARTS[part]}
              </p>
              <ol className="space-y-1">
                {steps.map((step, i) => {
                  if (step.part !== part) return null;
                  const done = spoken[step.key] !== undefined;
                  const now = i === index;
                  const label = step.cueCard ? 'Long turn: task card' : done || now ? step.question : `Question ${i + 1}`;
                  return (
                    <li
                      key={step.key}
                      aria-current={now ? 'step' : undefined}
                      className={cn(
                        'flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs',
                        now ? 'bg-primary/[0.08] font-semibold text-foreground' : done ? 'text-muted-foreground' : 'text-muted-foreground/60',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold',
                          done ? 'bg-emerald-500 text-white' : now ? 'bg-primary text-primary-foreground' : 'border border-border',
                        )}
                      >
                        {done ? <Check className="h-2.5 w-2.5" /> : i + 1}
                      </span>
                      <span className="min-w-0 flex-1 line-clamp-2">{label}</span>
                      {done && <span className="shrink-0 tabular-nums">{clock(spoken[step.key])}</span>}
                      {now && !done && <span className="shrink-0 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">Now</span>}
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
