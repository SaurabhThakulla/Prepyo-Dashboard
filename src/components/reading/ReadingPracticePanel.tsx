import { subTestsLeft } from '@/lib/subscriptions';
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { AlertCircle, Bot, CheckCircle2, RefreshCw, RotateCcw, Send, Shuffle, Square, Play } from 'lucide-react';
import PracticeUnavailable from '@/components/practice/PracticeUnavailable';
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
import { ExamType, ReadingGroup, ReadingTaskType } from '@/lib/types';
import { useMistakeResolution } from '@/lib/hooks/useMistakeResolution';
import { ReadingPracticeSkeleton } from '@/components/layout/PageSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueryClient } from '@tanstack/react-query';
import PracticeActionBar, { notesFor, ON_BAR, PracticeNotes } from '@/components/practice/flow/PracticeActionBar';
import MyScore from '@/components/practice/flow/MyScore';

const PILL = 'h-9 gap-1.5 rounded-full px-3 text-xs font-bold sm:px-4';

interface ReadingPracticePanelProps {
  /** The `?type=` key the sidebar linked with, if any. */
  initialTypeKey?: string;
  mistakeId?: string;
  exam?: ExamType;
  /** A passage chosen from the practice list; Start deals that one. */
  passageId?: string;
  /** The practice list's passages, in order, for the arrows and number list. */
  passageIds?: string[];
  /** The practice list is open: the first passage waits until it closes (or one is picked from it). */
  listOpen?: boolean;
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
export default function ReadingPracticePanel({ initialTypeKey, mistakeId, exam, passageId, passageIds = [], listOpen = false }: ReadingPracticePanelProps) {
  const { user, activeExam: contextExam, refreshUser, setIsTutorOpen, setTutorContextPrompt, activeTestSession, setActiveTestSession } = useApp();
  const activeExam = exam ?? contextExam;
  const resolution = useMistakeResolution(mistakeId);
  const toast = useToast();
  const queryClient = useQueryClient();

  const typesQuery = useReadingTypes(activeExam);
  const types = typesQuery.data?.types ?? [];

  const practice = useReadingPractice(activeExam);
  const { set, deal, dealing, reset } = practice;

  const currentTypeId = set?.groups[0]?.typeId;
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const subTestsRemaining = subTestsLeft(user?.subscription);

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

  // Redo passes the passage just checked so the same one is dealt again.
  const handleStart = useCallback(async (redoPassageId?: string) => {
    if (isStarting || isSessionActive) return;
    setIsStarting(true);
    try {
      let availableTypes = types;
      if (!mistakeId && availableTypes.length === 0) {
        const res = await typesQuery.refetch();
        availableTypes = res.data?.types ?? [];
      }
      const linked = firstAvailable(typeIdsFor(initialTypeKey), availableTypes);
      // An explicit unsupported/empty task must not silently become another task.
      const targetId = initialTypeKey ? linked : (currentTypeId ?? availableTypes[0]?.typeId);

      if (!targetId && !mistakeId) {
        toast.error('No tasks available', 'Please select another skill or exam.');
        return;
      }

      const dealtSet = await deal(targetId ?? '', mistakeId, redoPassageId ?? passageId);
      if (!dealtSet) {
        return;
      }

      const qId = dealtSet.groups[0]?.questions[0]?.id || dealtSet.passage?.id || 'reading-task';
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
        title: `READING: ${dealtSet.groups[0]?.typeName ?? 'Comprehension'}`,
        skill: 'reading',
        onStop: handleStop,
      });
      toast.success(
        'Reading test started',
        !Number.isFinite(subTestsRemaining)
          ? 'Unlimited practice active. Good luck!'
          : '1 sub-test credit applied. Good luck!',
      );
    } catch (err) {
      if (err instanceof ApiError && err.isLimitReached) {
        toast.warning('Daily limit reached', 'You have reached your daily sub-test allowance.');
      } else {
        toast.error('Could not start reading test', errorMessage(err));
      }
    } finally {
      setIsStarting(false);
    }
  }, [isStarting, isSessionActive, types, typesQuery, initialTypeKey, currentTypeId, deal, activeExam, refreshUser, setActiveTestSession, handleStop, toast, mistakeId, passageId]);

  const handleCheck = async () => {
    try {
      const graded = await practice.check();
      void queryClient.invalidateQueries({ queryKey: ['practice-history'] });
      if (mistakeId && graded) {
        const outcome = Object.values(graded)[0];
        if (outcome) await resolution.finish(outcome.attempt.isCorrect);
      }
    } finally {
      setIsSessionActive(false);
      setSessionId(null);
      setActiveTestSession(null);
    }
  };

  useEffect(() => {
    if (typesQuery.error) toast.error('Could not load reading tasks', errorMessage(typesQuery.error));
  }, [typesQuery.error]);

  // When task or exam changes in navigation, reset session and practice state so learner can start new task
  useEffect(() => {
    setIsSessionActive(false);
    setSessionId(null);
    setActiveTestSession(null);
    reset();
  }, [initialTypeKey, activeExam, reset]);

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

  const requestedTypeIds = useMemo(
    () => (initialTypeKey ? typeIdsFor(initialTypeKey) : []),
    [initialTypeKey],
  );

  const displayedGroups = useMemo<ReadingGroup[]>(() => {
    if (!set) return [];
    if (requestedTypeIds.length === 0) return set.groups;
    const matching = set.groups.filter((group: ReadingGroup) => requestedTypeIds.includes(group.typeId));
    return matching.length > 0 ? matching : set.groups;
  }, [set, requestedTypeIds]);

  const displayedQuestionCount = useMemo(
    () => displayedGroups.reduce((sum: number, g: ReadingGroup) => sum + g.questions.length, 0),
    [displayedGroups],
  );

  // A passage picked from the list replaces the one on screen in place.
  const pickedPassage = useRef(passageId);
  const [pendingPassage, setPendingPassage] = useState<string | null>(null);
  useEffect(() => {
    if (passageId === pickedPassage.current) return;
    pickedPassage.current = passageId;
    if (passageId && set) setPendingPassage(passageId);
  }, [passageId, set]);
  useEffect(() => {
    if (!pendingPassage || isStarting || isStopping) return;
    if (isSessionActive) {
      void handleStop();
      return;
    }
    setPendingPassage(null);
    void handleStart(pendingPassage);
  }, [pendingPassage, isSessionActive, isStarting, isStopping, handleStart, handleStop]);

  const linked = firstAvailable(typeIdsFor(initialTypeKey), types);
  const targetTypeId = linked ?? currentTypeId ?? types[0]?.typeId;
  // With a passage already on screen, the next one loads inside the same layout.
  const loadingNext = practice.dealing || isStarting || pendingPassage !== null;

  // Opening a task starts its first passage straight away, once; the start card is
  // only for an empty allowance or after the learner stops a test.
  const startKey = `${activeExam}:${initialTypeKey ?? ''}:${mistakeId ?? ''}`;
  const autoStartedFor = useRef<string | null>(null);
  const waitingToStart =
    !isSessionActive && !practice.checked && !set && subTestsRemaining > 0 && autoStartedFor.current !== startKey;
  useEffect(() => {
    if (!waitingToStart || listOpen || isStarting || pendingPassage) return;
    autoStartedFor.current = startKey;
    void handleStart();
  }, [waitingToStart, listOpen, isStarting, pendingPassage, startKey, handleStart]);

  // No start screen: the passage opens straight away and stays up after Stop.
  if (!set && loadingNext) {
    return <ReadingPracticeSkeleton />;
  }
  if (!set && waitingToStart) {
    // Blank behind the open practice list; the passage shows once it starts.
    return <div className="w-full min-h-[calc(100dvh-4rem)] bg-background" />;
  }
  if (!set && subTestsRemaining <= 0 && !mistakeId) {
    return <PracticeUnavailable />;
  }

  if (!set) {
    const alternatives = types.filter(
      type => type.questionCount > 0 && type.typeId !== targetTypeId,
    );
    return (
      <EmptyState
        message={practice.dealError ?? 'Pick a task type to begin'}
        onRetry={targetTypeId ? () => void handleStart() : undefined}
        types={alternatives}
        onPick={() => void handleStart()}
      />
    );
  }

  const hasPassage = Boolean(set.passage && displayedGroups[0]?.passageDisplay !== 'hidden');
  const passageIndex = set.passage ? passageIds.indexOf(set.passage.id) : -1;
  const shownQuestionIds = displayedGroups.flatMap(group => group.questions.map(question => question.id));
  // Redo before checking: blank every answer on this passage, same session.
  const clearAnswers = () =>
    shownQuestionIds.forEach(id => practice.answer(id, { textResponse: '', selectedOptions: [], blankResponses: {} }));

  return (
    <div data-practice-workspace className="relative w-full min-h-[calc(100dvh-4rem)] lg:h-[calc(100dvh-4rem)] p-0 m-0 flex flex-col bg-background lg:overflow-hidden">
      <div className="w-full flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="transition-all duration-300 flex-1 w-full px-0 py-1 flex flex-col lg:flex-row gap-1.5 min-h-0 overflow-hidden">
          {/* Left Pane: Reading Passage (Independent scroll only) */}
          {hasPassage && (
            <div className="w-full lg:w-1/2 lg:h-full min-h-0 flex flex-col lg:overflow-hidden">
              {loadingNext ? <PaneSkeleton lines={8} /> : <PassageReader
                passage={set.passage!}
                scroll={true}
                passageNumber={1}
                questionRange={`Questions 1–${displayedQuestionCount || practice.totalQuestions}`}
                showLabels={displayedGroups.some((group: ReadingGroup) => needsParagraphLabels(group.typeId))}
              />}
            </div>
          )}

          {/* Right Pane: Questions & Answer Cards (Independent scroll only) */}
          <div className={`w-full ${hasPassage ? 'lg:w-1/2' : 'lg:w-full'} lg:h-full min-h-0 flex flex-col lg:overflow-hidden`}>
            <div className="flex-1 min-h-0 lg:overflow-y-auto px-3 lg:pl-1 lg:pr-2 space-y-2 scrollbar-thin">
              {loadingNext ? <PaneSkeleton lines={4} tall /> : <>
              {displayedGroups.map((group: ReadingGroup, index: number) => (
                <ReadingGroupCard
                  key={group.id}
                  group={group}
                  startNumber={
                    displayedGroups.slice(0, index).reduce((sum: number, earlier: ReadingGroup) => sum + earlier.questions.length, 1)
                  }
                  answers={practice.answers}
                  results={practice.results}
                  disabled={practice.checking}
                  onAnswer={practice.answer}
                />
              ))}

              {practice.checked && (
                <ResultCard
                  correct={practice.partsCorrect}
                  total={practice.partsTotal}
                  note={resolution.resolved ? 'Mistake resolved' : 'Anything you got wrong stays in your Mistake Bank.'}
                />
              )}
              </>}

              {/* Actions sit under the questions, above the score, as on the other skills. */}
              <PracticeActionBar
                index={passageIndex}
                total={mistakeId ? 0 : passageIds.length}
                onJump={mistakeId ? undefined : i => void handleStart(passageIds[i])}
                onShuffle={mistakeId ? undefined : () => void handleStart()}
                disabled={isSessionActive || practice.checking || loadingNext}
                actions={
                  <>
                    {practice.checked && mistakeId && practice.correctCount > 0 && !resolution.resolved ? (
                      <Button disabled={resolution.saving} onClick={() => void resolution.finish(true)}>Retry saving resolution</Button>
                    ) : practice.checked ? (
                      <>
                        {!mistakeId && set.passage?.id && (
                          <Button variant="outline" onClick={() => void handleStart(set.passage?.id)} className={PILL}>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Redo</span>
                          </Button>
                        )}
                        <Button onClick={() => void handleStart()} className={`${PILL} bg-blue-600 hover:bg-blue-700 text-white shadow-2xs`}>
                          <Shuffle className="w-3.5 h-3.5" />
                          <span>{mistakeId ? 'Try again' : 'Another passage'}</span>
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => void handleCheck()}
                          disabled={practice.checking || practice.answeredCount === 0}
                          aria-label={practice.checking ? undefined : 'Check answers'}
                          className={`${PILL} border-primary text-primary hover:bg-primary hover:text-primary-foreground`}
                        >
                          {practice.checking ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Checking…</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Submit</span>
                            </>
                          )}
                        </Button>
                        <Button variant="outline" onClick={clearAnswers} disabled={practice.checking || practice.answeredCount === 0} className={PILL}>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Redo</span>
                        </Button>
                      </>
                    )}
                    {isSessionActive && (
                      <Button
                        variant="destructive"
                        onClick={handleStop}
                        disabled={isStopping}
                        className={`${PILL} bg-rose-600 hover:bg-rose-700 text-white shadow-xs`}
                      >
                        <Square className="w-3 h-3 fill-current" />
                        <span>Stop Practice</span>
                      </Button>
                    )}
                    <Button variant="ghost" onClick={askTutor} className={`${PILL} ${ON_BAR}`}>
                      <Bot className="w-3.5 h-3.5" />
                      <span><span className="hidden sm:inline">Ask </span>AI Coach</span>
                    </Button>
                  </>
                }
              />

              {!loadingNext && (
                <div className="space-y-3 px-1 py-3">
                  <PracticeNotes notes={notesFor('reading')} />
                  <MyScore questionIds={shownQuestionIds} bySitting />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The score after Submit, coloured by how well it went. */
function ResultCard({ correct, total, note }: { correct: number; total: number; note: string }) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const tone = pct === 100
    ? { ring: 'border-emerald-200 dark:border-emerald-900/60', soft: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500', Icon: CheckCircle2, word: 'All correct' }
    : pct >= 50
      ? { ring: 'border-amber-200 dark:border-amber-900/60', soft: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500', Icon: CheckCircle2, word: 'Nearly there' }
      : { ring: 'border-rose-200 dark:border-rose-900/60', soft: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-600 dark:text-rose-400', bar: 'bg-rose-500', Icon: AlertCircle, word: 'Keep practising' };
  const Icon = tone.Icon;

  return (
    <Card data-tour="practice-result" role="status" className={`rounded-2xl border ${tone.ring} bg-card p-4 shadow-xs`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tone.soft} ${tone.text}`}>
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-semibold uppercase tracking-wide ${tone.text}`}>{tone.word}</p>
          <CardTitle className="text-lg font-bold tabular-nums">
            {correct} of {total} correct
          </CardTitle>
        </div>
        <span className={`text-2xl font-black tabular-nums ${tone.text}`}>{pct}%</span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className={`h-full rounded-full ${tone.bar} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{note}</p>
    </Card>
  );
}

/** Stands in for one pane while the next passage loads, so the layout around it stays put. */
function PaneSkeleton({ lines, tall = false }: { lines: number; tall?: boolean }) {
  return (
    <Card role="status" aria-label="Loading the next passage" className="h-full p-6 space-y-3 overflow-hidden">
      <Skeleton className="h-6 w-1/2 mb-2" />
      {Array.from({ length: lines }).map((_, i) => <Skeleton key={i} className={tall ? 'h-16 w-full rounded-xl' : 'h-4 w-full'} />)}
    </Card>
  );
}
