import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError, errorMessage } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useToast } from '@/components/ui/toast';
import { useApp } from '@/context/AppContext';
import {
  AnswerSubmission,
  ExamType,
  MockAttempt,
  MockSubmitOutcome,
  PracticeAttempt,
  Question,
  ReadingMockSession,
  ReadingSet,
  ReadingTaskType,
} from '@/lib/types';

/**
 * Reading is the one skill that is not a flat list of questions.
 *
 * A reading question is unanswerable on its own — the text it is about lives on
 * the passage, not on the question row — so `GET /questions?skill=reading` does
 * not return them. They come from `/api/v1/reading` with their passage attached,
 * which is what these hooks talk to.
 */

/** The practice menu: which task types exist, and how much is behind each. */
export function useReadingTypes(exam: ExamType) {
  return useQuery({
    queryKey: queryKeys.readingTypes(exam),
    queryFn: () =>
      api.get<{
        types: ReadingTaskType[];
        mockRequiredTypes: string[];
        mockPassageCount: number;
      }>('/reading/types', { exam }),
    // Content, not learner data: it changes when someone writes a passage.
    staleTime: 10 * 60_000,
  });
}

/** What came back for one question after it was checked. */
export interface ReadingAnswerResult {
  attempt: PracticeAttempt;
  review: Question;
}

/**
 * One reading practice sitting: deal a set, fill it in, check it.
 *
 * Dealing is a POST rather than a GET because it has a consequence — the server
 * records that this learner has now read the passage, which is what stops the
 * next set repeating it.
 *
 * Checking submits each answered question to `POST /practice/attempts`, the same
 * endpoint every other question uses. That keeps one grading path for the whole
 * app, at the cost of one request per question.
 */
