import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock, LogOut, RefreshCw, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ReadingMockSession } from '@/lib/types';
import PassageReader from '@/components/reading/PassageReader';
import ReadingGroupCard from '@/components/reading/ReadingGroupCard';
import { useReadingMock } from '@/lib/hooks/useReading';

interface ReadingMockRunnerProps {
  session: ReadingMockSession;
  mock: ReturnType<typeof useReadingMock>;
}

/**
 * A generated reading paper: three passages, each with the full spread of task
 * types, one passage on screen at a time.
 *
 * Leaving is not the same as giving up. The paper stays open on the server, so
 * closing the tab and coming back resumes it — which matters because the three
 * passages were spent the moment they were dealt.
 */
export default function ReadingMockRunner({ session, mock }: ReadingMockRunnerProps) {
  const sets = session.sets ?? [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(session.durationMinutes * 60);

  // Where each passage's questions start, so numbering runs 1..n across the
  // whole paper rather than restarting on every passage.
  const startNumbers = useMemo(() => {
    const numbers: number[][] = [];
    let next = 1;
    for (const set of sets) {
      const perGroup: number[] = [];
      for (const group of set.groups) {
        perGroup.push(next);
        next += group.questions.length;
      }
      numbers.push(perGroup);
    }
    return numbers;
  }, [sets]);

  const { finish, submitting } = mock;

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft(seconds => seconds - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  // Time is up: submit what there is. A paper that expires unsubmitted would
  // leave the learner holding an open session they can no longer finish.
  useEffect(() => {
    if (secondsLeft === 0 && !submitting) void finish();
  }, [secondsLeft, submitting, finish]);

  const activeSet = sets[activeIndex];
  const minutes = Math.max(0, Math.floor(secondsLeft / 60));
  const seconds = Math.max(0, secondsLeft % 60);
  const lowOnTime = secondsLeft <= 300;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {session.mockTitle ?? 'Reading Mock'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {sets.length} passages • {session.totalQuestions} questions • graded on the server
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={lowOnTime ? 'warning' : 'outline'} className="gap-1 font-mono">
            <Clock className="w-3 h-3" />
            {minutes}:{String(seconds).padStart(2, '0')}
          </Badge>
          <Badge variant={mock.answeredCount === session.totalQuestions ? 'success' : 'outline'}>
            {mock.answeredCount}/{session.totalQuestions}
          </Badge>
          <Button variant="outline" size="sm" onClick={mock.exit} className="gap-1.5 font-bold">
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave</span>
          </Button>
        </div>
      </div>

      {session.reusedPassages && (
        <Card className="p-3 flex items-start gap-2 border-amber-500/40 bg-amber-500/5">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-foreground leading-relaxed">
            This paper repeats a passage you have sat before. There are not enough new reading
            passages in the bank yet, so your score here is less reliable than a fresh paper.
          </p>
        </Card>
      )}

      <div className="flex gap-2">
        {sets.map((set, index) => (
          <button
            key={set.passage?.id ?? index}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`flex-1 px-3 py-2 rounded-xl border text-xs font-bold transition-colors ${
              index === activeIndex
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40'
            }`}
          >
            Passage {index + 1}
            <span className="block font-medium text-[10px] opacity-70 truncate">
              {set.passage?.title}
            </span>
          </button>
        ))}
      </div>

      {activeSet && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {activeSet.passage && (
            <div className="lg:col-span-6">
              <PassageReader passage={activeSet.passage} />
            </div>
          )}

          <div className={`space-y-4 ${activeSet.passage ? 'lg:col-span-6' : 'lg:col-span-12'}`}>
            {activeSet.groups.map((group, groupIndex) => (
              <ReadingGroupCard
                key={group.id}
                group={group}
                startNumber={startNumbers[activeIndex]?.[groupIndex] ?? 1}
                answers={mock.answers}
                disabled={submitting}
                onAnswer={mock.answer}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
        <p className="text-[11px] text-muted-foreground">
          Unanswered questions are marked wrong. You can move between passages freely.
        </p>
        <Button onClick={() => void finish()} disabled={submitting} className="font-bold gap-1.5 shadow-md">
          {submitting ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Grading…</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Finish and grade</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
