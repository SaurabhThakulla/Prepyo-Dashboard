import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, Flame, Lock, RotateCcw, Star, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COURSE, lessonHref, type Unit } from '@/data/learnKorean';
import { useLearnProgress } from '@/lib/hooks/useLearnProgress';
import { dueCount, learnedWords, lessonState, nextLesson, unitDoneCount } from '@/lib/learn/progress';

/** Each unit's colours. Written out in full so Tailwind keeps every class. */
const UNIT_STYLE: Record<string, { banner: string; node: string; ring: string }> = {
  hangul: { banner: 'from-sky-500 to-sky-600', node: 'bg-sky-500 border-sky-700', ring: 'ring-sky-300' },
  basic: { banner: 'from-violet-500 to-violet-600', node: 'bg-violet-500 border-violet-700', ring: 'ring-violet-300' },
  'eps-vocab': { banner: 'from-amber-500 to-orange-500', node: 'bg-amber-500 border-amber-700', ring: 'ring-amber-300' },
  grammar: { banner: 'from-indigo-500 to-indigo-600', node: 'bg-indigo-500 border-indigo-700', ring: 'ring-indigo-300' },
  'daily-life': { banner: 'from-emerald-500 to-emerald-600', node: 'bg-emerald-500 border-emerald-700', ring: 'ring-emerald-300' },
  construction: { banner: 'from-yellow-500 to-amber-600', node: 'bg-yellow-500 border-yellow-700', ring: 'ring-yellow-300' },
  farming: { banner: 'from-lime-500 to-green-600', node: 'bg-lime-500 border-lime-700', ring: 'ring-lime-300' },
  fishery: { banner: 'from-cyan-500 to-blue-600', node: 'bg-cyan-500 border-cyan-700', ring: 'ring-cyan-300' },
  'eps-topik': { banner: 'from-rose-500 to-rose-600', node: 'bg-rose-500 border-rose-700', ring: 'ring-rose-300' },
};

// The path winds left and right, as it does in Duolingo.
const WIND = [0, 44, 66, 44, 0, -44, -66, -44];

const TOTAL_LESSONS = COURSE.reduce((sum, unit) => sum + unit.lessons.length, 0);

/**
 * The beginner Korean course: a path of short lessons from the alphabet to the
 * test's own task types, with XP and a daily streak.
 */
