import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/toast';
import { api, ApiError, errorMessage } from '@/lib/api';
import { encodeForUpload } from '@/lib/audio';
import { matchesTypeKey } from '@/lib/syllabus';
import { allowsMultipleChoices } from '@/lib/choices';
import { minimumWritingWords, writingWordCount } from '@/lib/writing';
import { useQuestions } from '@/lib/hooks/useResources';
import { isAiRatedListening } from '@/lib/listening';
import { Evaluation, PracticeAttempt, Question, SkillType } from '@/lib/types';

/**
 * How each skill is graded, which decides what the page can offer.
 *
 * - reading / listening are graded deterministically by POST /practice/attempts
 * - writing goes to the AI evaluator at POST /evaluations/writing
 * - speaking records audio and goes to POST /evaluations/speaking, which
 *   transcribes it and scores the transcript against what it heard
 */
export const GRADING: Record<SkillType, 'deterministic' | 'ai' | 'speech'> = {
  reading: 'deterministic',
  listening: 'deterministic',
  writing: 'ai',
  speaking: 'speech',
};

export interface PracticeResult {
  attempt?: PracticeAttempt;
  review?: Question;
  evaluation?: Evaluation;
  xpAwarded: number;
}

const SKILLS: SkillType[] = ['speaking', 'writing', 'reading', 'listening'];

/**
 * One practice sitting: the question list for a skill, the learner's answer,
 * and what came back from grading.
 *
 * Submission goes to a different endpoint per skill, which is the only real
 * complexity here — see `submit`.
 */
export function usePracticeSession() {
  const { activeExam, refreshUser } = useApp();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const [selectedSkill, setSelectedSkill] = useState<SkillType>(
    (searchParams.get('skill') as SkillType) || 'reading',
  );
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);

  // The answer being written, in whichever form this skill takes.
  const [textAnswer, setTextAnswer] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [blankResponses, setBlankResponses] = useState<Record<string, string>>({});
  const [recording, setRecording] = useState<Blob | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  const grading = GRADING[selectedSkill];
  const typeParam = searchParams.get('type');

  const resetAnswer = useCallback(() => {
    setResult(null);
    setTextAnswer('');
    setBlankResponses({});
    setSelectedOptions([]);
    setRecording(null);
    setStartedAt(Date.now());
  }, []);

  // Follow ?skill= when the sidebar links to a different skill.
  useEffect(() => {
    const skillParam = searchParams.get('skill') as SkillType;
    if (skillParam && SKILLS.includes(skillParam)) setSelectedSkill(skillParam);
  }, [searchParams]);

  // Cached per exam+skill, so switching back to a skill you have already opened
  // costs no request.
  const questionsQuery = useQuestions(activeExam, selectedSkill);
  const loading = questionsQuery.isPending;

  // A skill's bank holds every task type, so a sidebar link to one type has to
  // narrow the list rather than just pick a starting point in it. Without this
  // the navigator and Next question walk from Describe the figure straight into
  // the opinion essays.
  //
  // Memoised because the effect below depends on this array: a fresh one on
  // every render would reset the learner's answer on every render.
  const questions = useMemo(() => {
    const all = questionsQuery.data?.questions ?? [];
    if (!typeParam) return all;
    const ofType = all.filter(question => {
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
    });
    return ofType.length > 0 ? ofType : all;
  }, [questionsQuery.data, typeParam]);

  useEffect(() => {
    if (questionsQuery.error) {
      setCurrentQuestion(null);
      toast.error('Could not load questions', errorMessage(questionsQuery.error));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionsQuery.error]);

  // Which question to open. The sidebar links to a task type rather than a
  // question, so picking a type here is just a different starting point in the
  // list already loaded for the skill — no second fetch.
  useEffect(() => {
    setCurrentQuestion(questions[0] ?? null);
    resetAnswer();
  }, [questions, resetAnswer]);

  const selectQuestion = useCallback(
    (question: Question) => {
      setCurrentQuestion(question);
      resetAnswer();
    },
    [resetAnswer],
  );

  /** Clear the result and move to the question after the current one. */
  const goToNextQuestion = useCallback(() => {
    if (!currentQuestion) return;
    const next = questions[questions.findIndex(q => q.id === currentQuestion.id) + 1];
    resetAnswer();
    if (next) setCurrentQuestion(next);
  }, [currentQuestion, questions, resetAnswer]);

  const submit = async () => {
    if (!currentQuestion || submitting) return;
    setSubmitting(true);

    const timeSpentSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));

    try {
      if (grading === 'speech') {
        if (!recording) return;

        // Converted here rather than in the recorder: the learner may re-record
        // several times, and only the take they submit is worth the work.
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
      } else if (grading === 'ai' || isAiRatedListening(currentQuestion)) {
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
            textResponse: textAnswer || undefined,
            selectedOptions: selectedOptions.length ? selectedOptions : undefined,
            blankResponses: Object.keys(blankResponses).length ? blankResponses : undefined,
            timeSpentSeconds,
          },
        );
        setResult({ attempt: data.attempt, review: data.review, xpAwarded: data.xpAwarded });
      }

      // XP, streak and mission progress all changed server-side.
      await refreshUser();
    } catch (err) {
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

  const canSubmit =
    grading === 'speech'
      ? recording !== null
      : grading === 'ai'
        ? currentQuestion !== null && writingWordCount(textAnswer) >= minimumWritingWords(currentQuestion)
        : textAnswer.trim().length > 0 ||
        selectedOptions.length > 0 ||
        Object.values(blankResponses).some(Boolean);

  return {
    // Question list
    selectedSkill,
    setSelectedSkill,
    questions,
    currentQuestion,
    loading,
    typeParam,
    grading,
    // Answer
    textAnswer,
    setTextAnswer,
    selectedOptions,
    setSelectedOptions,
    blankResponses,
    setBlankResponses,
    setRecording,
    // Outcome
    submitting,
    result,
    canSubmit,
    // Actions
    submit,
    selectQuestion,
    goToNextQuestion,
  };
}
