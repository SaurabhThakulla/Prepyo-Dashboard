import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Headphones, RefreshCw, RotateCcw, Send, Shuffle, XCircle } from 'lucide-react';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AnswerSubmission, PracticeAttempt, Question } from '@/lib/types';
import PracticeActionBar from '@/components/practice/flow/PracticeActionBar';
import { ListeningGroup, ListeningGroupView } from '@/components/practice/ListeningMockPanel';
import { ResultCard } from '@/components/reading/ReadingPracticePanel';

/** One IELTS Listening part dealt for practice (listeningmock.DealtPart). */
interface DealtPart {
  id: string;
  testTitle: string;
  partNo: number;
  setting: string;
  readingSeconds: number;
  audioUrl: string;
  firstNumber: number;
  lastNumber: number;
  groups: ListeningGroup[];
}

interface Marked {
  attempt: PracticeAttempt;
  review: Question;
}

const PILL = 'h-9 gap-1.5 rounded-full px-3 text-xs font-bold sm:px-4';

const answerText = (answer?: AnswerSubmission) =>
  answer?.selectedOptions?.length ? answer.selectedOptions.join(', ') : (answer?.textResponse ?? '').trim();

/**
 * IELTS Listening practice by part: one recording and its ten questions, as
 * one part of the real test. Answers are marked one by one through
 * POST /practice/attempts; the transcript (the answer key) comes after.
 */