export function useReadingPractice(exam: ExamType) {
  const toast = useToast();
  const { refreshUser } = useApp();

  const [set, setSet] = useState<ReadingSet | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerSubmission>>({});
  const [results, setResults] = useState<Record<string, ReadingAnswerResult>>({});
  const [dealing, setDealing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  const deal = useCallback(
    async (typeId: string) => {
      setDealing(true);
      try {
        const data = await api.post<{ set: ReadingSet }>('/reading/practice', { exam, typeId });
        setSet(data.set);
        setAnswers({});
        setResults({});
        setStartedAt(Date.now());
      } catch (err) {
        setSet(null);
        if (err instanceof ApiError && err.status === 404) {
          toast.warning('Nothing to practise there yet', errorMessage(err));
        } else {
          toast.error('Could not load a passage', errorMessage(err));
        }
      } finally {
        setDealing(false);
      }
    },
    [exam, toast],
  );

  const answer = useCallback((questionId: string, patch: Partial<AnswerSubmission>) => {
    setAnswers(previous => ({
      ...previous,
      [questionId]: { ...previous[questionId], questionId, ...patch },
    }));
  }, []);

  const questionsOf = useCallback(
    (target: ReadingSet | null) => (target ? target.groups.flatMap(group => group.questions) : []),
    [],
  );

  /**
   * Grades every question the learner actually answered. Blank ones are left
   * alone rather than submitted empty: an unanswered question is not a wrong
   * answer, and sending it would put a mistake in their bank they never made.
   */
  const check = useCallback(async () => {
    if (!set || checking) return;
    setChecking(true);

    // Split evenly across the questions attempted. Per-question timing would
    // need a timer per input, and the total is what the estimate uses anyway.
    const answered = questionsOf(set).filter(question => hasAnswer(answers[question.id]));
    const perQuestion = Math.max(
      1,
      Math.round((Date.now() - startedAt) / 1000 / Math.max(1, answered.length)),
    );

    const graded: Record<string, ReadingAnswerResult> = {};
    try {
      for (const question of answered) {
        const submission = answers[question.id];
        const data = await api.post<ReadingAnswerResult & { xpAwarded: number }>('/practice/attempts', {
          questionId: question.id,
          textResponse: submission.textResponse || undefined,
          selectedOptions: submission.selectedOptions?.length ? submission.selectedOptions : undefined,
          blankResponses: submission.blankResponses,
          timeSpentSeconds: perQuestion,
        });
        graded[question.id] = { attempt: data.attempt, review: data.review };
      }
      setResults(graded);

      // XP, streak and mission progress all moved server-side.
      await refreshUser();
    } catch (err) {
      // Answering the first question of a set now spends a sub-test, so this
      // call can be refused where it never could before. Anything already
      // graded above stays on screen — the learner keeps the marks they earned.
      if (err instanceof ApiError && err.isLimitReached) {
        setResults(graded);
        toast.warning(
          'Daily sub-test limit reached',
          errorMessage(err, "You have used all of today's practice sub-tests."),
        );
        await refreshUser();
      } else {
        toast.error('Could not check your answers', errorMessage(err));
      }
    } finally {
      setChecking(false);
    }
  }, [answers, checking, questionsOf, refreshUser, set, startedAt, toast]);

  const questions = questionsOf(set);
  const answeredCount = questions.filter(question => hasAnswer(answers[question.id])).length;
  const correctCount = Object.values(results).filter(result => result.attempt.isCorrect).length;

  return {
    set,
    answers,
    results,
    dealing,
    checking,
    deal,
    answer,
    check,
    totalQuestions: questions.length,
    answeredCount,
    correctCount,
    /** True once the set has been checked; the inputs then go read-only. */
    checked: Object.keys(results).length > 0,
  };
}

/**
 * One generated reading paper.
 *
 * Starting is not idempotent — it spends three passages the learner will never
 * be dealt again — so the server returns the paper they already hold rather
 * than dealing a second one. That is why `start` is safe to call on a retry.
 */
export function useReadingMock(exam: ExamType, onGraded?: (attempt: MockAttempt) => void) {
  const toast = useToast();
  const { refreshUser } = useApp();

  const [session, setSession] = useState<ReadingMockSession | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerSubmission>>({});
  const [outcome, setOutcome] = useState<MockSubmitOutcome | null>(null);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  const start = useCallback(async () => {
    setStarting(true);
    try {
      const data = await api.post<{ session: ReadingMockSession }>('/reading/mocks', { exam });
      setSession(data.session);
      setAnswers({});
      setOutcome(null);
      setStartedAt(Date.now());
      if (data.session.reusedPassages) {
        toast.warning(
          'Some passages are ones you have sat before',
          'There are not enough new reading passages in the bank yet, so this paper repeats one.',
        );
      }
    } catch (err) {
      if (err instanceof ApiError && err.isLimitReached) {
        toast.warning('Mock limit reached', errorMessage(err));
      } else {
        toast.error('Could not start the reading mock', errorMessage(err));
      }
    } finally {
      setStarting(false);
    }
  }, [exam, toast]);

  const answer = useCallback((questionId: string, patch: Partial<AnswerSubmission>) => {
    setAnswers(previous => ({
      ...previous,
      [questionId]: { ...previous[questionId], questionId, ...patch },
    }));
  }, []);

  const finish = useCallback(async () => {
    if (!session || submitting) return;
    setSubmitting(true);
    try {
      const data = await api.post<MockSubmitOutcome>(`/reading/mocks/${session.id}/submit`, {
        // Everything, including blanks. The server grades against the paper it
        // dealt, so an unanswered question has to arrive as unanswered rather
        // than be left out and counted as never asked.
        answers: session.sets?.flatMap(set =>
          set.groups.flatMap(group =>
            group.questions.map(question => answers[question.id] ?? { questionId: question.id }),
          ),
        ) ?? [],
        durationSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      });
      setOutcome(data);
      setSession(null);
      onGraded?.(data.attempt);
      await refreshUser();
    } catch (err) {
      toast.error('Could not submit the reading mock', errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }, [answers, onGraded, refreshUser, session, startedAt, submitting, toast]);

  /** Leaves the paper open on the server, so it can be resumed. */
  const exit = useCallback(() => {
    setSession(null);
    setOutcome(null);
  }, []);

  const questions = session?.sets?.flatMap(set => set.groups.flatMap(group => group.questions)) ?? [];

  return {
    session,
    answers,
    outcome,
    starting,
    submitting,
    start,
    answer,
    finish,
    exit,
    totalQuestions: questions.length,
    answeredCount: questions.filter(question => hasAnswer(answers[question.id])).length,
  };
}

/** Whether a submission carries anything the server could grade. */
function hasAnswer(submission?: AnswerSubmission): boolean {
  if (!submission) return false;
  return (
    Boolean(submission.textResponse?.trim()) ||
    Boolean(submission.selectedOptions?.length) ||
    Object.values(submission.blankResponses ?? {}).some(Boolean)
  );
}
