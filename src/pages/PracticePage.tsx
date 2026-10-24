import { subTestsLeft } from '@/lib/subscriptions';
import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import PracticeUnavailable from '@/components/practice/PracticeUnavailable';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  RefreshCw,
  WifiOff,
  Clock,
  Bot,
  AlertCircle,
  Send,
  CheckCircle2,
  Volume2,
  LayoutList,
  PanelRight,
  RotateCcw,
  Lock,
} from 'lucide-react';
import { isPteTaskAvailable, getPteTaskLockedReason, findPteTaskConfig } from '@/lib/pteExamConfig';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import AudioRecorder, { type RecorderStatus } from '@/components/practice/AudioRecorder';
import { prepSecondsFor } from '@/components/practice/prepTime';
import QuestionFigure from '@/components/practice/QuestionFigure';
import PromptAudio from '@/components/practice/PromptAudio';
import KoreanHelp from '@/components/practice/KoreanHelp';
import PracticeResultDialog from '@/components/practice/PracticeResultDialog';
import { answerMark, OPTION_MARK_CLASS, OPTION_MARK_LABEL } from '@/lib/answerMarks';
import ListeningAnswerInput from '@/components/practice/ListeningAnswerInput';
import OptionContent, { hasPictureOptions } from '@/components/practice/OptionContent';
import InlineBlankPassage, { passageHasGaps } from '@/components/practice/InlineBlankPassage';
import { isReadAloudTask, isRepeatSentenceTask, isWordHighlightTask, passageText } from '@/lib/listening';
import { allowsMultipleChoices } from '@/lib/choices';
import { minimumWritingWords, writingLengthNote, writingWordCount, writingWordTarget } from '@/lib/writing';
import { AdminPageSkeleton, PracticePageSkeleton, ReadingPracticeSkeleton } from '@/components/layout/PageSkeleton';
import { Evaluation, EXAM_MAX_SCORE, ExamType, isAdmin, isExamType, isPremiumUser, listeningPlays, PracticeAttempt, Question, SkillType, ieltsModuleOf } from '@/lib/types';
import FreePlanNotice from '@/institution/FreePlanNotice';
import PracticeActionBar, { gradingUnits, notesFor, ON_BAR, PracticeNotes } from '@/components/practice/flow/PracticeActionBar';
import MyScore from '@/components/practice/flow/MyScore';
import RecordingPlayback from '@/components/practice/flow/RecordingPlayback';

const ReadingPracticePanel = lazy(() => import('@/components/reading/ReadingPracticePanel'));
const ReadingMockPanel = lazy(() => import('@/components/reading/ReadingMockPanel'));
const SkillMockPanel = lazy(() => import('@/components/practice/SkillMockPanel'));
const WritingMockPanel = lazy(() => import('@/components/practice/WritingMockPanel'));
const ListeningMockPanel = lazy(() => import('@/components/practice/ListeningMockPanel'));
const SpeakingMockPanel = lazy(() => import('@/components/practice/SpeakingMockPanel'));
const PracticeMockPaywall = lazy(() => import('@/components/practice/PracticeMockPaywall'));
const AdminReadingAuthoring = lazy(() => import('@/components/admin/AdminReadingAuthoring'));
const AdminQuestionAuthoring = lazy(() => import('@/components/admin/AdminQuestionAuthoring'));
import { useReadingPracticePassages } from '@/lib/hooks/useReading';
import { fetchAllQuestions } from '@/lib/hooks/useResources';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { familyOf, typeIdsFor } from '@/lib/readingTypes';
import { api, ApiError, errorMessage } from '@/lib/api';
import { encodeForUpload } from '@/lib/audio';
import { matchesTypeKey, typeLabel } from '@/lib/syllabus';
import { pteMockHref } from '@/lib/pteMock/catalog';
import { loadMistakeTask } from '@/lib/mistakePractice';
import { useMistakeResolution } from '@/lib/hooks/useMistakeResolution';
import { useAICapabilities } from '@/lib/hooks/useAICapabilities';
import type { Delivery } from '@/lib/delivery';
import { useProgressStage } from '@/lib/hooks/useProgressStage';
import { loadCompleted, saveCompleted } from '@/lib/practiceProgress';
import QuestionDrawer from '@/components/practice/QuestionDrawer';
import { useExclusivePanel } from '@/components/layout/sidePanels';
import ScoringProgress from '@/components/practice/ScoringProgress';
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

import { useToast } from '@/components/ui/toast';
import AnswerSelect from '@/components/ui/answer-select';

