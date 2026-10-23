import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Clock, Headphones, LogOut, RefreshCw, RotateCcw, Send, Volume2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useRefreshMockPapers } from '@/lib/hooks/useMockPapers';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AnswerSubmission, MockAttempt, Question, isPremiumUser } from '@/lib/types';
import { subTestsLeft } from '@/lib/subscriptions';
import { Playback, playClips, playRecording, StoppedError, unlockAudio } from '@/lib/scriptPlayer';
import PracticeMockPaywall from '@/components/practice/PracticeMockPaywall';
import SectionMockIntro from '@/components/mocks/SectionMockIntro';

/** Mirrors billing.SectionMockSubTests on the server, which is what enforces it. */
const SECTION_MOCK_SUB_TESTS = 5;
/** Time to check answers after the last recording, as on the computer test. */
const REVIEW_SECONDS = 120;

interface ListeningGroup {
  id: string;
  typeId: string;
  instructions: string;
  heading?: string;
  imageUrl?: string;
  firstNumber: number;
  questions: Question[];
}

interface ListeningPart {
  partNo: number;
  setting: string;
  readingSeconds: number;
  firstNumber: number;
  lastNumber: number;
  groups: ListeningGroup[];
}

export interface ListeningSession {
  id: string;
  status: string;
  testTitle: string;
  secondsRemaining: number;
  reusedTest: boolean;
  partsPlayed: number;
  parts: ListeningPart[];
  draftAnswers: AnswerSubmission[];
}

interface ReviewQuestion extends Question {
  correctAnswers?: string[];
  explanation?: string;
}

export interface ListeningOutcome {
  attempt: MockAttempt;
  xpAwarded: number;
  review: ReviewQuestion[];
  scripts: string[];
  /** The answers as submitted, for the review list. */
  submitted?: AnswerSubmission[];
}

/** The IELTS Listening mock: start screen, the paper, then the marked result. */
export default function ListeningMockPanel() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refreshPapers = useRefreshMockPapers();
  const toast = useToast();
  const { user, activeExam, refreshUser } = useApp();
  const [session, setSession] = useState<ListeningSession | null>(null);
  const [outcome, setOutcome] = useState<ListeningOutcome | null>(null);
  const [starting, setStarting] = useState(false);

  const start = async (chosen?: string) => {
    setStarting(true);
    try {
      const paperId = chosen ?? searchParams.get('paper');
      const body = paperId ? { paperId } : {};
      const data = await api.post<{ session: ListeningSession }>('/listening/mocks', body);
      setSession(data.session);
      void refreshUser();
      refreshPapers();
    } catch (err) {
      if (err instanceof ApiError && err.isLimitReached) {
        toast.warning('Not enough sub-tests left today', errorMessage(err));
      } else {
        toast.error('Could not start the listening mock', errorMessage(err));
      }
    } finally {
      setStarting(false);
    }
  };

  if (!isPremiumUser(user)) return <PracticeMockPaywall skill="listening" exam={activeExam} />;
  if (outcome) return <ListeningResult outcome={outcome} onBack={() => navigate('/practice?skill=listening')} onRedo={() => { setOutcome(null); void start(); }} />;
  if (session) {
    return (
      <ListeningMockRunner
        session={session}
        onDone={result => {
          setOutcome(result);
          setSession(null);
          void refreshUser();
          refreshPapers();
        }}
        onLeave={() => navigate('/practice?skill=listening')}
        onClosed={message => {
          toast.warning('This paper is closed', message);
          setSession(null);
        }}
      />
    );
  }
  return (
    <SectionMockIntro
      exam="IELTS"
      skill="listening"
      title="Listening Sectional Test"
      description="Four recordings and forty questions, each recording played once, as in the test."
      duration="About 30 min"
      items="40 questions"
      parts={[
        { name: 'Part 1: Everyday conversation', detail: '10 questions' },
        { name: 'Part 2: Everyday monologue', detail: '10 questions' },
        { name: 'Part 3: Study discussion', detail: '10 questions' },
        { name: 'Part 4: Academic lecture', detail: '10 questions' },
      ]}
      rules={[
        'Each recording plays once.',
        'You get time to read the questions before each recording.',
        'You have two minutes to check your answers at the end.',
      ]}
      equipment="Use headphones, as in the test centre."
      credits={SECTION_MOCK_SUB_TESTS}
      subTestsRemaining={subTestsLeft(user?.subscription)}
      isStarting={starting}
      onStart={paperId => void start(paperId)}
    />
  );
}

