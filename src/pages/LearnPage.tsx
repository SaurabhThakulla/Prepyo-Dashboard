import { useLayoutEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Lock, RotateCcw, Star } from 'lucide-react';
import { lessonHref, type Unit } from '@/data/learnKorean';
import { useLearnProgress } from '@/lib/hooks/useLearnProgress';
import { useLearnCourse } from '@/lib/learn/course';
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
  hiragana: { banner: 'from-sky-500 to-sky-600', node: 'bg-sky-500 border-sky-700', ring: 'ring-sky-300' },
  katakana: { banner: 'from-cyan-500 to-blue-600', node: 'bg-cyan-500 border-cyan-700', ring: 'ring-cyan-300' },
  'jp-basic': { banner: 'from-violet-500 to-violet-600', node: 'bg-violet-500 border-violet-700', ring: 'ring-violet-300' },
  'jp-grammar': { banner: 'from-indigo-500 to-indigo-600', node: 'bg-indigo-500 border-indigo-700', ring: 'ring-indigo-300' },
  'jp-numbers': { banner: 'from-amber-500 to-orange-500', node: 'bg-amber-500 border-amber-700', ring: 'ring-amber-300' },
  'jp-daily': { banner: 'from-emerald-500 to-emerald-600', node: 'bg-emerald-500 border-emerald-700', ring: 'ring-emerald-300' },
  'jp-kanji': { banner: 'from-lime-500 to-green-600', node: 'bg-lime-500 border-lime-700', ring: 'ring-lime-300' },
  'jlpt-n5': { banner: 'from-rose-500 to-rose-600', node: 'bg-rose-500 border-rose-700', ring: 'ring-rose-300' },
};

// The path winds left and right, as it does in Duolingo.
const WIND = [0, 44, 66, 44, 0, -44, -66, -44];

/**
 * A beginner course (Korean for EPS-TOPIK, Japanese for JLPT): a path of
 * short lessons from the alphabet to the test's own task types, with XP and a
 * daily streak.
 */
export default function LearnPage() {
  const [searchParams] = useSearchParams();
  const course = useLearnCourse();
  const { progress } = useLearnProgress();
  const upNext = nextLesson(progress, course.units);
  const known = learnedWords(progress, course.units).length;
  const due = dueCount(progress, new Date(), course.units);
  const focusUnit = searchParams.get('unit');

  const upNextKey = upNext ? `${upNext.unit.id}/${upNext.index}` : undefined;

  // The path climbs from the bottom: open on the unit asked for (its banner is
  // at its foot) or else on the lesson up next. Before paint and without
  // animating, so the page never shows its top first; again if a server sync
  // moves the next lesson.
  useLayoutEffect(() => {
    const target = focusUnit ? document.getElementById(`unit-${focusUnit}`) : document.getElementById('learn-up-next');
    target?.scrollIntoView({ behavior: 'instant', block: focusUnit ? 'end' : 'center' });
  }, [focusUnit, upNextKey]);

  return (
    <div className="w-full">
      {/* The same full-width header as the mock test pages. */}
      <header className="bg-gradient-to-r from-primary to-primary/75 px-4 py-8 text-primary-foreground sm:px-8 lg:px-10">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/80">New to {course.language}?</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold sm:text-4xl">{course.heading}</h1>
        {known >= 4 && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                to="/learn/review"
                className="flex items-center gap-2.5 rounded-xl bg-white/15 px-4 py-2.5 text-sm transition-colors hover:bg-white/25"
              >
                <RotateCcw className="h-4 w-4 shrink-0" />
                <span>
                  <span className="font-bold">Review your words</span>
                  <span className="text-white/80">
                    {' '}
                    · {due > 0 ? `${due} of ${known} due` : `all ${known} fresh`}
                  </span>
                </span>
              </Link>
          </div>
        )}
      </header>

      {/* Bottom to top, like a game map: Unit 1 at the foot of the page. */}
      <div className="mx-auto flex w-full max-w-3xl flex-col-reverse gap-8 px-4 py-8">
      {course.units.map(unit => (
        <UnitPath
          key={unit.id}
          unit={unit}
          lang={course.lang}
          upNextKey={upNextKey}
          states={unit.lessons.map((_, i) => lessonState(progress, unit, i))}
          done={unitDoneCount(progress, unit)}
        />
      ))}
      </div>
    </div>
  );
}

function UnitPath({
  unit,
  lang,
  states,
  done,
  upNextKey,
}: {
  unit: Unit;
  lang: string;
  states: ReturnType<typeof lessonState>[];
  done: number;
  upNextKey?: string;
}) {
  const style = UNIT_STYLE[unit.id] ?? UNIT_STYLE.hangul;

  return (
    <section id={`unit-${unit.id}`} className="flex scroll-mt-20 flex-col-reverse gap-6">
      <div className={`flex items-center gap-4 rounded-2xl bg-gradient-to-r ${style.banner} p-4 sm:p-5 text-white shadow-md`}>
        <div lang={lang} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 font-display text-2xl font-bold">
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

      <ol className="flex flex-col-reverse items-center gap-5 py-2">
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
            <li key={lesson.id} id={current ? 'learn-up-next' : undefined} style={{ transform: `translateX(${offset}px)` }} className="flex flex-col items-center">
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
