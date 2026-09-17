import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import PreTestBlurOverlay from '@/components/practice/PreTestBlurOverlay';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  Mic,
  RefreshCw,
  Clock,
  Bot,
  AlertCircle,
  Award,
  Send,
  CheckCircle2,
  XCircle,
  Quote,
  ChevronDown,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import AudioRecorder from '@/components/practice/AudioRecorder';
import PromptAudio from '@/components/practice/PromptAudio';
import { AdminPageSkeleton, PracticePageSkeleton, ReadingPracticeSkeleton } from '@/components/layout/PageSkeleton';
import { Evaluation, isAdmin, isPremiumUser, PracticeAttempt, Question, SkillType } from '@/lib/types';

const ReadingPracticePanel = lazy(() => import('@/components/reading/ReadingPracticePanel'));
const ReadingMockPanel = lazy(() => import('@/components/reading/ReadingMockPanel'));
const SkillMockPanel = lazy(() => import('@/components/practice/SkillMockPanel'));
const PracticeMockPaywall = lazy(() => import('@/components/practice/PracticeMockPaywall'));
const AdminReadingAuthoring = lazy(() => import('@/components/admin/AdminReadingAuthoring'));
const AdminQuestionAuthoring = lazy(() => import('@/components/admin/AdminQuestionAuthoring'));
const PtePracticeHub = lazy(() => import('@/components/pte/PtePracticeHub'));
import { api, ApiError, errorMessage } from '@/lib/api';
import { encodeForUpload } from '@/lib/audio';
import { typeKey } from '@/lib/syllabus';
import { loadCompleted, saveCompleted, unlockedIndex } from '@/lib/practiceProgress';

const QUESTION_LIMIT = 200;
import { useToast } from '@/components/ui/toast';

const GRADING: Record<SkillType, 'deterministic' | 'ai' | 'speech'> = {
  reading: 'deterministic',
  listening: 'deterministic',
  writing: 'ai',
  speaking: 'speech',
};

interface SubmitResult {
  attempt?: PracticeAttempt;
  review?: Question;
  evaluation?: Evaluation;
  xpAwarded: number;
}

