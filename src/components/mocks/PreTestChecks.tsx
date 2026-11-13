import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Headphones,
  Loader2,
  Mic,
  Play,
  Square,
  Volume2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnswerRecorder } from '@/lib/answerRecorder';
import { useTestLock } from '@/lib/hooks/useTestLock';
import FullscreenButton from '@/components/layout/FullscreenButton';

export type CheckSkill = 'speaking' | 'writing' | 'reading' | 'listening';
type StepId = 'intro' | 'headset' | 'mic' | 'keyboard' | 'speaking';

interface Props {
  exam: 'PTE' | 'IELTS';
  title: string;
  /** The skills the test covers; they decide which checks are shown. */
  skills: CheckSkill[];
  /** The parts or sections of the test, for the introduction. */
  sections: { label: string; timing?: string }[];
  /** Starting the test failed, or the microphone could not be opened. */
  error?: string | null;
  beginning?: boolean;
  /** Label of the last button; "Begin test" by default. */
  beginLabel?: string;
  onBegin: () => void;
  onCancel: () => void;
}

const SKILL_NAMES: Record<CheckSkill, string> = {
  speaking: 'Speaking',
  writing: 'Writing',
  reading: 'Reading',
  listening: 'Listening',
};

/** The steps a test needs: headset for anything heard, keyboard for anything typed. */
export function checkSteps(skills: CheckSkill[]): StepId[] {
  const has = (skill: CheckSkill) => skills.includes(skill);
  const steps: StepId[] = ['intro'];
  if (has('listening') || has('speaking')) steps.push('headset');
  if (has('speaking')) steps.push('mic');
  if (has('writing') || has('listening')) steps.push('keyboard');
  if (has('speaking')) steps.push('speaking');
  return steps;
}

/**
 * The screens before a mock's first question, as at a test centre: what the
 * test is, then a headset, microphone and keyboard check, then how the
 * speaking items run. Only the steps the test's skills need are shown.
 */
export default function PreTestChecks({
  exam, title, skills, sections, error, beginning = false, beginLabel = 'Begin test', onBegin, onCancel,
}: Props) {
  // The checks are part of the test: no sidebar or header, Cancel is the way out.
  useTestLock(title, onCancel);
  const steps = checkSteps(skills);
  const [index, setIndex] = useState(0);
  const [heard, setHeard] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const step = steps[index];
  const last = index === steps.length - 1;
  // The headset and microphone checks must be done once; a broken mic can still go on, with its error shown.
  const [micBroken, setMicBroken] = useState(false);
  const canNext = step === 'headset' ? heard : step === 'mic' ? recorded || micBroken : true;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [index]);

  return (
    <div data-practice-workspace className="flex min-h-dvh w-full flex-col">
      <header className="bg-gradient-to-r from-primary to-primary/75 px-4 py-5 text-primary-foreground sm:px-8">
        <div className="mx-auto flex max-w-4xl items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/80">{exam} · Before you start</p>
            <h1 className="mt-0.5 font-display text-xl font-extrabold sm:text-2xl">{title}</h1>
          </div>
          <span className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              Step {index + 1} of {steps.length}
            </span>
            <FullscreenButton tone="onPrimary" />
          </span>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        {/* A solid card: the text never sits on the page's patterned backdrop. */}
        <div className="mx-auto max-w-4xl space-y-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
          {step === 'intro' && <IntroStep exam={exam} skills={skills} sections={sections} />}
          {step === 'headset' && <HeadsetStep onHeard={() => setHeard(true)} heard={heard} />}
          {step === 'mic' && <MicStep exam={exam} onRecorded={() => setRecorded(true)} onBroken={() => setMicBroken(true)} />}
          {step === 'keyboard' && <KeyboardStep />}
          {step === 'speaking' && <SpeakingStep exam={exam} />}
        </div>
      </main>

      <footer className="dark test-bar sticky bottom-0 z-10 px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={index === 0 ? onCancel : () => setIndex(i => i - 1)} className="gap-1.5" disabled={beginning}>
            {index === 0 ? 'Cancel' : <><ArrowLeft className="h-4 w-4" /> Back</>}
          </Button>
          {error && (
            <p role="alert" className="order-last w-full text-xs text-rose-600 dark:text-rose-400 sm:order-none sm:w-auto sm:flex-1 sm:text-right">
              {error}
            </p>
          )}
          <Button
            onClick={last ? onBegin : () => setIndex(i => i + 1)}
            disabled={!canNext || beginning}
            className="h-10 min-w-32 gap-2 font-bold"
          >
            {beginning && <Loader2 className="h-4 w-4 animate-spin" />}
            {last ? beginLabel : 'Next'}
            {!beginning && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </footer>
    </div>
  );
}

