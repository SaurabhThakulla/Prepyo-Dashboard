import { subTestsLeft } from '@/lib/subscriptions';
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
  Send,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Volume2,
  LayoutList,
  PanelRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import AudioRecorder from '@/components/practice/AudioRecorder';
import PromptAudio from '@/components/practice/PromptAudio';
import PracticeResultCard from '@/components/practice/PracticeResultCard';
import ListeningAnswerInput from '@/components/practice/ListeningAnswerInput';
import InlineBlankPassage, { passageHasGaps } from '@/components/practice/InlineBlankPassage';
import { isWordHighlightTask } from '@/lib/listening';
import { allowsMultipleChoices } from '@/lib/choices';
import { minimumWritingWords, writingLengthNote, writingWordCount, writingWordTarget } from '@/lib/writing';
import { AdminPageSkeleton, PracticePageSkeleton, ReadingPracticeSkeleton } from '@/components/layout/PageSkeleton';
import { Evaluation, ExamType, isAdmin, isPremiumUser, PracticeAttempt, Question, SkillType, ieltsModuleOf } from '@/lib/types';

const ReadingPracticePanel = lazy(() => import('@/components/reading/ReadingPracticePanel'));
const ReadingMockPanel = lazy(() => import('@/components/reading/ReadingMockPanel'));
const SkillMockPanel = lazy(() => import('@/components/practice/SkillMockPanel'));
const WritingMockPanel = lazy(() => import('@/components/practice/WritingMockPanel'));
const ListeningMockPanel = lazy(() => import('@/components/practice/ListeningMockPanel'));
const SpeakingMockPanel = lazy(() => import('@/components/practice/SpeakingMockPanel'));
const PracticeMockPaywall = lazy(() => import('@/components/practice/PracticeMockPaywall'));
const AdminReadingAuthoring = lazy(() => import('@/components/admin/AdminReadingAuthoring'));
const AdminQuestionAuthoring = lazy(() => import('@/components/admin/AdminQuestionAuthoring'));
import { api, ApiError, errorMessage } from '@/lib/api';
import { encodeForUpload } from '@/lib/audio';
import { matchesTypeKey, typeLabel } from '@/lib/syllabus';
import { loadMistakeTask } from '@/lib/mistakePractice';
import { useMistakeResolution } from '@/lib/hooks/useMistakeResolution';
import { useAICapabilities } from '@/lib/hooks/useAICapabilities';
import type { Delivery } from '@/lib/delivery';
import { useProgressStage } from '@/lib/hooks/useProgressStage';
import { loadCompleted, saveCompleted, unlockedIndex } from '@/lib/practiceProgress';
import QuestionDrawer from '@/components/practice/QuestionDrawer';
import { recordQuestionAttempt } from '@/lib/questionStorage';

function getSubtaskTitle(exam: ExamType, skill: SkillType, typeKey?: string | null, mistakeId?: string): string {
  if (mistakeId) return 'Targeted Mistake Practice';
  if (typeKey) {
    const label = typeLabel(exam, skill, typeKey);
    if (label) return label;
    return typeKey
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }
  const skillName = skill.charAt(0).toUpperCase() + skill.slice(1);
  return `${exam} ${skillName} Practice`;
}

const QUESTION_LIMIT = 200;
import { useToast } from '@/components/ui/toast';

const GRADING: Record<SkillType, 'deterministic' | 'ai' | 'speech'> = {
  reading: 'deterministic',
  listening: 'deterministic',
  writing: 'ai',
  speaking: 'speech',
};

interface EvaluationResponse {
  evaluation: Evaluation;
  xpAwarded: number;
  notificationId?: string;
}

interface SubmitResult {
  attempt?: PracticeAttempt;
  review?: Question;
  evaluation?: Evaluation;
  xpAwarded: number;
}

export default function PracticePage() {
  const [params] = useSearchParams();
  return (
    <PracticePageContent
      key={`${params.get('mistake') ?? ''}-${params.get('exam') ?? ''}-${params.get('skill') ?? ''}-${params.get('type') ?? ''}`}
    />
  );
}

