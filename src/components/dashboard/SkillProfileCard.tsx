import React, { useMemo } from 'react';
import { BookOpen, Headphones, PenLine, Mic } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ProgressSummary, SkillType } from '@/lib/types';

/** The four skills the API scores, in the order the radar draws them. */
const SKILL_LABELS: { skill: SkillType; name: string }[] = [
  { skill: 'listening', name: 'Listening' },
  { skill: 'reading', name: 'Reading' },
  { skill: 'writing', name: 'Writing' },
  { skill: 'speaking', name: 'Speaking' },
];

/** Stands in for a number the learner has not generated yet. */
const NONE = 'â€”';

/** Skill profile for the learner's target exam, from the /progress summary. */
export default function SkillProfileCard({ progress }: { progress: ProgressSummary | null }) {
  const { user, activeExam } = useApp();
  const isIELTS = (user?.targetExam || activeExam || 'PTE') === 'IELTS';
  const minScale = isIELTS ? 0 : 10, maxScale = isIELTS ? 9 : 90;
  const targetNum = user?.targetScore ?? null;

  const { skillList, overallScore } = useMemo(() => {
    const rows = progress?.skills ?? [];
    const items = SKILL_LABELS.map(({ skill, name }) => {
      const row = rows.find(x => x.skill === skill);
      const score = row?.estimate ?? null;
      return {
        name,
        score: score != null ? Number(score.toFixed(1)) : null,
        acc: row?.accuracy ?? 0,
        att: row?.attempts ?? 0,
        gap: score != null && targetNum != null ? Number((score - targetNum).toFixed(1)) : null,
      };
    });

    // The overall figure is the server's. For IELTS it is the mean of all four
    // skill bands with the official rounding, and does not exist until all
    // four have evidence; a mean of whichever skills happen to be practised,
    // shown to one decimal place, is not an IELTS overall band.
    const serverOverall = user?.estimate?.value ?? progress?.estimate?.value ?? null;
    const overall = serverOverall != null ? (isIELTS ? serverOverall.toFixed(1) : String(Math.round(serverOverall))) : NONE;
    return { skillList: items, overallScore: overall };
  }, [progress, isIELTS, targetNum, user?.estimate?.value]);

  const skillsCovered = user?.estimate?.skillsCovered ?? progress?.estimate?.skillsCovered;
  const skillsRequired = user?.estimate?.skillsRequired ?? progress?.estimate?.skillsRequired;
  const overallNote =
    isIELTS && overallScore === NONE && skillsRequired
      ? `Needs all four skills (${skillsCovered ?? 0} of ${skillsRequired} so far)`
      : null;

  const norm = (score: number) => Math.min(1, Math.max(0.05, (score - minScale) / (maxScale - minScale)));

  return (
    <SkillProfile
      title={`Skill profile · ${isIELTS ? 'IELTS Academic' : 'PTE Academic'}`}
      scaleLabel={isIELTS ? 'Band per skill, 0–9' : 'Score per skill, 10–90'}
      overallLabel={isIELTS ? 'Overall band' : 'Overall score'}
      overall={overallScore}
      overallNote={overallNote}
      skills={skillList}
      target={targetNum}
      maxScale={maxScale}
      norm={norm}
    />
  );
}

type SkillRow = { name: string; score: number | null; acc: number; att: number; gap: number | null };

const SKILL_ICON: Record<string, typeof Mic> = { Listening: Headphones, Reading: BookOpen, Writing: PenLine, Speaking: Mic };