function StepHead({ title, lede }: { title: string; lede: string }) {
  return (
    <div>
      <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">{title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:text-base">{lede}</p>
    </div>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm text-foreground sm:text-base">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1 pt-0.5 leading-relaxed">{item}</div>
        </li>
      ))}
    </ol>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{children}</p>;
}

function listOf(words: string[]): string {
  return words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

function IntroStep({ exam, skills, sections }: { exam: 'PTE' | 'IELTS'; skills: CheckSkill[]; sections: Props['sections'] }) {
  const has = (skill: CheckSkill) => skills.includes(skill);
  // IELTS calls its skills sections; one skill's tasks or recordings are parts.
  const noun = exam === 'IELTS' && skills.length > 1 ? 'section' : 'part';
  const points = ['The time left and your place in the test are always shown at the top of the screen.'];
  if (exam === 'PTE') {
    points.push('Next saves your answer and moves you on. You cannot go back to an earlier item.');
    if (has('listening') || has('speaking')) points.push('Each recording plays once.');
  } else {
    if (has('listening')) points.push('Each listening recording plays once. You get time to read the questions first, and two minutes to check your answers at the end.');
    if (has('speaking')) points.push("The examiner's questions are read aloud and your answers are recorded. In Part 2 you get one minute to prepare.");
    if (skills.length > 1) points.push('Your place is kept, so you can take a break between sections.');
  }
  if (has('listening') || has('speaking')) {
    points.push('You will hear British, American, Australian and other accents. Answer in any standard English.');
  }
  return (
    <>
      <StepHead
        title="Test introduction"
        lede={`This test measures the ${listOf(skills.map(skill => SKILL_NAMES[skill]))} skills in English that you need for study and work.`}
      />
      <section className="space-y-2.5">
        <h3 className={SECTION_LABEL}>
          {sections.length} {noun}
          {sections.length === 1 ? '' : 's, each timed on its own'}
        </h3>
        <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {sections.map((section, i) => (
            <li key={section.label} className="flex items-baseline gap-3 px-4 py-3">
              <span className="w-4 shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">{i + 1}</span>
              <span className="flex-1 text-sm font-semibold text-foreground sm:text-base">{section.label}</span>
              {section.timing && <span className="text-right text-sm text-muted-foreground">{section.timing}</span>}
            </li>
          ))}
        </ol>
      </section>
      <section className="space-y-2.5">
        <h3 className={SECTION_LABEL}>Good to know</h3>
        <ul className="space-y-2.5">
          {points.map(point => (
            <li key={point} className="flex gap-3 text-sm leading-relaxed text-foreground sm:text-[15px]">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

const SECTION_LABEL = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground';

// A short rising and falling tune, played with the browser's own audio.
const TUNE = [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 523.25, 659.25, 783.99, 1046.5, 1318.5, 1046.5];
const NOTE_SECONDS = 0.42;
const MAX_GAIN = 0.5;

function HeadsetStep({ heard, onHeard }: { heard: boolean; onHeard: () => void }) {
  const [volume, setVolume] = useState(80);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const stop = () => {
    clearInterval(timerRef.current);
    gainRef.current?.disconnect();
    gainRef.current = null;
    setPlaying(false);
  };

  useEffect(
    () => () => {
      clearInterval(timerRef.current);
      gainRef.current?.disconnect();
      void ctxRef.current?.close().catch(() => {});
    },
    [],
  );

  const play = () => {
    stop();
    const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) {
      setUnsupported(true);
      return;
    }
    const ctx = ctxRef.current ?? new Ctor();
    ctxRef.current = ctx;
    void ctx.resume().catch(() => {});
    const master = ctx.createGain();
    master.gain.value = (volume / 100) * MAX_GAIN;
    master.connect(ctx.destination);
    gainRef.current = master;
    const t0 = ctx.currentTime + 0.05;
    TUNE.forEach((frequency, i) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      const at = t0 + i * NOTE_SECONDS;
      osc.type = 'triangle';
      osc.frequency.value = frequency;
      env.gain.setValueAtTime(0.0001, at);
      env.gain.exponentialRampToValueAtTime(1, at + 0.02);
      env.gain.exponentialRampToValueAtTime(0.0001, at + NOTE_SECONDS * 0.95);
      osc.connect(env).connect(master);
      osc.start(at);
      osc.stop(at + NOTE_SECONDS);
    });
    const total = TUNE.length * NOTE_SECONDS;
    setPlaying(true);
    // An interval, not animation frames: those stop in a hidden tab and the check would never finish.
    timerRef.current = setInterval(() => {
      const fraction = (ctx.currentTime - t0) / total;
      if (fraction >= 1) {
        clearInterval(timerRef.current);
        setProgress(1);
        setPlaying(false);
        onHeard();
        return;
      }
      setProgress(Math.max(0, fraction));
    }, 50);
  };

  const changeVolume = (value: number) => {
    setVolume(value);
    if (gainRef.current) gainRef.current.gain.value = (value / 100) * MAX_GAIN;
  };

  const status = unsupported
    ? 'This browser cannot play the check. Use Chrome or Edge.'
    : playing
      ? 'Playing…'
      : heard
        ? 'Finished. Play it again if you need to.'
        : 'Press play to start';

  return (
    <>
      <StepHead title="Headset check" lede="Make sure you can hear clearly through your headphones." />
      <Steps
        items={[
          'Put your headphones on and adjust them so they sit comfortably over your ears.',
          'When you are ready, press play. A short tune plays.',
          'If you hear nothing while it says Playing, check your volume and that your headphones are the selected output, then play it again.',
        ]}
      />
      <div className="max-w-md space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={playing ? stop : play}
            aria-label={playing ? 'Stop the tune' : 'Play the tune'}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {playing ? <Square className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
          </button>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-2 overflow-hidden rounded-full bg-primary/15">
              <div className="h-full rounded-full bg-primary" style={{ width: `${progress * 100}%` }} />
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
              {heard && !playing && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
              {status}
            </p>
          </div>
        </div>
        <label className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
          <Volume2 className="h-4 w-4 shrink-0 text-primary" />
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={e => changeVolume(Number(e.target.value))}
            aria-label="Volume"
            className="h-1.5 flex-1 cursor-pointer accent-primary"
          />
          <span className="w-8 text-right tabular-nums">{volume}%</span>
        </label>
      </div>
    </>
  );
}

type MicState = 'ready' | 'recording' | 'recorded' | 'playing';
const MIC_MAX_SECONDS = 10;
const METER_BARS = 24;

function MicStep({ exam, onRecorded, onBroken }: { exam: 'PTE' | 'IELTS'; onRecorded: () => void; onBroken: () => void }) {
  const [state, setState] = useState<MicState>('ready');
  const [level, setLevel] = useState(0);
  const [clip, setClip] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<AnswerRecorder | null>(null);
  const timersRef = useRef<{ meter?: ReturnType<typeof setInterval>; limit?: ReturnType<typeof setTimeout> }>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const clipRef = useRef<string | null>(null);

  const clearTimers = () => {
    clearInterval(timersRef.current.meter);
    clearTimeout(timersRef.current.limit);
  };

  useEffect(
    () => () => {
      clearTimers();
      audioRef.current?.pause();
      recorderRef.current?.close();
      if (clipRef.current) URL.revokeObjectURL(clipRef.current);
    },
    [],
  );

  const stopRecording = async () => {
    const recorder = recorderRef.current;
    clearTimers();
    setLevel(0);
    if (!recorder?.recording) return;
    const answer = await recorder.stop();
    if (clipRef.current) URL.revokeObjectURL(clipRef.current);
    const url = URL.createObjectURL(answer.blob);
    clipRef.current = url;
    setClip(url);
    setState('recorded');
    onRecorded();
  };

  const record = async () => {
    setError(null);
    audioRef.current?.pause();
    if (!AnswerRecorder.supported()) {
      setError('This browser cannot record audio. Use Chrome or Edge on a computer.');
      onBroken();
      return;
    }
    try {
      const recorder = recorderRef.current ?? new AnswerRecorder();
      recorderRef.current = recorder;
      await recorder.open();
      recorder.start();
      setState('recording');
      timersRef.current.meter = setInterval(() => setLevel(recorder.level()), 60);
      timersRef.current.limit = setTimeout(() => void stopRecording(), MIC_MAX_SECONDS * 1000);
    } catch {
      setError('Microphone access was refused. Allow the microphone for this site in your browser, then record again.');
      onBroken();
    }
  };

  const playBack = () => {
    if (!clip) return;
    audioRef.current?.pause();
    const audio = new Audio(clip);
    audioRef.current = audio;
    audio.onended = () => setState('recorded');
    audio.onerror = () => setState('recorded');
    setState('playing');
    void audio.play().catch(() => setState('recorded'));
  };

  const pill: Record<MicState, { text: string; cls: string; dot: string }> = {
    ready: { text: 'Ready', cls: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' },
    recording: { text: 'Recording', cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', dot: 'bg-rose-500 animate-pulse' },
    recorded: { text: 'Recorded', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
    playing: { text: 'Playing back', cls: 'bg-primary/10 text-primary', dot: 'bg-primary animate-pulse' },
  };
  const lit = Math.round(Math.min(1, level * 1.6) * METER_BARS);

  return (
    <>
      <StepHead
        title="Microphone check"
        lede="Make sure your microphone records your voice clearly. A headset and a quiet room work best."
      />
      <Steps
        items={[
          'Put your headset on with the microphone pointing down, near your mouth.',
          <>Press Record and say “Testing, testing, one, two, three” into the microphone.</>,
          'Press Stop when you have finished. Your recording is then complete.',
          'Press Play back. You should hear yourself clearly.',
          'If you cannot hear your voice clearly, check which microphone your browser is using, then record again.',
        ]}
      />
      <div className="max-w-xl space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void record()} disabled={state === 'recording'} className="gap-2 font-bold">
            <Mic className="h-4 w-4" /> {clip ? 'Record again' : 'Record'}
          </Button>
          <Button variant="outline" onClick={() => void stopRecording()} disabled={state !== 'recording'} className="gap-2">
            <Square className="h-3.5 w-3.5 fill-current" /> Stop
          </Button>
          <Button variant="outline" onClick={playBack} disabled={!clip || state === 'recording' || state === 'playing'} className="gap-2">
            <Play className="h-4 w-4 fill-current" /> Play back
          </Button>
          <span className={`ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${pill[state].cls}`} aria-live="polite">
            <span className={`h-2 w-2 rounded-full ${pill[state].dot}`} /> {pill[state].text}
          </span>
        </div>
        <div className="flex h-8 items-end gap-1" aria-hidden>
          {Array.from({ length: METER_BARS }, (_, i) => (
            <span
              key={i}
              className={`flex-1 rounded-sm transition-all duration-75 ${i < lit ? (i > METER_BARS * 0.8 ? 'bg-amber-500' : 'bg-primary') : 'bg-primary/15'}`}
              style={{ height: `${30 + (i / METER_BARS) * 70}%` }}
            />
          ))}
        </div>
        {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
      <Note>
        {exam === 'PTE'
          ? 'In the test there are no Record, Stop or Play back buttons. The microphone opens by itself after a short countdown and a beep, and stops when the time is up or after 3 seconds of silence.'
          : 'In the test there are no Record, Stop or Play back buttons. Each answer is recorded by itself while its timer runs.'}
      </Note>
    </>
  );
}

const KEY_ROWS = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

function KeyboardStep() {
  const [typed, setTyped] = useState('');
  const matched = typed.trim().toLowerCase() === 'qwerty';
  return (
    <>
      <StepHead title="Keyboard check" lede="Make sure you have the right keyboard for typing your answers." />
      <Steps
        items={[
          'Look at the top row of letters on your keyboard.',
          <>The letters should start in this order: <span className="whitespace-nowrap font-mono font-bold">Q W E R T Y</span>.</>,
          'Type those six letters in the box below to check.',
        ]}
      />
      <div aria-hidden className="w-full max-w-xl space-y-1.5 rounded-2xl bg-slate-900 p-3 shadow-lg sm:p-4 dark:bg-slate-950">
        {KEY_ROWS.map((row, r) => (
          <div key={row} className="flex justify-center gap-1 sm:gap-1.5">
            {[...row].map((key, k) => {
              const highlight = r === 1 && k < 6;
              return (
                <span
                  key={key}
                  className={`flex h-7 w-6 items-center justify-center rounded-md text-[10px] font-bold sm:h-9 sm:w-9 sm:text-xs ${
                    highlight ? 'bg-primary text-primary-foreground ring-2 ring-primary/50' : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  {key}
                </span>
              );
            })}
          </div>
        ))}
        <div className="flex justify-center">
          <span className="h-7 w-2/5 rounded-md bg-slate-700 sm:h-9" />
        </div>
      </div>
      <div className="max-w-xs space-y-1.5">
        <label htmlFor="keyboard-check" className="text-xs font-semibold text-muted-foreground">
          Type the highlighted letters
        </label>
        <div className="relative">
          <input
            id="keyboard-check"
            value={typed}
            onChange={e => setTyped(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            maxLength={12}
            className="h-11 w-full rounded-xl border border-input bg-background px-3 font-mono text-base tracking-[0.3em] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {matched && <CheckCircle2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-500" />}
        </div>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {matched ? 'Your keyboard is ready.' : 'If your keyboard is laid out differently, ask for help before you start.'}
        </p>
      </div>
    </>
  );
}

function StatusDemo({ label, value, fill, tone }: { label: string; value: string; fill: number; tone: 'primary' | 'rose' | 'emerald' }) {
  const bar = { primary: 'bg-primary', rose: 'bg-rose-500', emerald: 'bg-emerald-500' }[tone];
  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-bold text-foreground">{value}</p>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${fill}%` }} />
      </div>
    </div>
  );
}

function SpeakingStep({ exam }: { exam: 'PTE' | 'IELTS' }) {
  const pte = exam === 'PTE';
  return (
    <>
      <StepHead
        title="Speaking instructions"
        lede={
          pte
            ? 'Some items play a recording first, then you answer by speaking clearly into the microphone.'
            : "The examiner's questions are read aloud, then you answer by speaking clearly into the microphone."
        }
      />
      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Headphones className="h-4 w-4 text-primary" /> Listening
        </h3>
        <p className="text-sm text-muted-foreground">
          {pte
            ? 'The status shows how long until the recording starts. The bar fills as it plays, and the recording stops when the bar is full.'
            : 'Each question plays once. The bar fills as it plays.'}
        </p>
        <div aria-hidden className="grid gap-3 sm:grid-cols-3">
          <StatusDemo label="Status" value="Starting in 5 s" fill={0} tone="primary" />
          <StatusDemo label="Status" value="Playing" fill={35} tone="primary" />
          <StatusDemo label="Status" value="Completed" fill={100} tone="primary" />
        </div>
      </section>
      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Mic className="h-4 w-4 text-primary" /> Speaking
        </h3>
        <p className="text-sm text-muted-foreground">
          {pte
            ? 'The status shows how long until the microphone opens. Start speaking after the beep and finish before the bar is full. If you stay silent for 3 seconds the recording stops, and you cannot record that answer again.'
            : 'When the microphone opens, answer the question. Your answer is recorded until its timer ends. In Part 2 you get one minute to prepare first.'}
        </p>
        <div aria-hidden className="grid gap-3 sm:grid-cols-3">
          <StatusDemo label="Status" value={pte ? 'Recording in 3 s' : 'Preparing'} fill={0} tone="rose" />
          <StatusDemo label="Status" value="Recording" fill={45} tone="rose" />
          <StatusDemo label="Status" value="Completed" fill={100} tone="emerald" />
        </div>
      </section>
    </>
  );
}