export default function PracticePage() {
  const { user, activeExam, refreshUser, setIsTutorOpen, setTutorContextPrompt } = useApp();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const skillParam = searchParams.get('skill') as SkillType | null;
  const selectedSkill: SkillType =
    skillParam && ['speaking', 'writing', 'reading', 'listening'].includes(skillParam)
      ? skillParam
      : 'reading';

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);

  const [textAnswer, setTextAnswer] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [blankResponses, setBlankResponses] = useState<Record<string, string>>({});
  const [recording, setRecording] = useState<Blob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [startedAt, setStartedAt] = useState<number>(() => Date.now());
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  const [startedTask, setStartedTask] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const startPending = useRef(false);
  const taskKey = currentQuestion ? `${activeExam}:${selectedSkill}:${currentQuestion.id}` : null;
  const latestTaskKey = useRef(taskKey);
  latestTaskKey.current = taskKey;
  const hasStarted = taskKey !== null && startedTask === taskKey;
  const subTestsRemaining = Math.max(0,
    (user?.subscription?.dailySubTestsLimit ?? 0) - (user?.subscription?.dailySubTestsUsed ?? 0),
  );

  const handleStart = async () => {
    if (!currentQuestion || !taskKey || hasStarted || startPending.current) return;
    startPending.current = true;
    setIsStarting(true);
    const startingKey = taskKey;
    try {
      await api.post('/practice/start', {
        exam: activeExam,
        skill: selectedSkill,
        questionId: currentQuestion.id,
      });
      // A response for a task left during the request must not unlock another task.
      if (latestTaskKey.current === startingKey) {
        setStartedTask(startingKey);
        setStartedAt(Date.now());
      }
      await refreshUser();
    } catch (err) {
      toast.error('Could not start practice', errorMessage(err));
    } finally {
      startPending.current = false;
      setIsStarting(false);
    }
  };

  const grading = GRADING[selectedSkill];

  const resetAnswer = useCallback(() => {
    setStartedTask(null);
    setResult(null);
    setTextAnswer('');
    setBlankResponses({});
    setSelectedOptions([]);
    setRecording(null);
    setStartedAt(Date.now());
  }, []);

  const isReading = selectedSkill === 'reading';
  const isAdminUser = isAdmin(user);
  const typeParam = searchParams.get('type');

  useEffect(() => {
    if (isReading || isAdminUser) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    resetAnswer();

    api
      .get<{ questions: Question[] }>('/questions', {
        exam: activeExam,
        skill: selectedSkill,
        limit: QUESTION_LIMIT,
      })
      .then(data => {
        if (cancelled) return;
        const all = data.questions ?? [];
        // A skill's bank holds every task type. The sidebar links to one type,
        // so the list has to be narrowed to it: when a subtask type is requested,
        // only show questions belonging to that subtask.
        const list = typeParam
          ? all.filter(question => typeKey(question.typeName) === typeParam)
          : all;
        const done = loadCompleted(activeExam, selectedSkill, typeParam);
        const known = done.filter(id => list.some(question => question.id === id));
        setCompletedIds(known);
        setQuestions(list);
        const isFreeNav = Boolean(
          `${typeParam || ''} ${list[0]?.typeName || ''}`.toLowerCase().match(/agree|disagree|describe/),
        );
        setCurrentQuestion(
          isFreeNav ? list[0] ?? null : list[unlockedIndex(list.map(q => q.id), new Set(known))] ?? null,
        );
      })
      .catch(err => {
        if (cancelled) return;
        setQuestions([]);
        setCurrentQuestion(null);
        setCompletedIds([]);
        toast.error('Could not load questions', errorMessage(err));
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [activeExam, selectedSkill, isReading, isAdminUser, typeParam, resetAnswer, toast]);

  const wordCount = textAnswer.trim().split(/\s+/).filter(Boolean).length;

  const markComplete = (questionId: string) => {
    if (completedIds.includes(questionId)) return;
    const next = [...completedIds, questionId];
    setCompletedIds(next);
    saveCompleted(activeExam, selectedSkill, typeParam, next);
  };

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !hasStarted || submitting) return;
    setSubmitting(true);

    const timeSpentSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));

    try {
      if (grading === 'speech') {
        if (!recording) return;

        let encoded;
        try {
          encoded = await encodeForUpload(recording);
        } catch {
          toast.error(
            'That recording could not be read',
            'Nothing was captured from your microphone. Please record your answer again.',
          );
          return;
        }

        const data = await api.post<{ evaluation: Evaluation; xpAwarded: number }>('/evaluations/speaking', {
          questionId: currentQuestion.id,
          audio: encoded.base64,
          format: encoded.format,
          durationSeconds: encoded.durationSeconds,
        });
        setResult({ evaluation: data.evaluation, xpAwarded: data.xpAwarded });
      } else if (grading === 'ai') {
        const data = await api.post<{ evaluation: Evaluation; xpAwarded: number }>('/evaluations/writing', {
          questionId: currentQuestion.id,
          text: textAnswer,
        });
        setResult({ evaluation: data.evaluation, xpAwarded: data.xpAwarded });
      } else {
        const data = await api.post<{ attempt: PracticeAttempt; review: Question; xpAwarded: number }>(
          '/practice/attempts',
          {
            questionId: currentQuestion.id,
            exam: activeExam,
            textResponse: textAnswer || undefined,
            selectedOptions: selectedOptions.length ? selectedOptions : undefined,
            blankResponses: Object.keys(blankResponses).length ? blankResponses : undefined,
            timeSpentSeconds,
          },
        );
        setResult({ attempt: data.attempt, review: data.review, xpAwarded: data.xpAwarded });
      }
      markComplete(currentQuestion.id);
      await refreshUser();
    } catch (err) {
      if (err instanceof ApiError && err.isAIUnavailable) {
        toast.error('Scoring is unavailable right now', 'Your answer was saved. Please try again in a few minutes.');
      } else if (err instanceof ApiError && err.isLimitReached) {
        toast.warning('Daily sub-test limit reached', errorMessage(err));
      } else {
        toast.error('Could not submit your answer', errorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAskAITutor = () => {
    if (!currentQuestion) return;
    setTutorContextPrompt(
      `Question: ${currentQuestion.title}\nTask type: ${currentQuestion.typeName}\nPrompt: ${currentQuestion.prompt}`,
    );
    setIsTutorOpen(true);
  };

  const canSubmit =
    grading === 'speech'
      ? recording !== null
      : textAnswer.trim().length > 0 ||
      selectedOptions.length > 0 ||
      Object.values(blankResponses).some(Boolean);

  const isAgreeOrDescribe = Boolean(
    `${currentQuestion?.typeName || ''} ${typeParam || ''}`.toLowerCase().match(/agree|disagree|describe/),
  );

  const currentIndex = currentQuestion ? questions.findIndex(q => q.id === currentQuestion.id) : -1;
  const unlocked = unlockedIndex(questions.map(q => q.id), new Set(completedIds));
  const isLast = currentIndex === questions.length - 1;
  const canGoNext = isAgreeOrDescribe
    ? !isLast
    : currentIndex >= 0 && currentIndex < unlocked && !isLast;

  const goToIndex = (index: number) => {
    const question = questions[index];
    if (!question) return;
    setCurrentQuestion(question);
    resetAnswer();
  };

  const restartSet = () => {
    setCompletedIds([]);
    saveCompleted(activeExam, selectedSkill, typeParam, []);
    goToIndex(0);
  };

  return (
    <div
      className={`w-full ${
        isReading && !isAdminUser
          ? 'h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] overflow-hidden'
          : 'min-h-[calc(100vh-4rem)]'
      } p-0 m-0 flex flex-col bg-background`}
    >
      {/* An admin has no reason to sit the paper. The reading section is where
          they add one instead. */}
      {isReading && isAdmin(user) ? (
        <Suspense fallback={<AdminPageSkeleton />}>
          <AdminReadingAuthoring />
        </Suspense>
      ) : searchParams.get('mock') && !isPremiumUser(user) ? (
        <Suspense fallback={<PracticePageSkeleton />}>
          <PracticeMockPaywall skill={selectedSkill} exam={activeExam} />
        </Suspense>
      ) : isReading && searchParams.get('mock') ? (
        <Suspense fallback={<ReadingPracticeSkeleton />}>
          <ReadingMockPanel key={activeExam} />
        </Suspense>
      ) : searchParams.get('mock') ? (
        <Suspense fallback={<PracticePageSkeleton />}>
          <SkillMockPanel key={`${activeExam}-${selectedSkill}`} skill={selectedSkill} exam={activeExam} />
        </Suspense>
      ) : isReading ? (
        <Suspense fallback={<ReadingPracticeSkeleton />}>
          <ReadingPracticePanel
            key={`${activeExam}-${selectedSkill}-${typeParam || 'default'}`}
            initialTypeKey={typeParam ?? undefined}
          />
        </Suspense>
      ) : isAdminUser ? (
        <Suspense fallback={<AdminPageSkeleton />}>
          <AdminQuestionAuthoring key={selectedSkill} skill={selectedSkill} />
        </Suspense>
      ) : loading ? (
        <PracticePageSkeleton />
      ) : activeExam === 'PTE' && (searchParams.get('hub') === '1' || !currentQuestion) ? (
        <Suspense fallback={<PracticePageSkeleton />}>
          <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <h1 className="text-2xl font-black font-display text-foreground">PTE Academic Practice Matrix</h1>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                  Official 23 task types across Speaking, Writing, Reading, and Listening with instant AI scoring.
                </p>
              </div>
            </div>
            <PtePracticeHub activeTypeKey={typeParam} />
          </div>
        </Suspense>
      ) : !currentQuestion ? (
        <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-8 text-center space-y-3 bg-card/20">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
          <h3 className="text-sm font-bold text-foreground">No {selectedSkill} questions for {activeExam} yet</h3>
          <p className="text-xs text-muted-foreground">Try another skill or switch exam.</p>
        </div>
      ) : !hasStarted ? (
        <div className="relative w-full min-h-[calc(100vh-4rem)]">
          <PreTestBlurOverlay
            title={currentQuestion.title}
            instructions="Starting uses 1 credit. Submitting your answer and retrying scoring use no additional credits."
            subTestsRemaining={subTestsRemaining}
            isStarting={isStarting}
            onStart={handleStart}
          />
        </div>
      ) : (
        <div className="w-full flex flex-col flex-1">
          {/* Unified Full-Width Workspace matching Reading layout */}
          <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-5 flex-1 flex flex-col justify-between">
            {/* Main Unified Card */}
            <Card className="p-5 sm:p-7 space-y-5 bg-card dark:bg-[#0f141f] border-border/80 shadow-md rounded-2xl">
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3.5">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-600 text-white font-extrabold text-[11px] uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
                    {currentQuestion.typeName}
                  </span>
                  {activeExam === 'PTE' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchParams({ hub: '1' })}
                      className="text-xs font-bold text-muted-foreground hover:text-foreground h-6 px-2"
                    >
                      <span>All PTE Tasks</span>
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Instructions */}
              {currentQuestion.prompt && (
                <p className="text-xs sm:text-[13px] text-muted-foreground font-medium leading-relaxed">
                  {currentQuestion.prompt}
                </p>
              )}

              {/* Question Navigation Pills for quick jump */}
              {!isAgreeOrDescribe && questions.length > 1 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                    {questions.map((q, idx) => {
                      const isCurrent = q.id === currentQuestion.id;
                      const isDone = completedIds.includes(q.id);
                      const isLocked = idx > unlocked;
                      return (
                        <button
                          key={q.id}
                          type="button"
                          disabled={isLocked}
                          onClick={() => goToIndex(idx)}
                          title={isLocked ? 'Answer the earlier questions first' : `Question ${idx + 1}`}
                          className={`h-6 min-w-6 px-2 text-[11px] font-mono font-bold rounded-md border transition-colors inline-flex items-center justify-center gap-1 ${
                            isCurrent
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : isLocked
                                ? 'bg-muted/40 text-muted-foreground/50 border-border/60 cursor-not-allowed'
                                : isDone
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted border-border'
                          }`}
                        >
                          {isLocked && <Lock className="w-2.5 h-2.5" />}
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Questions unlock one at a time — answer this one to move on.
                  </p>
                </div>
              )}

              {/* Inner Question & Interaction Container */}
              <div className="rounded-2xl p-5 sm:p-6 bg-card dark:bg-card/40 border border-border/80 space-y-4 shadow-xs">
                {currentQuestion.title && (
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-7 h-7 rounded-xl bg-primary/10 text-primary font-mono font-bold text-xs flex items-center justify-center border border-primary/20">
                      {currentIndex + 1}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-foreground leading-relaxed pt-0.5">
                      {currentQuestion.title}
                    </h3>
                  </div>
                )}

                {/* Every figure in the bank is drawn on the same 760x440 canvas, so
                    the frame is cut to that ratio (19:11) and sized from its own
                    width alone. That gives each question identical geometry rather
                    than a size that shifts with the window, and it reserves the
                    figure's footprint before the image loads so nothing below it
                    jumps. object-contain keeps the axis labels out of a crop. */}
                {currentQuestion.imageUrl && (
                  <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-white p-3 ring-1 ring-black/5 sm:p-4">
                    <div className="relative w-full" style={{ aspectRatio: '19 / 11' }}>
                      <img
                        src={currentQuestion.imageUrl}
                        alt={currentQuestion.title}
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-contain"
                      />
                    </div>
                  </div>
                )}

                <PromptAudio
                  audioUrl={currentQuestion.audioUrl}
                  audioTranscript={currentQuestion.audioTranscript}
                  title={currentQuestion.title}
                />

                {currentQuestion.contextPassage && (
                  <div className="p-4 rounded-xl bg-background border border-border text-xs sm:text-sm text-foreground leading-relaxed max-h-60 overflow-y-auto">
                    {currentQuestion.contextPassage}
                  </div>
                )}

                {/* Question Inputs */}
                {grading === 'speech' && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                      <Mic className="w-3.5 h-3.5 text-blue-600" />
                      <span>Your answer</span>
                    </div>
                    <AudioRecorder
                      key={currentQuestion.id}
                      prepSeconds={currentQuestion.prepTimeSeconds ?? 0}
                      maxSeconds={currentQuestion.timeLimitSeconds}
                      disabled={submitting || result !== null}
                      onRecorded={setRecording}
                    />
                  </div>
                )}

                {grading === 'ai' && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">Your response</span>
                      <Badge variant={wordCount >= 20 ? 'success' : 'warning'}>{wordCount} words</Badge>
                    </div>
                    <Textarea
                      rows={8}
                      value={textAnswer}
                      onChange={e => setTextAnswer(e.target.value)}
                      placeholder="Write your response here…"
                      className="text-sm leading-relaxed"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      At least 20 words so the evaluator has something to work with.
                    </p>
                  </div>
                )}

                {currentQuestion.options && currentQuestion.options.length > 0 && (
                  <div className="space-y-2.5 pt-2">
                    <h4 className="text-xs font-bold text-foreground">Choose your answer:</h4>
                    {currentQuestion.options.map(opt => {
                      const checked = selectedOptions.includes(opt.id);
                      return (
                        <label
                          key={opt.id}
                          className={`flex items-start gap-2.5 p-3.5 rounded-xl border cursor-pointer text-xs sm:text-sm transition-colors ${
                            checked ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e =>
                              setSelectedOptions(prev =>
                                e.target.checked ? [...prev, opt.id] : prev.filter(id => id !== opt.id),
                              )
                            }
                            className="mt-0.5 rounded border-input text-primary focus:ring-primary h-4 w-4"
                          />
                          <span className="text-foreground font-medium leading-relaxed">{opt.text}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {currentQuestion.blanks && currentQuestion.blanks.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold text-foreground">Fill each blank:</h4>
                    {currentQuestion.blanks.map((b, idx) => (
                      <div key={b.id} className="flex items-center justify-between gap-3 p-3 bg-card rounded-xl border border-border text-xs sm:text-sm">
                        <span className="font-bold text-primary shrink-0">Blank {idx + 1}:</span>
                        {b.options && b.options.length > 0 ? (
                          <div className="relative inline-flex items-center group">
                            <select
                              value={blankResponses[b.id] || ''}
                              onChange={e => setBlankResponses({ ...blankResponses, [b.id]: e.target.value })}
                              className="appearance-none pr-8 pl-3 py-1.5 rounded-lg border border-input bg-background hover:border-primary/50 text-xs sm:text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-2xs cursor-pointer transition-all"
                            >
                              <option value="">— Select —</option>
                              {b.options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 pointer-events-none text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        ) : (
                          <input
                            value={blankResponses[b.id] || ''}
                            onChange={e => setBlankResponses({ ...blankResponses, [b.id]: e.target.value })}
                            className="bg-background border border-border text-xs sm:text-sm font-medium text-foreground px-3 py-1.5 rounded-lg focus:outline-none focus:border-primary"
                            placeholder="Type your answer"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Deterministic Attempt Result */}
              {result?.attempt && (
                <Card className="border-primary/40 p-6 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {result.attempt.isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-500" />
                      )}
                      <CardTitle className="text-base">
                        {result.attempt.isCorrect ? 'Correct' : 'Not quite'}
                      </CardTitle>
                    </div>
                    {result.xpAwarded > 0 && <Badge variant="warning">+{result.xpAwarded} XP</Badge>}
                  </div>

                  <div className="bg-background p-4 rounded-xl border border-border text-center space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Score</span>
                    <div className="font-display text-4xl font-black text-foreground">
                      {result.attempt.score}
                      <span className="text-xs text-muted-foreground font-bold"> / {result.attempt.maxScore}</span>
                    </div>
                    <p className="text-xs text-foreground pt-1">{result.attempt.feedback}</p>
                  </div>

                  {result.review?.explanation && (
                    <div className="p-3.5 rounded-xl bg-background border border-border space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Explanation</span>
                      <p className="text-xs text-foreground leading-relaxed">{result.review.explanation}</p>
                    </div>
                  )}
                </Card>
              )}

              {/* AI Evaluation Result */}
              {result?.evaluation && (
                <Card className="border-primary/40 p-6 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-400" />
                      <CardTitle className="text-base">Evaluation</CardTitle>
                    </div>
                    {result.xpAwarded > 0 && <Badge variant="warning">+{result.xpAwarded} XP</Badge>}
                  </div>

                  <div className="bg-background p-4 rounded-xl border border-border text-center space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Practice estimate</span>
                    <div className="font-display text-4xl font-black text-foreground">
                      {result.evaluation.estimatedScore ?? '—'}
                    </div>
                    <p className="text-xs text-foreground pt-1">{result.evaluation.summary}</p>
                  </div>

                  {result.evaluation.skill === 'speaking' && (
                    <div className="p-3.5 rounded-xl bg-background border border-border space-y-1.5">
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
                        <Quote className="w-3 h-3" /> What we heard
                      </span>
                      {result.evaluation.transcript ? (
                        <p className="text-xs text-foreground italic leading-relaxed">
                          &ldquo;{result.evaluation.transcript}&rdquo;
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          No speech could be made out in that recording, so there is no score for it.
                          Check your microphone and record the answer again.
                        </p>
                      )}
                    </div>
                  )}

                  {result.evaluation.criteria.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Rubric</span>
                      {result.evaluation.criteria.map(c => (
                        <div key={c.name} className="p-2.5 rounded-lg bg-background border border-border text-xs space-y-1">
                          <div className="flex justify-between font-bold text-foreground">
                            <span>{c.name}</span>
                            <span className="text-primary">{c.score}/{c.maxScore}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{c.feedback}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}
            </Card>

            {/* Bottom Action Bar */}
            <div className="w-full flex flex-wrap items-center justify-between gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAskAITutor}
                className="gap-2 font-bold text-xs rounded-xl h-10 px-4"
              >
                <Bot className="w-4 h-4 text-primary" />
                <span>Ask AI Coach</span>
              </Button>

              {result && isLast ? (
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    You have finished every question here
                  </span>
                  <Button
                    variant="outline"
                    size="default"
                    onClick={restartSet}
                    className="font-bold gap-2 text-xs rounded-xl h-10 px-5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Start over</span>
                  </Button>
                </div>
              ) : result ? (
                <Button
                  onClick={() => goToIndex(currentIndex + 1)}
                  size="default"
                  className="font-bold gap-2 text-xs rounded-xl h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  <span>Next question</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={submitting || !canSubmit}
                  size="default"
                  className="font-bold gap-2 text-xs rounded-xl h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>
                        {grading === 'speech'
                          ? 'Listening to your answer…'
                          : grading === 'ai'
                            ? 'Evaluating…'
                            : 'Checking…'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>{grading === 'speech' ? 'Submit recording' : 'Submit Answer'}</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
