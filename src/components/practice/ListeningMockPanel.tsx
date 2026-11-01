import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RefreshCw, RotateCcw, Send } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useRefreshMockPapers } from '@/lib/hooks/useMockPapers';
import { useTestLock } from '@/lib/hooks/useTestLock';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AnswerSubmission, MockAttempt, Question, isInstitutionStudent, isPremiumUser } from '@/lib/types';
import { subTestsLeft } from '@/lib/subscriptions';
import { Playback, playClips, playRecording, StoppedError, unlockAudio } from '@/lib/scriptPlayer';
import PracticeMockPaywall from '@/components/practice/PracticeMockPaywall';
import SectionMockIntro from '@/components/mocks/SectionMockIntro';
import ListeningLetterBoard from '@/components/listening/ListeningLetterBoard';
import ListeningGapOutline from '@/components/listening/ListeningGapOutline';
import { VoicePanel } from '@/components/practice/PromptAudio';
import MockHeader from '@/components/mocks/MockHeader';
import { LISTENING_TYPES, lettersMayRepeat } from '@/lib/listeningTypes';

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
      institution={isInstitutionStudent(user)}
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

type Phase = 'reading' | 'playing' | 'review' | 'submitting';

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
  // The part on screen during the checking time: one part at a time, as in the test.
  const [checkIndex, setCheckIndex] = useState(0);
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
  const shownPart = phase === 'review' || phase === 'submitting' ? session.parts[checkIndex] : part;
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

  const player = (
    <VoicePanel
      label={`Part ${part?.partNo} of 4 recording`}
      playing={phase === 'playing'}
      progress={phase === 'playing' ? progress : 0}
      status={
        phase === 'reading'
          ? `Starts in ${countdown}s · plays once`
          : phase === 'playing'
            ? `Playing · ${Math.round(progress * 100)}%`
            : ''
      }
      // Nothing to press: the recording starts by itself, once.
      disabled
      onToggle={() => undefined}
      toggleLabel={phase === 'playing' ? 'Recording playing' : 'The recording starts by itself'}
      toggleIcon={phase === 'playing' ? 'pause' : 'play'}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" aria-live="polite">
          <div className="space-y-1">
            {phase === 'reading' && (
              <p className="text-sm text-foreground">
                You now have <strong>{countdown} seconds</strong> to look at Questions {part?.firstNumber}–{part?.lastNumber}. The recording then starts by itself.
              </p>
            )}
            {phase === 'playing' && (
              <p className="text-sm text-foreground">Listen carefully and answer Questions {part?.firstNumber}–{part?.lastNumber}.</p>
            )}
            {audioError && <p role="alert" className="text-sm text-destructive">{audioError}</p>}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
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
          </div>
        </div>
      }
    />
  );

  return (
    <div className="w-full min-h-[calc(100dvh-4rem)] px-4 sm:px-6 lg:px-8 py-5 space-y-3.5 bg-background">
      <MockHeader
        code={checking ? 'L' : `P${part?.partNo ?? 1}`}
        title={title ?? session.testTitle}
        subtitle={`${checking ? 'All four parts' : `Part ${part?.partNo} of 4`} • 40 questions • each recording plays once`}
        secondsLeft={secondsLeft}
        answered={{ done: answered, total: 40 }}
        onLeave={onLeave}
      />

      {session.reusedTest && (
        <p className="text-[11px] text-amber-700 dark:text-amber-400">
          You have taken this listening test before, so your result here is less reliable than a fresh test.
        </p>
      )}

      {/* Once every recording has played, the bar to check and submit sits above the paper. */}
      {checking && (
        <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4" aria-live="polite">
          <p className="text-sm text-foreground">
            {phase === 'submitting'
              ? 'Marking your paper…'
              : partsPlayed >= session.parts.length
                ? <>All recordings have played. You have <strong>{countdown} seconds</strong> to check your answers; the paper is then submitted.</>
                : 'Check your answers, then submit.'}
          </p>
          <Button onClick={() => void submit()} disabled={phase === 'submitting'} className="shrink-0 gap-1.5 font-bold">
            <Send className="h-3.5 w-3.5" /> Submit
          </Button>
        </div>
      )}

      {/* During the checking time the learner moves between the parts, one on screen at a time. */}
      {checking && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist" aria-label="Parts">
          {session.parts.map((p, index) => {
            const done = answeredIn(p);
            const selected = index === checkIndex;
            return (
              <button
                key={p.partNo}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setCheckIndex(index)}
                className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                  selected ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/40'
                }`}
              >
                <span className={`block text-sm font-bold ${selected ? 'text-primary' : 'text-foreground'}`}>Part {p.partNo}</span>
                <span className="block text-xs text-muted-foreground">
                  Questions {p.firstNumber}–{p.lastNumber} · {done}/{partCount(p)} answered
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Each part is one card, as a practice item is: its bar, the recording, then its questions. */}
      <div className="space-y-5">
        {visibleParts.map(p => (
          <section key={p.partNo} className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-t-2xl bg-gradient-to-r from-primary to-primary/75 px-4 py-3 text-primary-foreground dark:!bg-muted dark:!text-foreground sm:px-5">
              <span className="rounded-lg bg-white/15 px-2.5 py-0.5 font-bold">Part {p.partNo}</span>
              <span className="h-5 w-px bg-white/40" aria-hidden />
              <h3 className="text-sm sm:text-base font-semibold">Questions {p.firstNumber}–{p.lastNumber}</h3>
            </div>
            <div className="p-3 sm:p-4 space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">{p.setting}</p>
              {!checking && p.partNo === part?.partNo && player}
              <div className="divide-y divide-border">
                {p.groups.map(group => (
                  <ListeningGroupView
                    key={group.id}
                    group={group}
                    answers={answers}
                    disabled={phase === 'submitting'}
                    onAnswer={answer}
                  />
                ))}
              </div>
            </div>
          </section>
        ))}
        {checking && (
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              disabled={checkIndex === 0}
              onClick={() => {
                setCheckIndex(index => index - 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="gap-1.5 font-bold"
            >
              <ChevronLeft className="h-4 w-4" /> {checkIndex > 0 ? `Part ${checkIndex}` : 'Previous'}
            </Button>
            {checkIndex < session.parts.length - 1 && (
              <Button
                onClick={() => {
                  setCheckIndex(index => index + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="gap-1.5 font-bold"
              >
                Part {checkIndex + 2} <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
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
export function ListeningGroupView({
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
  const box = group.questions[0]?.options ?? [];
  const dragged = LETTER_GROUPS.includes(group.typeId) && box.length > 0;
  const typed = TYPED_GROUPS.includes(group.typeId) && group.questions.every(question => !question.options?.length);
  const numberOf = (question: Question) => group.firstNumber + group.questions.indexOf(question);

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold tabular-nums text-primary">
              Questions {group.firstNumber}–{last}
            </span>
            {group.heading && <span className="text-base font-bold text-foreground">{group.heading}</span>}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">{group.instructions}</p>
        </div>

        {group.imageUrl && (
          <div className="mx-auto w-full max-w-xl overflow-hidden rounded-xl border border-border bg-white p-2">
            <img src={group.imageUrl} alt={group.heading || 'Map'} className="w-full h-auto" />
          </div>
        )}

        {dragged ? (
          <div className="rounded-xl border border-border bg-background p-3 sm:p-4">
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
              onChange={patch => {
                for (const [id, letter] of Object.entries(patch)) {
                  const question = group.questions.find(q => q.id === id);
                  if (question) onAnswer(question, { selectedOptions: letter ? [letter] : [] });
                }
              }}
            />
          </div>
        ) : typed ? (
          // Notes, forms, tables and short answers: the outline with a numbered box at each gap.
          <ListeningGapOutline
            passage={group.questions.map(question => outlineLine(question.prompt, numberOf(question))).join('\n')}
            blanks={group.questions.map(question => ({ id: String(numberOf(question)) }))}
            responses={Object.fromEntries(
              group.questions.map(question => [String(numberOf(question)), answers[question.id]?.textResponse ?? '']),
            )}
            disabled={disabled}
            onChange={responses => {
              for (const question of group.questions) {
                const value = responses[String(numberOf(question))] ?? '';
                if (value !== (answers[question.id]?.textResponse ?? '')) onAnswer(question, { textResponse: value });
              }
            }}
          />
        ) : (
          <ol className="space-y-4">
            {group.questions.map(question => {
              const number = numberOf(question);
              const current = answers[question.id];
              const compact = group.typeId === 'ielts-listening-map';
              return (
                <li key={question.id} className="space-y-2.5">
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
                          className={`flex items-start gap-2.5 rounded-xl border cursor-pointer text-xs sm:text-sm transition-colors ${
                            compact ? 'px-3.5 py-2' : 'p-3.5'
                          } ${selected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'}`}
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
  const answersById = new Map((outcome.submitted ?? []).map(a => [a.questionId, a]));
  return (
    <div className={embedded ? 'space-y-4' : 'w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 space-y-4'}>
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

      {!embedded && (
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onBack}>Back to listening practice</Button>
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
