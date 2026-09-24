import { subTestsLeft } from '@/lib/subscriptions';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import { ExamType, ReadingGroup, ReadingTaskType } from '@/lib/types';
import { useMistakeResolution } from '@/lib/hooks/useMistakeResolution';
import { ReadingPracticeSkeleton } from '@/components/layout/PageSkeleton';

interface ReadingPracticePanelProps {
  /** The `?type=` key the sidebar linked with, if any. */
  initialTypeKey?: string;
  mistakeId?: string;
  exam?: ExamType;
  /** A passage chosen from the practice list; Start deals that one. */
  passageId?: string;
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

function labelForTypeKey(key?: string) {
  if (!key) return 'Reading Practice';
  const labels: Record<string, string> = {
    matchinginformation: 'Matching Information',
    findparagraph: 'Matching Information',
    whichparagraphcontainsfollowinginformation: 'Matching Information',
    truefalse: 'True / False / Not Given',
    truefalsenotgiven: 'True / False / Not Given',
    yesnonotgiven: 'Yes / No / Not Given',
    fillinblanks: 'Sentence Completion',
    completesentences: 'Sentence Completion',
    sentencecompletions: 'Sentence Completion',
    arrangepassage: 'Sequence the Summary (legacy practice)',
    matchheading: 'Match the Heading',
    matchtheheading: 'Match the Heading',
    matchheadings: 'Match the Heading',
    matchingheadings: 'Match the Heading',
    matchingheading: 'Match the Heading',
  };
  if (labels[key.toLowerCase()]) return labels[key.toLowerCase()];
  const words = key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  return words;
}

/**
 * Reading practice: IELTS-style split-pane screen.
 * Left pane: Reading passage with centered title and continuous natural paragraphs.
 * Right pane: Question notes completion card with inline inputs and circled numbers.
 */
export default function ReadingPracticePanel({ initialTypeKey, mistakeId, exam, passageId }: ReadingPracticePanelProps) {
  const { user, activeExam: contextExam, refreshUser, setIsTutorOpen, setTutorContextPrompt, activeTestSession, setActiveTestSession } = useApp();
  const activeExam = exam ?? contextExam;
  const resolution = useMistakeResolution(mistakeId);
  const toast = useToast();

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

  const handleStart = useCallback(async () => {
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

      const dealtSet = await deal(targetId ?? '', mistakeId, passageId);
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

  const linked = firstAvailable(typeIdsFor(initialTypeKey), types);
  const targetTypeId = linked ?? currentTypeId ?? types[0]?.typeId;

  // Confirmation / Protection screen: Shown prior to starting.
  // Absolutely no database load or passage dealt until Start is clicked.
  if (!isSessionActive && !practice.checked) {
    if (isStarting || practice.dealing) {
      return <ReadingPracticeSkeleton />;
    }

    return (
      <div className="relative w-full min-h-[calc(100dvh-4rem)] bg-background">
        <PreTestBlurOverlay
          title={labelForTypeKey(initialTypeKey)}
          instructions="The passage and questions will appear after you start."
          subTestsRemaining={subTestsRemaining}
          isStarting={isStarting}
          onStart={handleStart}
        />
      </div>
    );
  }

  // Once started, while backend is dealing the set or starting session:
  if (practice.dealing || isStarting) {
    return <ReadingPracticeSkeleton />;
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

  return (
    <div data-practice-workspace className="relative w-full min-h-[calc(100dvh-4rem)] lg:h-[calc(100dvh-4rem)] p-0 m-0 flex flex-col bg-background lg:overflow-hidden">
      <div className="w-full flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="transition-all duration-300 flex-1 w-full px-0 py-1 flex flex-col lg:flex-row gap-1.5 min-h-0 overflow-hidden">
          {/* Left Pane: Reading Passage (Independent scroll only) */}
          {hasPassage && (
            <div className="w-full lg:w-1/2 lg:h-full min-h-0 flex flex-col lg:overflow-hidden">
              <PassageReader
                passage={set.passage!}
                scroll={true}
                passageNumber={1}
                questionRange={`Questions 1–${displayedQuestionCount || practice.totalQuestions}`}
                showLabels={displayedGroups.some((group: ReadingGroup) => needsParagraphLabels(group.typeId))}
              />
            </div>
          )}

          {/* Right Pane: Questions & Answer Cards (Independent scroll only) */}
          <div className={`w-full ${hasPassage ? 'lg:w-1/2' : 'lg:w-full'} lg:h-full min-h-0 flex flex-col lg:overflow-hidden`}>
            <div className="flex-1 min-h-0 lg:overflow-y-auto px-3 lg:pl-1 lg:pr-2 space-y-2 scrollbar-thin">
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
                <Card className="border-primary/40 border-r-0 rounded-r-none rounded-l-lg p-3 space-y-1.5 bg-card/60">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <CardTitle className="text-sm">
                      {practice.partsCorrect} of {practice.partsTotal} correct
                    </CardTitle>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {resolution.resolved ? 'Mistake resolved' : 'Anything you got wrong stays in your Mistake Bank.'}
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

              {practice.checked && mistakeId && practice.correctCount > 0 && !resolution.resolved ? (
                <Button disabled={resolution.saving} onClick={() => void resolution.finish(true)}>Retry saving resolution</Button>
              ) : practice.checked ? (
                <Button
                  onClick={handleStart}
                  className="font-bold gap-1.5 text-xs rounded-lg h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>{mistakeId ? 'Try again' : 'Another passage'}</span>
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
