import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Headphones, Lightbulb, MessageCircle, Mic, NotebookPen, Square, Send, RefreshCw, RotateCcw, Volume2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useRefreshMockPapers } from '@/lib/hooks/useMockPapers';
import { useTestLock } from '@/lib/hooks/useTestLock';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Evaluation, MockAttempt, isInstitutionStudent, isPremiumUser } from '@/lib/types';
import { subTestsLeft } from '@/lib/subscriptions';
import { encodeForUpload, beep } from '@/lib/audio';
import { AnswerRecorder } from '@/lib/answerRecorder';
import { Playback, playClips, playRecording, replayClip, StoppedError, unlockAudio } from '@/lib/scriptPlayer';
import PracticeMockPaywall from '@/components/practice/PracticeMockPaywall';
import SectionMockIntro from '@/components/mocks/SectionMockIntro';
import TestFeedback from '@/components/mocks/TestFeedback';
import MockHeader from '@/components/mocks/MockHeader';
import { CueCardPaper, ExaminerAvatar, ExaminerWave, MicOrb, PART_PHRASES, PART_TIPS, PartProgress, SPEAKING_PARTS, SpeakingDots, TestOverview, TimerRing, VoiceMeter } from '@/components/practice/SpeakingMockStage';

/** How many recent microphone readings the meter shows. */
const METER_BARS = 28;

/** Mirrors billing.SectionMockSubTests on the server, which is what enforces it. */
const SECTION_MOCK_SUB_TESTS = 5;

interface CueCard {
  task: string;
  points: string[];
  explain: string;
}

export interface Step {
  key: string;
  part: number;
  lead?: string;
  question: string;
  cueCard?: CueCard;
  prepSeconds?: number;
  answerSeconds: number;
  /** Stored recordings of the lead and the question, where they exist. */
  leadAudioUrl?: string;
  questionAudioUrl?: string;
}

/**
 * The stored recordings for what the examiner says, or null when any piece
 * has none and the words must be spoken live instead.
 */
export function storedLines(step: Step, say: 'lead' | 'question' | 'all'): string[] | null {
  const pieces: [string | undefined, string | undefined][] = [];
  if (say !== 'question') pieces.push([step.lead, step.leadAudioUrl]);
  if (say !== 'lead') pieces.push([step.question, step.questionAudioUrl]);
  const urls: string[] = [];
  for (const [text, url] of pieces) {
    if (!text?.trim()) continue;
    if (!url) return null;
    urls.push(url);
  }
  return urls.length ? urls : null;
}

interface SpokenAnswer {
  key: string;
  transcript: string;
  durationSeconds: number;
  source: 'server' | 'browser';
}

export interface SpeakingSession {
  id: string;
  status: string;
  title: string;
  secondsRemaining: number;
  steps: Step[];
  answers: SpokenAnswer[];
}

export interface SpeakingOutcome {
  attempt: MockAttempt | null;
  evaluation: Evaluation;
  xpAwarded: number;
}

