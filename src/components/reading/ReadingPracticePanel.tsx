import React, { useEffect, useState, useCallback } from 'react';
import { AlertCircle, Bot, CheckCircle2, RefreshCw, Send, Shuffle, Square, Play } from 'lucide-react';
import PreTestBlurOverlay from '@/components/practice/PreTestBlurOverlay';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { useApp } from '@/context/AppContext';
import { errorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { useReadingPractice, useReadingTypes } from '@/lib/hooks/useReading';
import PassageReader from '@/components/reading/PassageReader';
import ReadingGroupCard from '@/components/reading/ReadingGroupCard';
import { READING_TYPES, typeIdsFor, needsParagraphLabels, familyOf } from '@/lib/readingTypes';
import { ReadingTaskType } from '@/lib/types';
import { ReadingPracticeSkeleton } from '@/components/layout/PageSkeleton';

interface ReadingPracticePanelProps {
  /** The `?type=` key the sidebar linked with, if any. */
  initialTypeKey?: string;
}

/**
 * The first of a heading's task types the bank actually has questions behind.
 *
 * A heading like Multiple Choice covers two server types, and only one of them
 * may have content, so dealing the first id blindly would show an empty state
 * beside a menu entry that promised questions.
 */
function firstAvailable(typeIds: string[], types: ReadingTaskType[]): string | undefined {
  const withQuestions = typeIds.find(id =>
    types.some(type => type.typeId === id && type.questionCount > 0),
  );
  return withQuestions ?? typeIds.find(id => types.some(type => type.typeId === id));
}

function EmptyState({
  message,
  onRetry,
  types = [],
  onPick,
}: {
  message: string;
  onRetry?: () => void;
  types?: ReadingTaskType[];
  onPick?: (typeId: string) => void;
}) {
  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-8 text-center space-y-3 bg-card/20">
      <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
      <h3 className="text-sm font-bold text-foreground">{message}</h3>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2 mt-2">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try again</span>
        </Button>
      )}
      {onPick && types.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 max-w-lg">
          {types.map(type => (
            <Button
              key={type.typeId}
              variant="ghost"
              size="sm"
              onClick={() => onPick(type.typeId)}
              className="text-xs font-bold rounded-lg h-8"
            >
              {type.typeName}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Reading practice: IELTS-style split-pane screen.
 * Left pane: Reading passage with centered title and continuous natural paragraphs.
 * Right pane: Question notes completion card with inline inputs and circled numbers.
 */
export default function ReadingPracticePanel({ initialTypeKey }: ReadingPracticePanelProps) {
  const { user, activeExam, refreshUser, setIsTutorOpen, setTutorContextPrompt, activeTestSession, setActiveTestSession } = useApp();
  const toast = useToast();

  const typesQuery = useReadingTypes(activeExam);
  const types = typesQuery.data?.types ?? [];

  const practice = useReadingPractice(activeExam);
  const { set, deal } = practice;

  const currentTypeId = set?.groups[0]?.typeId;
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const subTestsRemaining = Math.max(
    0,
    (user?.subscription?.dailySubTestsLimit ?? 0) - (user?.subscription?.dailySubTestsUsed ?? 0)
  );

  const handleStop = useCallback(async () => {
    if (sessionId) {
      try {
        setIsStopping(true);
        await api.post('/practice/stop', { sessionId });
      } catch (err) {
        console.error('Failed to stop reading practice session:', err);
      } finally {
        setIsStopping(false);
      }
    }
    setIsSessionActive(false);
    setSessionId(null);
    setActiveTestSession(null);
    toast.info('Test stopped', 'Reading session has ended.');
  }, [sessionId, setActiveTestSession, toast]);

  const handleStart = useCallback(async () => {
    if (!set || isStarting) return;
    setIsStarting(true);
    try {
      const qId = set.groups[0]?.questions[0]?.id || set.passage?.id || 'reading-task';
      const data = await api.post<{ sessionId: string; remainingSubTests: number }>('/practice/start', {
        exam: activeExam,
        skill: 'reading',
        questionId: qId,
      });
      setSessionId(data.sessionId);
      setIsSessionActive(true);
      await refreshUser();
      setActiveTestSession({
        isActive: true,
        title: `READING: ${set.groups[0]?.typeName ?? 'Comprehension'}`,
        skill: 'reading',
        onStop: handleStop,
      });
      toast.success('Reading test started', '1 sub-test credit applied. Good luck!');
    } catch (err) {
      if (err instanceof ApiError && err.isLimitReached) {
        toast.warning('Daily limit reached', 'You have reached your daily sub-test allowance.');
      } else {
        toast.error('Could not start reading test', errorMessage(err));
      }
    } finally {
      setIsStarting(false);
    }
  }, [set, isStarting, activeExam, refreshUser, setActiveTestSession, handleStop, toast]);

  const handleCheck = async () => {
    await practice.check();
    setIsSessionActive(false);
    setSessionId(null);
    setActiveTestSession(null);
  };


  useEffect(() => {
    if (typesQuery.error) toast.error('Could not load reading tasks', errorMessage(typesQuery.error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typesQuery.error]);

  // Open on the type the sidebar linked to, or the first one with questions.
  useEffect(() => {
    if (types.length === 0) return;
    const linked = firstAvailable(typeIdsFor(initialTypeKey), types);
    const wanted = (linked ? types.find(type => type.typeId === linked) : undefined) ?? (set ? undefined : types[0]);
    // A dealt set covers a whole family, so its first group may be a different
    // type from the one asked for. Comparing the two directly re-dealt for ever.
    const dealt = currentTypeId ? familyOf(currentTypeId) : [];
    if (wanted && !dealt.includes(wanted.typeId)) {
      setIsSessionActive(false);
      setSessionId(null);
      setActiveTestSession(null);
      void deal(wanted.typeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [types, initialTypeKey, activeExam]);

  const askTutor = () => {
    if (!set) return;
    const group = set.groups[0];
    const subject = set.passage
      ? `Reading passage: ${set.passage.title}`
      : `Reading task: ${group?.typeName}`;
    setTutorContextPrompt(
      `${subject}\nTask type: ${group?.typeName}\nInstructions: ${group?.instructions}`,
    );
    setIsTutorOpen(true);
  };

  const linked = firstAvailable(typeIdsFor(initialTypeKey), types);
  const targetTypeId = linked ?? currentTypeId ?? types[0]?.typeId;
  // One skeleton for every reading task: they all load into the passage-left,
  // questions-right layout below, so choosing by task type only made the page
  // flash a shape it was never going to settle into.
  const skeleton = <ReadingPracticeSkeleton />;

  if (typesQuery.isPending) {
    return skeleton;
  }

  if (types.length === 0) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-8 text-center space-y-3 bg-card/20">
        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
        <h3 className="text-sm font-bold text-foreground">No {activeExam} reading passages yet</h3>
        <p className="text-xs text-muted-foreground">Switch exam, or try another skill.</p>
      </div>
    );
  }

  if (practice.dealing) {
    return skeleton;
  }

  if (!set) {
    // A failed deal is usually a 404 on a type with nothing behind it, so
    // retrying that same type just fails again. Offer the ones that do have
    // questions instead.
    const alternatives = types.filter(
      type => type.questionCount > 0 && type.typeId !== targetTypeId,
    );
    return (
      <EmptyState
        message={practice.dealError ?? 'Pick a task type to begin'}
        onRetry={targetTypeId ? () => void deal(targetTypeId) : undefined}
        types={alternatives}
        onPick={typeId => void deal(typeId)}
      />
    );
  }

  const hasPassage = Boolean(set.passage && set.groups[0]?.passageDisplay !== 'hidden');

  return (
    <div data-practice-workspace className="relative w-full h-[calc(100vh-4rem)] p-0 m-0 flex flex-col bg-background overflow-hidden">
      <div className="w-full flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Compact IELTS Two-Column Split Screen Layout with Independent Scrolling */}
        {!isSessionActive && !practice.checked && (
          <PreTestBlurOverlay
            title={set.passage?.title || set.groups[0]?.typeName || 'Reading Practice'}
            typeName={set.groups[0]?.typeName || 'Reading Comprehension'}
            instructions={set.groups[0]?.instructions || 'Read the passage and answer the questions.'}
            subTestsRemaining={subTestsRemaining}
            isStarting={isStarting}
            onStart={handleStart}
            onPickAnother={() => currentTypeId && void deal(currentTypeId)}
            skill="reading"
          />
        )}
        <div className={!isSessionActive && !practice.checked ? 'filter blur-[7px] pointer-events-none select-none opacity-25 transition-all duration-300 flex-1 w-full px-0 py-1 flex flex-col lg:flex-row gap-1.5 min-h-0 overflow-hidden' : 'transition-all duration-300 flex-1 w-full px-0 py-1 flex flex-col lg:flex-row gap-1.5 min-h-0 overflow-hidden'}>
          {/* Left Pane: Reading Passage (Independent scroll only) */}
          {hasPassage && (
            <div className="w-full lg:w-1/2 h-1/2 lg:h-full min-h-0 flex flex-col overflow-hidden">
              <PassageReader
                passage={set.passage!}
                scroll={true}
                passageNumber={1}
                questionRange={`Questions 1–${practice.totalQuestions}`}
                showLabels={set.groups.some(group => needsParagraphLabels(group.typeId))}
              />
            </div>
          )}

          {/* Right Pane: Questions & Answer Cards (Independent scroll only) */}
          <div className={`w-full ${hasPassage ? 'lg:w-1/2' : 'lg:w-full'} h-1/2 lg:h-full min-h-0 flex flex-col overflow-hidden`}>
            <div className="flex-1 min-h-0 overflow-y-auto pl-1 pr-2 space-y-2 scrollbar-thin">
              {/* Numbering runs across the paper, not from 1 inside each set:
                  the paper says "Questions 14–19" and the answer key refers
                  back by those numbers. */}
              {set.groups.map((group, index) => (
                <ReadingGroupCard
                  key={group.id}
                  group={group}
                  startNumber={
                    set.groups.slice(0, index).reduce((sum, earlier) => sum + earlier.questions.length, 1)
                  }
                  answers={practice.answers}
                  results={practice.results}
                  disabled={practice.checking}
                  onAnswer={practice.answer}
                />
              ))}

              {practice.checked && (
                <Card className="border-primary/40 border-r-0 rounded-r-none rounded-l-lg p-3 space-y-1.5 bg-card/60">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <CardTitle className="text-sm">
                      {practice.partsCorrect} of {practice.partsTotal} correct
                    </CardTitle>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Anything you got wrong is in your Mistakes bank with the explanation.
                  </p>
                </Card>
              )}
            </div>

            {/* Bottom Sticky Action Bar - Compact */}
            <div className="pt-2 mt-1 border-t border-border/70 flex flex-wrap items-center justify-between gap-2 shrink-0 bg-background/90 backdrop-blur-xs py-1.5 px-3">
              <Button variant="outline" size="sm" onClick={askTutor} className="gap-1.5 font-bold text-xs rounded-lg h-8 px-3">
                <Bot className="w-3.5 h-3.5 text-primary" />
                <span>Ask AI Coach</span>
              </Button>

              {isSessionActive && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleStop}
                  disabled={isStopping}
                  className="font-bold gap-1.5 text-xs rounded-lg h-8 px-3 bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop Practice</span>
                </Button>
              )}

              {!isSessionActive && !practice.checked ? (
                <Button
                  onClick={handleStart}
                  disabled={isStarting || subTestsRemaining <= 0}
                  className="font-bold gap-1.5 text-xs rounded-lg h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
                >
                  {isStarting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Starting…</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Practice</span>
                    </>
                  )}
                </Button>
              ) : practice.checked ? (
                <Button
                  onClick={() => currentTypeId && void deal(currentTypeId)}
                  className="font-bold gap-1.5 text-xs rounded-lg h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Another passage</span>
                </Button>
              ) : (
                <Button
                  onClick={() => void handleCheck()}
                  disabled={practice.checking || practice.answeredCount === 0}
                  className="font-bold gap-1.5 text-xs rounded-lg h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
                >
                  {practice.checking ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Checking…</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Check answers</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
