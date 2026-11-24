import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, Flag, Headphones, LogOut, RefreshCw, RotateCcw, Send } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useRefreshMockPapers } from '@/lib/hooks/useMockPapers';
import { useTestLock } from '@/lib/hooks/useTestLock';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AnswerSubmission, MockAttempt, Question, isInstitutionStudent, isPremiumUser } from '@/lib/types';
import { subTestsLeft } from '@/lib/subscriptions';
import { Playback, playClips, playRecording, StoppedError, unlockAudio } from '@/lib/scriptPlayer';
import RecordingStatus from '@/components/mocks/RecordingStatus';
import PracticeMockPaywall from '@/components/practice/PracticeMockPaywall';
import SectionMockIntro from '@/components/mocks/SectionMockIntro';
import ListeningLetterBoard from '@/components/listening/ListeningLetterBoard';
import ListeningGapOutline from '@/components/listening/ListeningGapOutline';
import MockHeader from '@/components/mocks/MockHeader';
import ConfirmSubmit from '@/components/mocks/ConfirmSubmit';
import { FlagToggle, NavNumber, toggled } from '@/components/mocks/QuestionNav';
import { LISTENING_TYPES, lettersMayRepeat } from '@/lib/listeningTypes';
import IeltsTestReport from '@/components/mocks/ielts/IeltsTestReport';
import QuestionFigure from '@/components/practice/QuestionFigure';

/** Mirrors billing.SectionMockSubTests on the server, which is what enforces it. */
const SECTION_MOCK_SUB_TESTS = 5;
/** Time to check answers after the last recording, as on the computer test. */
const REVIEW_SECONDS = 120;
/** Groups whose questions are typed into a gap, one answer each. */
const TYPED_GROUPS: string[] = ['ielts-listening-completion', LISTENING_TYPES.table, LISTENING_TYPES.diagram, LISTENING_TYPES.shortAnswer];
/** Groups answered by dragging a letter from the box, as on the computer-delivered test. */
const LETTER_GROUPS: string[] = [LISTENING_TYPES.matching, LISTENING_TYPES.diagram];

export interface ListeningGroup {
  id: string;
  typeId: string;
  instructions: string;
  heading?: string;
  imageUrl?: string;
  /** The notes as printed: "## " subheadings, "- " bullets, given lines, the group's k-th question at [[k]]. */
  outline?: string;
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

  if (!isPremiumUser(user)) return <PracticeMockPaywall skill="listening" exam={activeExam} institution={isInstitutionStudent(user)} />;
  if (outcome) return <ListeningResult outcome={outcome} onBack={() => navigate('/mocks')} onRedo={() => { setOutcome(null); void start(); }} />;
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
        onLeave={() => navigate('/mocks')}
        onClosed={message => {
          toast.warning('This paper is closed', message);
          setSession(null);
        }}
      />
    );
  }
  return (
    <SectionMockIntro
      institution={isInstitutionStudent(user)}
      exam="IELTS"
      skill="listening"
      title="Listening Sectional Test"
      description="Four recordings and forty questions, each recording played once, as in the test."
      duration="About 30 min"
      items="40 questions"
      parts={[
        { label: 'Recording 1', timing: '10 questions · everyday conversation' },
        { label: 'Recording 2', timing: '10 questions · everyday talk' },
        { label: 'Recording 3', timing: '10 questions · study discussion' },
        { label: 'Recording 4', timing: '10 questions · academic lecture' },
      ]}
      credits={SECTION_MOCK_SUB_TESTS}
      subTestsRemaining={subTestsLeft(user?.subscription)}
      isStarting={starting}
      onStart={paperId => void start(paperId)}
    />
  );
}