const PILL = 'h-9 gap-1.5 rounded-full px-3 text-xs font-bold sm:px-4';

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
    user, activeExam: contextExam, pteVariant, setPteVariant, refreshUser, setIsTutorOpen, setTutorContextPrompt, setActiveTestSession,
    markNotificationAsRead, refreshNotifications, closeTutorialVideo,
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
  const activeExam = isExamType(linkedExam) ? linkedExam : contextExam;
  const resolution = useMistakeResolution(mistakeId);

  const skillParam = searchParams.get('skill') as SkillType | null;
  const selectedSkill: SkillType =
    skillParam && ['speaking', 'writing', 'reading', 'listening'].includes(skillParam)
      ? skillParam
      : 'reading';

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isMockMode = Boolean(searchParams.get('mock'));
  // Task links add drawer=open: the question list opens so the learner picks one (no credit until then).
  const drawerParam = searchParams.get('drawer');
  // EPS-TOPIK reading items stand alone rather than sitting on a passage, so
  // they are dealt one at a time like listening, not from the passage list.
  const readingList =
    selectedSkill === 'reading' && activeExam !== 'EPS_TOPIK' && !isMockMode && !mistakeId && !isAdmin(user);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(
    () => !mistakeId && !readingList && Boolean(typeParam || drawerParam === 'open' || drawerParam === '1'),
  );
  // The list of mock papers opens with the page, so the learner picks one straight away.
  // Practice opens on its first question instead (a start costs a credit), with the list a tap away.
  // A link to one particular item keeps it shut, and so does reading with no task type.
  const opensOnList =
    isMockMode && !mistakeId && !searchParams.get('paper') && !searchParams.get('passage') && !searchParams.get('questionId') &&
    !(readingList && typeIdsFor(typeParam).length === 0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(
    () => opensOnList || drawerParam === 'open' || drawerParam === '1',
  );
  // Set when the question list could not be fetched, so the page offers a retry instead of loading forever.
  const [loadFailed, setLoadFailed] = useState(false);

  // Reading is practised by passage, not by single question, so its list is
  // the passages practice deals for the task (and its family).
  const readingFamily = useMemo(
    () => [...new Set(typeIdsFor(typeParam).flatMap(familyOf))],
    [typeParam],
  );
  const readingPassagesQuery = useReadingPracticePassages(activeExam, readingFamily, readingList);
  const readingPassages = readingPassagesQuery.data?.passages ?? [];
  const passageParam = searchParams.get('passage');

  // Every click on a task link opens its list, even the task already on screen.
  const { key: locationKey } = useLocation();
  useEffect(() => {
    if (drawerParam === 'open' || drawerParam === '1') {
      setIsDrawerOpen(true);
    }
  }, [drawerParam, locationKey]);

  // Moving to another task or mock without leaving the page opens its list too.
  const listKey = `${activeExam}:${selectedSkill}:${typeParam ?? ''}:${isMockMode ? 'mock' : 'practice'}`;
  const listOpenedFor = useRef(listKey);
  useEffect(() => {
    if (listOpenedFor.current === listKey) return;
    listOpenedFor.current = listKey;
    if (opensOnList) setIsDrawerOpen(true);
  }, [listKey, opensOnList]);

  const loadQuestionsForSubtask = useCallback(async () => {
    if (mistakeId) return;
    setLoading(true);
    setLoadFailed(false);
    try {
      const data = await queryClient.fetchQuery({
        queryKey: queryKeys.questions(activeExam, selectedSkill),
        queryFn: () => fetchAllQuestions(activeExam, selectedSkill),
        staleTime: 5 * 60_000,
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
        return list[0] ?? null;
      });
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [activeExam, selectedSkill, typeParam, mistakeId, searchParams, queryClient]);

  useEffect(() => {
    if (!isTestMockMode && (isDrawerOpen || Boolean(typeParam)) && !mistakeId && questions.length === 0 && !loadFailed) {
      void loadQuestionsForSubtask();
    }
  }, [isDrawerOpen, typeParam, mistakeId, questions.length, loadFailed, loadQuestionsForSubtask, isTestMockMode]);

  const handleSelectQuestionFromDrawer = async (question: Question) => {
    closeTutorialVideo?.();
    setIsDrawerOpen(false);
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
  // The recorder's phase and mic action, for the recording pill in the action bar.
  const [recorderStatus, setRecorderStatus] = useState<RecorderStatus | null>(null);
  const recorderControl = useRef<(() => void) | null>(null);
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
  // A result opens as a pop-up rather than under the answer; a button shows it again.
  const [showResult, setShowResult] = useState(false);
  useEffect(() => setShowResult(result !== null), [result]);
  const seeResultButton = result && (
    <Button variant="outline" onClick={() => setShowResult(true)} className={PILL}>
      See your result{result.evaluation?.estimatedScore != null && ` (${result.evaluation.estimatedScore})`}
    </Button>
  );
  const [startedAt, setStartedAt] = useState<number>(() => Date.now());
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  const [startedTask, setStartedTask] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const startPending = useRef(false);
  const taskKey = currentQuestion ? `${activeExam}:${selectedSkill}:${currentQuestion.id}` : null;
  const latestTaskKey = useRef(taskKey);
  const hasStarted = Boolean(taskKey && startedTask === taskKey);
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

  // A question starts on its own; only a refused start stops it retrying, and shows the start card instead.
  const startFailedFor = useRef<string | null>(null);

  const handleStart = async () => {
    closeTutorialVideo?.();
    if (hasStarted || startPending.current || isStarting) return;
    startPending.current = true;
    setIsStarting(true);

    let targetQuestion = currentQuestion;
    try {
      let qList = questions;

      // Lazy load questions only when user explicitly clicks Start Practice
      if (!targetQuestion || qList.length === 0) {
        const data = mistakeId
          ? await loadMistakeTask(mistakeId, activeExam, selectedSkill).then(task => ({ questions: [task.question] }))
          : await fetchAllQuestions(activeExam, selectedSkill);

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

        // A task always opens on its first question; the list picks any other.
        targetQuestion = list[0] ?? null;
        setCurrentQuestion(targetQuestion);
      }

      if (!targetQuestion) {
        toast.error('No questions available', `No ${selectedSkill} questions found.`);
        return;
      }

      const startingKey = `${activeExam}:${selectedSkill}:${targetQuestion.id}`;
      const started = await api.post<{ scored?: boolean }>('/practice/start', {
        exam: activeExam,
        skill: selectedSkill,
        questionId: targetQuestion.id,
      });

      setStartedTask(startingKey);
      setStartedAt(Date.now());
      await refreshUser();
      // Only a spent credit is worth a toast; free and unlimited starts stay quiet.
      // The server's answer: the capability check may not have returned when the page starts on its own.
      if (!speakingUnscored && started?.scored !== false && Number.isFinite(subTestsRemaining)) {
        toast.success('Practice started', '1 sub-test credit applied. Good luck!');
      }
    } catch (err) {
      startFailedFor.current = targetQuestion?.id ?? listKey;
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
  const promptHasAudio = Boolean(currentQuestion && !isReadAloudTask(currentQuestion) && (currentQuestion.audioUrl || currentQuestion.audioTranscript?.trim()));
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

  // Redo before submitting: a clean answer to the same question, with no new credit spent.
  const [answerRound, setAnswerRound] = useState(0);
  const clearAnswer = () => {
    setTextAnswer('');
    setBlankResponses({});
    setSelectedOptions([]);
    setRecording(null);
    setSpokenTranscript('');
    setDelivery(undefined);
    setAnswerRound(n => n + 1);
  };

  // A marked answer shows up in My Score at once.
  useEffect(() => {
    if (result) void queryClient.invalidateQueries({ queryKey: ['practice-history'] });
  }, [result, queryClient]);

  // Passage-based reading (IELTS, PTE). EPS-TOPIK reading items stand alone,
  // so they are practised and authored like any other single question.
  const isReading = selectedSkill === 'reading' && activeExam !== 'EPS_TOPIK';
  const isAdminUser = isAdmin(user);
  // The list (rendered at the bottom) only shows for these; while it shows, the left menu stays shut.
  const drawerShown = readingList || (!isAdminUser && !mistakeId && !isMockMode);
  useExclusivePanel('right', isDrawerOpen && drawerShown, () => setIsDrawerOpen(false));

  // When switching exam, skill, subtask, or mistake, reset state cleanly without querying backend/database.
  useEffect(() => {
    resetAnswer();
    setQuestions([]);
    setCurrentQuestion(null);
    setLoading(false);
    setLoadFailed(false);
  }, [activeExam, selectedSkill, typeParam, mistakeId, resetAnswer]);

  // Keep global activeTestSession in sync while question or subtest is in progress
  useEffect(() => {
    if (hasStarted && !result && currentQuestion) {
      setActiveTestSession?.({
        isActive: true,
        title: `${selectedSkill.toUpperCase()}: ${currentQuestion.typeName || currentQuestion.title || 'Practice'}`,
        skill: selectedSkill,
        // Clicking elsewhere keeps the answer: a reset would start (and charge) the task again on its own.
        // Another task resets it anyway, and leaving the page unmounts it.
        onStop: () => {},
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
        recordQuestionAttempt(activeExam, currentQuestion.id, scoreVal, EXAM_MAX_SCORE[activeExam]);
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
          delivery,
        });
        showEvaluation(data);
        const scoreVal = data.evaluation.estimatedScore ?? (data.evaluation as any)?.overallScore ?? (data.evaluation as any)?.score ?? (activeExam === 'PTE' ? 79 : 7);
        recordQuestionAttempt(activeExam, currentQuestion.id, scoreVal, EXAM_MAX_SCORE[activeExam]);
      } else if (grading === 'ai') {
        const data = await api.post<EvaluationResponse>('/evaluations/writing', {
          questionId: currentQuestion.id,
          text: textAnswer,
        });
        showEvaluation(data);
        const scoreVal = data.evaluation.estimatedScore ?? (data.evaluation as any)?.overallScore ?? (data.evaluation as any)?.score ?? (activeExam === 'PTE' ? 79 : 7);
        recordQuestionAttempt(activeExam, currentQuestion.id, scoreVal, EXAM_MAX_SCORE[activeExam]);
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
          data.attempt.isCorrect ? EXAM_MAX_SCORE[activeExam] : 0,
          EXAM_MAX_SCORE[activeExam],
          data.attempt.isCorrect,
        );
        await resolution.finish(data.attempt.isCorrect);
      }
      // A targeted retry must not overwrite the normal subtask's saved progression.
      if (!mistakeId) markComplete(currentQuestion.id);
      await refreshUser();
    } catch (err) {
      if (currentQuestion && !mistakeId) {
        recordQuestionAttempt(
          activeExam,
          currentQuestion.id,
          0,
          EXAM_MAX_SCORE[activeExam],
          false,
        );
      }
      if (err instanceof ApiError && err.isAIUnavailable) {
        toast.error(
          'Internet connection issue',
          'Your internet connection seems slow or disconnected. Your question is saved in your Mistake Bank so you can retry once your internet connection is restored.',
        );
      } else if (err instanceof ApiError && (err.code === 'network_error' || err.status === 0)) {
        toast.error(
          'Network connection error',
          'Your internet connection is not stable right now. You can check your Mistake Bank to retry once your connection is resolved.',
        );
      } else if (err instanceof ApiError && err.isLimitReached) {
        toast.warning('Daily sub-test limit reached', errorMessage(err));
      } else {
        toast.error(
          'Internet connection issue',
          'Could not complete scoring due to an internet or connection interruption. You can check your Mistake Bank to retry once your connection is resolved.',
        );
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
      ? [{ afterSeconds: 0, label: 'Scoring…' }] // the steps show in ScoringProgress below
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
  // PTE listening titles are "Question N"; drop that, it repeats the number.
  const questionHeading = (currentQuestion?.title ?? '').replace(isPteListening ? /^question\s*\d+[:\s-]*/i : /^$/, '').trim();
  // Short code in the heading badge: the exam's own (RA, FIB-D), else the type's initials.
  const taskCode = (activeExam === 'PTE' && findPteTaskConfig(currentQuestion?.typeName ?? '')?.code)
    || (currentQuestion?.typeName ?? '').split(/[\s:&-]+/).filter(Boolean).slice(0, 3).map(w => w[0]).join('').toUpperCase();

  const goToIndex = (index: number) => {
    const question = questions[index];
    if (!question) return;
    setCurrentQuestion(question);
    resetAnswer();
  };

  // Next question starts the next one straight away, as reading does, instead
  // of going back through the start screen. It still spends its credit; if
  // that is refused (limit reached), the start screen is shown so the learner
  // sees why. Redo passes the current question to start it again the same way.
  const goToNextQuestion = async (next: Question | undefined = questions[currentIndex + 1]) => {
    if (!next || startPending.current) return;
    closeTutorialVideo?.();
    startPending.current = true;
    setIsStarting(true);
    setCurrentQuestion(next);
    resetAnswer();
    // Shown in place straight away, as before submitting; a refused start falls back to the start screen.
    const nextKey = `${activeExam}:${selectedSkill}:${next.id}`;
    setStartedTask(nextKey);
    // The answer was read at the bottom; the new attempt starts at the top.
    document.querySelector('[data-practice-workspace]')?.scrollIntoView?.({ block: 'start' });
    try {
      await api.post('/practice/start', {
        exam: activeExam,
        skill: selectedSkill,
        questionId: next.id,
      });
      setStartedAt(Date.now());
      await refreshUser();
    } catch (err) {
      setStartedTask(prev => (prev === nextKey ? null : prev));
      startFailedFor.current = next.id;
      if (err instanceof ApiError && err.isLimitReached) {
        toast.warning('Daily limit reached', 'You have reached your daily sub-test allowance.');
      } else {
        toast.error('Could not start the question', errorMessage(err));
      }
    } finally {
      startPending.current = false;
      setIsStarting(false);
    }
  };

  // Arrows and the number list open the question straight away.
  const openQuestion = (question: Question | undefined) => {
    if (!question || question.id === currentQuestion?.id) return;
    if (result) void goToNextQuestion(question);
    else void handleSelectQuestionFromDrawer(question);
  };

  // Try again on the same question: a clean answer, started again on its own.
  const retryQuestion = () => {
    startFailedFor.current = null;
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
        } p-0 m-0 max-sm:pb-20 flex flex-col bg-background`}
    >
      {/* An admin has no reason to sit the paper. They add questions/passages instead. */}
      {user?.subscription?.aiBlocked && (selectedSkill === 'speaking' || selectedSkill === 'writing') ? (
        <FreePlanNotice />
      ) : isReading && isAdmin(user) ? (
        <Suspense fallback={<AdminPageSkeleton />}>
          <AdminReadingAuthoring
            key={`admin-reading-${activeExam}-${typeParam || 'all'}`}
            initialTypeKey={typeParam ?? undefined}
            exam={activeExam}
          />
        </Suspense>
      ) : searchParams.get('mock') && activeExam === 'PTE' && !isAdmin(user) ? (
        // Every PTE sectional test runs on the PTE test player.
        <Navigate to={pteMockHref(selectedSkill)} replace />
      ) : isReading && searchParams.get('mock') && !isPremiumUser(user) ? (
        <Suspense fallback={<PracticePageSkeleton />}>
          <PracticeMockPaywall skill={selectedSkill} exam={activeExam} />
        </Suspense>
      ) : isReading && searchParams.get('mock') ? (
        <Suspense fallback={<ReadingPracticeSkeleton />}>
          <ReadingMockPanel key={`${activeExam}-${searchParams.get('paper') || 'default'}`} />
        </Suspense>
      ) : searchParams.get('mock') && selectedSkill === 'speaking' && activeExam === 'IELTS' && !isAdmin(user) ? (
        <Suspense fallback={<PracticePageSkeleton />}>
          <SpeakingMockPanel key={`speaking-mock-${searchParams.get('paper') || 'default'}`} />
        </Suspense>
      ) : searchParams.get('mock') && selectedSkill === 'listening' && activeExam === 'IELTS' && !isAdmin(user) ? (
        <Suspense fallback={<PracticePageSkeleton />}>
          <ListeningMockPanel key={`listening-mock-${searchParams.get('paper') || 'default'}`} />
        </Suspense>
      ) : searchParams.get('mock') && selectedSkill === 'writing' && activeExam === 'IELTS' && !isAdmin(user) ? (
        <Suspense fallback={<PracticePageSkeleton />}>
          <WritingMockPanel key={`writing-mock-${ieltsModuleOf(user)}-${searchParams.get('paper') || 'default'}`} />
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
            passageId={passageParam ?? undefined}
            passageIds={readingPassages.map(passage => passage.id)}
            listOpen={isDrawerOpen}
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
      ) : isStarting && !hasStarted ? (
        <PracticePageSkeleton />
      ) : loadFailed && !currentQuestion && !hasStarted ? (
        <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-4 p-8 text-center">
          <WifiOff className="w-8 h-8 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-display text-lg font-semibold text-foreground">Couldn't load the questions</p>
            <p className="text-sm text-muted-foreground">Check your internet connection and try again.</p>
          </div>
          <Button onClick={() => void loadQuestionsForSubtask()} className="rounded-xl gap-2">
            <RefreshCw className="w-4 h-4" /> Try again
          </Button>
        </div>
      ) : !hasStarted && subTestsRemaining > 0 && startFailedFor.current !== (currentQuestion?.id ?? listKey) ? (
        <AutoStart ready={!isDrawerOpen || Boolean(currentQuestion)} onStart={() => void handleStart()} />
      ) : !hasStarted ? (
        <PracticeUnavailable
          onRetry={subTestsRemaining > 0 ? () => void handleStart() : undefined}
          isStarting={isStarting}
        />
      ) : !currentQuestion ? (
        loading ? (
          <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-8 text-center space-y-4">
            <RefreshCw className="w-8 h-8 text-teal-500 animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground font-medium">Loading questions…</p>
          </div>
        ) : questions.length > 0 ? (
          <div className="w-full min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
            <Card className="max-w-xl w-full p-6 sm:p-8 text-center space-y-6 bg-card dark:bg-[#0f141f] border-border/80 shadow-lg rounded-2xl">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
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
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => setIsDrawerOpen(true)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PanelRight className="w-4 h-4" />
                  <span>Choose Question ({questions.length} available)</span>
                </Button>

                {questions[0] && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleSelectQuestionFromDrawer(questions[0])}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                  >
                    <span>Start First Question</span>
                  </Button>
                )}
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
          <div className="w-full px-4 sm:px-6 lg:px-8 py-5 space-y-4 flex-1 flex flex-col">
            {/* Warning banner when practicing a task locked in current PTE variant */}
            {activeExam === 'PTE' && typeParam && !isPteTaskAvailable(pteVariant, typeParam) && (
              <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/90 dark:bg-amber-950/40 p-4 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold">
                      This task is unavailable in {pteVariant === 'core' ? 'PTE Core' : 'PTE Academic'}
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300/85 mt-0.5">
                      {getPteTaskLockedReason(pteVariant, typeParam)}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-bold shrink-0 self-start sm:self-auto hover:bg-amber-100 dark:hover:bg-amber-900/40"
                  onClick={() => setPteVariant(pteVariant === 'core' ? 'academic' : 'core')}
                >
                  Switch to {pteVariant === 'core' ? 'PTE Academic' : 'PTE Core'}
                </Button>
              </div>
            )}
            <div className="space-y-3.5">
              {/* Task type, its instructions, and the time allowed */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3 sm:gap-4">
                  <span className="inline-flex h-12 min-w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 px-2 text-sm font-bold text-primary-foreground shadow-md sm:h-14 sm:min-w-14">
                    {taskCode}
                  </span>
                  <div data-dictionary className="min-w-0 space-y-1 pt-0.5">
                    <h2 className="text-xl sm:text-2xl font-bold text-primary leading-tight">{currentQuestion.typeName}</h2>
                    {currentQuestion.timeLimitSeconds > 0 && (
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-primary sm:hidden">
                        <Clock className="h-3.5 w-3.5" aria-hidden /> {timeAllowed(currentQuestion.timeLimitSeconds)} per question
                      </p>
                    )}
                    {/* Plain sentences flow across the full width; prompts with lists keep their lines. */}
                    {currentQuestion.prompt && (/\S\r?\n\S/.test(currentQuestion.prompt.trim())
                      ? currentQuestion.prompt.split(/\n\s*\n/).map((paragraph, i) => (
                        <p key={i} className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                          {paragraph.trim()}
                        </p>
                      ))
                      : <p className="text-sm text-muted-foreground leading-relaxed">{currentQuestion.prompt.trim().split(/\s*\n\s*\n\s*/).join(' ')}</p>)}
                  </div>
                </div>
                {currentQuestion.timeLimitSeconds > 0 && (
                  <div className="hidden shrink-0 items-center gap-3 self-start rounded-2xl bg-primary/[0.07] px-4 py-2.5 sm:flex">
                    <Clock className="h-6 w-6 text-primary" aria-hidden />
                    <div className="leading-tight">
                      <p className="text-xs text-muted-foreground">Time per question</p>
                      <p className="text-sm font-bold text-primary">{timeAllowed(currentQuestion.timeLimitSeconds)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* The question: blue bar with its number and title, then its content */}
              <div data-dictionary className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              {(questionHeading || (!isPteListening && currentIndex >= 0)) && (
                <div className="flex items-center gap-3 bg-gradient-to-r from-primary to-primary/75 px-4 py-3 text-primary-foreground dark:!bg-muted dark:!text-foreground sm:px-5">
                  {!isPteListening && currentIndex >= 0 && <span className="rounded-lg bg-white/15 px-2.5 py-0.5 font-bold tabular-nums">#{currentIndex + 1}</span>}
                  {!isPteListening && currentIndex >= 0 && questionHeading && <span className="h-5 w-px bg-white/40" aria-hidden />}
                  {questionHeading && <h3 className="text-sm sm:text-base font-semibold leading-snug">{questionHeading}</h3>}
                </div>
              )}

              <div className="p-3 sm:p-4 space-y-3 empty:hidden">

                {currentQuestion.imageUrl && (
                  // On a phone the figure runs edge to edge across the card, for a larger table.
                  <QuestionFigure src={currentQuestion.imageUrl} alt={currentQuestion.title} className="-mx-4 w-auto rounded-none sm:mx-auto sm:w-full sm:rounded-xl" />
                )}

                {!isReadAloudTask(currentQuestion) && <PromptAudio
                  key={currentQuestion.id}
                  questionId={currentQuestion.id}
                  audioUrl={currentQuestion.audioUrl}
                  audioTranscript={result?.review?.audioTranscript ?? currentQuestion.audioTranscript}
                  scriptOnRequest={currentQuestion.scriptOnRequest}
                  singlePlay={
                    (currentQuestion.exam === 'IELTS' && currentQuestion.skill === 'listening') ||
                    (currentQuestion.exam === 'PTE' && (currentQuestion.skill === 'listening' || currentQuestion.skill === 'speaking')) ||
                    (currentQuestion.exam === 'EPS_TOPIK' && currentQuestion.skill === 'listening')
                  }
                  repeat={listeningPlays(currentQuestion)}
                  title={currentQuestion.title}
                  allowTranscript={result !== null}
                  highlights={result?.review?.blanks?.map(blank => blank.correctAnswer ?? '')}
                  onFinished={() => setHeardPromptFor(currentQuestion.id)}
                />}

                {/* Read Aloud: hear the passage. Stored audio when there is some, the browser's voice for now otherwise. */}
                {isReadAloudTask(currentQuestion) && currentQuestion.contextPassage && (
                  <PromptAudio
                    key={`read-aloud-${currentQuestion.id}`}
                    audioUrl={currentQuestion.audioUrl}
                    audioTranscript={passageText(currentQuestion)}
                    title={currentQuestion.title}
                  />
                )}

                {currentQuestion.exam === 'EPS_TOPIK' && (currentQuestion.hasTranslation || result?.review?.audioTranslation) && (
                  <KoreanHelp
                    key={`help-${currentQuestion.id}-${result?.review?.audioTranslation ? 'review' : 'question'}`}
                    questionId={currentQuestion.id}
                    premium={isPremiumUser(user)}
                    initial={
                      result?.review?.audioTranslation
                        ? { text: result.review.audioTranslation, audioUrl: result.review.translationAudioUrl }
                        : undefined
                    }
                  />
                )}

                {currentQuestion.contextPassage && !isWordHighlightTask(currentQuestion) && !isRepeatSentenceTask(currentQuestion) && (
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
                    <div className="px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-primary/[0.04] text-[15px] sm:text-[16px] text-foreground leading-relaxed whitespace-pre-line sm:max-h-72 sm:overflow-y-auto">
                      {passageText(currentQuestion)}
                    </div>
                  )
                )}

              </div>
              </div>

              <div className="space-y-3">
                {/* Question Inputs */}
                {grading === 'speech' && (
                  <div className="space-y-3 pt-2">
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
                        Play the audio above. Recording starts on its own when it ends.
                      </p>
                    )}
                    <AudioRecorder
                      key={`${currentQuestion.id}-${answerRound}`}
                      prepSeconds={prepSecondsFor(currentQuestion.typeId, currentQuestion.prepTimeSeconds)}
                      // Prep counts down in the recorder as soon as the task (or its audio) is done, then recording starts.
                      autoStart
                      maxSeconds={currentQuestion.timeLimitSeconds}
                      disabled={submitting || result !== null || waitingForPrompt}
                      controlRef={recorderControl}
                      onStatus={setRecorderStatus}
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
                      <span className="text-sm font-bold text-foreground">Your response</span>
                      <Badge variant={wordCount >= (wordTarget ?? minWords) ? 'success' : 'warning'}>
                        {wordTarget ? `${wordCount} / ${wordTarget} words` : `${wordCount} words`}
                      </Badge>
                    </div>
                    <Textarea
                      rows={8}
                      value={textAnswer}
                      onChange={e => setTextAnswer(e.target.value)}
                      placeholder="Write your response here…"
                      className="border-2 border-primary bg-background px-4 py-3 text-[15px] leading-7 text-foreground placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-primary/30"
                    />
                    <p className="text-xs leading-relaxed text-foreground/75">
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
                  correctAnswers={result?.review?.correctAnswers ?? null}
                />

                {!isWordHighlightTask(currentQuestion) && currentQuestion.options && currentQuestion.options.length > 0 && (
                  <div className="space-y-2.5 pt-2">
                    <h4 className="text-xs font-bold text-foreground">Choose your answer:</h4>
                    <div className={hasPictureOptions(currentQuestion.options) ? 'grid grid-cols-2 gap-2.5' : 'space-y-2.5'}>
                    {currentQuestion.options.map((opt, optIndex) => {
                      const checked = selectedOptions.includes(opt.id);
                      // Once marked, the right answer is green and a wrong pick red.
                      const key = result?.review?.correctAnswers ?? null;
                      const mark = answerMark(opt.id, checked, key);
                      return (
                        <label
                          key={opt.id}
                          className={`flex items-start gap-2.5 p-3.5 rounded-xl border cursor-pointer text-xs sm:text-sm transition-colors ${key ? OPTION_MARK_CLASS[mark] : checked ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'
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
                          <OptionContent option={opt} index={optIndex} />
                          {OPTION_MARK_LABEL[mark] && (
                            <span className={`ml-auto shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${mark === 'wrong' ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'}`}>
                              {OPTION_MARK_LABEL[mark]}
                            </span>
                          )}
                        </label>
                      );
                    })}
                    </div>
                  </div>
                )}

                {!passageHasGaps(currentQuestion.contextPassage) && currentQuestion.blanks && currentQuestion.blanks.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold text-foreground">Fill each blank:</h4>
                    {currentQuestion.blanks.map((b, idx) => {
                      const reviewed = result?.review?.blanks?.find(r => r.id === b.id);
                      const given = (blankResponses[b.id] ?? '').trim().toLowerCase();
                      const right = !!reviewed && [reviewed.correctAnswer]
                        .some(a => (a ?? '').trim().toLowerCase() === given && given !== '');
                      return (
                      <div key={b.id} className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border text-xs sm:text-sm ${!reviewed ? 'bg-card border-border' : right ? 'border-emerald-500 bg-emerald-500/10' : 'border-rose-500 bg-rose-500/10'}`}>
                        <span className="font-bold text-primary shrink-0">Blank {idx + 1}:</span>
                        {b.options && b.options.length > 0 ? (
                          <AnswerSelect
                            value={blankResponses[b.id] || ''}
                            options={b.options}
                            onChange={value => setBlankResponses({ ...blankResponses, [b.id]: value })}
                            aria-label={`Blank ${idx + 1}`}
                            className="bg-background text-xs sm:text-sm"
                          />
                        ) : (
                          <input
                            value={blankResponses[b.id] || ''}
                            onChange={e => setBlankResponses({ ...blankResponses, [b.id]: e.target.value })}
                            className="bg-background border border-border text-xs sm:text-sm font-medium text-foreground px-3 py-1.5 rounded-lg focus:outline-none focus:border-primary"
                            placeholder="Type your answer"
                          />
                        )}
                        {reviewed && !right && (
                          <span className="w-full text-xs font-semibold text-emerald-700 dark:text-emerald-300">Correct answer: {reviewed.correctAnswer}</span>
                        )}
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {result && (
              <PracticeResultDialog
                result={result}
                answerText={textAnswer}
                blankAnswers={blankResponses}
                recording={recording}
                open={showResult}
                onOpenChange={setShowResult}
                busy={isStarting}
                taskType={activeExam === 'PTE' ? currentQuestion?.typeId : undefined}
                redoLabel={mistakeId ? 'Try again' : 'Redo'}
                onRedo={() => (mistakeId ? retryQuestion() : void goToNextQuestion(currentQuestion ?? undefined))}
                onNext={mistakeId || isLast ? undefined : () => void goToNextQuestion()}
              />
            )}

            <PracticeActionBar
              cost={speakingUnscored ? null : gradingUnits(selectedSkill, currentQuestion.typeId)}
              index={mistakeId ? -1 : currentIndex}
              total={mistakeId ? 0 : questions.length}
              onJump={mistakeId ? undefined : i => openQuestion(questions[i])}
              onShuffle={mistakeId || questions.length < 2 ? undefined : () => {
                const others = questions.filter(q => q.id !== currentQuestion.id);
                openQuestion(others[Math.floor(Math.random() * others.length)]);
              }}
              disabled={isStarting || submitting}
              hideMiddleOnPhone={recording === null}
              middle={grading === 'speech' ? (
                <RecordingPlayback
                  recording={recording}
                  status={recorderStatus}
                  maxSeconds={currentQuestion.timeLimitSeconds}
                  onControl={() => recorderControl.current?.()}
                  disabled={submitting || result !== null || waitingForPrompt}
                />
              ) : undefined}
              actions={
                <>
                  {result && mistakeId ? (
                    <>
                      {resolution.resolved && <span role="status" className="text-xs font-bold text-emerald-300">Mistake resolved</span>}
                      {seeResultButton}
                      {result.attempt?.isCorrect && !resolution.resolved ? (
                        <Button disabled={resolution.saving} onClick={() => void resolution.finish(true)} className={PILL}>Retry saving resolution</Button>
                      ) : (
                        <Button variant="outline" onClick={retryQuestion} className={PILL}>Try again</Button>
                      )}
                    </>
                  ) : result ? (
                    <>
                      {seeResultButton}
                      <Button variant="outline" onClick={() => void goToNextQuestion(currentQuestion ?? undefined)} disabled={isStarting} className={PILL}>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Redo</span>
                      </Button>
                      {isLast && (
                        <>
                          <Button variant="outline" onClick={restartSet} className={PILL}>
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Start over</span>
                          </Button>
                          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                            <CheckCircle2 className="w-4 h-4" />
                            You have finished every question here
                          </span>
                        </>
                      )}
                    </>
                  ) : speakingUnscored ? (
                    <span className="text-xs font-semibold text-white/85">
                      Scoring for speaking answers is being set up. Record and listen back as
                      often as you like - this costs no sub-test credit.
                    </span>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={handleSubmitAnswer}
                        disabled={submitting || !canSubmit}
                        aria-label={submitting ? undefined : grading === 'speech' ? 'Submit recording' : 'Submit Answer'}
                        className={`${PILL} border-primary text-primary hover:bg-primary hover:text-primary-foreground disabled:border-white/25 disabled:bg-white/10 disabled:text-white/60 disabled:opacity-100`}
                      >
                        {submitting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>{submitStage}</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Submit</span>
                          </>
                        )}
                      </Button>
                      <Button variant="outline" onClick={clearAnswer} disabled={submitting} className={PILL}>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Redo</span>
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" onClick={handleAskAITutor} className={`${PILL} gap-2 ${ON_BAR}`}>
                    <Bot className="w-4 h-4" />
                    <span><span className="hidden sm:inline">Ask </span>AI Coach</span>
                  </Button>
                </>
              }
            />

            {submitting && grading === 'speech' && <ScoringProgress />}

            <PracticeNotes notes={speakingUnscored ? [] : notesFor(selectedSkill)} />

            <MyScore questionIds={[currentQuestion.id]} />
          </div>
        </div>
      )}

      {readingList && (
        <QuestionDrawer
          isOpen={isDrawerOpen}
          onToggle={() => setIsDrawerOpen(prev => !prev)}
          onClose={() => setIsDrawerOpen(false)}
          exam={activeExam}
          skill={selectedSkill}
          typeKey={typeParam}
          isMock={false}
          questions={readingPassages.map(passage => ({
            id: passage.id,
            title: passage.title,
            prompt: passage.topic,
            difficulty: passage.difficulty,
          }))}
          currentQuestionId={passageParam}
          completedIds={readingPassages.filter(passage => passage.practisedAt).map(passage => passage.id)}
          isLoading={
            readingPassagesQuery.isLoading ||
            readingPassagesQuery.isPending ||
            (readingPassagesQuery.isFetching && readingPassages.length === 0) ||
            (readingFamily.length === 0 && Boolean(typeParam))
          }
          onSelectQuestion={passage => {
            const next = new URLSearchParams(searchParams);
            next.set('passage', passage.id);
            next.delete('drawer');
            setSearchParams(next);
            setIsDrawerOpen(false);
          }}
        />
      )}

      {!isAdminUser && !mistakeId && !isMockMode && !readingList && (
        <QuestionDrawer
          isOpen={isDrawerOpen}
          onToggle={() => setIsDrawerOpen(prev => !prev)}
          onClose={() => setIsDrawerOpen(false)}
          exam={activeExam}
          skill={selectedSkill}
          typeKey={typeParam}
          isMock={false}
          questions={questions}
          currentQuestionId={currentQuestion?.id}
          completedIds={completedIds}
          isLoading={loading || (questions.length === 0 && Boolean(typeParam) && !mistakeId && !loadFailed)}
          onRetry={loadFailed ? () => void loadQuestionsForSubtask() : undefined}
          onSelectQuestion={question => void handleSelectQuestionFromDrawer(question)}
          onResetCompleted={() => {
            setCompletedIds([]);
            saveCompleted(activeExam, selectedSkill, typeParam, []);
          }}
        />
      )}

    </div>
  );
}

/** Starts the task as soon as the question list is out of the way; a skeleton until then. */
// "40 seconds", "2 minutes", "1 min 30 s".
function timeAllowed(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m} min ${s} s` : `${m} ${m === 1 ? 'minute' : 'minutes'}`;
}

function AutoStart({ ready, onStart }: { ready: boolean; onStart: () => void }) {
  const start = useRef(onStart);
  start.current = onStart;
  useEffect(() => {
    if (ready) start.current();
  }, [ready]);
  // Blank while the question list is open; the question itself shows once it starts.
  return <div className="w-full min-h-[calc(100vh-4rem)]" />;
}
