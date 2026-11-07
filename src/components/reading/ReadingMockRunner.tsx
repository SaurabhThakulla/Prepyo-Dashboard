import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, RefreshCw, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import QuestionSource from '@/components/mocks/QuestionSource';
import { Card } from '@/components/ui/card';
import { ReadingMockSession } from '@/lib/types';
import PassageReader from '@/components/reading/PassageReader';
import ReadingGroupCard from '@/components/reading/ReadingGroupCard';
import { useReadingMock } from '@/lib/hooks/useReading';
import MockHeader from '@/components/mocks/MockHeader';
import { useTestLock } from '@/lib/hooks/useTestLock';
import { needsParagraphLabels } from '@/lib/readingTypes';

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
  useTestLock('Reading test', mock.exit);
  const sets = session.sets ?? [];
  const [activeIndex, setActiveIndex] = useState(0);
  // The clock is the server's: a reopened paper resumes with the time it has
  // left, not a fresh hour. Counting down to a fixed deadline, rather than
  // subtracting a second per tick, stays right when the tab is throttled.
  const [deadline] = useState(
    () => Date.now() + (session.secondsRemaining ?? session.durationMinutes * 60) * 1000,
  );
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));

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
    const timer = setInterval(
      () => setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))),
      1000,
    );
    return () => clearInterval(timer);
  }, [secondsLeft, deadline]);

  // Time is up: submit what there is. A paper that expires unsubmitted would
  // leave the learner holding an open session they can no longer finish. It
  // is tried once; a failure is left to the Submit button, not retried in a
  // loop.
  const autoSubmitted = useRef(false);
  useEffect(() => {
    if (secondsLeft === 0 && !submitting && !autoSubmitted.current) {
      autoSubmitted.current = true;
      void finish();
    }
  }, [secondsLeft, submitting, finish]);

  // "Questions 14-26" for the passage on screen, numbered across the whole
  // paper the way the printed test does it.
  const rangeFor = (index: number) => {
    const starts = startNumbers[index] ?? [];
    const first = starts[0];
    if (first === undefined) return undefined;
    const count = (sets[index]?.groups ?? []).reduce((sum, group) => sum + group.questions.length, 0);
    return count === 1 ? `Question ${first}` : `Questions ${first}–${first + count - 1}`;
  };

  const activeSet = sets[activeIndex];

  return (
    <div className="w-full min-h-[calc(100dvh-4rem)] lg:h-[calc(100dvh-4rem)] p-0 m-0 flex flex-col bg-background lg:overflow-hidden px-3 sm:px-6 lg:px-8 py-2.5 space-y-2.5">
      <div className="shrink-0">
        <MockHeader
          code={`R${activeIndex + 1}`}
          title={session.mockTitle ?? 'Reading Mock'}
          subtitle={`Passage ${activeIndex + 1} of ${sets.length} • ${session.totalQuestions} questions • marked automatically`}
          secondsLeft={secondsLeft}
          answered={{ done: mock.answeredCount, total: session.totalQuestions }}
          onLeave={mock.exit}
        />
      </div>

      {session.reusedPassages && (
        <Card className="p-2.5 flex items-start gap-2 border-amber-500/40 bg-amber-500/5 shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-foreground leading-relaxed">
            This paper repeats a passage you have sat before. There are not enough new reading
            passages in the bank yet, so your score here is less reliable than a fresh paper.
          </p>
        </Card>
      )}

      <div className="flex gap-2 shrink-0">
        {sets.map((set, index) => (
          <button
            key={set.passage?.id ?? index}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`flex-1 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
              index === activeIndex
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40'
            }`}
          >
            Passage {index + 1}
            <span className="block font-medium text-xs opacity-70 truncate">
              {set.passage?.title}
            </span>
          </button>
        ))}
      </div>

      {activeSet && (
        <div className="shrink-0">
          <QuestionSource questions={activeSet.groups.flatMap(group => group.questions)} />
        </div>
      )}

      {activeSet && (
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 overflow-hidden">
          {activeSet.passage && (
            <div className="w-full lg:w-1/2 lg:h-full min-h-0 flex flex-col lg:overflow-hidden">
              <PassageReader
                passage={activeSet.passage}
                scroll={true}
                passageNumber={activeIndex + 1}
                questionRange={rangeFor(activeIndex)}
                showLabels={activeSet.groups.some(group => needsParagraphLabels(group.typeId))}
              />
            </div>
          )}

          <div
            className={`w-full ${
              activeSet.passage ? 'lg:w-1/2 lg:h-full' : 'lg:w-full lg:h-full'
            } min-h-0 flex flex-col overflow-hidden rounded-xl border border-border/80 bg-card/40 p-2.5 sm:p-3.5`}
          >
            <div className="flex-1 min-h-0 lg:overflow-y-auto pr-1.5 space-y-4 scrollbar-thin">
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
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border shrink-0">
        <p className="text-[11px] text-muted-foreground">
          Unanswered questions are marked wrong. You can move between passages freely, and your answers are saved as you go.
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
