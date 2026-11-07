import type { ReactNode } from 'react';
import { Bot, CheckCircle2, Mic, Target, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Evaluation } from '@/lib/types';
import { CorrectedSentence } from '@/components/practice/EvaluationCard';
import { MarkedAnswer, MarkedAnswerLegend, ScoreRing, TONE, toneFor } from '@/components/practice/ResultParts';

export interface SpokenTurn {
  question: string;
  timing?: string;
  answer: string;
}

export interface SpokenPart {
  part: number;
  turns: SpokenTurn[];
}

/**
 * The speaking test transcript the server rates, cut back into its parts and
 * turns. It is written "Part 1", "Examiner: …", "Candidate (12s): …", one a
 * line; a line with neither label continues the one before.
 */
export function speakingTurns(transcript: string): SpokenPart[] {
  const parts: SpokenPart[] = [];
  let field: 'question' | 'answer' | null = null;
  const current = () => {
    if (parts.length === 0) parts.push({ part: 1, turns: [] });
    return parts[parts.length - 1];
  };
  for (const raw of transcript.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const part = /^Part (\d)$/.exec(line);
    if (part) {
      parts.push({ part: Number(part[1]), turns: [] });
      field = null;
      continue;
    }
    const examiner = /^Examiner:\s*(.*)$/.exec(line);
    if (examiner) {
      current().turns.push({ question: examiner[1], answer: '' });
      field = 'question';
      continue;
    }
    const candidate = /^Candidate(?:\s*\(([^)]*)\))?:\s*(.*)$/.exec(line);
    if (candidate) {
      const turns = current().turns;
      if (turns.length === 0 || turns[turns.length - 1].answer) turns.push({ question: '', answer: '' });
      const turn = turns[turns.length - 1];
      turn.timing = candidate[1];
      turn.answer = candidate[2];
      field = 'answer';
      continue;
    }
    const turns = current().turns;
    const turn = turns[turns.length - 1];
    if (turn && field) turn[field] = `${turn[field]}\n${line}`;
  }
  return parts.filter(p => p.turns.length > 0);
}

const PART_NAME: Record<number, string> = {
  1: 'Part 1 · Introduction and interview',
  2: 'Part 2 · Long turn',
  3: 'Part 3 · Discussion',
};

const NO_ANSWER = /^\(no answer was heard\)$/;

/**
 * Everything a rated speaking test or writing task came back with, laid out to
 * be read: the band and each criterion with its reason in full, what went well
 * and what to work on, the answer itself with the corrections marked, and the
 * fixes.
 */