/** The IELTS Speaking mock: start screen, the test, then the rating. */
export default function SpeakingMockPanel() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refreshPapers = useRefreshMockPapers();
  const toast = useToast();
  const { user, activeExam, refreshUser } = useApp();
  const [session, setSession] = useState<SpeakingSession | null>(null);
  const [outcome, setOutcome] = useState<SpeakingOutcome | null>(null);
  const [starting, setStarting] = useState(false);

  const start = async (chosen?: string) => {
    setStarting(true);
    try {
      const paperId = chosen ?? searchParams.get('paper');
      const body = paperId ? { paperId } : {};
      const data = await api.post<{ session: SpeakingSession }>('/speaking/mocks', body);
      setSession(data.session);
      void refreshUser();
      refreshPapers();
    } catch (err) {
      if (err instanceof ApiError && err.isLimitReached) {
        toast.warning('Not enough sub-tests left today', errorMessage(err));
      } else {
        toast.error('Could not start the speaking mock', errorMessage(err));
      }
    } finally {
      setStarting(false);
    }
  };

  if (!isPremiumUser(user)) return <PracticeMockPaywall skill="speaking" exam={activeExam} institution={isInstitutionStudent(user)} />;
  if (outcome) return <SpeakingResult outcome={outcome} onBack={() => navigate('/practice?skill=speaking')} onRedo={() => { setOutcome(null); void start(); }} />;
  if (session) {
    return (
      <SpeakingMockRunner
        session={session}
        onDone={result => {
          setOutcome(result);
          setSession(null);
          void refreshUser();
          refreshPapers();
        }}
        onLeave={() => navigate('/practice?skill=speaking')}
        onClosed={message => {
          toast.warning('This test is closed', message);
          setSession(null);
        }}
      />
    );
  }
  return (
    <SectionMockIntro
      institution={isInstitutionStudent(user)}
      exam="IELTS"
      skill="speaking"
      title="Speaking Sectional Test"
      description="All three parts in one sitting. The examiner's questions are read aloud and each answer is recorded."
      duration="About 15 min"
      items="3 parts"
      parts={[
        { name: 'Part 1: Introduction and interview', detail: '4–5 min' },
        { name: 'Part 2: Long turn', detail: '1 min prep, 2 min talk' },
        { name: 'Part 3: Discussion', detail: '4–5 min' },
      ]}
      rules={[
        'The parts run in order, one question at a time, as in the test.',
        'Each answer records until you finish or its time runs out, then the next question is asked.',
        'Part 2 gives you one minute to prepare before you speak.',
      ]}
      equipment="You need a microphone and a quiet room. Your browser asks for the microphone when the test starts."
      credits={SECTION_MOCK_SUB_TESTS}
      subTestsRemaining={subTestsLeft(user?.subscription)}
      isStarting={starting}
      onStart={paperId => void start(paperId)}
    />
  );
}

type Phase = 'intro' | 'examiner' | 'prep' | 'recording' | 'saving' | 'failed' | 'finished' | 'submitting';

interface PendingAnswer {
  key: string;
  audio: string;
  format: string;
  durationSeconds: number;
  browserTranscript: string;
}

interface RunnerProps {
  session: SpeakingSession;
  onDone: (outcome: SpeakingOutcome) => void;
  onLeave: () => void;
  /** The test closed without a rating: its time ran out with too little said. */
  onClosed: (message: string) => void;
}

/**
 * The test. For each step the examiner speaks, then the answer is recorded
 * until the learner finishes or the time for that answer runs out, and it is
 * uploaded for transcription before the next question.
 */
