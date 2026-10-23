import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mic, Square, Send, LogOut, RefreshCw, RotateCcw, User } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useRefreshMockPapers } from '@/lib/hooks/useMockPapers';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Evaluation, MockAttempt, isPremiumUser } from '@/lib/types';
import { subTestsLeft } from '@/lib/subscriptions';
import { encodeForUpload, beep } from '@/lib/audio';
import { AnswerRecorder } from '@/lib/answerRecorder';
import { Playback, playClips, playRecording, StoppedError, unlockAudio } from '@/lib/scriptPlayer';
import PracticeMockPaywall from '@/components/practice/PracticeMockPaywall';
import SectionMockIntro from '@/components/mocks/SectionMockIntro';
import PracticeResultCard from '@/components/practice/PracticeResultCard';

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

  if (!isPremiumUser(user)) return <PracticeMockPaywall skill="speaking" exam={activeExam} />;
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
  const [level, setLevel] = useState(0);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SpokenAnswer[]>(session.answers);
  const [pending, setPending] = useState<PendingAnswer | null>(null);
  const recorder = useRef<AnswerRecorder | null>(null);
  const examiner = useRef<Playback | null>(null);
  const run = useRef(0);

  const step = session.steps[index];

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
    const timer = setInterval(() => setLevel(recorder.current?.level() ?? 0), 120);
    return () => clearInterval(timer);
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
          await speak(target, 'lead', target.lead ?? '');
          if (current !== run.current) return;
          setNotes('');
          setCountdown(target.prepSeconds ?? 60);
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

  const partLabel = step ? `Part ${step.part}` : 'Finished';
  return (
    <div className="w-full min-h-[calc(100dvh-4rem)] px-3 sm:px-6 lg:px-8 py-3 space-y-3 bg-background">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-border pb-2.5">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">IELTS Speaking Mock: {session.title}</h1>
          <p className="text-xs text-muted-foreground">
            {partLabel} • question {Math.min(index + 1, session.steps.length)} of {session.steps.length}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onLeave} className="gap-1.5 font-bold">
          <LogOut className="w-3.5 h-3.5" /> <span>Leave</span>
        </Button>
      </div>

      {phase === 'intro' && (
        <Card className="p-5 space-y-3">
          <p className="text-sm text-foreground">
            {index === 0
              ? 'The examiner will ask you questions in three parts. Answer each one aloud; your answer is recorded until you press Finish answer or its time runs out.'
              : 'Continue your test from the next question.'}
          </p>
          <Button onClick={() => void begin()} className="font-bold gap-1.5">
            <Mic className="w-4 h-4" /> {index === 0 ? 'Start the test' : 'Continue the test'}
          </Button>
        </Card>
      )}

      {step && phase !== 'intro' && phase !== 'finished' && phase !== 'submitting' && (
        <Card className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground">Examiner</p>
              {step.lead && <p className="text-sm text-foreground">{step.lead}</p>}
              {(!step.cueCard || phase === 'recording' || phase === 'saving') && (
                <p className="text-sm font-semibold text-foreground">{step.question}</p>
              )}
            </div>
          </div>

          {step.cueCard && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1.5">
              <p className="text-sm font-semibold text-foreground">{step.cueCard.task}</p>
              <p className="text-xs text-muted-foreground">You should say:</p>
              <ul className="list-disc pl-5 text-sm text-foreground">
                {step.cueCard.points.map(point => <li key={point}>{point}</li>)}
              </ul>
              <p className="text-sm text-foreground">{step.cueCard.explain}</p>
            </div>
          )}

          {phase === 'prep' && (
            <div className="space-y-2">
              <Badge variant="outline">Preparation: {countdown}s</Badge>
              <Textarea rows={4} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Make notes if you wish. They are not marked." />
            </div>
          )}

          {phase === 'examiner' && <p className="text-xs text-muted-foreground" aria-live="polite">The examiner is speaking…</p>}

          {phase === 'recording' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant={countdown <= 10 ? 'warning' : 'outline'} className="gap-1">
                  <Mic className="w-3 h-3 text-rose-500" /> Recording · {countdown}s left
                </Badge>
                <Button onClick={() => void finishAnswer()} className="font-bold gap-1.5">
                  <Square className="w-3.5 h-3.5" /> Finish answer
                </Button>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-100" style={{ width: `${Math.round(level * 100)}%` }} />
              </div>
            </div>
          )}

          {phase === 'failed' && pending && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void upload(pending)} className="font-bold gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Try saving again
              </Button>
              <Button variant="outline" onClick={() => record(step.answerSeconds)}>
                Record the answer again
              </Button>
            </div>
          )}

          {phase === 'saving' && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving your answer…
            </p>
          )}
        </Card>
      )}

      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}

      {(phase === 'finished' || phase === 'submitting') && (
        <Card className="p-5 space-y-3">
          <p className="text-sm text-foreground">
            That is the end of the speaking test. {saved.length} of {session.steps.length} answers were recorded.
          </p>
          <Button onClick={() => void submit()} disabled={phase === 'submitting'} className="font-bold gap-1.5">
            {phase === 'submitting' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {phase === 'submitting' ? 'Rating your test…' : 'Get my rating'}
          </Button>
        </Card>
      )}
    </div>
  );
}

export function SpeakingResult({ outcome, onBack, onRedo }: { outcome: SpeakingOutcome; onBack: () => void; onRedo?: () => void }) {
  const band = outcome.evaluation.estimatedScore;
  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      <Card className="p-5 text-center space-y-1.5">
        <span className="text-xs font-bold text-muted-foreground uppercase">Speaking estimate</span>
        <div className="font-display text-4xl font-black text-foreground">{band != null ? band.toFixed(1) : '—'}</div>
        <p className="text-xs text-muted-foreground">
          Rated across all three parts from transcripts of your answers. Pronunciation could not be assessed, so this uses three of the four Speaking criteria. A practice estimate, not an official result.
        </p>
        {outcome.xpAwarded > 0 && <Badge variant="default">+{outcome.xpAwarded} XP</Badge>}
      </Card>
      <PracticeResultCard result={{ evaluation: outcome.evaluation, xpAwarded: 0 }} />
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
