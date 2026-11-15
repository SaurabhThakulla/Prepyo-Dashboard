import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, Flag, RefreshCw, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import QuestionSource from '@/components/mocks/QuestionSource';
import { Card } from '@/components/ui/card';
import { ReadingMockSession } from '@/lib/types';
import PassageReader from '@/components/reading/PassageReader';
import ReadingGroupCard from '@/components/reading/ReadingGroupCard';
import { useReadingMock } from '@/lib/hooks/useReading';
import MockHeader from '@/components/mocks/MockHeader';
import TestFooter from '@/components/mocks/TestFooter';
import ConfirmSubmit from '@/components/mocks/ConfirmSubmit';
import { useTestLock } from '@/lib/hooks/useTestLock';
import { needsParagraphLabels } from '@/lib/readingTypes';
import { isAnswered } from '@/components/reading/ReadingQuestionRow';
import { FlagToggle, NavNumber, toggled } from '@/components/mocks/QuestionNav';

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
  const [confirmFinish, setConfirmFinish] = useState(false);
  // Flagged question ids, and the question last opened or answered (the one Flag acts on).
  const [flags, setFlags] = useState<Set<string>>(() => new Set());
  const [current, setCurrent] = useState<string | undefined>();
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

  // Every question with its paper-wide number, for the navigator.
  const items = sets.flatMap((set, setIndex) =>
    set.groups.flatMap((group, groupIndex) =>
      group.questions.map((question, i) => ({
        id: question.id,
        number: (startNumbers[setIndex]?.[groupIndex] ?? 1) + i,
        setIndex,
        groupId: group.id,
      })),
    ),
  );
  // Flag acts only on a question of the passage on screen.
  const currentItem = items.find(item => item.id === current && item.setIndex === activeIndex);

  const answer = (questionId: string, patch: Parameters<typeof mock.answer>[1]) => {
    setCurrent(questionId);
    mock.answer(questionId, patch);
  };

  // Opens the question's passage and scrolls to its group (the renderers carry no per-question anchor).
  const jump = (item: (typeof items)[number]) => {
    setActiveIndex(item.setIndex);
    setCurrent(item.id);
    setTimeout(() => document.getElementById(`rg-${item.groupId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  // The bar of the computer-delivered test: every passage, the open passage's
  // question numbers (filled once answered, flagged), and Flag.
  const navigator = (
    <nav aria-label="Question navigator" className="mb-2 flex items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-0.5 scrollbar-thin">
        {sets.map((set, index) => {
          const inSet = items.filter(item => item.setIndex === index);
          if (index !== activeIndex) {
            const done = inSet.filter(item => isAnswered(mock.answers[item.id])).length;
            return (
              <button
                key={set.passage?.id ?? index}
                type="button"
                onClick={() => setActiveIndex(index)}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-muted/60 px-3 py-1.5 text-xs transition-colors hover:bg-primary/10"
              >
                <span className="font-bold text-foreground">Passage {index + 1}</span>
                <span className="tabular-nums text-muted-foreground">{done}/{inSet.length}</span>
                {inSet.some(item => flags.has(item.id)) && <Flag aria-label="has flagged questions" className="h-3 w-3 fill-amber-400 text-amber-500" />}
              </button>
            );
          }
          return (
            <div key={set.passage?.id ?? index} className="flex shrink-0 items-center gap-1 rounded-xl bg-primary/[0.07] px-2 py-1 ring-1 ring-primary/30">
              <span className="px-1.5 text-xs font-bold text-primary">Passage {index + 1}</span>
              {inSet.map(item => (
                <NavNumber
                  key={item.id}
                  number={item.number}
                  answered={isAnswered(mock.answers[item.id])}
                  flagged={flags.has(item.id)}
                  current={item.id === current}
                  onClick={() => jump(item)}
                />
              ))}
            </div>
          );
        })}
      </div>
      <FlagToggle
        number={currentItem?.number}
        flagged={currentItem !== undefined && flags.has(currentItem.id)}
        onToggle={() => currentItem && setFlags(previous => toggled(previous, currentItem.id))}
      />
    </nav>
  );

  return (
    // The whole screen: a running mock has no app header above it.
    <div className="w-full min-h-dvh lg:h-dvh p-0 m-0 flex flex-col bg-background lg:overflow-hidden px-3 sm:px-6 lg:px-8 space-y-2.5">
      <MockHeader
        className="-mx-3 shrink-0 sm:-mx-6 lg:-mx-8"
        code={`R${activeIndex + 1}`}
        title={session.mockTitle ?? 'Reading Mock'}
        subtitle={`Passage ${activeIndex + 1} of ${sets.length} • ${session.totalQuestions} questions • marked automatically`}
        secondsLeft={secondsLeft}
        answered={{ done: mock.answeredCount, total: session.totalQuestions }}
      />

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
            className={`flex-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              index === activeIndex
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card text-muted-foreground shadow-sm hover:bg-primary/10 hover:text-primary'
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
            } min-h-0 flex flex-col overflow-hidden rounded-xl bg-muted/40 p-2.5 sm:p-3.5`}
          >
            <div className="flex-1 min-h-0 lg:overflow-y-auto pr-1.5 space-y-4 scrollbar-thin">
              {activeSet.groups.map((group, groupIndex) => (
                <div key={group.id} id={`rg-${group.id}`} className="scroll-mt-2">
                  <ReadingGroupCard
                    group={group}
                    startNumber={startNumbers[activeIndex]?.[groupIndex] ?? 1}
                    answers={mock.answers}
                    disabled={submitting}
                    onAnswer={answer}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <TestFooter
        className="-mx-3 sm:-mx-6 lg:-mx-8"
        onLeave={mock.exit}
        navigator={navigator}
        note="Unanswered questions are marked wrong. You can move between passages freely, and your answers are saved as you go."
      >
        {activeIndex < sets.length - 1 ? (
          <Button
            onClick={() => setActiveIndex(activeIndex + 1)}
            disabled={submitting}
            className="test-next h-11 gap-3 rounded-full pl-6 pr-1.5 font-bold tracking-wide"
          >
            Next passage
            <span className="test-next-chip"><ArrowRight className="h-4 w-4" /></span>
          </Button>
        ) : (
          <Button
            onClick={() => setConfirmFinish(true)}
            disabled={submitting}
            className="test-next h-11 gap-3 rounded-full pl-6 pr-1.5 font-bold tracking-wide"
          >
            {submitting ? 'Grading…' : 'Finish and grade'}
            <span className="test-next-chip">
              {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </span>
          </Button>
        )}
      </TestFooter>

      <ConfirmSubmit
        open={confirmFinish}
        onCancel={() => setConfirmFinish(false)}
        onConfirm={() => void finish()}
        description={
          mock.answeredCount < session.totalQuestions
            ? `${session.totalQuestions - mock.answeredCount} of ${session.totalQuestions} questions are unanswered and will be marked wrong. You cannot change your answers after this.`
            : undefined
        }
      />
    </div>
  );
}