export default function LearnKoreanPage() {
  const [searchParams] = useSearchParams();
  const { progress, streak } = useLearnProgress();
  const upNext = nextLesson(progress);
  const doneCount = Object.keys(progress.completed).length;
  const known = learnedWords(progress).length;
  const due = dueCount(progress);
  const focusUnit = searchParams.get('unit');

  useEffect(() => {
    if (!focusUnit) return;
    // A moment later: a scroll started while the page is still arriving is
    // dropped by the browser. A timer, not a frame, so a tab that is not being
    // drawn still ends up in the right place.
    const timer = setTimeout(
      () => document.getElementById(`unit-${focusUnit}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      50,
    );
    return () => clearTimeout(timer);
  }, [focusUnit]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10 space-y-8">
      <section className="rounded-3xl border-2 border-border bg-card p-5 sm:p-6 space-y-5">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">New to Korean?</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Learn Korean for EPS-TOPIK</h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Start from the alphabet. Short lessons, a few minutes each, take you through everyday and workplace Korean
            to every task in the test.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <HeaderStat icon={<Zap className="h-5 w-5 text-amber-500" />} value={progress.xp} label="XP" />
          <HeaderStat icon={<Flame className={`h-5 w-5 ${streak > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />} value={streak} label="day streak" />
          <HeaderStat icon={<Star className="h-5 w-5 text-emerald-500" />} value={`${doneCount}/${TOTAL_LESSONS}`} label="lessons" />
        </div>
        {upNext && (
          <Button asChild size="lg" className="h-12 w-full sm:w-auto rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 px-8 font-bold text-white hover:bg-emerald-600">
            <Link to={lessonHref(upNext.unit.id, upNext.unit.lessons[upNext.index].id)}>
              {doneCount === 0 ? 'Start the first lesson' : `Continue: ${upNext.unit.lessons[upNext.index].title}`}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        )}
        {known >= 4 && (
          <Link
            to="/learn/review"
            className="flex items-center gap-3 rounded-2xl border-2 border-violet-200 bg-violet-50 px-4 py-3 text-left transition-colors hover:bg-violet-100 dark:border-violet-900 dark:bg-violet-950/40 dark:hover:bg-violet-950/70"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500 text-white">
              <RotateCcw className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-foreground">Review your words</span>
              <span className="block text-xs text-muted-foreground">
                {due > 0 ? `${due} of ${known} words are due. A quick round keeps them fresh.` : `All ${known} words are fresh. Review any time for extra practice.`}
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-violet-600" />
          </Link>
        )}
      </section>

      {COURSE.map(unit => (
        <UnitPath
          key={unit.id}
          unit={unit}
          upNextKey={upNext ? `${upNext.unit.id}/${upNext.index}` : undefined}
          states={unit.lessons.map((_, i) => lessonState(progress, unit, i))}
          done={unitDoneCount(progress, unit)}
        />
      ))}
    </div>
  );
}

function HeaderStat({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border-2 border-border px-3 py-2.5 sm:flex-row sm:items-center sm:gap-2.5">
      {icon}
      <div className="min-w-0">
        <p className="font-display text-lg font-bold leading-none text-foreground">{value}</p>
        <p className="text-[11px] leading-tight text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function UnitPath({
  unit,
  states,
  done,
  upNextKey,
}: {
  unit: Unit;
  states: ReturnType<typeof lessonState>[];
  done: number;
  upNextKey?: string;
}) {
  const style = UNIT_STYLE[unit.id] ?? UNIT_STYLE.hangul;

  return (
    <section id={`unit-${unit.id}`} className="scroll-mt-20 space-y-6">
      <div className={`flex items-center gap-4 rounded-2xl bg-gradient-to-r ${style.banner} p-4 sm:p-5 text-white shadow-md`}>
        <div lang="ko" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 font-display text-2xl font-bold">
          {unit.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-white/80">Unit {unit.number}</p>
          <h2 className="font-display text-lg sm:text-xl font-bold leading-tight">{unit.title}</h2>
          <p className="text-xs sm:text-sm text-white/90 leading-snug">{unit.description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold tabular-nums">
          {done}/{unit.lessons.length}
        </span>
      </div>

      <ol className="flex flex-col items-center gap-5 py-2">
        {unit.lessons.map((lesson, i) => {
          const state = states[i];
          const current = upNextKey === `${unit.id}/${i}`;
          const offset = WIND[i % WIND.length];
          const node = (
            <span
              className={`relative flex h-16 w-16 items-center justify-center rounded-full border-b-[6px] text-white transition-transform ${
                state === 'locked'
                  ? 'bg-muted border-muted-foreground/30 text-muted-foreground'
                  : state === 'done'
                    ? 'bg-amber-400 border-amber-600 group-hover:scale-105'
                    : `${style.node} group-hover:scale-105`
              } ${current ? `ring-4 ring-offset-4 ring-offset-background ${style.ring}` : ''}`}
            >
              {state === 'done' ? (
                <Check className="h-8 w-8" strokeWidth={3} />
              ) : state === 'locked' ? (
                <Lock className="h-6 w-6" />
              ) : (
                <Star className="h-7 w-7 fill-current" />
              )}
            </span>
          );

          return (
            <li key={lesson.id} style={{ transform: `translateX(${offset}px)` }} className="flex flex-col items-center">
              {current && (
                <span className="mb-2 rounded-xl border-2 border-border bg-card px-3 py-1 text-xs font-bold uppercase tracking-wide text-foreground shadow-sm motion-safe:animate-bounce">
                  Start
                </span>
              )}
              {state === 'locked' ? (
                <div className="flex flex-col items-center" title="Finish the lesson before this one to open it">
                  {node}
                  <NodeLabel title={lesson.title} summary={lesson.summary} muted />
                </div>
              ) : (
                <Link to={lessonHref(unit.id, lesson.id)} className="group flex flex-col items-center rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  {node}
                  <NodeLabel title={lesson.title} summary={lesson.summary} />
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function NodeLabel({ title, summary, muted = false }: { title: string; summary: string; muted?: boolean }) {
  return (
    <span className="mt-2 max-w-[13rem] text-center">
      <span className={`block text-sm font-bold ${muted ? 'text-muted-foreground' : 'text-foreground'}`}>{title}</span>
      <span className="block text-[11px] leading-snug text-muted-foreground">{summary}</span>
    </span>
  );
}