type Phase = 'ready' | 'reading' | 'playing' | 'review' | 'submitting';

interface RunnerProps {
  session: ListeningSession;
  onDone: (outcome: ListeningOutcome) => void;
  onLeave: () => void;
  /**
   * The paper closed without a result: its time ran out with nothing
   * answered, or it was submitted elsewhere.
   */
  onClosed: (message: string) => void;
  /** Heading shown above the paper, e.g. inside a full mock. */
  title?: string;
}

/**
 * The paper. Before each part the learner reads the questions; the recording
 * then plays once, with no pause or replay. After the last part there are two
 * minutes to check answers, then the paper is submitted.
 */
export function ListeningMockRunner({ session, onDone, onLeave, onClosed, title }: RunnerProps) {
  const toast = useToast();
  const [answers, setAnswers] = useState<Record<string, AnswerSubmission>>(() => {
    const restored: Record<string, AnswerSubmission> = {};
    for (const saved of session.draftAnswers ?? []) restored[saved.questionId] = saved;
    return restored;
  });
  // A reopened paper continues with the next recording, never replays one.
  const [partIndex, setPartIndex] = useState(() => Math.min(session.partsPlayed, session.parts.length - 1));
  const [partsPlayed, setPartsPlayed] = useState(session.partsPlayed);
  const [phase, setPhase] = useState<Phase>(() => (session.partsPlayed >= session.parts.length ? 'review' : 'ready'));
  // A paper reopened after the last recording gets its checking time again.
  const [countdown, setCountdown] = useState(() => (session.partsPlayed >= session.parts.length ? REVIEW_SECONDS : 0));
  const [progress, setProgress] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [deadline] = useState(() => Date.now() + session.secondsRemaining * 1000);
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
  const playback = useRef<Playback | null>(null);
  const saved = useRef('');
  const autoSubmitted = useRef(false);

  const part = session.parts[partIndex];

  const save = useCallback(
    async (current: Record<string, AnswerSubmission>, played: number) => {
      const body = JSON.stringify({ current, played });
      if (body === saved.current) return;
      try {
        await api.put(`/listening/mocks/${session.id}/answers`, {
          answers: Object.values(current),
          partsPlayed: played,
        });
        saved.current = body;
      } catch {
        // Retried with the next change; the answers are still in the page.
      }
    },
    [session.id],
  );

  useEffect(() => {
    const timer = setTimeout(() => void save(answers, partsPlayed), 1500);
    return () => clearTimeout(timer);
  }, [answers, partsPlayed, save]);

  // The paper's own clock, kept by the server.
  useEffect(() => {
    const timer = setInterval(() => setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))), 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  // Phase countdowns: reading time before a part, checking time at the end.
  useEffect(() => {
    if (phase !== 'reading' && phase !== 'review') return;
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  const submit = useCallback(async () => {
    playback.current?.stop();
    setPhase('submitting');
    try {
      const submitted = Object.values(answers);
      const outcome = await api.post<ListeningOutcome>(`/listening/mocks/${session.id}/submit`, { answers: submitted });
      onDone({ ...outcome, submitted });
    } catch (err) {
      const timeUp = deadline <= Date.now();
      if (err instanceof ApiError && (err.status === 409 || (err.code === 'not_attempted' && timeUp))) {
        onClosed(errorMessage(err));
        return;
      }
      setPhase('review');
      toast.error('Could not submit the listening mock', errorMessage(err));
    }
  }, [answers, deadline, onClosed, onDone, session.id, toast]);

  const play = useCallback(async () => {
    if (!part) return;
    setAudioError(null);
    setPhase('playing');
    setProgress(0);
    // Once started, a recording counts as heard: leaving now does not earn a replay.
    const played = Math.max(partsPlayed, part.partNo);
    setPartsPlayed(played);
    void save(answers, played);
    try {
      // The stored recording, where the part has one; otherwise its script is
      // read aloud as before. A stored file that fails before a word is heard
      // falls back to the voice, so the one hearing is not lost.
      const base = `/listening/mocks/${session.id}/parts/${part.partNo}`;
      const stored = await api.get<{ url: string }>(`${base}/recording`).then(r => r.url).catch(() => '');
      let heard = false;
      if (stored) {
        const handle = playClips([{ url: stored }], fraction => {
          heard = heard || fraction > 0;
          setProgress(fraction);
        });
        playback.current = handle;
        try {
          await handle.done;
        } catch (err) {
          if (err instanceof StoppedError || heard) throw err;
        }
      }
      if (!stored || !heard) {
        const handle = await playRecording({ scriptUrl: `${base}/script`, audioUrl: `${base}/audio` }, setProgress);
        playback.current = handle;
        await handle.done;
      }
    } catch (err) {
      if (err instanceof StoppedError) return;
      setAudioError("The recording couldn't play. Check your sound and try again, or open Prepyo in Chrome or Edge.");
      return;
    }
    if (partIndex + 1 < session.parts.length) {
      setPartIndex(partIndex + 1);
      setCountdown(session.parts[partIndex + 1].readingSeconds);
      setPhase('reading');
    } else {
      setCountdown(REVIEW_SECONDS);
      setPhase('review');
    }
  }, [answers, part, partIndex, partsPlayed, save, session.id, session.parts]);

  // Reading time over: the recording starts by itself, as in the test.
  useEffect(() => {
    if (phase === 'reading' && countdown === 0) void play();
  }, [phase, countdown, play]);

  // Checking time over, or the paper's time gone: submit what there is, once.
  // A failed submission is left to the Submit button rather than retried.
  useEffect(() => {
    if (autoSubmitted.current || phase === 'submitting') return;
    if ((phase === 'review' && countdown === 0 && partsPlayed >= session.parts.length) || secondsLeft === 0) {
      autoSubmitted.current = true;
      void submit();
    }
  }, [phase, countdown, secondsLeft, partsPlayed, session.parts.length, submit]);

  useEffect(() => () => playback.current?.stop(), []);

  const answer = (question: Question, patch: Partial<AnswerSubmission>) =>
    setAnswers(previous => ({ ...previous, [question.id]: { ...previous[question.id], questionId: question.id, ...patch } }));

  const answered = Object.values(answers).filter(
    a => Boolean(a.textResponse?.trim()) || Boolean(a.selectedOptions?.length),
  ).length;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const visibleParts = phase === 'review' || phase === 'submitting' ? session.parts : part ? [part] : [];

  return (
    <div className="w-full min-h-[calc(100dvh-4rem)] px-3 sm:px-6 lg:px-8 py-3 space-y-3 bg-background">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-border pb-2.5">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">{title ?? session.testTitle}</h1>
          <p className="text-xs text-muted-foreground">4 parts • 40 questions • each recording plays once</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={secondsLeft <= 300 ? 'warning' : 'outline'} className="gap-1 font-mono">
            <Clock className="w-3 h-3" />
            {minutes}:{String(seconds).padStart(2, '0')}
          </Badge>
          <Badge variant={answered === 40 ? 'success' : 'outline'}>{answered}/40</Badge>
          <Button variant="outline" size="sm" onClick={onLeave} className="gap-1.5 font-bold">
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave</span>
          </Button>
        </div>
      </div>

      <Card className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground shrink-0">
          {phase === 'playing' ? <Volume2 className="w-4 h-4 text-primary" /> : <Headphones className="w-4 h-4 text-primary" />}
          {phase === 'review' || phase === 'submitting' ? 'Check your answers' : `Part ${part?.partNo} of 4`}
        </div>
        <div className="flex-1 space-y-1.5" aria-live="polite">
          {phase === 'ready' && (
            <p className="text-xs text-muted-foreground">
              {part?.partNo === 1
                ? 'Put on your headphones. When you start, you will have time to read the questions before each recording.'
                : `Continue with Part ${part?.partNo}. The recordings you have already heard do not play again.`}
            </p>
          )}
          {phase === 'reading' && (
            <p className="text-xs text-foreground">
              You now have {countdown} seconds to look at Questions {part?.firstNumber}–{part?.lastNumber}.
            </p>
          )}
          {phase === 'playing' && (
            <>
              <p className="text-xs text-foreground">Listen carefully and answer Questions {part?.firstNumber}–{part?.lastNumber}.</p>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            </>
          )}
          {phase === 'review' && (
            <p className="text-xs text-foreground">
              {partsPlayed >= session.parts.length
                ? `You have ${countdown} seconds to check your answers. The paper is then submitted.`
                : 'Check your answers, then submit.'}
            </p>
          )}
          {phase === 'submitting' && <p className="text-xs text-muted-foreground">Marking your paper…</p>}
          {audioError && <p role="alert" className="text-xs text-destructive">{audioError}</p>}
        </div>
        {phase === 'ready' && (
          <Button
            onClick={() => {
              // The recording starts after the reading time, not on this tap;
              // iOS needs audio unlocked by the tap itself.
              unlockAudio();
              setCountdown(part?.readingSeconds ?? 30);
              setPhase('reading');
            }}
            className="font-bold"
          >
            {part?.partNo === 1 ? 'Start test' : `Continue with Part ${part?.partNo}`}
          </Button>
        )}
        {audioError && (
          <Button
            variant="outline"
            onClick={() => {
              unlockAudio();
              void play();
            }}
            className="font-bold gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Try the audio again
          </Button>
        )}
        {(phase === 'review' || phase === 'submitting') && (
          <Button onClick={() => void submit()} disabled={phase === 'submitting'} className="font-bold gap-1.5">
            <Send className="w-3.5 h-3.5" /> Submit
          </Button>
        )}
      </Card>

      {session.reusedTest && (
        <p className="text-[11px] text-amber-700 dark:text-amber-400">
          You have taken this listening test before, so your result here is less reliable than a fresh test.
        </p>
      )}

      <div className="space-y-3">
        {visibleParts.map(p => (
          <Card key={p.partNo} className="p-4 space-y-4">
            <div>
              <h2 className="font-display font-bold text-base text-foreground">Part {p.partNo}: Questions {p.firstNumber}–{p.lastNumber}</h2>
              <p className="text-xs text-muted-foreground">{p.setting}</p>
            </div>
            {p.groups.map(group => (
              <ListeningGroupView
                key={group.id}
                group={group}
                answers={answers}
                disabled={phase === 'submitting'}
                onAnswer={answer}
              />
            ))}
          </Card>
        ))}
      </div>
    </div>
  );
}

function ListeningGroupView({
  group,
  answers,
  disabled,
  onAnswer,
}: {
  group: ListeningGroup;
  answers: Record<string, AnswerSubmission>;
  disabled: boolean;
  onAnswer: (question: Question, patch: Partial<AnswerSubmission>) => void;
}) {
  const last = group.firstNumber + group.questions.length - 1;
  return (
    <div className="space-y-2.5">
      <div>
        <p className="text-xs font-bold text-foreground">Questions {group.firstNumber}–{last}</p>
        <p className="text-xs text-muted-foreground">{group.instructions}</p>
        {group.heading && <p className="mt-1 text-sm font-semibold text-foreground">{group.heading}</p>}
      </div>
      {group.imageUrl && (
        <div className="mx-auto w-full max-w-xl overflow-hidden rounded-xl border border-border bg-white p-2">
          <img src={group.imageUrl} alt={group.heading || 'Map'} className="w-full h-auto" />
        </div>
      )}
      <ol className="space-y-2">
        {group.questions.map((question, index) => {
          const number = group.firstNumber + index;
          const current = answers[question.id];
          if (group.typeId === 'ielts-listening-completion') {
            const [before, after] = question.prompt.split('________');
            return (
              <li key={question.id} className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-foreground">
                <span className="font-bold tabular-nums w-6">{number}</span>
                <span>{before}</span>
                <input
                  type="text"
                  aria-label={`Question ${number}`}
                  value={current?.textResponse ?? ''}
                  disabled={disabled}
                  onChange={event => onAnswer(question, { textResponse: event.target.value })}
                  className="h-7 w-36 rounded-md border border-input bg-card px-2 text-sm"
                  autoComplete="off"
                  spellCheck={false}
                />
                {after && <span>{after}</span>}
              </li>
            );
          }
          const compact = group.typeId === 'ielts-listening-map' || group.typeId === 'ielts-listening-matching';
          return (
            <li key={question.id} className="space-y-1">
              <p className="text-xs sm:text-sm text-foreground">
                <span className="font-bold tabular-nums mr-2">{number}</span>
                {question.prompt}
              </p>
              <div className={compact ? 'flex flex-wrap gap-1.5 pl-8' : 'space-y-1 pl-8'} role="radiogroup" aria-label={`Question ${number}`}>
                {(question.options ?? []).map(option => {
                  const selected = current?.selectedOptions?.[0] === option.id;
                  return (
                    <label
                      key={option.id}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs cursor-pointer ${
                        selected ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border text-foreground'
                      }`}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        className="sr-only"
                        checked={selected}
                        disabled={disabled}
                        onChange={() => onAnswer(question, { selectedOptions: [option.id] })}
                      />
                      <span className="font-mono font-bold">{option.id}</span>
                      {!compact && <span>{option.text}</span>}
                    </label>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function ListeningResult({ outcome, onBack, onRedo }: { outcome: ListeningOutcome; onBack: () => void; onRedo?: () => void }) {
  const [showScripts, setShowScripts] = useState(false);
  const answersById = new Map((outcome.submitted ?? []).map(a => [a.questionId, a]));
  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      <Card className="p-5 text-center space-y-1.5">
        <span className="text-xs font-bold text-muted-foreground uppercase">Estimated Listening band</span>
        <div className="font-display text-4xl font-black text-foreground">{outcome.attempt.userScore.toFixed(1)}</div>
        <p className="text-xs text-muted-foreground">
          {outcome.attempt.totalCorrect} of {outcome.attempt.totalQuestions} correct, converted with an indicative band table. A practice estimate, not an official result.
        </p>
        {outcome.xpAwarded > 0 && <Badge variant="default">+{outcome.xpAwarded} XP</Badge>}
      </Card>

      <Card className="p-4 space-y-2">
        <h2 className="font-display text-sm font-bold text-foreground">Answers</h2>
        <ol className="space-y-1.5">
          {outcome.review.map((question, index) => {
            const given = answersById.get(question.id);
            const key = (question.correctAnswers ?? []).join(' / ');
            return (
              <li key={question.id} className="text-xs text-foreground">
                <span className="font-bold tabular-nums mr-2">{index + 1}</span>
                <span className="text-muted-foreground">{question.prompt.replace('________', '…')}</span>
                <span className="ml-2">
                  Answer: <strong>{key}</strong>
                  {given && (given.textResponse || given.selectedOptions?.length) ? (
                    <span className="text-muted-foreground"> · yours: {given.textResponse || given.selectedOptions?.join(', ')}</span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>
      </Card>

      <Card className="p-4 space-y-2">
        <Button variant="ghost" size="sm" onClick={() => setShowScripts(open => !open)} className="font-bold -ml-2">
          {showScripts ? 'Hide transcripts' : 'Show transcripts'}
        </Button>
        {showScripts &&
          outcome.scripts.map((script, index) => (
            <div key={index} className="space-y-1">
              <p className="text-xs font-bold text-foreground">Part {index + 1}</p>
              <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{script}</p>
            </div>
          ))}
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onBack}>Back to listening practice</Button>
        {onRedo && (
          <Button onClick={onRedo} className="gap-1.5">
            <RotateCcw className="h-4 w-4" />
            Redo
          </Button>
        )}
      </div>
    </div>
  );
}