export default function TestFeedback({ evaluation, answer }: { evaluation: Evaluation; answer?: string }) {
  const criteria = evaluation.criteria ?? [];
  const fixes = evaluation.sentenceFeedback ?? [];
  const strengths = evaluation.strengths ?? [];
  const weaknesses = evaluation.weaknesses ?? [];
  const score = evaluation.estimatedScore;
  const fraction = score === null ? null : score / 9;
  const speaking = evaluation.skill === 'speaking';
  const parts = speaking ? speakingTurns(evaluation.transcript ?? '') : [];
  const written = speaking ? '' : (answer?.trim() ? answer : evaluation.answer) ?? '';

  return (
    <div className="space-y-4" data-testid="test-feedback">
      {/* The band and each criterion, with the examiner-style reason in full. */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex shrink-0 flex-col items-center gap-1">
            <ScoreRing fraction={fraction ?? 0} tone={toneFor(fraction)} className="h-20 w-20">
              <span className="font-display text-2xl font-bold leading-none text-foreground">{score === null ? '—' : score.toFixed(1)}</span>
              <span className="mt-0.5 text-[11px] text-muted-foreground">of 9</span>
            </ScoreRing>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{score === null ? 'Not rated' : 'Band'}</span>
          </div>
          {evaluation.summary && (
            <p data-dictionary className="min-w-0 flex-1 text-sm leading-relaxed text-foreground">
              {evaluation.summary}
            </p>
          )}
        </div>

        {criteria.length > 0 && (
          <ul className="grid gap-3 md:grid-cols-2">
            {criteria.map(c => {
              const part = c.maxScore > 0 ? Math.min(1, Math.max(0, c.score / c.maxScore)) : 0;
              const tone = TONE[toneFor(part)];
              return (
                <li key={c.name} className="rounded-xl border border-border bg-background p-3.5 space-y-2">
                  <p className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-bold text-foreground">{c.name}</span>
                    <span className="shrink-0 tabular-nums">
                      <span className={cn('text-base font-bold', tone.text)}>{c.score}</span>
                      <span className="text-xs text-muted-foreground">/{c.maxScore}</span>
                    </span>
                  </p>
                  <span className="block h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <span className={cn('block h-full rounded-full', tone.bar)} style={{ width: `${Math.round(part * 100)}%` }} />
                  </span>
                  {c.feedback && (
                    <p data-dictionary className="text-[13px] leading-relaxed text-muted-foreground">
                      {c.feedback}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {(strengths.length > 0 || weaknesses.length > 0) && (
        <section className="grid gap-3 md:grid-cols-2">
          <PointList title="What went well" icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} items={strengths} />
          <PointList title="What to work on" icon={<Target className="h-4 w-4 text-amber-600" />} items={weaknesses} />
        </section>
      )}

      {/* The test itself: each question and the answer heard, part by part. */}
      {speaking && parts.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-base font-bold text-primary">
              <Mic className="h-4 w-4" /> Your test, part by part
            </h3>
            {score !== null && <MarkedAnswerLegend />}
          </div>
          {parts.map(p => (
            <div key={p.part} className="space-y-3">
              <h4 className="bg-gradient-to-r from-primary to-primary/80 px-4 py-2.5 text-[15px] font-semibold tracking-tight text-primary-foreground dark:!bg-muted dark:!text-foreground">
                {PART_NAME[p.part] ?? `Part ${p.part}`}
              </h4>
              <ol className="divide-y divide-border">
                {p.turns.map((turn, i) => (
                  <li key={i} className="space-y-3 py-4 first:pt-1 last:pb-0">
                    {turn.question && (
                      <div className="flex items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-muted text-muted-foreground" aria-hidden>
                          <Bot className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Examiner</p>
                          <p className="whitespace-pre-line text-[15px] font-semibold text-foreground">{turn.question}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-primary/10 text-primary" aria-hidden>
                        <User className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1 bg-primary/[0.04] px-4 py-3">
                        <p className="text-[11px] font-bold tracking-wider text-primary">
                          <span className="uppercase">You</span>
                          {turn.timing && <span className="font-medium tracking-normal text-muted-foreground"> · {turn.timing}</span>}
                        </p>
                        {!turn.answer.trim() || NO_ANSWER.test(turn.answer.trim()) ? (
                          <p className="text-sm italic text-muted-foreground">No answer was heard.</p>
                        ) : (
                          <div data-dictionary className="mt-1 [&_p]:leading-7">
                            <MarkedAnswer text={turn.answer} fixes={fixes} rated={score !== null} />
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>
      )}

      {!speaking && written.trim() && (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold text-primary">Your answer</h3>
            {score !== null && <MarkedAnswerLegend writing />}
          </div>
          <div data-dictionary>
            <MarkedAnswer text={written} fixes={fixes} rated={score !== null} />
          </div>
        </section>
      )}

      {fixes.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5 space-y-3">
          <h3 className="text-base font-bold text-primary">Corrections ({fixes.length})</h3>
          <ul className="space-y-2" data-dictionary>
            {fixes.map((fix, i) => (
              <li key={i} className="space-y-1 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                <CorrectedSentence original={fix.original} correction={fix.correction} />
                {fix.explanation && <p className="text-xs leading-relaxed text-muted-foreground">{fix.explanation}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {evaluation.modelRewrite && (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5 space-y-2">
          <h3 className="text-base font-bold text-primary">A stronger version</h3>
          <p data-dictionary className="whitespace-pre-line text-sm leading-relaxed text-foreground">
            {evaluation.modelRewrite}
          </p>
        </section>
      )}
    </div>
  );
}

function PointList({ title, icon, items }: { title: string; icon: ReactNode; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
        {icon} {title}
      </h3>
      <ul data-dictionary className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-foreground">
            <span aria-hidden className="text-muted-foreground">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