export default function ListeningPartPanel({ partNo, partId, listOpen, onBackToList }: {
  partNo: number;
  /** A recording chosen from the list; without one the server picks the least recently heard. */
  partId?: string;
  /** The list is on screen: nothing is dealt until it closes. */
  listOpen: boolean;
  onBackToList?: () => void;
}) {
  const { refreshUser, setActiveTestSession } = useApp();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [part, setPart] = useState<DealtPart | null>(null);
  const [dealing, setDealing] = useState(false);
  const [dealError, setDealError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerSubmission>>({});
  const [marked, setMarked] = useState<Record<string, Marked> | null>(null);
  const [checking, setChecking] = useState(false);
  const [script, setScript] = useState<string | null>(null);
  const sessionId = useRef<string | null>(null);
  const startedAt = useRef(Date.now());

  const stop = useCallback(async () => {
    const id = sessionId.current;
    sessionId.current = null;
    setActiveTestSession(null);
    if (id) await api.post('/practice/stop', { sessionId: id }).catch(() => undefined);
  }, [setActiveTestSession]);

  // Deals a part and starts the sitting that pays for it (one sub-test covers the part).
  const deal = useCallback(async (id?: string) => {
    setDealing(true);
    setDealError(null);
    try {
      await stop();
      const { part: next } = await api.post<{ part: DealtPart }>('/listening/practice', { part: partNo, ...(id ? { partId: id } : {}) });
      const first = next.groups[0]?.questions[0];
      if (first) {
        const started = await api.post<{ sessionId: string }>('/practice/start', { exam: 'IELTS', skill: 'listening', questionId: first.id });
        sessionId.current = started.sessionId;
        setActiveTestSession({ isActive: true, title: `LISTENING: Part ${partNo}`, skill: 'listening', onStop: stop });
      }
      setPart(next);
      setAnswers({});
      setMarked(null);
      setScript(null);
      startedAt.current = Date.now();
      void refreshUser();
      void queryClient.invalidateQueries({ queryKey: ['listening', 'practice-parts'] });
    } catch (err) {
      setPart(null);
      const message = err instanceof ApiError && err.isLimitReached ? 'You have reached your daily sub-test allowance.' : errorMessage(err);
      setDealError(message);
      toast.error('Could not load a recording', message);
    } finally {
      setDealing(false);
    }
  }, [partNo, stop, setActiveTestSession, refreshUser, queryClient, toast]);

  // The chosen recording (or a fresh one) once the list closes; again when another is chosen.
  const dealtFor = useRef<string | null>(null);
  useEffect(() => {
    const key = `${partNo}:${partId ?? ''}`;
    if (listOpen || dealing || dealtFor.current === key) return;
    dealtFor.current = key;
    void deal(partId);
  }, [listOpen, dealing, partNo, partId, deal]);

  // Leaving the page ends the sitting.
  useEffect(() => () => { void stop(); }, [stop]);

  const questions = part?.groups.flatMap(group => group.questions) ?? [];
  const answered = questions.filter(question => answerText(answers[question.id]));
  const numberOf = (question: Question) => (part?.firstNumber ?? 1) + questions.indexOf(question);

  const check = async () => {
    if (!part || checking || answered.length === 0) return;
    setChecking(true);
    const perQuestion = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000 / answered.length));
    const graded: Record<string, Marked> = {};
    try {
      for (const question of answered) {
        const answer = answers[question.id];
        graded[question.id] = await api.post<Marked>('/practice/attempts', {
          questionId: question.id,
          exam: 'IELTS',
          textResponse: answer.textResponse || undefined,
          selectedOptions: answer.selectedOptions?.length ? answer.selectedOptions : undefined,
          timeSpentSeconds: perQuestion,
        });
      }
      setMarked(graded);
      const { script: text } = await api.get<{ script: string }>(`/listening/practice/parts/${part.id}/script`);
      setScript(text);
      void queryClient.invalidateQueries({ queryKey: ['practice-history'] });
      await refreshUser();
      await stop();
    } catch (err) {
      if (Object.keys(graded).length) setMarked(graded);
      toast.error('Could not mark every answer', errorMessage(err));
    } finally {
      setChecking(false);
    }
  };

  if (!part) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 p-3 sm:p-5">
        {dealing || !dealError ? (
          <>
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-96 w-full rounded-2xl" />
          </>
        ) : (
          <Card className="space-y-3 rounded-2xl p-6 text-center">
            <p className="text-sm text-muted-foreground">{dealError}</p>
            <div className="flex justify-center gap-2">
              <Button onClick={() => void deal(partId)}>Try again</Button>
              {onBackToList && <Button variant="outline" onClick={onBackToList}>All recordings</Button>}
            </div>
          </Card>
        )}
      </div>
    );
  }

  const checked = marked !== null;
  const correct = Object.values(marked ?? {}).filter(result => result.attempt.isCorrect).length;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-3 sm:p-5">
      <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
        <div className="flex items-center gap-2.5 bg-gradient-to-r from-primary to-primary/75 px-4 py-3 text-primary-foreground dark:!bg-muted dark:!text-foreground">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">
            <Headphones className="h-4 w-4" aria-hidden />
          </span>
          <h2 className="min-w-0 flex-1 truncate text-base font-bold sm:text-lg">
            Part {part.partNo} · Questions {part.firstNumber}–{part.lastNumber}
          </h2>
          <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums">
            {answered.length}/{questions.length} answered
          </span>
        </div>
        <div className="space-y-2 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {part.testTitle} · {part.setting.replace(/\.\s*$/, '')}. Read the questions first, then play the recording.
          </p>
          {/* key: a new recording loads from the start. */}
          <audio key={part.id} controls preload="metadata" src={part.audioUrl} className="w-full" aria-label={`Part ${part.partNo} recording`} />
        </div>
      </Card>

      <Card className="divide-y divide-border rounded-2xl p-4 shadow-sm sm:p-5">
        {part.groups.map(group => (
          <ListeningGroupView
            key={group.id}
            group={group}
            answers={answers}
            disabled={checked || checking}
            onAnswer={(question, patch) =>
              setAnswers(previous => ({ ...previous, [question.id]: { ...previous[question.id], questionId: question.id, ...patch } }))
            }
          />
        ))}
      </Card>

      {checked && (
        <>
          <ResultCard correct={correct} total={questions.length} note="Unanswered questions count as wrong. Anything you got wrong stays in your Mistake Bank." />
          <Card className="rounded-2xl p-4 shadow-sm sm:p-5">
            <h3 className="mb-2 text-sm font-bold">Answers</h3>
            <ol className="divide-y divide-border">
              {questions.map(question => {
                const result = marked?.[question.id];
                const yours = answerText(answers[question.id]);
                return (
                  <li key={question.id} className="flex items-start gap-2.5 py-2 text-sm">
                    {result?.attempt.isCorrect ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Correct" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-label="Wrong" />
                    )}
                    <span className="w-6 shrink-0 font-bold tabular-nums">{numberOf(question)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="text-muted-foreground">Your answer: </span>
                      <span className="font-semibold">{yours || '(blank)'}</span>
                      {!result?.attempt.isCorrect && (result?.review.correctAnswers?.length ?? 0) > 0 && (
                        <span className="text-emerald-700 dark:text-emerald-400"> · Answer: {result?.review.correctAnswers?.join(' / ')}</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          </Card>
          {script && (
            <Card className="rounded-2xl p-4 shadow-sm sm:p-5">
              <h3 className="mb-2 text-sm font-bold">Transcript</h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{script}</p>
            </Card>
          )}
        </>
      )}

      <PracticeActionBar
        onShuffle={() => void deal()}
        disabled={dealing || checking}
        actions={
          checked ? (
            <>
              <Button variant="outline" onClick={() => void deal(part.id)} className={PILL}>
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Redo</span>
              </Button>
              <Button onClick={() => void deal()} className={`${PILL} bg-blue-600 text-white shadow-2xs hover:bg-blue-700`}>
                <Shuffle className="h-3.5 w-3.5" />
                <span>Another recording</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => void check()}
                disabled={checking || answered.length === 0}
                className={`${PILL} border-primary text-primary hover:bg-primary hover:text-primary-foreground`}
              >
                {checking ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>{checking ? 'Checking…' : 'Submit'}</span>
              </Button>
              <Button variant="outline" onClick={() => setAnswers({})} disabled={checking || answered.length === 0} className={PILL}>
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Clear</span>
              </Button>
            </>
          )
        }
      />
    </div>
  );
}
