import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Flame, Heart, Lock, RotateCcw, Target, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { findLesson, lessonHref, type Exercise } from '@/data/learnKorean';
import { ChoiceCard, MatchCard, TaskIntroCard, TeachCard } from '@/components/learn/exercises';
import { useLearnProgress } from '@/lib/hooks/useLearnProgress';
import { useLearnCourse } from '@/lib/learn/course';
import danfeProud from '@/assets/danfe-proud.svg';
import { lessonState, prerequisite } from '@/lib/learn/progress';
import { buildUnitTest, UNIT_TEST_LIVES } from '@/lib/learn/unitTest';
import { stopSpeech, useLearnVoice } from '@/lib/learn/speech';

type Phase = 'answer' | 'checked';

/**
 * One lesson, one exercise at a time. A wrong answer goes back into the queue
 * and comes round again at the end, so a lesson is finished only once every
 * question has been answered right.
 */
export default function LessonPage() {
  const { unitId, lessonId } = useParams();
  const course = useLearnCourse();
  const found = findLesson(unitId, lessonId, course.units);
  const { progress } = useLearnProgress();

  if (!found) {
    return (
      <Centered>
        <p className="text-lg font-semibold">That lesson doesn't exist.</p>
        <Button asChild><Link to="/learn">Back to the path</Link></Button>
      </Centered>
    );
  }

  const { unit, lesson, index } = found;
  const needed = prerequisite(unit, index, course.units);
  if (needed && lessonState(progress, unit, index, course.units) === 'locked') {
    const isTest = needed.lesson.test;
    return (
      <Centered>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted"><Lock className="h-7 w-7 text-muted-foreground" /></div>
        <p className="text-lg font-semibold">{lesson.title} is locked</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          {isTest
            ? `Pass the Unit ${needed.unit.number} test (${needed.unit.title}) first. Each unit opens once the one before it is passed.`
            : `Finish “${needed.lesson.title}” first. Lessons in a unit open one after another.`}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link to="/learn">Back to the path</Link></Button>
          <Button asChild>
            <Link to={lessonHref(needed.unit.id, needed.lesson.id)}>{isTest ? `Go to the Unit ${needed.unit.number} test` : `Go to ${needed.lesson.title}`}</Link>
          </Button>
        </div>
      </Centered>
    );
  }

  // Keyed so moving to the next lesson starts a fresh run.
  return <LessonRun key={`${unit.id}/${lesson.id}`} unitId={unit.id} lessonId={lesson.id} />;
}

