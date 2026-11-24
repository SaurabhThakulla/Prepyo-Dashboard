import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/toast';
import { AnswerSubmission, Mock, MockAttempt, MockSubmitOutcome, Question, isCdsSchemaExam } from '@/lib/types';
import { cdsApi } from '@/cds/cdsApi';
import { cdsKeys, cdsMockAttempt, cdsQuestion } from '@/cds/cdsShared';

/**
 * Everything involved in actually sitting a mock exam: the questions, the
 * countdown, the learner's answers, and submitting for a score.
 *
 * This lives in a hook rather than in the page because the page was carrying
 * thirteen pieces of state at once, and only three of them were about showing
 * the catalog. Now the page decides *which screen to show* and this decides
 * *what happens during an exam*.
 *
 * The exam is "not running" whenever `activeMock` is null.
 */
export function useMockExam(onAttemptFinished: (attempt: MockAttempt) => void) {
  const { refreshUser, setActiveTestSession } = useApp();
  const toast = useToast();
  const queryClient = useQueryClient();
  // A CDS paper is sat through the CDS backend: its attempt is opened on start.
  const cdsAttemptId = useRef<string | null>(null);

  const [activeMock, setActiveMock] = useState<Mock | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerSubmission>>({});
  const [flaggedIds, setFlaggedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startingMockId, setStartingMockId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<MockSubmitOutcome | null>(null);

  const exit = useCallback(() => {
    setActiveMock(null);
    setQuestions([]);
    setOutcome(null);
    setAnswers({});
    setFlaggedIds([]);
  }, []);

  useEffect(() => {
    if (activeMock && !outcome) {
      setActiveTestSession?.({
        isActive: true,
        title: activeMock.title || `${activeMock.exam} Mock Exam`,
        skill: activeMock.sections?.[0]?.skill,
        onStop: () => {
          exit();
        },
      });
    } else {
      setActiveTestSession?.(null);
    }
    return () => {
      setActiveTestSession?.(null);
    };
  }, [activeMock, outcome, setActiveTestSession, exit]);

  const currentQuestion = questions[currentIndex] ?? null;

  const finish = useCallback(async () => {
    if (!activeMock || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const elapsed = activeMock.totalDurationMinutes * 60 - secondsLeft;
      if (isCdsSchemaExam(activeMock.exam) && cdsAttemptId.current) {
        const chosen = Object.values(answers).filter(answer => answer.selectedOptions?.[0]);
        const { attempt, score } = await cdsApi.submitAttempt(cdsAttemptId.current, {
          answers: Object.fromEntries(chosen.map(answer => [answer.questionId, answer.selectedOptions![0]])),
          timeSpentSeconds: Math.max(0, elapsed),
        });
        const finished = { ...cdsMockAttempt(attempt), totalQuestions: score.totalQuestions };
        setOutcome({ attempt: finished, xpAwarded: 0, scoredQuestions: score.totalQuestions, ungradedQuestions: 0, scoreConfidence: '' });
        onAttemptFinished(finished);
        void queryClient.invalidateQueries({ queryKey: ['cds'] });
        return;
      }
      const result = await api.post<MockSubmitOutcome>(`/mocks/${activeMock.id}/submit`, {
        answers: Object.values(answers),
        durationSeconds: Math.max(0, elapsed),
      });
      setOutcome(result);
      onAttemptFinished(result.attempt);
      await refreshUser();
    } catch (err) {
      if (err instanceof ApiError && err.isLimitReached) {
        toast.warning('Mock limit reached', errorMessage(err));
      } else {
        toast.error('Could not submit your mock', errorMessage(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [activeMock, isSubmitting, secondsLeft, answers, refreshUser, toast, onAttemptFinished, queryClient]);

  // Exam countdown. Submitting on zero mirrors a real timed test.
  useEffect(() => {
    if (!activeMock || outcome || secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          finish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeMock, outcome, secondsLeft, finish]);

  const start = useCallback(
    async (mock: Mock) => {
      setStartingMockId(mock.id);
      try {
        if (isCdsSchemaExam(mock.exam)) {
          // A fresh attempt on the CDS backend each time.
          const { attempt, questions: paper } = await cdsApi.startAttempt(mock.id);
          cdsAttemptId.current = attempt.id;
          const type = mock.sections[0]?.name === 'Elementary Mathematics' ? 'maths' : undefined;
          setActiveMock(mock);
          setQuestions(paper.map(question => cdsQuestion(question, type)));
        } else {
          // Fetch the mock's real questions rather than improvising a prompt.
          const data = await api.get<{ mock: Mock; questions: Question[] }>(`/mocks/${mock.id}`);
          setActiveMock(data.mock);
          setQuestions(data.questions ?? []);
        }
        setCurrentIndex(0);
        setSecondsLeft(mock.totalDurationMinutes * 60);
        setAnswers({});
        setFlaggedIds([]);
        setOutcome(null);
      } catch (err) {
        if (err instanceof ApiError && err.isLimitReached) toast.warning('Mock limit reached', errorMessage(err));
        else toast.error('Could not start that mock', errorMessage(err));
      } finally {
        setStartingMockId(null);
      }
    },
    [toast],
  );

  /** Merge a partial answer into whatever the learner has already given. */
  const answerQuestion = useCallback((question: Question, patch: Partial<AnswerSubmission>) => {
    setAnswers(prev => ({
      ...prev,
      [question.id]: { ...prev[question.id], questionId: question.id, ...patch },
    }));
  }, []);

  const toggleFlag = useCallback((questionId: string) => {
    setFlaggedIds(prev =>
      prev.includes(questionId) ? prev.filter(id => id !== questionId) : [...prev, questionId],
    );
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev < questions.length - 1 ? prev + 1 : prev));
  }, [questions.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  }, []);

  return {
    // State
    activeMock,
    questions,
    currentIndex,
    currentQuestion,
    secondsLeft,
    answers,
    flaggedIds,
    isSubmitting,
    startingMockId,
    outcome,
    // Actions
    start,
    finish,
    exit,
    answerQuestion,
    toggleFlag,
    goToNext,
    goToPrevious,
    goToIndex: setCurrentIndex,
  };
}
