import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Lock, RotateCcw, Star, Trophy } from 'lucide-react';
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
  'ssw-life': { banner: 'from-teal-500 to-teal-600', node: 'bg-teal-500 border-teal-700', ring: 'ring-teal-300' },
  'ssw-jft': { banner: 'from-blue-500 to-indigo-600', node: 'bg-blue-500 border-blue-700', ring: 'ring-blue-300' },
  'ssw-care': { banner: 'from-pink-500 to-rose-500', node: 'bg-pink-500 border-pink-700', ring: 'ring-pink-300' },
  'ssw-food': { banner: 'from-orange-500 to-red-500', node: 'bg-orange-500 border-orange-700', ring: 'ring-orange-300' },
  'ssw-farm': { banner: 'from-green-500 to-emerald-600', node: 'bg-green-500 border-green-700', ring: 'ring-green-300' },
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
          states={unit.lessons.map((_, i) => lessonState(progress, unit, i, course.units))}
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
  const listRef = useRef<HTMLOListElement>(null);
  const nodeRefs = useRef<(HTMLSpanElement | null)[]>([]);
  // The track is gold as far as the learner has gone: up to the first stop not yet done.
  const firstOpen = states.findIndex(s => s !== 'done');
  const reached = firstOpen === -1 ? states.length : firstOpen;

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

      <ol ref={listRef} className="relative flex flex-col-reverse items-center gap-5 py-2">
        {unit.lessons.map((lesson, i) => {
          const state = states[i];
          const current = upNextKey === `${unit.id}/${i}`;
          // The unit test sits centred and larger, a trophy at the end of the path.
          const offset = lesson.test ? 0 : WIND[i % WIND.length];
          const node = (
            <span
              ref={el => {
                nodeRefs.current[i] = el;
              }}
              className={`relative flex ${lesson.test ? 'h-20 w-20' : 'h-16 w-16'} items-center justify-center rounded-full border-b-[6px] text-white transition-transform ${
                state === 'locked'
                  ? 'bg-muted border-muted-foreground/30 text-muted-foreground'
                  : state === 'done'
                    ? 'bg-amber-400 border-amber-600 group-hover:scale-105'
                    : `${style.node} group-hover:scale-105`
              } ${current ? `ring-4 ring-offset-4 ring-offset-background ${style.ring}` : ''}`}
            >
              {current && (
                // Danfe stands beside the learner's stop, on the side away from the bend, so he stays on screen.
                <img
                  src="/danfe.svg"
                  alt=""
                  aria-hidden
                  className={`danfe-idle pointer-events-none absolute bottom-[-6px] h-24 w-auto max-w-none ${offset > 0 ? 'right-full mr-3' : 'left-full ml-3'}`}
                />
              )}
              {state === 'done' ? (
                <Check className="h-8 w-8" strokeWidth={3} />
              ) : state === 'locked' ? (
                <Lock className="h-6 w-6" />
              ) : lesson.test ? (
                <Trophy className="h-9 w-9" />
              ) : (
                <Star className="h-7 w-7 fill-current" />
              )}
            </span>
          );

          return (
            <li key={lesson.id} id={current ? 'learn-up-next' : undefined} style={{ transform: `translateX(${offset}px)` }} className="relative z-[1] flex flex-col items-center">
              {current && (
                <span className="mb-2 rounded-xl border-2 border-border bg-card px-3 py-1 text-xs font-bold uppercase tracking-wide text-foreground shadow-sm motion-safe:animate-bounce">
                  Start
                </span>
              )}
              {state === 'locked' ? (
                <div className="flex flex-col items-center" title="Finish what comes before this to open it">
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
        <Track listRef={listRef} nodeRefs={nodeRefs} reached={reached} count={unit.lessons.length} />
      </ol>
    </section>
  );
}

function NodeLabel({ title, summary, muted = false }: { title: string; summary: string; muted?: boolean }) {
  return (
    <span className="mt-2 max-w-[13rem] rounded-xl bg-background/95 px-2 py-0.5 text-center">
      <span className={`block text-sm font-bold ${muted ? 'text-muted-foreground' : 'text-foreground'}`}>{title}</span>
      <span className="block text-[11px] leading-snug text-muted-foreground">{summary}</span>
    </span>
  );
}

type Point = [number, number];

/** The S-curve from one stop up to the next: it leaves and arrives upright, like a railway bend. */
function bend([x0, y0]: Point, [x1, y1]: Point, t: number): Point {
  const ym = (y0 + y1) / 2;
  const u = 1 - t;
  return [
    u * u * u * x0 + 3 * u * u * t * x0 + 3 * u * t * t * x1 + t * t * t * x1,
    u * u * u * y0 + 3 * u * u * t * ym + 3 * u * t * t * ym + t * t * t * y1,
  ];
}

/** One rail: the bend sampled finely and shifted sideways by `side` pixels. */
function rail(a: Point, b: Point, side: number): string {
  const steps = 24;
  const pts = Array.from({ length: steps + 1 }, (_, k) => bend(a, b, k / steps));
  return pts
    .map(([x, y], k) => {
      const [px, py] = pts[Math.max(0, k - 1)];
      const [nx, ny] = pts[Math.min(steps, k + 1)];
      const len = Math.hypot(nx - px, ny - py) || 1;
      return `${k ? 'L' : 'M'}${(x - ((ny - py) / len) * side).toFixed(1)} ${(y + ((nx - px) / len) * side).toFixed(1)}`;
    })
    .join(' ');
}

/**
 * A railway joining a unit's stops, drawn behind them: wooden sleepers and two
 * rails, gold up to the learner's place and grey beyond. The stops are measured
 * after layout, so the track follows wherever they wind.
 */
function Track({
  listRef,
  nodeRefs,
  reached,
  count,
}: {
  listRef: React.RefObject<HTMLOListElement | null>;
  nodeRefs: React.MutableRefObject<(HTMLSpanElement | null)[]>;
  reached: number;
  count: number;
}) {
  const [points, setPoints] = useState<(Point | null)[]>([]);

  // After commit, not in layout: the list's own ref is attached only once its children are.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const box = list.getBoundingClientRect();
      setPoints(
        // One entry per stop, null where a stop is not mounted, so index i is always lesson i.
        Array.from({ length: count }, (_, i): Point | null => {
          const node = nodeRefs.current[i];
          if (!node) return null;
          const r = node.getBoundingClientRect();
          return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top];
        }),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [listRef, nodeRefs, count]);

  if (points.length < 2) return null;
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
      {points.slice(1).map((to, i) => {
        const from = points[i];
        if (!from || !to) return null;
        const gold = i < reached;
        const ym = (from[1] + to[1]) / 2;
        const centre = `M${from[0]} ${from[1]} C${from[0]} ${ym} ${to[0]} ${ym} ${to[0]} ${to[1]}`;
        const rails = gold ? '#F59E0B' : '#94A3B8';
        return (
          <g key={i} fill="none" strokeLinecap="round">
            <path d={centre} stroke={gold ? '#B45309' : '#94A3B8'} strokeOpacity={gold ? 0.55 : 0.35} strokeWidth={22} strokeDasharray="4 9" strokeLinecap="butt" />
            <path d={rail(from, to, 7)} stroke={rails} strokeWidth={3.5} />
            <path d={rail(from, to, -7)} stroke={rails} strokeWidth={3.5} />
          </g>
        );
      })}
    </svg>
  );
}