function LessonRun({ unitId, lessonId }: { unitId: string; lessonId: string }) {
  const navigate = useNavigate();
  const course = useLearnCourse();
  const { unit, lesson, index } = findLesson(unitId, lessonId, course.units)!;
  const { streak, finishLesson } = useLearnProgress();
  const voice = useLearnVoice(course);

  // A unit test deals fresh questions each attempt; a lesson plays its own exercises.
  const deal = (): Exercise[] => (lesson.test ? buildUnitTest(unit, course.language) : lesson.exercises);
  const [queue, setQueue] = useState<Exercise[]>(deal);
  const [failed, setFailed] = useState(false);
  const [position, setPosition] = useState(0);
  const [phase, setPhase] = useState<Phase>('answer');
  const [selected, setSelected] = useState<number | null>(null);
  const [matchDone, setMatchDone] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [result, setResult] = useState<{ earned: number } | null>(null);

  useEffect(() => stopSpeech, []);

  const exercise = queue[position];
  const total = lesson.test ? queue.length : lesson.exercises.length;
  const livesLeft = UNIT_TEST_LIVES - mistakes;
  // Progress counts first-time exercises passed; re-queued ones do not move it back.
  const done = Math.min(total, position + (phase === 'checked' ? 1 : 0));
  const correct = exercise?.kind === 'choice' && selected === exercise.answer;
  const isChoice = exercise?.kind === 'choice';
  const canCheck = isChoice && phase === 'answer' && selected !== null;
  const canContinue = (!isChoice && (exercise?.kind !== 'match' || matchDone)) || phase === 'checked';
  const next = unit.lessons[index + 1];

  const advance = () => {
    stopSpeech();
    if (lesson.test && livesLeft <= 0) {
      setFailed(true);
      return;
    }
    if (position + 1 >= queue.length) {
      setResult({ earned: finishLesson(unit.id, lesson.id, mistakes) });
      return;
    }
    setPosition(p => p + 1);
    setPhase('answer');
    setSelected(null);
    setMatchDone(false);
  };

  const check = () => {
    if (exercise.kind !== 'choice' || selected === null) return;
    setPhase('checked');
    if (selected !== exercise.answer) {
      setMistakes(m => m + 1);
      // In a lesson a miss comes round again; in a test it only costs a life.
      if (!lesson.test) setQueue(q => [...q, exercise]);
    }
  };

  const restart = () => {
    stopSpeech();
    setQueue(deal());
    setPosition(0);
    setPhase('answer');
    setSelected(null);
    setMistakes(0);
    setFailed(false);
  };

  // Enter checks or moves on, as the button in the footer does, even while an
  // option still has focus; the focused button's own click is held back so
  // one key press is one step.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || result || failed || event.repeat) return;
      // The leave button, and anything outside the lesson, keeps its own Enter.
      const target = event.target as HTMLElement | null;
      if (target !== document.body && !target?.closest('[data-lesson-keys]')) return;
      if (canContinue) {
        event.preventDefault();
        advance();
      } else if (canCheck) {
        event.preventDefault();
        check();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (failed) {
    return (
      <Centered>
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950">
          <Heart className="h-10 w-10 text-rose-500" />
        </div>
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Out of lives</h1>
          <p className="text-sm text-muted-foreground">
            {UNIT_TEST_LIVES} mistakes in {lesson.title.toLowerCase()} for {unit.title}. Start again with new questions.
          </p>
        </div>
        <div className="flex w-full max-w-sm flex-col gap-2">
          <Button size="lg" onClick={restart} className="gap-2"><RotateCcw className="h-4 w-4" /> Restart the test</Button>
          <Button size="lg" variant="outline" asChild><Link to={`/learn?unit=${unit.id}`}>Back to the path</Link></Button>
        </div>
      </Centered>
    );
  }

  if (result) {
    return (
      <Finished
        title={lesson.title}
        earned={result.earned}
        mistakes={mistakes}
        streak={streak}
        nextHref={next ? lessonHref(unit.id, next.id) : undefined}
        nextTitle={next?.title}
        practiceHref={lesson.practice ? `/practice?skill=${lesson.practice.skill}&type=${lesson.practice.typeKey}` : undefined}
        practiceCode={lesson.practice?.code}
      />
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/60">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(`/learn?unit=${unit.id}`)}
            aria-label="Leave lesson"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
            <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${(done / total) * 100}%` }} />
          </div>
          <span className="text-xs font-bold text-muted-foreground tabular-nums">{done}/{total}</span>
          {lesson.test && (
            <span className="flex items-center gap-1 text-sm font-bold text-rose-500 tabular-nums" aria-label={`${livesLeft} mistakes left`}>
              <Heart className="h-4 w-4 fill-current" /> {livesLeft}
            </span>
          )}
        </div>
      </header>

      <main data-lesson-keys className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:py-10">
        {voice === 'none' && exercise.kind === 'teach' && (
          <p className="mb-4 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
            This device has no {course.language} voice, so audio is off. Open Prepyo in Chrome or Edge, or add {course.language} in your device's speech settings, to hear the words.
          </p>
        )}
        {exercise.kind === 'teach' && <TeachCard key={position} ex={exercise} voice={voice} />}
        {exercise.kind === 'choice' && (
          <ChoiceCard
            key={position}
            ex={exercise}
            voice={voice}
            selected={selected}
            checked={phase === 'checked'}
            onSelect={setSelected}
          />
        )}
        {exercise.kind === 'match' && (
          <MatchCard
            key={position}
            ex={exercise}
            onDone={wrong => {
              setMistakes(m => m + wrong);
              setMatchDone(true);
            }}
          />
        )}
        {exercise.kind === 'taskIntro' && lesson.practice && (
          <TaskIntroCard ex={exercise} practice={lesson.practice} voice={voice} />
        )}
      </main>

      <footer
        data-lesson-keys
        className={`sticky bottom-0 border-t-2 ${
          phase === 'checked'
            ? correct
              ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60'
              : 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/60'
            : 'border-border bg-background'
        }`}
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          {/* A wrong answer needs no "Answer:" line, the right tile is already marked green, but keeps its explanation. */}
          {!(phase === 'checked' && !correct) ? (
            <div className="min-h-[1.5rem]">
              {phase === 'checked' && exercise.kind === 'choice' && (
                <div className="flex gap-2.5">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
                  <div>
                    <p className="font-bold text-emerald-800 dark:text-emerald-200">Correct!</p>
                    {exercise.explain && <p className="text-sm text-foreground/80">{exercise.explain}</p>}
                  </div>
                </div>
              )}
            </div>
          ) : (
            exercise.kind === 'choice' && exercise.explain && (
              <p className="text-sm text-rose-900 dark:text-rose-100">{exercise.explain}</p>
            )
          )}
          {phase === 'answer' && isChoice ? (
            <Button
              onClick={check}
              disabled={!canCheck}
              size="lg"
              className="h-12 rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 px-10 font-bold uppercase tracking-wide text-white hover:bg-emerald-600 disabled:border-muted disabled:bg-muted disabled:text-muted-foreground sm:w-auto"
            >
              Check
            </Button>
          ) : (
            <Button
              onClick={advance}
              disabled={!canContinue}
              size="lg"
              className={`h-12 rounded-2xl border-b-4 px-10 font-bold uppercase tracking-wide text-white sm:w-auto ${
                phase === 'checked' && !correct
                  ? 'border-rose-700 bg-rose-500 hover:bg-rose-600'
                  : 'border-emerald-700 bg-emerald-500 hover:bg-emerald-600'
              } disabled:border-muted disabled:bg-muted disabled:text-muted-foreground`}
            >
              {exercise.kind === 'taskIntro' ? 'Got it' : 'Continue'}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

function Finished({
  title,
  earned,
  mistakes,
  streak,
  nextHref,
  nextTitle,
  practiceHref,
  practiceCode,
}: {
  title: string;
  earned: number;
  mistakes: number;
  streak: number;
  nextHref?: string;
  nextTitle?: string;
  practiceHref?: string;
  practiceCode?: string;
}) {
  return (
    <Centered>
      <ProudDanfe />
      <div className="space-y-1">
        <h1 className="font-display text-2xl sm:text-3xl font-bold">Lesson complete!</h1>
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>
      <div className="grid w-full max-w-sm grid-cols-3 gap-3">
        <Stat icon={<Zap className="h-5 w-5 text-amber-500" />} value={`+${earned}`} label="XP" />
        <Stat icon={<Flame className="h-5 w-5 text-orange-500" />} value={String(streak)} label="day streak" />
        <Stat icon={<Target className="h-5 w-5 text-emerald-500" />} value={mistakes === 0 ? 'Perfect' : String(mistakes)} label={mistakes === 0 ? 'no mistakes' : mistakes === 1 ? 'mistake' : 'mistakes'} />
      </div>
      {earned === 0 && <p className="text-xs text-muted-foreground">Practice run: XP is earned the first time, plus a bonus for a perfect run.</p>}
      <div className="flex w-full max-w-sm flex-col gap-2">
        {practiceHref && (
          <Button asChild size="lg" className="h-12 rounded-2xl border-b-4 border-blue-800 bg-blue-600 font-bold text-white hover:bg-blue-700">
            <Link to={practiceHref}>Try a real {practiceCode} question <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        )}
        {nextHref && (
          <Button asChild size="lg" className="h-12 rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 font-bold text-white hover:bg-emerald-600">
            <Link to={nextHref}>Next: {nextTitle} <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        )}
        <Button asChild variant="outline" size="lg" className="h-12 rounded-2xl font-bold">
          <Link to="/learn">Back to the path</Link>
        </Button>
      </div>
    </Centered>
  );
}

// Sparkles around the circle: position (% of the box), size (px), colour and when each twinkles.
const SPARKS = [
  { top: 6, left: 14, size: 18, color: '#FBBF24', delay: 0.2 },
  { top: 2, left: 74, size: 14, color: '#38BDF8', delay: 0.9 },
  { top: 40, left: 92, size: 20, color: '#F472B6', delay: 0.5 },
  { top: 82, left: 80, size: 14, color: '#FBBF24', delay: 1.3 },
  { top: 86, left: 10, size: 16, color: '#34D399', delay: 0.7 },
  { top: 44, left: -2, size: 13, color: '#A78BFA', delay: 1.6 },
];

/** Proud Danfe for a finished lesson: pops in, bobs, with a glow, turning rays and twinkling sparkles. */
function ProudDanfe() {
  return (
    <div className="relative flex h-44 w-44 items-center justify-center" aria-hidden>
      <span
        className="proud-rays absolute inset-0 rounded-full dark:hidden"
        style={{
          backgroundImage:
            'repeating-conic-gradient(from 0deg, rgba(251,191,36,0.28) 0deg 10deg, transparent 10deg 30deg)',
          maskImage: 'radial-gradient(circle, black 35%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(circle, black 35%, transparent 70%)',
        }}
      />
      <span className="proud-glow absolute h-28 w-28 rounded-full bg-sky-300/60 dark:bg-white/20" />
      <span className="proud-pop relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-sky-100 dark:bg-sky-950 ring-4 ring-white dark:ring-white/10 shadow-xl shadow-sky-500/25">
        <img src={danfeProud} alt="" className="proud-bob h-full w-full" />
      </span>
      {SPARKS.map((s, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className="proud-spark absolute"
          style={{ top: `${s.top}%`, left: `${s.left}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }}
        >
          <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z" fill={s.color} />
        </svg>
      ))}
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-2xl border-2 border-border bg-card p-3 text-center">
      <div className="flex justify-center">{icon}</div>
      <p className="mt-1 font-display text-lg font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center gap-5 px-4 py-10 text-center">
      {children}
    </div>
  );
}