// 'heard': the part's recording has ended; the learner moves on with Next part.
type Phase = 'reading' | 'playing' | 'heard' | 'review' | 'submitting';

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
  useTestLock(title ?? 'Listening test', onLeave);
  const [answers, setAnswers] = useState<Record<string, AnswerSubmission>>(() => {
    const restored: Record<string, AnswerSubmission> = {};
    for (const saved of session.draftAnswers ?? []) restored[saved.questionId] = saved;
    return restored;
  });
  // A reopened paper continues with the next recording, never replays one.
  const [partIndex, setPartIndex] = useState(() => Math.min(session.partsPlayed, session.parts.length - 1));
  const [partsPlayed, setPartsPlayed] = useState(session.partsPlayed);
  // The part on screen while the recordings play. As in the computer-delivered test, the
  // learner may look at any part and come back; the recording plays on regardless.
  const [viewIndex, setViewIndex] = useState(() => Math.min(session.partsPlayed, session.parts.length - 1));
  // The part on screen during the checking time: one part at a time, as in the test.
  const [checkIndex, setCheckIndex] = useState(0);
  // One question group on screen at a time (Questions 11–15, then 16–20). Kept
  // with its part number, so a new part opens on its first group.
  const [groupPage, setGroupPage] = useState({ partNo: 0, index: 0 });
  // The part Next part was pressed on: it asks before moving on, as a part's recording never plays again.
  const [confirmPart, setConfirmPart] = useState<number | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  // Flagged question numbers, and the question last opened or worked on (the one Flag acts on).
  const [flags, setFlags] = useState<Set<number>>(() => new Set());
  const [current, setCurrent] = useState<number | undefined>();
  // The paper opens straight into the reading time, and each recording then
  // plays by itself, as in the test. The learner arrives here with a tap
  // (Start, Continue), which lets the browser play the sound.
  const [phase, setPhase] = useState<Phase>(() => (session.partsPlayed >= session.parts.length ? 'review' : 'reading'));
  // A paper reopened after the last recording gets its checking time again.
  const [countdown, setCountdown] = useState(() =>
    session.partsPlayed >= session.parts.length
      ? REVIEW_SECONDS
      : session.parts[Math.min(session.partsPlayed, session.parts.length - 1)]?.readingSeconds ?? 30,
  );
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
    // The learner moves on when ready, with Next part.
    setPhase('heard');
  }, [answers, part, partsPlayed, save, session.id]);

  // Next part, at any point in a part: stops its recording, which still counts
  // as heard (no replay), and opens the next part's reading time, or the
  // checking time after Part 4.
  const nextPart = useCallback(() => {
    if (!part) return;
    playback.current?.stop();
    setAudioError(null);
    const played = Math.max(partsPlayed, part.partNo);
    setPartsPlayed(played);
    void save(answers, played);
    if (partIndex + 1 < session.parts.length) {
      setPartIndex(partIndex + 1);
      // A new recording brings its part on screen, as in the test.
      setViewIndex(partIndex + 1);
      setCountdown(session.parts[partIndex + 1].readingSeconds);
      setPhase('reading');
    } else {
      setCountdown(REVIEW_SECONDS);
      setPhase('review');
    }
  }, [answers, part, partIndex, partsPlayed, save, session.parts]);

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

  // Ready the audio as the paper opens: the tap that opened it still counts.
  useEffect(() => {
    unlockAudio();
    return () => playback.current?.stop();
  }, []);

  const answer = (question: Question, patch: Partial<AnswerSubmission>) =>
    setAnswers(previous => ({ ...previous, [question.id]: { ...previous[question.id], questionId: question.id, ...patch } }));

  const answered = Object.values(answers).filter(
    a => Boolean(a.textResponse?.trim()) || Boolean(a.selectedOptions?.length),
  ).length;
  const shownPart = phase === 'review' || phase === 'submitting' ? session.parts[checkIndex] : session.parts[viewIndex] ?? part;
  const visibleParts = shownPart ? [shownPart] : [];
  const answeredIn = (p: ListeningPart) =>
    p.groups.reduce(
      (sum, group) =>
        sum +
        group.questions.filter(q => Boolean(answers[q.id]?.textResponse?.trim()) || Boolean(answers[q.id]?.selectedOptions?.length)).length,
      0,
    );
  const partCount = (p: ListeningPart) => p.lastNumber - p.firstNumber + 1;

  const checking = phase === 'review' || phase === 'submitting';

  const audioStatus = <RecordingStatus state={phase === 'reading' ? 'waiting' : phase === 'playing' ? 'playing' : 'done'} countdown={countdown} />;

  // Under the bar, only when the recording could not play: why, and a retry.
  const audioNote = audioError ? (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p role="alert" className="text-sm text-destructive">{audioError}</p>
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
    </div>
  ) : null;

  const isAnswered = (q: Question) => Boolean(answers[q.id]?.textResponse?.trim()) || Boolean(answers[q.id]?.selectedOptions?.length);
  // Any part may be opened at any time, as in the computer-delivered test; only the recordings are fixed.
  const canOpen = (index: number) => index >= 0 && index < session.parts.length;
  const jump = (index: number, number?: number) => {
    if (!canOpen(index)) return;
    if (checking) setCheckIndex(index);
    else setViewIndex(index);
    if (number) setCurrent(number);
    const target = session.parts[index];
    const holding = number ? target.groups.findIndex(g => number >= g.firstNumber && number < g.firstNumber + g.questions.length) : 0;
    setGroupPage({ partNo: target.partNo, index: Math.max(0, holding) });
    // After the part has rendered.
    setTimeout(() => {
      const target = number ? document.getElementById(`lq-${number}`) : null;
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
      target?.querySelector<HTMLElement>('input')?.focus({ preventScroll: true });
    }, 50);
  };
  // Next and back move through a part's question groups (21-25, then 26-30) before changing part.
  const shownGroup = shownPart && groupPage.partNo === shownPart.partNo ? Math.min(groupPage.index, shownPart.groups.length - 1) : 0;
  const nextGroup = shownPart && shownGroup < shownPart.groups.length - 1 ? shownGroup + 1 : null;
  const showGroup = (index: number) => {
    if (!shownPart) return;
    setGroupPage({ partNo: shownPart.partNo, index });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  // Flag acts only on a question of the part on screen.
  const flaggable = shownPart && current !== undefined && current >= shownPart.firstNumber && current <= shownPart.lastNumber ? current : undefined;
  const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

  // The bar along the bottom of the computer-delivered test: every part, the
  // open part's question numbers (filled once answered), and the audio status.
  const navigator = (
    <nav
      aria-label="Question navigator"
      className="sticky bottom-0 z-30 -mx-4 dark test-bar px-4 py-2.5 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.35)] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    >
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-4">
        <div className="flex shrink-0 items-center gap-4">
          <Button variant="ghost" onClick={onLeave} className="test-leave h-10 shrink-0 gap-2 rounded-full px-4 text-sm font-semibold">
            <LogOut className="h-4 w-4" /> Save and Exit
          </Button>
          <span className="hidden h-8 w-px bg-border lg:block" aria-hidden />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-0.5 scrollbar-thin">
          {session.parts.map((p, index) => {
            const open = canOpen(index);
            if (p.partNo !== shownPart?.partNo) {
              return (
                <button
                  key={p.partNo}
                  type="button"
                  disabled={!open}
                  onClick={() => jump(index)}
                  title={open ? `Go to Part ${p.partNo}` : undefined}
                  className="flex shrink-0 flex-col gap-1 rounded-xl bg-muted/60 px-3 py-1.5 text-left text-xs transition-colors enabled:hover:border-primary/50 enabled:hover:bg-primary/[0.04] disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-bold text-foreground">Part {p.partNo}</span>
                    <span className="tabular-nums text-muted-foreground">{answeredIn(p)}/{partCount(p)}</span>
                    {[...flags].some(n => n >= p.firstNumber && n <= p.lastNumber) && (
                      <Flag aria-label="has flagged questions" className="h-3 w-3 fill-amber-400 text-amber-500" />
                    )}
                  </span>
                  <span className="h-1 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${(answeredIn(p) / Math.max(1, partCount(p))) * 100}%` }} />
                  </span>
                </button>
              );
            }
            return (
              <div key={p.partNo} className="flex shrink-0 items-center gap-1 rounded-xl bg-primary/[0.07] px-2 py-1.5 ring-1 ring-primary/30">
                <span className="px-1.5 text-xs font-bold text-primary">Part {p.partNo}</span>
                {p.groups.flatMap(group =>
                  group.questions.map((q, i) => {
                    const number = group.firstNumber + i;
                    return (
                      <NavNumber
                        key={q.id}
                        number={number}
                        answered={isAnswered(q)}
                        flagged={flags.has(number)}
                        current={current === number}
                        onClick={() => jump(index, number)}
                      />
                    );
                  }),
                )}
              </div>
            );
          })}
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3" aria-live="polite">
          <FlagToggle
            number={flaggable}
            flagged={flaggable !== undefined && flags.has(flaggable)}
            onToggle={() => flaggable !== undefined && setFlags(previous => toggled(previous, flaggable))}
          />
          {phase === 'reading' && (
            <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-foreground">
              <Clock className="h-4 w-4 text-primary" /> Recording starts in <span className="tabular-nums">{countdown}s</span>
            </span>
          )}
          {phase === 'playing' && (
            <span className="flex items-center gap-2 rounded-full bg-primary/[0.07] px-3 py-1.5 text-xs font-semibold text-foreground">
              <Headphones className="h-4 w-4 animate-pulse text-primary" /> Part {part?.partNo} playing
              <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                <span className="block h-full bg-primary transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
              </span>
            </span>
          )}
          {(phase === 'reading' || phase === 'playing' || phase === 'heard') && (
            <Button
              onClick={() => (nextGroup !== null ? showGroup(nextGroup) : setConfirmPart(partIndex))}
              className="test-next h-10 gap-2 rounded-full px-6 font-bold tracking-wide"
              title={nextGroup !== null || phase === 'heard' ? undefined : "This part's recording will not play again"}
            >
              {nextGroup !== null ? 'Next' : partIndex + 1 < session.parts.length ? 'Next part' : 'Go to checking time'}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          {checking && (
            <>
              {partsPlayed >= session.parts.length && phase === 'review' && (
                <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-foreground">
                  <Clock className="h-4 w-4 text-primary" /> <span className="tabular-nums">{clock(countdown)}</span> to check
                </span>
              )}
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="icon" aria-label="Previous" disabled={checkIndex === 0 && shownGroup === 0} onClick={() => (shownGroup > 0 ? showGroup(shownGroup - 1) : jump(checkIndex - 1))} className="h-9 w-9 rounded-full">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Next"
                  disabled={nextGroup === null && checkIndex >= session.parts.length - 1}
                  onClick={() => (nextGroup !== null ? showGroup(nextGroup) : jump(checkIndex + 1))}
                  className="h-9 w-9 rounded-full"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button onClick={() => setConfirmSubmit(true)} disabled={phase === 'submitting'} className="h-9 gap-1.5 rounded-full px-5 font-bold shadow-md">
                  <Send className="h-3.5 w-3.5" /> {phase === 'submitting' ? 'Marking…' : 'Submit'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );

  return (
    <div className="flex w-full min-h-dvh flex-col px-4 sm:px-6 lg:px-8 bg-card">
      <MockHeader
        className="-mx-4 mb-3.5 sm:-mx-6 lg:-mx-8"
        code={checking ? 'L' : `P${part?.partNo ?? 1}`}
        title={title ?? session.testTitle}
        subtitle={`${checking ? 'All four parts' : `Part ${part?.partNo} of 4`} • 40 questions • each recording plays once`}
        secondsLeft={secondsLeft}
        answered={{ done: answered, total: 40 }}
      />
      <div className="flex-1 space-y-3.5 pb-6">

      {session.reusedTest && (
        <p className="text-[11px] text-amber-700 dark:text-amber-400">
          You have taken this listening test before, so your result here is less reliable than a fresh test.
        </p>
      )}

      {/* Once every recording has played, the bar to check and submit sits above the paper. */}
      {checking && (
        <div className="flex flex-col gap-3 rounded-2xl bg-primary/[0.06] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4" aria-live="polite">
          <p className="text-sm text-foreground">
            {phase === 'submitting'
              ? 'Marking your paper…'
              : partsPlayed >= session.parts.length
                ? <>All recordings have played. You have <strong>{countdown} seconds</strong> to check your answers; the paper is then submitted.</>
                : 'Check your answers, then submit.'}
          </p>
        </div>
      )}

      {/* Each part: its questions' heading, the recording, then the questions.
          Clicking or typing in a question makes it the one Flag acts on. */}
      <div
        className="space-y-5"
        onFocusCapture={event => {
          const id = (event.target as HTMLElement).closest('[id^="lq-"]')?.id;
          if (id) setCurrent(Number(id.slice(3)));
        }}
      >
        {visibleParts.map(p => (
          <section key={p.partNo} className="rounded-2xl bg-card">
            <div className="space-y-6 py-6 sm:px-2 sm:py-8">
              {(() => {
                const gi = groupPage.partNo === p.partNo ? Math.min(groupPage.index, p.groups.length - 1) : 0;
                const group = p.groups[gi];
                // A form, notes, a table or a matching set is drawn in its box with the title across the top,
                // so the heading above leaves it out.
                const boxedForm = Boolean(
                  group && !group.imageUrl &&
                    ((TYPED_GROUPS.includes(group.typeId) && group.questions.every(question => !question.options?.length)) ||
                      (LETTER_GROUPS.includes(group.typeId) && (group.questions[0]?.options?.length ?? 0) > 0)),
                );
                // One question group at a time (Next in the bar moves on): which questions, the recording, then the questions.
                return (
                  <>
                    {!checking && p.partNo === part?.partNo && audioNote}
                    {group && <GroupHeading group={boxedForm ? { ...group, heading: '' } : group} />}
                    {/* The recording sits above the questions, or under the map where there is one. */}
                    {!checking && p.partNo === part?.partNo && !group?.imageUrl && audioStatus}
                    {group && (
                      <ListeningGroupView
                        key={group.id}
                        group={group}
                        answers={answers}
                        disabled={phase === 'submitting'}
                        onAnswer={answer}
                        showHeading={false}
                        paper
                        afterFigure={!checking && p.partNo === part?.partNo ? audioStatus : null}
                      />
                    )}
                  </>
                );
              })()}
            </div>
          </section>
        ))}
      </div>
      </div>
      {navigator}

      <ConfirmSubmit
        open={confirmSubmit}
        onCancel={() => setConfirmSubmit(false)}
        onConfirm={() => void submit()}
        description={(() => {
          const unanswered = session.parts.flatMap(p => p.groups.flatMap(g => g.questions)).filter(q => !isAnswered(q)).length;
          return unanswered
            ? `${unanswered} question${unanswered === 1 ? ' is' : 's are'} unanswered and will be marked wrong. You cannot change your answers after this.`
            : undefined;
        })()}
      />

      <Dialog open={confirmPart === partIndex && !checking} onOpenChange={open => !open && setConfirmPart(null)}>
        <DialogContent centered>
          <DialogHeader>
            <DialogTitle>
              {partIndex + 1 < session.parts.length ? 'Do you want to go to the next part?' : 'Do you want to go to the checking time?'}
            </DialogTitle>
            <DialogDescription>
              {phase === 'heard'
                ? 'You can still change your answers to this part in the checking time.'
                : "This part's recording stops now and will not play again."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmPart(null)} className="min-w-[96px]">No</Button>
            <Button
              autoFocus
              onClick={() => {
                setConfirmPart(null);
                nextPart();
              }}
              className="min-w-[96px]"
            >
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** A typed question's line in the outline, its gap numbered as on the paper: "Child's surname: ____ (1)". */
const outlineLine = (prompt: string, number: number) => {
  const line = prompt.replace(/\s*\r?\n\s*/g, ' ');
  const gap = `____ (${number})`;
  return /_{3,}(?:\s*\(\d+\))?/.test(line) ? line.replace(/_{3,}(?:\s*\(\d+\))?/, gap) : `${line} ${gap}`;
};

/**
 * One group of questions inside its part's card: the question numbers and
 * heading, the instructions, then the paper.
 */
/** A group's question numbers, heading and instructions: "Questions 31–40 · Lecture: … · Complete the notes…". */
function GroupHeading({ group, showRange = true, showInstructions = true }: { group: ListeningGroup; showRange?: boolean; showInstructions?: boolean }) {
  // The word limit in capitals ("ONE WORD ONLY") is the part students must not miss.
  const pieces = group.instructions.split(/([A-Z]{2,}(?:[ /][A-Z]+)*)/);
  // As on the paper: which questions on their own line, what to do, then the title of what follows.
  return (
    <div className="space-y-2">
      {showRange && (
        <span className="inline-block rounded-md bg-primary px-2.5 py-1 text-sm font-bold tabular-nums text-primary-foreground">
          Questions {group.firstNumber}–{group.firstNumber + group.questions.length - 1}
        </span>
      )}
      {showInstructions && (
        <p className="text-lg font-medium leading-relaxed text-foreground">
          {pieces.map((piece, i) => (i % 2 ? <strong key={i} className="font-bold text-foreground">{piece}</strong> : piece))}
        </p>
      )}
      {group.heading && <h4 className={`${showInstructions ? 'pt-2 ' : ''}text-xl font-bold leading-snug text-foreground`}>{group.heading}</h4>}
    </div>
  );
}


export function ListeningGroupView({
  group,
  answers,
  disabled,
  onAnswer,
  showHeading = true,
  showRange = true,
  showInstructions = true,
  afterFigure,
  paper = false,
}: {
  group: ListeningGroup;
  answers: Record<string, AnswerSubmission>;
  disabled: boolean;
  onAnswer: (question: Question, patch: Partial<AnswerSubmission>) => void;
  /** False where the part card already shows the heading at its top. */
  showHeading?: boolean;
  /** False where the page's own header already says which questions these are. */
  showRange?: boolean;
  /** False in part practice, which leaves out the instruction line. */
  showInstructions?: boolean;
  /** Shown under the group's map or diagram, where it has one. */
  afterFigure?: React.ReactNode;
  /**
   * Part practice: a form, notes or a table drawn as on the test, in a box
   * with its title across the top and the question number inside each field.
   */
  paper?: boolean;
}) {
  const box = group.questions[0]?.options ?? [];
  // Part practice: a diagram labelled with letters is answered like a map, a letter picked beside each part.
  const letterPick = paper && group.typeId === LISTENING_TYPES.diagram && box.length > 0;
  const dragged = LETTER_GROUPS.includes(group.typeId) && box.length > 0 && !letterPick;
  const typed = TYPED_GROUPS.includes(group.typeId) && group.questions.every(question => !question.options?.length);
  const numberOf = (question: Question) => group.firstNumber + group.questions.indexOf(question);
  // Practice and the mocks: a form, notes, a table or a matching set sits in one box with its title across the top.
  const boxed = paper && !group.imageUrl && (typed || dragged);

  const board = dragged && (
    <ListeningLetterBoard
      options={box}
      items={group.questions.map((question, index) => ({
        slot: question.id,
        number: group.firstNumber + index,
        text: question.prompt,
      }))}
      values={Object.fromEntries(group.questions.map(question => [question.id, answers[question.id]?.selectedOptions?.[0]]))}
      // A letter answers several questions where the box is shorter than the list, or the instruction says so.
      reuse={box.length < group.questions.length || lettersMayRepeat(group.instructions)}
      disabled={disabled}
      boxTitle={group.typeId === LISTENING_TYPES.diagram ? 'Letters on the diagram' : 'Options'}
      stacked={paper}
      onChange={patch => {
        for (const [id, letter] of Object.entries(patch)) {
          const question = group.questions.find(q => q.id === id);
          if (question) onAnswer(question, { selectedOptions: letter ? [letter] : [] });
        }
      }}
    />
  );

  const outline = typed && (
    // Notes, forms, tables and short answers: the outline with a numbered box at each gap.
    <ListeningGapOutline
      passage={
        group.outline
          ? // The printed notes, their gaps renumbered as on this paper (the group's k-th question).
            group.outline.replace(/\[\[(\d+)\]\]/g, (_, k: string) => `[[${group.firstNumber + Number(k) - 1}]]`)
          : group.questions.map(question => outlineLine(question.prompt, numberOf(question))).join('\n')
      }
      blanks={group.questions.map(question => ({ id: String(numberOf(question)) }))}
      responses={Object.fromEntries(
        group.questions.map(question => [String(numberOf(question)), answers[question.id]?.textResponse ?? '']),
      )}
      disabled={disabled}
      paper={paper}
      onChange={responses => {
        for (const question of group.questions) {
          const value = responses[String(numberOf(question))] ?? '';
          if (value !== (answers[question.id]?.textResponse ?? '')) onAnswer(question, { textResponse: value });
        }
      }}
    />
  );

  if (boxed) {
    return (
      <div className="space-y-3 py-4 first:pt-0 last:pb-0">
        {showHeading && (showRange || showInstructions) && <GroupHeading group={{ ...group, heading: '' }} showRange={showRange} showInstructions={showInstructions} />}
        {/* A matching set is centred, its questions and options under one title. */}
        <div className={`${dragged ? 'mx-auto ' : ''}w-fit max-w-full overflow-hidden border border-foreground/80 bg-background`}>
          {group.heading && (
            <h4 className="border-b border-foreground/80 px-4 py-3 text-center text-base font-bold uppercase tracking-wide text-foreground">
              {group.heading}
            </h4>
          )}
          <div className={dragged ? 'p-3 sm:p-4' : 'px-3 py-2 sm:px-4'}>{typed ? outline : board}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="space-y-3">
        {showHeading && <GroupHeading group={group} showRange={showRange} showInstructions={showInstructions} />}

        {group.imageUrl && (
          // The same figure as in practice: drawn large enough to read, with zoom and a full view.
          <QuestionFigure src={group.imageUrl} alt={group.heading || 'Map'} />
        )}
        {group.imageUrl && afterFigure}

        {dragged ? (
          <div>{board}</div>
        ) : typed ? (
          outline
        ) : (
          <ol className="space-y-4">
            {group.questions.map(question => {
              const number = numberOf(question);
              const current = answers[question.id];
              const compact = group.typeId === 'ielts-listening-map' || letterPick;
              // Practice, as the test's plan labelling: the place, then a box, empty until a letter (A-H) is picked.
              if (compact && paper) {
                return (
                  <li key={question.id} id={`lq-${number}`} className="scroll-mt-24 text-sm text-foreground sm:text-base">
                    <label className="inline-flex flex-wrap items-center gap-2">
                      <span>
                        <span className="font-bold tabular-nums">{number}.</span> {question.prompt}
                      </span>
                      <select
                        value={current?.selectedOptions?.[0] ?? ''}
                        disabled={disabled}
                        onChange={event => onAnswer(question, { selectedOptions: event.target.value ? [event.target.value] : [] })}
                        aria-label={`Question ${number}`}
                        className={`h-8 w-24 cursor-pointer rounded-full border-2 bg-background px-3 text-sm font-semibold outline-none transition-colors hover:border-primary/60 focus:border-primary disabled:cursor-default ${
                          current?.selectedOptions?.[0] ? 'border-primary text-foreground' : 'border-slate-400 text-muted-foreground dark:border-slate-500'
                        }`}
                      >
                        <option value="" aria-label="No letter chosen" />
                        {(question.options ?? []).map(option => (
                          <option key={option.id} value={option.id}>{option.id}</option>
                        ))}
                      </select>
                    </label>
                  </li>
                );
              }
              return (
                <li key={question.id} id={`lq-${number}`} className="scroll-mt-24 space-y-2.5">
                  <p className="flex items-start gap-2 text-sm sm:text-base text-foreground">
                    <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground tabular-nums">
                      {number}
                    </span>
                    <span className="leading-relaxed">{question.prompt}</span>
                  </p>
                  <div
                    className={compact ? 'flex flex-wrap gap-2 sm:pl-8' : 'space-y-2.5 sm:pl-8'}
                    role="radiogroup"
                    aria-label={`Question ${number}`}
                  >
                    {(question.options ?? []).map(option => {
                      const selected = current?.selectedOptions?.[0] === option.id;
                      return (
                        <label
                          key={option.id}
                          className={`flex items-start gap-2.5 rounded-xl cursor-pointer text-base transition-colors ${
                            compact ? 'px-3.5 py-2' : 'p-3.5'
                          } ${selected ? 'bg-primary/15' : 'bg-muted/50 hover:bg-primary/[0.08]'}`}
                        >
                          <input
                            type="radio"
                            name={question.id}
                            checked={selected}
                            disabled={disabled}
                            onChange={() => onAnswer(question, { selectedOptions: [option.id] })}
                            className="mt-0.5 h-4 w-4 border-input text-primary focus:ring-primary"
                          />
                          <span className="font-bold text-primary">{option.id}</span>
                          {!compact && <span className="text-foreground font-medium leading-relaxed">{option.text}</span>}
                        </label>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

export function ListeningResult({
  outcome,
  onBack,
  onRedo,
  embedded = false,
}: {
  outcome: ListeningOutcome;
  onBack?: () => void;
  onRedo?: () => void;
  /** Shown inside another page (the full mock's result): no page frame or buttons. */
  embedded?: boolean;
}) {
  const [showScripts, setShowScripts] = useState(false);
  if (!embedded && outcome.attempt?.id) {
    return (
      <IeltsTestReport
        attemptId={outcome.attempt.id}
        xpAwarded={outcome.xpAwarded}
        backLabel="Back to mock tests"
        onBack={onBack}
        onRedo={onRedo}
      />
    );
  }
  const answersById = new Map((outcome.submitted ?? []).map(a => [a.questionId, a]));
  return (
    <div className={embedded ? 'space-y-4' : 'w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 space-y-4'}>
      <Card className="border-0 p-5 text-center space-y-1.5">
        <span className="text-xs font-bold text-muted-foreground uppercase">Estimated Listening band</span>
        <div className="font-display text-4xl font-black text-foreground">{outcome.attempt.userScore.toFixed(1)}</div>
        <p className="text-xs text-muted-foreground">
          {outcome.attempt.totalCorrect} of {outcome.attempt.totalQuestions} correct, converted with an indicative band table. A practice estimate, not an official result.
        </p>
        {outcome.xpAwarded > 0 && <Badge variant="default">+{outcome.xpAwarded} XP</Badge>}
      </Card>

      <Card className="border-0 p-4 space-y-2">
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

      <Card className="border-0 p-4 space-y-2">
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

      {!embedded && (
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onBack}>Back to mock tests</Button>
        {onRedo && (
          <Button onClick={onRedo} className="gap-1.5">
            <RotateCcw className="h-4 w-4" />
            Redo
          </Button>
        )}
      </div>
      )}
    </div>
  );
}
