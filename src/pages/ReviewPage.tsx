import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Flame, RotateCcw, Target, X, XCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChoiceCard } from '@/components/learn/exercises';
import { useLearnProgress } from '@/lib/hooks/useLearnProgress';
import { buildReview } from '@/lib/learn/progress';
import { stopKorean, useKoreanVoice } from '@/lib/learn/speakKorean';

type Phase = 'answer' | 'checked';

/**
 * A short review of words from finished lessons, those due first. Each word's
 * first answer decides how soon it comes back; a missed word is asked again at
 * the end of the session, as in a lesson.
 */
export default function ReviewPage() {
  const navigate = useNavigate();
  const { progress, streak, finishReview } = useLearnProgress();
  const voice = useKoreanVoice();
  // Fixed for the session: progress changes as answers are saved.
  const [session] = useState(() => buildReview(progress));
  const [queue, setQueue] = useState(() => session.map((_, i) => i));
  const [position, setPosition] = useState(0);
  const [phase, setPhase] = useState<Phase>('answer');
  const [selected, setSelected] = useState<number | null>(null);
  const [firstTry, setFirstTry] = useState<Record<string, boolean>>({});
  const [earned, setEarned] = useState<number | null>(null);

  useEffect(() => stopKorean, []);

  if (session.length === 0) {
    return (
      <Centered>
        <div className="text-6xl" aria-hidden>📚</div>
        <h1 className="font-display text-2xl font-bold">Nothing to review yet</h1>
        <p className="max-w-sm text-sm text-muted-foreground">Finish a lesson or two first. The words you learn come back here for review.</p>
        <Button asChild size="lg" className="h-12 rounded-2xl font-bold"><Link to="/learn">Back to the path</Link></Button>
      </Centered>
    );
  }

  if (earned !== null) {
    const right = Object.values(firstTry).filter(Boolean).length;
    return (
      <Centered>
        <div className="text-6xl" aria-hidden>{right === session.length ? '🏆' : '💪'}</div>
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Review complete!</h1>
          <p className="text-sm text-muted-foreground">Words you knew come back later; the others come back tomorrow.</p>
        </div>
        <div className="grid w-full max-w-sm grid-cols-3 gap-3">
          <Stat icon={<Zap className="h-5 w-5 text-amber-500" />} value={`+${earned}`} label="XP" />
          <Stat icon={<Flame className="h-5 w-5 text-orange-500" />} value={String(streak)} label="day streak" />
          <Stat icon={<Target className="h-5 w-5 text-emerald-500" />} value={`${right}/${session.length}`} label="right first time" />
        </div>
        <div className="flex w-full max-w-sm flex-col gap-2">
          <Button asChild size="lg" className="h-12 rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 font-bold text-white hover:bg-emerald-600">
            <Link to="/learn">Back to the path <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </Centered>
    );
  }

  const { word, exercise } = session[queue[position]];
  const correct = selected === exercise.answer;
  const total = session.length;
  const done = Math.min(total, Object.keys(firstTry).length);

  const check = () => {
    if (selected === null || phase !== 'answer') return;
    setPhase('checked');
    setFirstTry(current => (word.ko in current ? current : { ...current, [word.ko]: correct }));
    if (!correct) setQueue(q => [...q, queue[position]]);
  };

  const advance = () => {
    stopKorean();
    if (position + 1 >= queue.length) {
      const results = session.map(item => ({ ko: item.word.ko, correct: firstTry[item.word.ko] ?? false }));
      setEarned(finishReview(results));
      return;
    }
    setPosition(p => p + 1);
    setPhase('answer');
    setSelected(null);
  };

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/60">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate('/learn')}
            aria-label="Leave review"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
            <div className="h-full rounded-full bg-violet-500 transition-[width] duration-500" style={{ width: `${(done / total) * 100}%` }} />
          </div>
          <span className="text-xs font-bold text-muted-foreground tabular-nums">{done}/{total}</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:py-10">
        <p className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <RotateCcw className="h-3.5 w-3.5" /> Word review
        </p>
        <ChoiceCard key={position} ex={exercise} voice={voice} selected={selected} checked={phase === 'checked'} onSelect={setSelected} />
      </main>

      <footer
        className={`sticky bottom-0 border-t-2 ${
          phase === 'checked'
            ? correct
              ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60'
              : 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/60'
            : 'border-border bg-background'
        }`}
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-[1.5rem]">
            {phase === 'checked' && (
              <div className="flex gap-2.5">
                {correct ? <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" /> : <XCircle className="h-6 w-6 shrink-0 text-rose-600" />}
                <div>
                  <p className={`font-bold ${correct ? 'text-emerald-800 dark:text-emerald-200' : 'text-rose-800 dark:text-rose-200'}`}>
                    {correct ? 'Correct!' : 'Not quite. It will come round again.'}
                  </p>
                  {exercise.explain && <p className="text-sm text-foreground/80">{exercise.explain}</p>}
                </div>
              </div>
            )}
          </div>
          {phase === 'answer' ? (
            <Button
              onClick={check}
              disabled={selected === null}
              size="lg"
              className="h-12 rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 px-10 font-bold uppercase tracking-wide text-white hover:bg-emerald-600 disabled:border-muted disabled:bg-muted disabled:text-muted-foreground sm:w-auto"
            >
              Check
            </Button>
          ) : (
            <Button
              onClick={advance}
              size="lg"
              className={`h-12 rounded-2xl border-b-4 px-10 font-bold uppercase tracking-wide text-white sm:w-auto ${
                correct ? 'border-emerald-700 bg-emerald-500 hover:bg-emerald-600' : 'border-rose-700 bg-rose-500 hover:bg-rose-600'
              }`}
            >
              Continue
            </Button>
          )}
        </div>
      </footer>
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