/** Overall score, a radar of the four skills, and a row per skill with its gap to the target. */
function SkillProfile({ title, scaleLabel, overallLabel, overall, overallNote, skills, target, maxScale, norm }: {
  title: string; scaleLabel: string; overallLabel: string; overall: string; overallNote: string | null;
  skills: SkillRow[]; target: number | null; maxScale: number; norm: (score: number) => number;
}) {
  const rad = 130, c = 170, axes = skills.length;
  const gradId = `radar-${React.useId().replace(/:/g, '')}`;
  const pt = (i: number, r: number) => ({ x: c + r * Math.cos((i * 2 * Math.PI) / axes - Math.PI / 2), y: c + r * Math.sin((i * 2 * Math.PI) / axes - Math.PI / 2) });
  const poly = (r: (i: number) => number) => skills.map((_, i) => { const p = pt(i, r(i) * rad); return `${p.x},${p.y}`; }).join(' ');
  // Label offsets per axis (top, right, bottom, left): skill name, then its score below it.
  const anchors = [{ dx: 0, dy: -30, a: 'middle' }, { dx: 16, dy: -4, a: 'start' }, { dx: 0, dy: 24, a: 'middle' }, { dx: -16, dy: -4, a: 'end' }] as const;
  const hasData = skills.some(s => s.score != null);
  const at = (s: SkillRow) => (s.score != null ? norm(s.score) : 0);

  return (
    <section className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{scaleLabel}</p>
        </div>
        <div className="rounded-2xl border border-border bg-muted/40 px-4 py-2.5 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{overallLabel}</p>
          <p className="font-display text-3xl font-black leading-none text-foreground tabular-nums">{overall}</p>
          {overallNote && <p className="mt-1 text-[11px] text-muted-foreground">{overallNote}</p>}
        </div>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-8">
        <div className="flex flex-col items-center rounded-2xl bg-gradient-to-b from-primary/[0.04] to-transparent py-4">
          <svg viewBox="-40 0 420 360" className="w-full max-w-[520px] overflow-visible select-none text-primary" role="img" aria-label={`${title} radar chart`}>
            <defs>
              <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.4" />
              </radialGradient>
            </defs>
            {[1, 0.75, 0.5, 0.25].map((l, k) => <polygon key={l} points={poly(() => l)} fill="currentColor" className={k % 2 === 0 ? 'text-muted/70' : 'text-card'} stroke="currentColor" strokeWidth="1" style={{ stroke: 'hsl(var(--border))' }} />)}
            {skills.map((_, i) => <line key={i} x1={c} y1={c} x2={pt(i, rad).x} y2={pt(i, rad).y} stroke="hsl(var(--border))" strokeWidth="1" />)}
            {target != null && <polygon points={poly(() => norm(target))} fill="none" stroke="currentColor" className="text-muted-foreground" strokeWidth="1.5" strokeDasharray="5 4" />}
            {hasData && <polygon points={poly(i => at(skills[i]))} fill={`url(#${gradId})`} stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" className="transition-all duration-500" />}
            {skills.map((s, i) => {
              const p = pt(i, at(s)), lbl = pt(i, rad), anc = anchors[i];
              return (
                <g key={s.name}>
                  {s.score != null && <circle cx={p.x} cy={p.y} r="5.5" className="fill-card" stroke="currentColor" strokeWidth="2.5" />}
                  <text x={lbl.x + anc.dx} y={lbl.y + anc.dy} textAnchor={anc.a} className="fill-muted-foreground text-[13px] font-semibold">{s.name}</text>
                  <text x={lbl.x + anc.dx} y={lbl.y + anc.dy + 17} textAnchor={anc.a} className={`text-[15px] font-black tabular-nums ${s.score != null ? 'fill-foreground' : 'fill-muted-foreground/60'}`}>{s.score ?? NONE}</text>
                </g>
              );
            })}
          </svg>
          <div className="mt-3 flex items-center gap-5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary/60" />Your score</span>
            {target != null && <span className="inline-flex items-center gap-1.5"><span className="w-3 border-t-2 border-dashed border-muted-foreground" />Target {target}</span>}
          </div>
        </div>

        <ul className="space-y-3">
          {skills.map(s => {
            const Icon = SKILL_ICON[s.name] ?? BookOpen;
            const pct = s.score != null ? Math.round(norm(s.score) * 100) : 0;
            return (
              <li key={s.name} className="rounded-xl border border-border/80 bg-muted/20 p-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" aria-hidden /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.att === 0 ? 'Not practised yet' : `${s.att} ${s.att === 1 ? 'attempt' : 'attempts'} Â· ${s.acc}% accuracy`}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl font-black leading-none text-foreground tabular-nums">{s.score ?? NONE}<span className="text-xs font-medium text-muted-foreground"> / {maxScale}</span></p>
                    {s.gap != null && (
                      <span className={`mt-1 inline-block rounded-md px-1.5 py-0.5 text-[11px] font-bold ${s.gap >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                        {s.gap >= 0 ? 'Target met' : `${s.gap} vs target`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="relative mt-3 h-2 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                  {target != null && <span title={`Target ${target}`} className="absolute -top-1 h-4 w-0.5 rounded bg-foreground/60" style={{ left: `${Math.round(norm(target) * 100)}%` }} />}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