export function SpeakingMockRunner({ session, onDone, onLeave, onClosed }: RunnerProps) {
  const toast = useToast();
  useTestLock('Speaking test', onLeave);
  const answered = new Set(session.answers.map(a => a.key));
  const [index, setIndex] = useState(() => {
    const next = session.steps.findIndex(step => !answered.has(step.key));
    return next === -1 ? session.steps.length : next;
  });
  // A test reopened after its time ran out can only be submitted.
  const [phase, setPhase] = useState<Phase>(() =>
    index >= session.steps.length || session.secondsRemaining <= 0 ? 'finished' : 'intro',
  );
  const [countdown, setCountdown] = useState(0);
  // What the countdown started from, so the dial can show how much is left.
  const [countdownTotal, setCountdownTotal] = useState(0);
  const [level, setLevel] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array(METER_BARS).fill(0));
  // Part 2: whether the minute to prepare has begun for the current card.
  const [prepared, setPrepared] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SpokenAnswer[]>(session.answers);
  const [pending, setPending] = useState<PendingAnswer | null>(null);
  const recorder = useRef<AnswerRecorder | null>(null);
  const examiner = useRef<Playback | null>(null);
  const run = useRef(0);

  const step = session.steps[index];
  // The whole test's time left, as the server set it when the test opened.
  const [secondsLeft, setSecondsLeft] = useState(session.secondsRemaining);
  useEffect(() => {
    const timer = setInterval(() => setSecondsLeft(value => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(
    () => () => {
      run.current += 1;
      examiner.current?.stop();
      recorder.current?.close();
    },
    [],
  );

  // A live input meter while recording, so a silent microphone is obvious.
  useEffect(() => {
    if (phase !== 'recording') return;
    const timer = setInterval(() => {
      const value = recorder.current?.level() ?? 0;
      setLevel(value);
      setLevels(previous => [...previous.slice(1), value]);
    }, 120);
    return () => {
      clearInterval(timer);
      setLevel(0);
      setLevels(Array(METER_BARS).fill(0));
    };
  }, [phase]);

  useEffect(() => {
    if ((phase !== 'prep' && phase !== 'recording') || countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  /**
   * The examiner speaks: the stored recordings of the lines where they exist,
   * otherwise the browser's voice where it works, otherwise the server's clips
   * of the same words. `say` picks half of a step's words.
   */
  const speak = useCallback(
    async (step: Step, say: 'lead' | 'question' | 'all', text: string) => {
      const current = run.current;
      if (!text.trim()) return;
      const query = say === 'all' ? '' : `?say=${say}`;
      const stored = storedLines(step, say);
      const playback = stored
        ? playClips(stored.map(url => ({ url })))
        : await playRecording({
            script: text,
            audioUrl: `/speaking/mocks/${session.id}/steps/${step.key}/audio${query}`,
          });
      if (current !== run.current) {
        playback.stop();
        throw new StoppedError();
      }
      examiner.current = playback;
      await playback.done;
    },
    [session.id],
  );

  const record = useCallback(async (seconds: number) => {
    try {
      await beep();
    } catch {
      // non-fatal
    }
    try {
      recorder.current?.start();
    } catch {
      setError('Recording could not start. Check that your microphone is still connected.');
      return;
    }
    setCountdown(seconds);
    setCountdownTotal(seconds);
    setPhase('recording');
  }, []);

  const ask = useCallback(
    async (target: Step) => {
      const current = run.current;
      setError(null);
      setPhase('examiner');
      try {
        if (target.cueCard) {
          // The introduction, then a minute to prepare, then "start speaking".
          setPrepared(false);
          await speak(target, 'lead', target.lead ?? '');
          if (current !== run.current) return;
          setPrepared(true);
          setNotes('');
          setCountdown(target.prepSeconds ?? 60);
          setCountdownTotal(target.prepSeconds ?? 60);
          setPhase('prep');
          return;
        }
        await speak(target, 'all', [target.lead, target.question].filter(Boolean).join(' '));
      } catch (err) {
        if (err instanceof StoppedError || current !== run.current) return;
        setError("The examiner's voice couldn't play. Read the question below and answer it aloud.");
      }
      if (current === run.current) record(target.answerSeconds);
    },
    [record, speak],
  );

  // Preparation over: the examiner asks the candidate to start.
  useEffect(() => {
    if (phase !== 'prep' || countdown > 0 || !step) return;
    const current = run.current;
    setPhase('examiner');
    speak(step, 'question', step.question)
      .catch(() => {})
      .finally(() => {
        if (current === run.current) record(step.answerSeconds);
      });
  }, [phase, countdown, step, speak, record]);

  const advance = useCallback(() => {
    if (index + 1 >= session.steps.length) {
      setIndex(session.steps.length);
      setPhase('finished');
      recorder.current?.close();
      return;
    }
    const next = session.steps[index + 1];
    setIndex(index + 1);
    void ask(next);
  }, [ask, index, session.steps]);

  const upload = useCallback(
    async (payload: PendingAnswer) => {
      setPhase('saving');
      setError(null);
      try {
        const data = await api.post<{ answer: SpokenAnswer }>(`/speaking/mocks/${session.id}/answers`, payload);
        setPending(null);
        setSaved(previous => [...previous.filter(a => a.key !== payload.key), data.answer]);
        advance();
      } catch (err) {
        if (err instanceof ApiError && err.code === 'paper_expired') {
          // The test's time is up; what was saved is rated.
          setPending(null);
          setPhase('finished');
          recorder.current?.close();
          setError('The time for this test has run out.');
          return;
        }
        setPending(payload);
        setPhase('failed');
        setError(`Your answer could not be saved: ${errorMessage(err)}`);
      }
    },
    [advance, session.id],
  );

  const finishAnswer = useCallback(async () => {
    if (!step || !recorder.current?.recording) return;
    setPhase('saving');
    const answer = await recorder.current.stop();
    const payload: PendingAnswer = {
      key: step.key,
      audio: '',
      format: '',
      durationSeconds: answer.durationSeconds,
      browserTranscript: answer.transcript,
    };
    try {
      const encoded = await encodeForUpload(answer.blob);
      payload.audio = encoded.base64;
      payload.format = encoded.format;
      payload.durationSeconds = encoded.durationSeconds || payload.durationSeconds;
    } catch {
      // No usable audio was captured; the browser's transcript is still sent.
    }
    await upload(payload);
  }, [step, upload]);

  // An answer's time is up: the examiner moves on, as in the test.
  useEffect(() => {
    if (phase === 'recording' && countdown === 0) void finishAnswer();
  }, [phase, countdown, finishAnswer]);

  const begin = async () => {
    // The examiner speaks after the microphone prompt, not on this tap; iOS
    // needs audio unlocked by the tap itself.
    unlockAudio();
    if (!AnswerRecorder.supported()) {
      setError('This browser cannot record audio. Please use Chrome, Edge or Safari.');
      return;
    }
    try {
      recorder.current = new AnswerRecorder();
      await recorder.current.open();
    } catch {
      setError('Microphone access was refused. Allow the microphone for this site and try again.');
      return;
    }
    if (step) void ask(step);
  };

  // Plays the first examiner line (or a tone) so the learner can set the volume.
  const [checkingSound, setCheckingSound] = useState(false);
  const testSound = async () => {
    unlockAudio();
    setCheckingSound(true);
    try {
      const first = session.steps.map(s => storedLines(s, 'all')?.[0]).find(Boolean);
      if (first) await playClips([{ url: first }]).done;
      else await beep();
    } catch {
      setError("No sound played. Check your speaker or headphone volume, then try again.");
    } finally {
      setCheckingSound(false);
    }
  };

  const submit = async () => {
    setPhase('submitting');
    try {
      const data = await api.post<SpeakingOutcome>(`/speaking/mocks/${session.id}/submit`, {});
      onDone(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        onClosed(errorMessage(err));
        return;
      }
      setPhase('finished');
      toast.error('Could not rate the speaking test', errorMessage(err));
    }
  };

  const parts = session.steps.map(s => s.part);
  const partLabel = step ? `Part ${step.part}` : 'Finished';
  const active = step && phase !== 'intro' && phase !== 'finished' && phase !== 'submitting';
  const showQuestion = Boolean(step && (!step.cueCard || phase === 'recording' || phase === 'saving' || phase === 'failed'));
  const status: Partial<Record<Phase, { icon: React.ReactNode; text: string; className: string }>> = {
    examiner: { icon: <Volume2 className="h-3.5 w-3.5" />, text: 'Listen to the examiner', className: 'bg-primary/10 text-primary' },
    prep: { icon: <NotebookPen className="h-3.5 w-3.5" />, text: 'Prepare your talk', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
    recording: {
      icon: <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />,
      text: 'Recording',
      className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    },
    saving: { icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" />, text: 'Saving your answer', className: 'bg-muted text-muted-foreground' },
    failed: { icon: <RefreshCw className="h-3.5 w-3.5" />, text: 'Answer not saved', className: 'bg-destructive/10 text-destructive' },
  };
  const pill = status[phase];
  const earlier = step ? session.steps.slice(0, index).filter(s => s.part === step.part && !s.cueCard) : [];
  const timerTone = phase === 'recording' ? 'recording' : phase === 'prep' ? 'primary' : 'idle';
  const timerLabel = phase === 'prep' ? 'Prepare' : phase === 'recording' ? 'Speak' : phase === 'examiner' ? 'Listen' : 'Wait';
  return (
    <div className="w-full min-h-[calc(100dvh-4rem)] bg-background">
      <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-5 sm:px-6 lg:px-8">
        <MockHeader
          code={step ? `P${step.part}` : 'S'}
          title={`IELTS Speaking Mock: ${session.title}`}
          subtitle={`${partLabel} • question ${Math.min(index + 1, session.steps.length)} of ${session.steps.length}`}
          secondsLeft={phase === 'finished' || phase === 'submitting' ? undefined : secondsLeft}
          onLeave={onLeave}
        />

        <div className="lg:hidden">
          <PartProgress parts={parts} index={index} />
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">

        {phase === 'intro' && (
          <Card className="relative overflow-hidden p-0">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-primary/10 to-transparent" aria-hidden />
            <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-6 px-5 py-10 text-center sm:px-8 sm:py-12 lg:min-h-[540px] lg:justify-center">
              <div className="relative flex h-28 w-28 items-center justify-center" aria-hidden>
                <span className="absolute inset-0 rounded-full bg-primary/10 motion-safe:animate-ping [animation-duration:2.5s]" />
                <span className="absolute inset-2 rounded-full bg-primary/15" />
                <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/30">
                  <Mic className="h-9 w-9" />
                </span>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{index === 0 ? 'Ready when you are' : 'Welcome back'}</h2>
                <p className="mx-auto max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {index === 0
                    ? 'The examiner will ask you questions in three parts. Answer each one aloud; your answer is recorded until you press Finish answer or its time runs out.'
                    : 'Continue your test from the next question.'}
                </p>
              </div>

              {index === 0 && (
                <ol className="grid w-full gap-2 sm:grid-cols-3">
                  {[1, 2, 3].map(part => (
                    <li key={part} className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3 text-left sm:flex-col sm:items-center sm:gap-1.5 sm:text-center">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">P{part}</span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-foreground">{SPEAKING_PARTS[part]}</span>
                        <span className="block text-xs text-muted-foreground">{part === 2 ? '3–4 min' : '4–5 min'}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}

              {index === 0 && (
                <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                  {['Sit somewhere quiet', 'Allow the microphone', 'Answer in full sentences'].map(tip => (
                    <li key={tip} className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> {tip}
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex w-full flex-col items-stretch justify-center gap-2 sm:w-auto sm:flex-row sm:items-center">
                <Button size="lg" onClick={() => void begin()} disabled={checkingSound} className="h-12 gap-2 rounded-full px-8 text-base font-bold shadow-md shadow-primary/20">
                  <Mic className="h-4 w-4" /> {index === 0 ? 'Start the test' : 'Continue the test'}
                </Button>
                <Button size="lg" variant="outline" onClick={() => void testSound()} disabled={checkingSound} className="h-12 gap-2 rounded-full px-6">
                  <Volume2 className="h-4 w-4" /> {checkingSound ? 'Playing…' : 'Test your sound'}
                </Button>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Headphones className="h-3.5 w-3.5 shrink-0" /> Turn your volume up. You should hear the examiner's voice when you test your sound.
              </p>
            </div>
          </Card>
        )}

        {active && step && (
          <Card className="overflow-hidden p-0">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-5 p-5 sm:p-6">
                <div className="flex items-center gap-4">
                  <ExaminerAvatar speaking={phase === 'examiner'} />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                      Examiner {phase === 'examiner' && <SpeakingDots />}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Part {step.part} · {SPEAKING_PARTS[step.part] ?? 'Speaking'}
                    </p>
                  </div>
                </div>

                {(step.lead || showQuestion) && (
                  <div className="space-y-2 rounded-2xl rounded-tl-sm border border-border bg-muted/40 p-4 sm:p-5" aria-live="polite">
                    {step.lead && <p className="text-sm leading-relaxed text-muted-foreground">{step.lead}</p>}
                    {showQuestion && <p className="text-lg font-semibold leading-snug text-foreground sm:text-xl">{step.question}</p>}
                  </div>
                )}

                {step.cueCard && <CueCardPaper {...step.cueCard} />}

                {!step.cueCard && earlier.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground">Earlier in Part {step.part}</p>
                    <ul className="space-y-1.5">
                      {earlier.map(previous => (
                        <li key={previous.key} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                          <span>{previous.question}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {phase === 'prep' && (
                  <div className="space-y-2">
                    <label htmlFor="speaking-notes" className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                      <NotebookPen className="h-3.5 w-3.5" /> Your notes
                    </label>
                    <Textarea
                      id="speaking-notes"
                      rows={5}
                      value={notes}
                      onChange={event => setNotes(event.target.value)}
                      placeholder="Make notes if you wish. They are not marked."
                      className="rounded-xl bg-background"
                    />
                  </div>
                )}
              </div>

              <div className="order-first flex items-center gap-4 border-b border-border bg-muted/25 p-4 lg:order-none lg:flex-col lg:justify-center lg:border-b-0 lg:border-l lg:p-6 lg:text-center">
                <TimerRing seconds={countdown} total={countdownTotal} tone={timerTone} label={timerLabel} />

                <div className="flex min-w-0 flex-1 flex-col items-start gap-3 lg:w-full lg:flex-none lg:items-center">
                  {pill && (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${pill.className}`}>
                      {pill.icon} {pill.text}
                    </span>
                  )}

                  {phase === 'examiner' && (
                    <>
                      <ExaminerWave />
                      <p className="text-xs text-muted-foreground lg:max-w-[16rem]">
                        {step.cueCard && !prepared
                          ? 'Read the task card. Your minute to prepare starts next.'
                          : 'Recording starts after the beep.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => replayClip()}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Can't hear it? Play again
                      </button>
                    </>
                  )}

                  {phase === 'prep' && (
                    <p className="text-xs text-muted-foreground lg:max-w-[16rem]">
                      When the time is up, the examiner asks you to start and your talk is recorded.
                    </p>
                  )}

                  {phase === 'recording' && (
                    <div className="flex w-full flex-col items-stretch gap-3 lg:items-center">
                      <div className="hidden lg:block">
                        <MicOrb recording level={level} />
                      </div>
                      <VoiceMeter levels={levels} active />
                      <Button size="lg" onClick={() => void finishAnswer()} className="h-11 w-full gap-2 rounded-full font-bold">
                        <Square className="h-3.5 w-3.5 fill-current" /> Finish answer
                      </Button>
                    </div>
                  )}

                  {phase === 'failed' && pending && (
                    <div className="flex w-full flex-col gap-2">
                      <Button onClick={() => void upload(pending)} className="w-full gap-1.5 rounded-full font-bold">
                        <RefreshCw className="h-3.5 w-3.5" /> Try saving again
                      </Button>
                      <Button variant="outline" onClick={() => record(step.answerSeconds)} className="w-full rounded-full">
                        Record the answer again
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {active && step && PART_PHRASES[step.part] && (
          <Card className="p-4 sm:p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-foreground">
              <MessageCircle className="h-4 w-4 text-primary" /> Useful ways to begin
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PART_PHRASES[step.part].map(phrase => (
                <span key={phrase} className="rounded-full border border-primary/20 bg-primary/[0.05] px-3 py-1.5 text-sm text-foreground">
                  {phrase}
                </span>
              ))}
            </div>
          </Card>
        )}

        {active && step && PART_TIPS[step.part] && (
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {PART_TIPS[step.part].map(tip => (
              <div key={tip.title} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Lightbulb className="h-4 w-4" />
                </span>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-foreground">{tip.title}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{tip.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {(phase === 'finished' || phase === 'submitting') && (
          <Card className="p-6 sm:p-8">
            <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-9 w-9 text-emerald-500" />
              </span>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-foreground">That is the end of the speaking test</h2>
                <p className="text-sm text-muted-foreground">
                  {saved.length} of {session.steps.length} answers were recorded.
                </p>
              </div>
              <Button size="lg" onClick={() => void submit()} disabled={phase === 'submitting'} className="h-11 gap-2 rounded-full px-6 font-bold">
                {phase === 'submitting' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {phase === 'submitting' ? 'Rating your test…' : 'Get my rating'}
              </Button>
            </div>
          </Card>
        )}
        </div>

        <aside className="lg:sticky lg:top-4">
          <TestOverview
            steps={session.steps}
            index={index}
            spoken={Object.fromEntries(saved.map(answer => [answer.key, answer.durationSeconds]))}
          />
        </aside>
        </div>
      </div>
    </div>
  );
}

export function SpeakingResult({ outcome, onBack, onRedo }: { outcome: SpeakingOutcome; onBack: () => void; onRedo?: () => void }) {
  const band = outcome.evaluation.estimatedScore;
  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      <Card className="overflow-hidden p-0">
        <div className="flex flex-col items-center gap-5 bg-gradient-to-br from-primary/[0.08] via-transparent to-transparent p-6 text-center sm:flex-row sm:text-left">
          <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
            <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
              <circle cx="60" cy="60" r="52" className="fill-none stroke-muted" strokeWidth="8" />
              <circle
                cx="60"
                cy="60"
                r="52"
                className="fill-none stroke-primary"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 52}
                strokeDashoffset={2 * Math.PI * 52 * (1 - Math.min(1, (band ?? 0) / 9))}
              />
            </svg>
            <div className="leading-none">
              <div className="font-display text-4xl font-black text-foreground">{band != null ? band.toFixed(1) : '—'}</div>
              <div className="mt-1 text-xs font-semibold text-muted-foreground">/ 9</div>
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wide text-primary">Speaking estimate</span>
            <p className="text-sm text-muted-foreground">
              Rated across all three parts from transcripts of your answers. Pronunciation could not be assessed, so this uses three of the four Speaking criteria. A practice estimate, not an official result.
            </p>
            {outcome.xpAwarded > 0 && <Badge variant="default">+{outcome.xpAwarded} XP</Badge>}
          </div>
        </div>
      </Card>
      <TestFeedback evaluation={outcome.evaluation} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onBack}>Back to speaking practice</Button>
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
