import { cn } from '@/lib/utils';
import { getPteTaskContributions } from '@/lib/pteExamConfig';
import type { SkillType } from '@/lib/types';
import type { PracticeResult } from '@/lib/hooks/usePracticeSession';

export const SKILL_STYLE: Record<SkillType, { label: string; head: string; ring: string; text: string }> = {
  speaking: { label: 'Speaking', head: 'bg-orange-400', ring: 'stroke-orange-400', text: 'text-orange-500' },
  writing: { label: 'Writing', head: 'bg-sky-400', ring: 'stroke-sky-400', text: 'text-sky-500' },
  reading: { label: 'Reading', head: 'bg-emerald-500', ring: 'stroke-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  listening: { label: 'Listening', head: 'bg-blue-900 dark:bg-blue-700', ring: 'stroke-blue-900 dark:stroke-blue-400', text: 'text-blue-900 dark:text-blue-300' },
};

const PRODUCTIVE = new Set<SkillType>(['speaking', 'writing']);

const toScale = (fraction: number) => Math.round(10 + 80 * Math.min(1, Math.max(0, fraction)));

/**
 * One answer's score for each PTE skill its task counts towards. A rated answer
 * gives speaking or writing the full estimate and reading or listening its
 * Content trait only, as Pearson scores integrated tasks; a keyed answer gives
 * both the same.
 * Undefined when the task counts towards one skill or the answer was not rated.
 */
export function pteSkillScores(taskType: string, result: PracticeResult): { skill: SkillType; score: number }[] | undefined {
  const skills = getPteTaskContributions('academic', taskType)?.map(c => c.skill);
  if (!skills || skills.length < 2) return undefined;

  if (result.attempt) {
    const { score, maxScore, isCorrect } = result.attempt;
    const scaled = toScale(maxScore > 0 ? score / maxScore : isCorrect ? 1 : 0);
    return skills.map(skill => ({ skill, score: scaled }));
  }

  const evaluation = result.evaluation;
  if (!evaluation || evaluation.estimatedScore === null) return undefined;
  const content = (evaluation.criteria ?? []).find(c => /^content/i.test(c.name) && c.maxScore > 0);
  const contentScore = content ? toScale(content.score / content.maxScore) : evaluation.estimatedScore;
  return skills.map(skill => ({ skill, score: PRODUCTIVE.has(skill) ? evaluation.estimatedScore! : contentScore }));
}

/** The per-skill score boxes at the top of a PTE result, out of 90 like the test report. */
export default function PteSkillScores({ taskType, result }: { taskType: string; result: PracticeResult }) {
  const scores = pteSkillScores(taskType, result);
  if (!scores) return null;
  const rated = Boolean(result.evaluation);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        {scores.map(({ skill, score }) => (
          <SkillBox key={skill} skill={skill} score={score} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {rated
          ? `This task counts towards ${scores.map(s => SKILL_STYLE[s.skill].label).join(' and ')}. ${scores.filter(s => !PRODUCTIVE.has(s.skill)).map(s => SKILL_STYLE[s.skill].label).join(' and ')} uses your Content score only.`
          : `This task counts towards ${scores.map(s => SKILL_STYLE[s.skill].label).join(' and ')}, both from the same marks.`}
      </p>
    </div>
  );
}

function SkillBox({ skill, score }: { skill: SkillType; score: number }) {
  const style = SKILL_STYLE[skill];
  const radius = 26;
  const length = 2 * Math.PI * radius;
  const filled = ((score - 10) / 80) * length;

  return (
    <div className="w-28 overflow-hidden rounded-xl border border-border bg-card text-center" data-testid={`skill-score-${skill}`}>
      <p className={cn('py-1 text-xs font-semibold text-white', style.head)}>{style.label}</p>
      <div className="relative mx-auto my-2 h-16 w-16">
        <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90" aria-hidden>
          <circle cx="32" cy="32" r={radius} fill="none" strokeWidth="6" className="stroke-muted" />
          <circle cx="32" cy="32" r={radius} fill="none" strokeWidth="6" strokeLinecap="round" className={style.ring} strokeDasharray={`${filled} ${length}`} />
        </svg>
        <span className={cn('absolute inset-0 flex items-center justify-center text-lg font-bold', style.text)}>{score}</span>
      </div>
      <p className="pb-2 text-[11px] text-muted-foreground">Out of 90</p>
    </div>
  );
}
