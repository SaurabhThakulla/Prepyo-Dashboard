import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, errorMessage } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useRefreshMockPapers } from '@/lib/hooks/useMockPapers';
import { loadMistakeTask, mistakeReadingSet } from '@/lib/mistakePractice';
import { useToast } from '@/components/ui/toast';
import { useApp } from '@/context/AppContext';
import { READING_TYPES, familyOf } from '@/lib/readingTypes';
import {
  AnswerSubmission,
  ExamType,
  MockAttempt,
  MockSubmitOutcome,
  PracticeAttempt,
  Question,
  ReadingMockSession,
  ReadingPracticePassage,
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

/**
 * The passages practice can deal for a family of task types, for the practice
 * list. Re-order Paragraphs has none, so its list is empty.
 */
export function useReadingPracticePassages(exam: ExamType, typeIds: string[], enabled = true) {
  return useQuery({
    queryKey: queryKeys.readingPracticePassages(exam, typeIds),
    queryFn: () => {
      const params = new URLSearchParams({ exam });
      for (const id of typeIds) params.append('typeId', id);
      return api.get<{ passages: ReadingPracticePassage[] }>(`/reading/practice/passages?${params}`);
    },
    enabled: enabled && typeIds.length > 0,
  });
}

/** The practice menu: which task types exist, and how much is behind each. */
export function useReadingTypes(exam: ExamType, enabled = true) {
  return useQuery({
    queryKey: queryKeys.readingTypes(exam),
    queryFn: () =>
      api.get<{
        types: ReadingTaskType[];
        mockRequiredTypes: string[];
        mockPassageCount: number;
      }>('/reading/types', { exam }),
    enabled,
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
  const queryClient = useQueryClient();
  const { refreshUser } = useApp();

  const [set, setSet] = useState<ReadingSet | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerSubmission>>({});
  const [results, setResults] = useState<Record<string, ReadingAnswerResult>>({});
  const [dealing, setDealing] = useState(false);
  const [dealError, setDealError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  const deal = useCallback(
    async (typeId: string, mistakeId?: string, passageId?: string): Promise<ReadingSet | null> => {
      setDealing(true);
      setDealError(null);
      try {
        const data = mistakeId
          ? { set: mistakeReadingSet(await loadMistakeTask(mistakeId, exam, 'reading')) }
          : await api.post<{ set: ReadingSet }>('/reading/practice', {
          exam,
          typeId,
          // The whole heading, so a passage hands over every set behind it.
          typeIds: familyOf(typeId),
          // A passage chosen from the practice list; otherwise the server
          // deals the one practised least recently.
          ...(passageId ? { passageId } : {}),
        });
        setSet(data.set);
        setAnswers({});
        setResults({});
        setStartedAt(Date.now());
        // The practice list marks the passage just dealt as practised.
        void queryClient.invalidateQueries({ queryKey: ['reading', 'practice-passages'] });
        return data.set;
      } catch (err) {
        setSet(null);
        setDealError(errorMessage(err));
        if (err instanceof ApiError && err.status === 404) {
          toast.warning('Nothing to practise there yet', errorMessage(err));
        } else {
          toast.error('Could not load a passage', errorMessage(err));
        }
        return null;
      } finally {
        setDealing(false);
      }
    },
    [exam, queryClient, toast],
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
          // The exam the learner is working under. The server records it on the
          // attempt: a question on a shared passage may be set by both exams,
          // so the question can no longer say which one this was.
          exam,
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
      return graded;
    } catch (err) {
      setResults(graded);
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

  // A gap-fill or an ordering task is one question carrying several marks, and
  // the server grades it that way. Counting whole questions reported a learner
  // who filled four of five gaps as nothing correct at all.
  const graded = questions.filter(question => results[question.id]);
  const partsTotal = graded.reduce((sum, question) => sum + partsOf(question), 0);
  const partsCorrect = graded.reduce((sum, question) => {
    const accuracy = results[question.id].attempt.accuracyPercentage;
    return sum + Math.round((accuracy / 100) * partsOf(question));
  }, 0);

  const reset = useCallback(() => {
    setSet(null);
    setAnswers({});
    setResults({});
    setDealing(false);
    setDealError(null);
    setChecking(false);
    setStartedAt(Date.now());
  }, []);

  return {
    set,
    answers,
    results,
    dealing,
    dealError,
    checking,
    deal,
    answer,
    check,
    reset,
    totalQuestions: questions.length,
    answeredCount,
    correctCount,
    partsCorrect,
    partsTotal,
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
  const refreshPapers = useRefreshMockPapers();

  const [session, setSession] = useState<ReadingMockSession | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerSubmission>>({});
  const [outcome, setOutcome] = useState<MockSubmitOutcome | null>(null);
  // The paper closed without a result: time ran out with nothing answered.
  const [closed, setClosed] = useState(false);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const savedAnswers = useRef('{}');

  /** Opens a dealt paper: one this hook started, or one a full mock dealt. */
  const open = useCallback(
    (paper: ReadingMockSession) => {
      setSession(paper);
      // A reopened paper comes back with the answers saved on the server.
      const restored: Record<string, AnswerSubmission> = {};
      for (const saved of paper.draftAnswers ?? []) restored[saved.questionId] = saved;
      setAnswers(restored);
      savedAnswers.current = JSON.stringify(restored);
      setOutcome(null);
      setClosed(false);
      setStartedAt(Date.now());
      if (paper.reusedPassages) {
        toast.warning(
          'Some passages are ones you have sat before',
          'There are not enough new reading passages in the bank yet, so this paper repeats one.',
        );
      }
    },
    [toast],
  );

  const start = useCallback(async (paperId?: string): Promise<boolean> => {
    setStarting(true);
    try {
      const payload: { exam: ExamType; paperId?: string } = { exam };
      if (paperId) payload.paperId = paperId;
      const data = await api.post<{ session: ReadingMockSession }>('/reading/mocks', payload);
      open(data.session);
      refreshPapers();
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.isLimitReached) {
        toast.warning('Not enough sub-tests left today', errorMessage(err));
      } else {
        toast.error('Could not start the reading mock', errorMessage(err));
      }
      return false;
    } finally {
      setStarting(false);
    }
  }, [exam, open, refreshPapers, toast]);

  // Answers are saved to the server as the learner works, a moment after the
  // last change. The server keeps the paper's time: a reopened paper resumes
  // with these answers, and one that runs out of time is graded from them.
  const saveDrafts = useCallback(async (paper: ReadingMockSession, current: Record<string, AnswerSubmission>) => {
    const body = JSON.stringify(current);
    if (body === savedAnswers.current) return;
    try {
      await api.put(`/reading/mocks/${paper.id}/answers`, { answers: Object.values(current) });
      savedAnswers.current = body;
    } catch {
      // A failed save is retried with the next change or on submission; the
      // answers are still in the page.
    }
  }, []);

  useEffect(() => {
    if (!session || outcome) return;
    const timer = setTimeout(() => void saveDrafts(session, answers), 1500);
    return () => clearTimeout(timer);
  }, [answers, session, outcome, saveDrafts]);

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
      refreshPapers();
      await refreshUser();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'paper_expired') {
        // Time ran out on a paper with nothing answered: the server closed it
        // without a band, so there is nothing left to resume.
        setSession(null);
        setClosed(true);
        toast.warning('Time is up', errorMessage(err));
      } else if (err instanceof ApiError && err.code === 'not_attempted') {
        toast.warning('Nothing answered yet', errorMessage(err));
      } else {
        toast.error('Could not submit the reading mock', errorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  }, [answers, onGraded, refreshPapers, refreshUser, session, startedAt, submitting, toast]);

  /** Leaves the paper open on the server, so it can be resumed. */
  const exit = useCallback(() => {
    if (session) void saveDrafts(session, answers);
    setSession(null);
    setOutcome(null);
  }, [answers, saveDrafts, session]);

  const questions = session?.sets?.flatMap(set => set.groups.flatMap(group => group.questions)) ?? [];

  return {
    session,
    answers,
    outcome,
    closed,
    starting,
    submitting,
    start,
    open,
    answer,
    finish,
    exit,
    totalQuestions: questions.length,
    answeredCount: questions.filter(question => hasAnswer(answers[question.id])).length,
  };
}

/**
 * How many marks a question is worth to a learner counting their own score:
 * one per gap, one per adjacent pair of boxes, and otherwise one for the
 * question. Mirrors what scoring.proportional divides by on the server.
 */
function partsOf(question: Question): number {
  if (question.blanks?.length) return question.blanks.length;
  if (question.typeId === READING_TYPES.reorderParagraphs) {
    return Math.max((question.options?.length ?? 2) - 1, 1);
  }
  return 1;
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
