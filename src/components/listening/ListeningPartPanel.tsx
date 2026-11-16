import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, FileText, Headphones, RefreshCw, RotateCcw, Send, Shuffle, Trophy } from 'lucide-react';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AnswerSubmission, PracticeAttempt, Question } from '@/lib/types';
import PracticeActionBar from '@/components/practice/flow/PracticeActionBar';
import QuestionHeader from '@/components/practice/QuestionHeader';
import { NavNumber } from '@/components/mocks/QuestionNav';
import PromptAudio from '@/components/practice/PromptAudio';
import { splitTurns } from '@/lib/listeningScript';
import { ListeningGroup, ListeningGroupView } from '@/components/practice/ListeningMockPanel';
import ListeningPartResult from '@/components/listening/ListeningPartResult';
import MyScore from '@/components/practice/flow/MyScore';

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
 * POST /practice/attempts. The transcript opens on request at any time, and on its own after marking.
 */
export default function ListeningPartPanel({ partNo, partId, listOpen, onBackToList, onNext }: {
  /** The next recording in the part's list, after the one on screen. */
  onNext?: (currentId: string) => void;
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
  const [showScript, setShowScript] = useState(false);
  const [loadingScript, setLoadingScript] = useState(false);
  const [current, setCurrent] = useState<number>();
  const [page, setPage] = useState(0);
  const [showResult, setShowResult] = useState(false);
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
      setShowScript(false);
      setCurrent(undefined);
      setPage(0);
      setShowResult(false);
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

  // What the speakers say, at any time in practice (never in a mock: the server refuses an open mock's part).
  const openScript = async () => {
    if (!part) return;
    if (script === null) {
      setLoadingScript(true);
      try {
        const { script: text } = await api.get<{ script: string }>(`/listening/practice/parts/${part.id}/script`);
        setScript(text);
      } catch (err) {
        toast.error('Could not load the transcript', errorMessage(err));
        return;
      } finally {
        setLoadingScript(false);
      }
    }
    setShowScript(true);
  };

  const check = async () => {
    if (!part || checking || answered.length === 0) return;
    setChecking(true);
    const perQuestion = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000 / answered.length));
    const graded: Record<string, Marked> = {};
    try {
      // Every question, a blank one too: it is marked wrong, as the result says, and the review gets its key.
      for (const question of questions) {
        const answer = answers[question.id];
        graded[question.id] = await api.post<Marked>('/practice/attempts', {
          questionId: question.id,
          exam: 'IELTS',
          textResponse: answer?.textResponse || undefined,
          selectedOptions: answer?.selectedOptions?.length ? answer.selectedOptions : undefined,
          timeSpentSeconds: perQuestion,
        });
      }
      setMarked(graded);
      setShowResult(true);
      await openScript();
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

  const backButton = onBackToList && (
    <Button variant="outline" onClick={onBackToList} className={`${PILL} gap-2`}>
      <ArrowLeft className="h-4 w-4" />
      <span>Back to questions</span>
    </Button>
  );

  if (!part) {
    return (
      <div className="w-full space-y-4 px-4 py-5 sm:px-6 lg:px-8">
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
              {backButton}
            </div>
          </Card>
        )}
      </div>
    );
  }

  const checked = marked !== null;
  const correct = Object.values(marked ?? {}).filter(result => result.attempt.isCorrect).length;

  const shownGroup = part.groups[Math.min(page, part.groups.length - 1)];
  const rangeOf = (group: ListeningGroup) => `${group.firstNumber}–${group.firstNumber + group.questions.length - 1}`;
  const showPage = (index: number) => {
    setPage(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // To a question from the number bar: its group's page, scrolled to the question, its field focused.
  const jump = (number: number) => {
    setCurrent(number);
    setPage(Math.max(0, part.groups.findIndex(g => number >= g.firstNumber && number < g.firstNumber + g.questions.length)));
    // After the page has rendered.
    setTimeout(() => {
      const target = document.getElementById(`lq-${number}`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target?.querySelector<HTMLElement>('input, button')?.focus({ preventScroll: true });
    }, 50);
  };

  // As on the computer-delivered test: every question's number, filled once answered, the group being
  // worked on ringed. `dark`: the bar is dark blue, so the numbers take the dark theme's colours.
  const numberBar = (
    // Bigger numbers than the mock's bar, with more room between them.
    <nav aria-label="Questions" className="dark flex flex-wrap items-center justify-center gap-3 [&_button]:h-10 [&_button]:min-w-10 [&_button]:text-sm">

      {part.groups.map(group => {
        const here = group.id === shownGroup.id;
        return (
          <div key={group.id} className={`flex items-center gap-2 rounded-full p-1 ${here ? 'ring-2 ring-white/70' : ''}`}>
            {group.questions.map((question, index) => (
              <NavNumber
                key={question.id}
                number={group.firstNumber + index}
                answered={Boolean(answerText(answers[question.id]))}
                flagged={false}
                current={current === group.firstNumber + index}
                light
                onClick={() => jump(group.firstNumber + index)}
              />
            ))}
          </div>
        );
      })}
    </nav>
  );

  // Laid out as every other question page (Speaking's): the header band, then the task on the page's white.
  return (
    <div className="w-full space-y-4 px-4 pb-5 sm:px-6 lg:px-8">
      <QuestionHeader
        code={`P${part.partNo}`}
        title={`Part ${part.partNo} · Questions ${part.firstNumber}–${part.lastNumber}`}
        actions={
          <>
            <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-card px-3 text-xs font-bold tabular-nums text-primary">
              <Headphones className="h-4 w-4" aria-hidden />
              {answered.length}/{questions.length} answered
            </span>
            <Button
              variant="outline"
              aria-pressed={showScript}
              onClick={() => (showScript ? setShowScript(false) : void openScript())}
              disabled={loadingScript}
              className={`${PILL} gap-2`}
            >
              {loadingScript ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 text-primary" />}
              <span>{showScript ? 'Hide transcript' : 'Transcript'}</span>
            </Button>
            {backButton}
          </>
        }
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          {part.testTitle} · {part.setting.replace(/\.\s*$/, '')}. Read the questions first, then play the recording.
        </p>
      </QuestionHeader>

      {/* Above every page, so the recording plays on while the learner moves between them.
          Speaking's player; key: a new recording loads from the start. */}
      <PromptAudio key={part.id} audioUrl={part.audioUrl} title={`Part ${part.partNo} recording`} layout="bar" />
      {showScript && script && (
        <div className="rounded-2xl border border-border/70 bg-slate-50/70 p-4 dark:bg-white/[0.03]">
          <h3 className="mb-2 text-sm font-bold">Transcript</h3>
          {/* A turn a line, its speaker in bold: the script is stored as one paragraph. */}
          <div className="space-y-2 text-sm leading-relaxed text-foreground/90">
            {splitTurns(script).map((turn, i) => (
              <p key={i}>
                {turn.speaker && <strong className="font-bold text-foreground">{turn.speaker}: </strong>}
                {turn.text}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* One question group a page, as on the test (11-13, then 14-20); the number bar moves between them.
          The question being worked on, for the bar: whichever numbered question holds the focus. */}
      <div
        className="rounded-2xl border border-border/70 p-4 sm:p-5"
        onFocusCapture={event => {
          const id = (event.target as HTMLElement).closest('[id^="lq-"]')?.id;
          if (id) setCurrent(Number(id.slice(3)));
        }}
      >
        <ListeningGroupView
          key={shownGroup.id}
          group={shownGroup}
          showRange={false}
          showInstructions={false}
          paper
          answers={answers}
          disabled={checked || checking}
          onAnswer={(question, patch) =>
            setAnswers(previous => ({ ...previous, [question.id]: { ...previous[question.id], questionId: question.id, ...patch } }))
          }
        />
        {part.groups.length > 1 && (
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
            {page > 0 ? (
              <Button variant="outline" onClick={() => showPage(page - 1)} className={`${PILL} gap-2`}>
                <ArrowLeft className="h-4 w-4" />
                <span>Questions {rangeOf(part.groups[page - 1])}</span>
              </Button>
            ) : <span />}
            {page < part.groups.length - 1 && (
              <Button variant="outline" onClick={() => showPage(page + 1)} className={`${PILL} gap-2`}>
                <span>Questions {rangeOf(part.groups[page + 1])}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {marked && (
        <ListeningPartResult
          open={showResult}
          onOpenChange={setShowResult}
          title={`Part ${part.partNo} · Questions ${part.firstNumber}–${part.lastNumber}`}
          groups={part.groups}
          answers={answers}
          marked={marked}
        />
      )}

      <PracticeActionBar
        onShuffle={() => void deal()}
        onNext={onNext ? () => onNext(part.id) : undefined}
        disabled={dealing || checking}
        middle={numberBar}
        actions={
          checked ? (
            <>
              <Button variant="outline" onClick={() => setShowResult(true)} className={PILL}>
                <Trophy className="h-3.5 w-3.5" />
                <span>See your result ({correct}/{questions.length})</span>
              </Button>
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

      {/* This recording's earlier tries, as under every practice item: each Submit is one sitting of its questions. */}
      <MyScore questionIds={questions.map(question => question.id)} bySitting />
    </div>
  );
}