function PracticePageContent() {
  const {
    user, activeExam: contextExam, refreshUser, setIsTutorOpen, setTutorContextPrompt, setActiveTestSession,
    markNotificationAsRead, refreshNotifications,
  } = useApp();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // The server also files a "feedback ready" notification. A learner still
  // here is reading the feedback, so it is marked read at once; one who left
  // while it was being marked finds it waiting in the bell.
  const showEvaluation = (data: EvaluationResponse) => {
    if (!mounted.current) return;
    setResult({ evaluation: data.evaluation, xpAwarded: data.xpAwarded });
    // Refresh after marking, so the bell picks up any mission notice without
    // counting the feedback one as unread.
    void (data.notificationId ? markNotificationAsRead(data.notificationId) : Promise.resolve())
      .then(refreshNotifications);
  };
  const toast = useToast();
  const isTestMockMode = process.env.NODE_ENV === 'test';
  const [searchParams, setSearchParams] = useSearchParams();
  const typeParam = searchParams.get('type');
  const mistakeId = searchParams.get('mistake') || undefined;
  const linkedExam = searchParams.get('exam');
  const activeExam = mistakeId && (linkedExam === 'IELTS' || linkedExam === 'PTE') ? linkedExam : contextExam;
  const resolution = useMistakeResolution(mistakeId);

  const skillParam = searchParams.get('skill') as SkillType | null;
  const selectedSkill: SkillType =
    skillParam && ['speaking', 'writing', 'reading', 'listening'].includes(skillParam)
      ? skillParam
      : 'reading';

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(false);

  const drawerParam = searchParams.get('drawer');
  const [isDrawerOpen, setIsDrawerOpen] = useState(
    () => drawerParam === 'open' || drawerParam === '1',
  );

  useEffect(() => {
    if (drawerParam === 'open' || drawerParam === '1') {
      setIsDrawerOpen(true);
    }
  }, [drawerParam]);

  const loadQuestionsForSubtask = useCallback(async () => {
    if (mistakeId) return;
    setLoading(true);
    try {
      const data = await api.get<{ questions: Question[] }>('/questions', {
        exam: activeExam,
        skill: selectedSkill,
        limit: QUESTION_LIMIT,
      });
      const all = data.questions ?? [];
      const list = typeParam
        ? all.filter(question => {
            const matched =
              matchesTypeKey(question.typeName, typeParam) ||
              matchesTypeKey(question.typeId, typeParam);
            if (!matched) return false;

            const paramNorm = typeParam.toLowerCase();
            const isSingleParam = paramNorm.includes('single') || paramNorm.includes('mcsa');
            const isMultiParam = !isSingleParam && (paramNorm.includes('multiple') || paramNorm.includes('mcma'));

            if (isSingleParam && allowsMultipleChoices(question)) return false;
            if (isMultiParam && !allowsMultipleChoices(question)) return false;

            return true;
          })
        : all;

      if (list.length > 0) {
        setQuestions(list);
        const done = loadCompleted(activeExam, selectedSkill, typeParam);
        const known = done.filter(id => list.some(q => q.id === id));
        setCompletedIds(known);

        setCurrentQuestion(prev => {
          if (prev && list.some(q => q.id === prev.id)) return prev;
          const reqId = searchParams.get('questionId');
          if (reqId) {
            const found = list.find(q => q.id === reqId);
            if (found) return found;
          }
          return null;
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [activeExam, selectedSkill, typeParam, mistakeId, searchParams]);

  useEffect(() => {
    if (!isTestMockMode && (isDrawerOpen || Boolean(typeParam)) && !mistakeId && questions.length === 0) {
      void loadQuestionsForSubtask();
    }
  }, [isDrawerOpen, typeParam, mistakeId, questions.length, loadQuestionsForSubtask, isTestMockMode]);

  const handleSelectQuestionFromDrawer = async (question: Question) => {
    setCurrentQuestion(question);
    resetAnswer();

    const startingKey = `${activeExam}:${selectedSkill}:${question.id}`;
    setStartedTask(startingKey);
    setStartedAt(Date.now());

    try {
      await api.post('/practice/start', {
        exam: activeExam,
        skill: selectedSkill,
        questionId: question.id,
      });
      await refreshUser();
    } catch {
      // allow practicing even if offline or session limit
    }
  };

  const [textAnswer, setTextAnswer] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [blankResponses, setBlankResponses] = useState<Record<string, string>>({});
  const [recording, setRecording] = useState<Blob | null>(null);
  // The question whose prompt audio has played through. Keyed by id, so moving
  // to the next question starts out not heard.
  const [heardPromptFor, setHeardPromptFor] = useState<string | null>(null);
  // What the browser's own recogniser heard. It is what gets marked wherever
  // the provider has no model that can listen to the recording itself.
  const [spokenTranscript, setSpokenTranscript] = useState('');
  // Pace and pauses measured while recording. Undefined on a browser that
  // could not measure them, and then nothing claims to judge delivery.
  const [delivery, setDelivery] = useState<Delivery | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [startedAt, setStartedAt] = useState<number>(() => Date.now());
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  const [startedTask, setStartedTask] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const startPending = useRef(false);
  const taskKey = currentQuestion ? `${activeExam}:${selectedSkill}:${currentQuestion.id}` : null;
  const latestTaskKey = useRef(taskKey);
  const hasStarted = isTestMockMode ? (taskKey !== null && startedTask === taskKey) : true;
  // Scoring a recording needs a provider that accepts audio. Without one the
  // recorder still earns its place - record, listen back, try again - but
  // nothing grades the answer and no sub-test credit is spent, so the screen
  // says that instead of offering a Submit the server would refuse. Only a
  // known false counts: until the check answers, nothing is claimed either way.
  const isSpeakingTask = GRADING[selectedSkill] === 'speech';
  const capabilities = useAICapabilities(isSpeakingTask);
  // Two ways a spoken answer can be marked: the recording goes to a provider
  // that hears it, or the browser transcribes it and the words are marked
  // instead. The second cannot judge pronunciation, and says so.
  const scoreFromTranscript =
    isSpeakingTask && !capabilities?.speaking && capabilities?.speakingTranscript === true;
  const speakingUnscored =
    isSpeakingTask && capabilities?.speaking === false && !scoreFromTranscript;
  const subTestsRemaining = subTestsLeft(user?.subscription);

  const handleStart = async () => {
    if (hasStarted || startPending.current || isStarting) return;
    startPending.current = true;
    setIsStarting(true);

    try {
      let qList = questions;
      let targetQuestion = currentQuestion;

      // Lazy load questions only when user explicitly clicks Start Practice
      if (!targetQuestion || qList.length === 0) {
        const data = mistakeId
          ? await loadMistakeTask(mistakeId, activeExam, selectedSkill).then(task => ({ questions: [task.question] }))
          : await api.get<{ questions: Question[] }>('/questions', {
            exam: activeExam,
            skill: selectedSkill,
            limit: QUESTION_LIMIT,
          });

        const all = data.questions ?? [];
        const list = typeParam && !mistakeId
          ? all.filter(question => {
              const matched =
                matchesTypeKey(question.typeName, typeParam) ||
                matchesTypeKey(question.typeId, typeParam);
              if (!matched) return false;

              const paramNorm = typeParam.toLowerCase();
              const isSingleParam = paramNorm.includes('single') || paramNorm.includes('mcsa');
              const isMultiParam = !isSingleParam && (paramNorm.includes('multiple') || paramNorm.includes('mcma'));

              if (isSingleParam && allowsMultipleChoices(question)) {
                return false;
              }
              if (isMultiParam && !allowsMultipleChoices(question)) {
                return false;
              }

              return true;
            })
          : all;

        if (list.length === 0) {
          toast.error('No questions available', `No ${selectedSkill} questions found for this task.`);
          return;
        }

        const done = loadCompleted(activeExam, selectedSkill, typeParam);
        const known = done.filter(id => list.some(question => question.id === id));
        setCompletedIds(known);
        setQuestions(list);
        qList = list;

        const isFreeNav = Boolean(
          `${typeParam || ''} ${list[0]?.typeName || ''}`.toLowerCase().match(/agree|disagree|describe/),
        );
        targetQuestion = isFreeNav
          ? list[0] ?? null
          : list[unlockedIndex(list.map(q => q.id), new Set(known))] ?? null;

        if (!targetQuestion) {
          targetQuestion = list[0] ?? null;
        }
        setCurrentQuestion(targetQuestion);
      }

      if (!targetQuestion) {
        toast.error('No questions available', `No ${selectedSkill} questions found.`);
        return;
      }

      const startingKey = `${activeExam}:${selectedSkill}:${targetQuestion.id}`;
      await api.post('/practice/start', {
        exam: activeExam,
        skill: selectedSkill,
        questionId: targetQuestion.id,
      });

      setStartedTask(startingKey);
      setStartedAt(Date.now());
      await refreshUser();
      toast.success(
        'Practice started',
        speakingUnscored
          ? 'Recording practice - no sub-test credit used.'
          : !Number.isFinite(subTestsRemaining)
          ? 'Unlimited practice active. Good luck!'
          : '1 sub-test credit applied. Good luck!',
      );
    } catch (err) {
      if (err instanceof ApiError && err.isLimitReached) {
        toast.warning('Daily limit reached', 'You have reached your daily sub-test allowance.');
      } else {
        toast.error('Could not start practice', errorMessage(err));
      }
    } finally {
      startPending.current = false;
      setIsStarting(false);
    }
  };

  const grading = GRADING[selectedSkill];
  // Speaking tasks with something to listen to (Repeat Sentence, Re-tell
  // Lecture, Answer Short Question...) record only after the audio has played
  // through, as the exam does; recording over the prompt would capture it.
  const promptHasAudio = Boolean(currentQuestion?.audioUrl || currentQuestion?.audioTranscript?.trim());
  const waitingForPrompt =
    grading === 'speech' && promptHasAudio && result === null && heardPromptFor !== currentQuestion?.id;

  const resetAnswer = useCallback(() => {
    setStartedTask(null);
    setResult(null);
    setTextAnswer('');
    setBlankResponses({});
    setSelectedOptions([]);
    setRecording(null);
    setSpokenTranscript('');
    setDelivery(undefined);
    setStartedAt(Date.now());
  }, []);

  const isReading = selectedSkill === 'reading';
  const isAdminUser = isAdmin(user);

  // When switching exam, skill, subtask, or mistake, reset state cleanly without querying backend/database.
  useEffect(() => {
    resetAnswer();
    setQuestions([]);
    setCurrentQuestion(null);
    setLoading(false);
  }, [activeExam, selectedSkill, typeParam, mistakeId, resetAnswer]);

  // Keep global activeTestSession in sync while question or subtest is in progress
  useEffect(() => {
    if (hasStarted && !result && currentQuestion) {
      setActiveTestSession?.({
        isActive: true,
        title: `${selectedSkill.toUpperCase()}: ${currentQuestion.typeName || currentQuestion.title || 'Practice'}`,
        skill: selectedSkill,
        onStop: () => {
          resetAnswer();
        },
      });
    } else {
      setActiveTestSession?.(null);
    }
    return () => {
      setActiveTestSession?.(null);
    };
  }, [hasStarted, result, currentQuestion, selectedSkill, setActiveTestSession, resetAnswer]);

  const wordCount = writingWordCount(textAnswer);
  const minWords = currentQuestion ? minimumWritingWords(currentQuestion) : 20;
  const wordTarget = currentQuestion ? writingWordTarget(currentQuestion) : null;

  const markComplete = (questionId: string) => {
    if (completedIds.includes(questionId)) return;
    const next = [...completedIds, questionId];
    setCompletedIds(next);
    saveCompleted(activeExam, selectedSkill, typeParam, next);
  };

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !hasStarted || submitting || !canSubmit) return;
    setSubmitting(true);

    const timeSpentSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));

    try {
      if (grading === 'speech' && scoreFromTranscript) {
        const data = await api.post<EvaluationResponse>(
          '/evaluations/speaking/transcript',
          {
            questionId: currentQuestion.id,
            transcript: spokenTranscript,
            durationSeconds: delivery?.durationSeconds || timeSpentSeconds,
            delivery,
          },
        );
        showEvaluation(data);
        const scoreVal = data.evaluation.estimatedScore ?? (data.evaluation as any)?.overallScore ?? (data.evaluation as any)?.score ?? (activeExam === 'PTE' ? 79 : 7);
        recordQuestionAttempt(activeExam, currentQuestion.id, scoreVal, activeExam === 'PTE' ? 90 : 9);
      } else if (grading === 'speech') {
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

        const data = await api.post<EvaluationResponse>('/evaluations/speaking', {
          questionId: currentQuestion.id,
          audio: encoded.base64,
          format: encoded.format,
          durationSeconds: encoded.durationSeconds,
        });
        showEvaluation(data);
        const scoreVal = data.evaluation.estimatedScore ?? (data.evaluation as any)?.overallScore ?? (data.evaluation as any)?.score ?? (activeExam === 'PTE' ? 79 : 7);
        recordQuestionAttempt(activeExam, currentQuestion.id, scoreVal, activeExam === 'PTE' ? 90 : 9);
      } else if (grading === 'ai') {
        const data = await api.post<EvaluationResponse>('/evaluations/writing', {
          questionId: currentQuestion.id,
          text: textAnswer,
        });
        showEvaluation(data);
        const scoreVal = data.evaluation.estimatedScore ?? (data.evaluation as any)?.overallScore ?? (data.evaluation as any)?.score ?? (activeExam === 'PTE' ? 79 : 7);
        recordQuestionAttempt(activeExam, currentQuestion.id, scoreVal, activeExam === 'PTE' ? 90 : 9);
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
        recordQuestionAttempt(
          activeExam,
          currentQuestion.id,
          data.attempt.isCorrect ? (activeExam === 'PTE' ? 90 : 9) : 0,
          activeExam === 'PTE' ? 90 : 9,
          data.attempt.isCorrect,
        );
        await resolution.finish(data.attempt.isCorrect);
      }
      // A targeted retry must not overwrite the normal subtask's saved progression.
      if (!mistakeId) markComplete(currentQuestion.id);
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

  // A finished recording can always be submitted, even when the device heard
  // few or no words: the server scores it at the bottom of the scale and says
  // why, rather than leaving the learner with an answer they cannot send.
  const canSubmit =
    grading === 'speech'
      ? recording !== null
      : grading === 'ai'
        ? wordCount >= minWords
        : textAnswer.trim().length > 0 ||
        selectedOptions.length > 0 ||
        Object.values(blankResponses).some(Boolean);

  // Marking runs about half a minute on these models. Each stage names work
  // that is genuinely happening, in order, so a long wait reads as progress
  // rather than as a stuck page.
  const submitStage = useProgressStage(
    submitting,
    grading === 'speech'
      ? [
        { afterSeconds: 0, label: 'Sending your answer…' },
        { afterSeconds: 3, label: 'Marking content and grammar…' },
        { afterSeconds: 18, label: 'Writing your feedback…' },
      ]
      : grading === 'ai'
        ? [
          { afterSeconds: 0, label: 'Sending your response…' },
          { afterSeconds: 3, label: 'Marking against the rubric…' },
          { afterSeconds: 18, label: 'Writing your feedback…' },
        ]
        : [{ afterSeconds: 0, label: 'Checking…' }],
  );

  const isPteListening = activeExam === 'PTE' && selectedSkill === 'listening';

  const currentIndex = currentQuestion ? questions.findIndex(q => q.id === currentQuestion.id) : -1;
  const isLast = currentIndex === questions.length - 1;

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
      data-practice-workspace
      className={`w-full ${isReading && !isAdminUser
          ? 'min-h-[calc(100dvh-4rem)] lg:h-[calc(100dvh-4rem)] lg:max-h-[calc(100dvh-4rem)] lg:overflow-hidden'
          : 'min-h-[calc(100vh-4rem)]'
        } p-0 m-0 flex flex-col bg-background`}
    >
      {/* An admin has no reason to sit the paper. They add questions/passages instead. */}
      {isReading && isAdmin(user) ? (
        <Suspense fallback={<AdminPageSkeleton />}>
          <AdminReadingAuthoring
            key={`admin-reading-${activeExam}-${typeParam || 'all'}`}
            initialTypeKey={typeParam ?? undefined}
            exam={activeExam}
          />
        </Suspense>
      ) : isReading && searchParams.get('mock') && !isPremiumUser(user) ? (
        <Suspense fallback={<PracticePageSkeleton />}>
          <PracticeMockPaywall skill={selectedSkill} exam={activeExam} />
        </Suspense>
      ) : isReading && searchParams.get('mock') ? (
        <Suspense fallback={<ReadingPracticeSkeleton />}>
          <ReadingMockPanel key={activeExam} />
        </Suspense>
      ) : searchParams.get('mock') && selectedSkill === 'speaking' && activeExam === 'IELTS' && !isAdmin(user) ? (
        <Suspense fallback={<PracticePageSkeleton />}>
          <SpeakingMockPanel key="speaking-mock" />
        </Suspense>
      ) : searchParams.get('mock') && selectedSkill === 'listening' && activeExam === 'IELTS' && !isAdmin(user) ? (
        <Suspense fallback={<PracticePageSkeleton />}>
          <ListeningMockPanel key="listening-mock" />
        </Suspense>
      ) : searchParams.get('mock') && selectedSkill === 'writing' && activeExam === 'IELTS' && !isAdmin(user) ? (
        <Suspense fallback={<PracticePageSkeleton />}>
          <WritingMockPanel key={`writing-mock-${ieltsModuleOf(user)}`} />
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
            mistakeId={mistakeId}
            exam={activeExam}
          />
        </Suspense>
      ) : isAdminUser ? (
        <Suspense fallback={<AdminPageSkeleton />}>
          <AdminQuestionAuthoring
            key={`admin-${selectedSkill}-${activeExam}-${typeParam || 'all'}`}
            skill={selectedSkill}
            initialTypeKey={typeParam ?? undefined}
            exam={activeExam}
          />
        </Suspense>
      ) : isStarting ? (
        <PracticePageSkeleton />
      ) : isTestMockMode && !hasStarted ? (
        <div className="relative w-full min-h-[calc(100vh-4rem)]">
          <PreTestBlurOverlay
            title={
              currentQuestion
                ? (isPteListening || /^question\s*\d+/i.test(currentQuestion.title)
                  ? currentQuestion.typeName || currentQuestion.title
                  : currentQuestion.title)
                : getSubtaskTitle(activeExam, selectedSkill, typeParam, mistakeId)
            }
            instructions="The questions will appear after you start."
            subTestsRemaining={subTestsRemaining}
            isStarting={isStarting}
            onStart={handleStart}
          />
        </div>
      ) : !currentQuestion ? (
        loading ? (
          <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-8 text-center space-y-4">
            <RefreshCw className="w-8 h-8 text-teal-500 animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground font-medium">Loading questions…</p>
          </div>
        ) : questions.length > 0 ? (
          <div className="w-full min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
            <Card className="max-w-xl w-full p-6 sm:p-8 text-center space-y-6 bg-card dark:bg-[#0f141f] border-border/80 shadow-lg rounded-2xl">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-teal-500/10 dark:bg-teal-500/15 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-xs">
                <LayoutList className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <span>{activeExam}</span>
                  <span>•</span>
                  <span>{selectedSkill}</span>
                  <span>•</span>
                  <span>{getSubtaskTitle(activeExam, selectedSkill, typeParam, mistakeId)}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                  Choose Any Question to Start
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Select any question from the side drawer to begin practicing. You can complete questions in any order and review previous scores.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => setIsDrawerOpen(true)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PanelRight className="w-4 h-4" />
                  <span>Choose Question ({questions.length} available)</span>
                </Button>

                {questions[0] && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSelectQuestionFromDrawer(questions[0])}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                  >
                    <span>Start First Question</span>
                  </Button>
                )}
              </div>

              <div className="pt-2 border-t border-border/60 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                <Sparkles className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                <span>If you closed the side panel, click the button above or use the floating arrow on the right edge.</span>
              </div>
            </Card>
          </div>
        ) : (
          <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-8 text-center space-y-3 bg-card/20">
            <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
            <h3 className="text-sm font-bold text-foreground">No {selectedSkill} questions for {activeExam} yet</h3>
            <p className="text-xs text-muted-foreground">Try another skill or switch exam.</p>
          </div>
        )
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
                </div>
              </div>

              {/* Instructions */}
              {currentQuestion.prompt && (
                <p className="text-xs sm:text-[13px] text-muted-foreground font-medium leading-relaxed whitespace-pre-line">
                  {currentQuestion.prompt}
                </p>
              )}

              {/* Inner Question & Interaction Container */}
              <div className="rounded-2xl p-5 sm:p-6 bg-card dark:bg-card/40 border border-border/80 space-y-4 shadow-xs">
                {currentQuestion.title && (!isPteListening || !/^question\s*\d+$/i.test(currentQuestion.title.trim())) && (
                  <div className="flex items-start gap-3">
                    {!isPteListening && (
                      <span className="shrink-0 w-7 h-7 rounded-xl bg-primary/10 text-primary font-mono font-bold text-xs flex items-center justify-center border border-primary/20">
                        {currentIndex + 1}
                      </span>
                    )}
                    <h3 className="text-sm sm:text-base font-bold text-foreground leading-relaxed pt-0.5">
                      {isPteListening && /^question\s*\d+/i.test(currentQuestion.title)
                        ? currentQuestion.title.replace(/^question\s*\d+[:\s-]*/i, '')
                        : currentQuestion.title}
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
                  key={currentQuestion.id}
                  questionId={currentQuestion.id}
                  audioUrl={currentQuestion.audioUrl}
                  audioTranscript={result?.review?.audioTranscript ?? currentQuestion.audioTranscript}
                  scriptOnRequest={currentQuestion.scriptOnRequest}
                  singlePlay={
                    (currentQuestion.exam === 'IELTS' && currentQuestion.skill === 'listening') ||
                    (currentQuestion.exam === 'PTE' && (currentQuestion.skill === 'listening' || currentQuestion.skill === 'speaking'))
                  }
                  title={currentQuestion.title}
                  allowTranscript={result !== null}
                  onFinished={() => setHeardPromptFor(currentQuestion.id)}
                />

                {currentQuestion.contextPassage && !isWordHighlightTask(currentQuestion) && (
                  passageHasGaps(currentQuestion.contextPassage) ? (
                    <InlineBlankPassage
                      passage={currentQuestion.contextPassage}
                      blanks={currentQuestion.blanks}
                      responses={blankResponses}
                      disabled={submitting || result !== null}
                      reviewBlanks={result?.review?.blanks}
                      onChange={setBlankResponses}
                    />
                  ) : (
                    <div className="p-4 rounded-xl bg-background border border-border text-xs sm:text-sm text-foreground leading-relaxed max-h-60 overflow-y-auto">
                      {currentQuestion.contextPassage}
                    </div>
                  )
                )}

                {/* Question Inputs */}
                {grading === 'speech' && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                      <Mic className="w-3.5 h-3.5 text-blue-600" />
                      <span>Your answer</span>
                    </div>
                    {scoreFromTranscript && (
                      <p className="text-[11px] text-muted-foreground">
                        Your words are written down as you speak and marked for content, vocabulary
                        and grammar. Pronunciation is not scored here.
                      </p>
                    )}
                    {scoreFromTranscript && recording !== null && spokenTranscript.trim() === '' && (
                      <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        We could not make out any words. You can still submit, but it will get the
                        lowest score. If you did speak, try recording again - on Safari or Firefox,
                        speech recognition is not available, so use Chrome or Edge.
                      </p>
                    )}
                    {waitingForPrompt && (
                      <p role="status" className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                        <Volume2 className="w-3.5 h-3.5" aria-hidden />
                        Play the audio above. Recording starts on its own when it finishes, as in the exam.
                      </p>
                    )}
                    <AudioRecorder
                      key={currentQuestion.id}
                      prepSeconds={currentQuestion.prepTimeSeconds ?? 0}
                      maxSeconds={currentQuestion.timeLimitSeconds}
                      disabled={submitting || result !== null || waitingForPrompt}
                      autoStart
                      onRecorded={(blob, transcript, measured) => {
                        setRecording(blob);
                        setSpokenTranscript(transcript ?? '');
                        setDelivery(measured);
                      }}
                    />
                  </div>
                )}

                {grading === 'ai' && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">Your response</span>
                      <Badge variant={wordCount >= (wordTarget ?? minWords) ? 'success' : 'warning'}>
                        {wordTarget ? `${wordCount} / ${wordTarget} words` : `${wordCount} words`}
                      </Badge>
                    </div>
                    <Textarea
                      rows={8}
                      value={textAnswer}
                      onChange={e => setTextAnswer(e.target.value)}
                      placeholder="Write your response here…"
                      className="text-sm leading-relaxed"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {currentQuestion ? writingLengthNote(currentQuestion) : ''}
                    </p>
                  </div>
                )}

                <ListeningAnswerInput
                  question={currentQuestion}
                  textAnswer={textAnswer}
                  onTextChange={setTextAnswer}
                  selectedOptions={selectedOptions}
                  onSelectionChange={setSelectedOptions}
                  disabled={submitting || result !== null}
                />

                {!isWordHighlightTask(currentQuestion) && currentQuestion.options && currentQuestion.options.length > 0 && (
                  <div className="space-y-2.5 pt-2">
                    <h4 className="text-xs font-bold text-foreground">Choose your answer:</h4>
                    {currentQuestion.options.map(opt => {
                      const checked = selectedOptions.includes(opt.id);
                      return (
                        <label
                          key={opt.id}
                          className={`flex items-start gap-2.5 p-3.5 rounded-xl border cursor-pointer text-xs sm:text-sm transition-colors ${checked ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'
                            }`}
                        >
                          <input
                            type={allowsMultipleChoices(currentQuestion) ? 'checkbox' : 'radio'}
                            name={`answer-${currentQuestion.id}`}
                            checked={checked}
                            disabled={submitting || result !== null}
                            onChange={e =>
                              setSelectedOptions(prev => allowsMultipleChoices(currentQuestion)
                                ? (e.target.checked ? [...prev, opt.id] : prev.filter(id => id !== opt.id))
                                : [opt.id],
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

                {!passageHasGaps(currentQuestion.contextPassage) && currentQuestion.blanks && currentQuestion.blanks.length > 0 && (
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

              {result && <PracticeResultCard result={result} />}
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

              {result && mistakeId ? (
                <div className="flex items-center gap-3">
                  {resolution.resolved && <span role="status">Mistake resolved</span>}
                  {result.attempt?.isCorrect && !resolution.resolved ? (
                    <Button disabled={resolution.saving} onClick={() => void resolution.finish(true)}>Retry saving resolution</Button>
                  ) : (
                    <Button onClick={() => { resetAnswer(); }}>Try again</Button>
                  )}
                </div>
              ) : result && isLast ? (
                <div className="flex flex-wrap items-center gap-3">
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
              ) : speakingUnscored ? (
                <span className="text-xs font-semibold text-muted-foreground">
                  Scoring for speaking answers is being set up. Record and listen back as
                  often as you like - this costs no sub-test credit.
                </span>
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
                      <span>{submitStage}</span>
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

      {!isAdminUser && !mistakeId && (
        <QuestionDrawer
          isOpen={isDrawerOpen}
          onToggle={() => setIsDrawerOpen(prev => !prev)}
          onClose={() => setIsDrawerOpen(false)}
          exam={activeExam}
          skill={selectedSkill}
          typeKey={typeParam}
          isMock={Boolean(searchParams.get('mock'))}
          questions={questions}
          currentQuestionId={currentQuestion?.id}
          completedIds={completedIds}
          isLoading={loading}
          onSelectQuestion={handleSelectQuestionFromDrawer}
          onResetCompleted={() => {
            setCompletedIds([]);
            saveCompleted(activeExam, selectedSkill, typeParam, []);
          }}
        />
      )}
    </div>
  );
}
