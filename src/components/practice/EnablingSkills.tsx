import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { EvaluationCriterion, ExamType } from '@/lib/types';
import { onExamScale, TONE, toneFor } from './ResultParts';

/** Each scoring trait: its score, a bar coloured by how well it went, and the tip for it. */
export default function EnablingSkills({ criteria, exam }: { criteria: EvaluationCriterion[]; exam?: ExamType }) {
  if (criteria.length === 0) return null;
  return (
    <TooltipProvider delayDuration={100}>
    <section className="space-y-3" data-testid="enabling-skills">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
        <span className="h-3.5 w-1 rounded-full bg-teal-400" aria-hidden />
        {exam === 'IELTS' ? 'Band criteria' : 'Score'}
      </h3>
      <ul className={cn('grid gap-x-6 gap-y-3.5 sm:grid-cols-2', criteria.length > 4 && 'lg:grid-cols-3')}>
        {criteria.map(c => {
          // Pearson's own points when the server sent them, else the score as rated.
          const [points, outOf] = c.maxPoints ? [c.points ?? 0, c.maxPoints] : [c.score, c.maxScore];
          const part = outOf > 0 ? Math.min(1, Math.max(0, points / outOf)) : 0;
          // Shown on the exam's scale (PTE /90, IELTS /9), like the overall score.
          // The server's own conversion when it sent one (PTE traits come as /90 on
          // the same curve as the overall score), else a straight conversion.
          const scaled = onExamScale(exam, part);
          const { score, max } = scaled && c.maxScore === scaled.max
            ? { score: c.score, max: c.maxScore }
            : scaled ?? { score: points, max: outOf };
          const tone = TONE[toneFor(part)];
          return (
            <Trait key={c.name} reason={c.feedback} name={c.name} score={score} max={max}>
              <p className="flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
                  <span className="truncate">{c.name}</span>
                  {c.feedback && <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-primary" aria-hidden />}
                </span>
                <span className="shrink-0 tabular-nums">
                  <span className={cn('text-sm font-bold', tone.text)}>{score}</span>
                  <span className="text-xs text-muted-foreground">/{max}</span>
                </span>
              </p>
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                <span className={cn('block h-full rounded-full transition-[width] duration-700', tone.bar)} style={{ width: `${Math.round(part * 100)}%` }} />
              </span>
            </Trait>
          );
        })}
      </ul>
    </section>
    </TooltipProvider>
  );
}

/**
 * One trait row. Hovering (or focusing) it shows why it got that mark: the
 * examiner's note the AI already wrote with the grading, so it costs nothing extra.
 */
function Trait({ reason, name, score, max, children }: { reason?: string; name: string; score: number; max: number; children: ReactNode }) {
  if (!reason) return <li className="min-w-0">{children}</li>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <li tabIndex={0} className="group -m-1.5 min-w-0 cursor-help rounded-lg p-1.5 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary/40">
          {children}
        </li>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="start" className="max-w-sm px-3.5 py-2.5">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {name} · {score}/{max}
        </p>
        <p className="text-[13px] leading-relaxed text-foreground">{reason}</p>
      </TooltipContent>
    </Tooltip>
  );
}
