import { cn } from '@/lib/utils';
import type { EvaluationCriterion } from '@/lib/types';
import { TONE, toneFor } from './ResultParts';

/** Rubric traits as a Component / Score / Suggestion table. */
export default function CriteriaTable({ criteria }: { criteria: EvaluationCriterion[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-foreground/20">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-foreground/20 bg-muted/60 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="whitespace-nowrap px-4 py-2.5">Component</th>
            <th className="whitespace-nowrap border-l border-foreground/15 px-4 py-2.5">Score</th>
            <th className="whitespace-nowrap border-l border-foreground/15 px-4 py-2.5">Suggestion</th>
          </tr>
        </thead>
        <tbody>{criteria.map(c => <CriterionRow key={c.name} criterion={c} />)}</tbody>
      </table>
    </div>
  );
}

/** One trait: its points with a step meter, and what to do about it. */
function CriterionRow({ criterion }: { criterion: EvaluationCriterion }) {
  const part = criterion.maxScore > 0 ? Math.min(1, Math.max(0, criterion.score / criterion.maxScore)) : 0;
  const tone = TONE[toneFor(part)];
  const steps = criterion.maxScore > 0 && criterion.maxScore <= 10 && Number.isInteger(criterion.maxScore) ? criterion.maxScore : 0;

  return (
    <tr className="border-t border-foreground/15 align-top first:border-t-0">
      <td className="w-48 min-w-[10rem] px-4 py-3.5 font-medium text-foreground">{criterion.name}</td>
      <td className="w-28 whitespace-nowrap border-l border-foreground/15 px-4 py-3.5">
        <span className="tabular-nums">
          <span className={cn('text-base font-semibold', tone.text)}>{criterion.score}</span>
          <span className="text-muted-foreground"> / {criterion.maxScore}</span>
        </span>
        <span className="mt-2 flex w-16 gap-0.5" aria-hidden>
          {steps > 0 ? (
            Array.from({ length: steps }, (_, i) => (
              <span key={i} className={cn('h-1 flex-1 rounded-full', i < criterion.score ? tone.bar : 'bg-muted')} />
            ))
          ) : (
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <span className={cn('block h-full rounded-full', tone.bar)} style={{ width: `${Math.round(part * 100)}%` }} />
            </span>
          )}
        </span>
      </td>
      <td className="min-w-[16rem] border-l border-foreground/15 px-4 py-3.5 leading-relaxed text-foreground/90">{criterion.feedback}</td>
    </tr>
  );
}
