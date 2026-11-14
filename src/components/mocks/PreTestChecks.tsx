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
  /** The parts or sections of the test, for the introduction, each with its time. */
  sections: { label: string; timing?: string }[];
  /** Starting the test failed, or the microphone could not be opened. */
  error?: string | null;
  beginning?: boolean;
  /** Label of the last button; "Begin test" by default. */
  beginLabel?: string;
  onBegin: () => void;
  onCancel: () => void;
}

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
    <div data-practice-workspace className="flex min-h-dvh w-full flex-col bg-card">
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

      {/* Every step's card sits in the middle of the screen, across and down. */}
      <main className="flex flex-1 flex-col justify-center px-4 py-4 sm:px-8 sm:py-5">
        {/* A solid card: the text never sits on the page's patterned backdrop. */}
        <div className="mx-auto w-full max-w-4xl space-y-5 px-1 py-2">
          {step === 'intro' && <IntroStep exam={exam} title={title} skills={skills} sections={sections} />}
          {step === 'headset' && <HeadsetStep onHeard={() => setHeard(true)} heard={heard} />}
          {step === 'mic' && <MicStep onRecorded={() => setRecorded(true)} onBroken={() => setMicBroken(true)} />}
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

function StepHead({ title }: { title: string }) {
  return <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{title}</h2>;
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-base text-foreground sm:text-lg">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1 pt-0.5 leading-relaxed">{item}</div>
        </li>
      ))}
    </ol>
  );
}

function IntroStep({ exam, title, skills, sections }: { exam: 'PTE' | 'IELTS'; title: string; skills: CheckSkill[]; sections: Props['sections'] }) {
  const has = (skill: CheckSkill) => skills.includes(skill);
  // IELTS calls its skills sections; one skill's tasks or recordings are parts.
  const noun = exam === 'IELTS' && skills.length > 1 ? 'section' : 'part';
  return (
    <>
      <StepHead title={`You are about to begin ${title}`} />
      {(has('listening') || has('speaking')) && (
        <p className="flex items-center gap-2.5 text-base font-semibold text-foreground sm:text-lg">
          <Headphones className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          Remember to put your headphones on before you begin.
        </p>
      )}
      <TestOverview sections={sections} noun={noun} />
    </>
  );
}

// A short rising and falling tune, played with the browser's own audio.
const TUNE = [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 523.25, 659.25, 783.99, 1046.5, 1318.5, 1046.5];
const NOTE_SECONDS = 0.42;
const MAX_GAIN = 0.5;
// The signal's resting shape: 40 bars, tall in the middle and tapering at the ends.
// A mirrored signal: tallest in the middle, the same on both sides.
const SIGNAL = Array.from({ length: 40 }, (_, i) => {
  const d = Math.abs(i + 0.5 - 20) / 20;
  return 0.18 + 0.82 * Math.cos((Math.PI * d) / 2) * (0.6 + 0.4 * Math.abs(Math.cos(d * 9)));
});

/**
 * A recording as a radio signal. While it plays the bars follow `levels` (the
 * live sound, one 0-1 value a bar) or, without them, pulse outward from the
 * middle. With `progress` they light up as it plays; without it all are lit.
 */
export function SignalBars({
  progress = 1,
  playing,
  levels,
  className = '',
}: {
  progress?: number;
  playing: boolean;
  levels?: number[] | null;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-center gap-[3px] ${className}`} aria-hidden>
      {SIGNAL.map((base, i) => {
        const d = Math.abs(i + 0.5 - SIGNAL.length / 2) / (SIGNAL.length / 2);
        const lit = (i + 0.5) / SIGNAL.length <= progress;
        return (
          <span
            key={i}
            className={`w-1 shrink-0 rounded-full bg-gradient-to-b from-primary to-indigo-500 transition-[height] duration-100 ${
              playing && !levels ? 'signal-live' : ''
            }`}
            style={{
              height: `${Math.max(10, (playing && levels ? Math.max(levels[i] ?? 0, base * 0.15) : base) * 100)}%`,
              // Fades towards the edges; unplayed bars stay faint.
              opacity: (lit ? 1 : 0.25) * (1 - 0.55 * d),
              // The pulse ripples out from the middle.
              animationDelay: `${Math.round(d * 450)}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

/** The test at a glance, as a test centre shows it: each part and its time, on one screen. */
function TestOverview({ sections, noun }: { sections: Props['sections']; noun: string }) {
  const timed = sections.some(section => section.timing);
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full border-collapse text-left text-base sm:text-lg">
        <thead>
          <tr className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="w-20 border-b border-border px-4 py-3">{noun}</th>
            <th scope="col" className="border-b border-l border-border px-4 py-3">Content</th>
            {timed && <th scope="col" className="border-b border-l border-border px-4 py-3">Time allowed</th>}
          </tr>
        </thead>
        <tbody>
          {sections.map((section, i) => (
            <tr key={section.label} className="border-t border-border first:border-t-0">
              <td className="px-4 py-3.5 tabular-nums text-muted-foreground">{i + 1}</td>
              <td className="border-l border-border px-4 py-3.5 font-semibold text-foreground">{section.label}</td>
              {timed && <td className="border-l border-border px-4 py-3.5 text-foreground">{section.timing ?? ''}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
      <StepHead title="Headset check" />
      <Steps
        items={[
          'Put your headphones on.',
          'Press play and check you can hear the tune.',
        ]}
      />
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-5 py-4 sm:px-8">
        <div className="flex w-full items-center gap-4">
          <button
            type="button"
            onClick={playing ? stop : play}
            aria-label={playing ? 'Stop the tune' : 'Play the tune'}
            className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {playing && <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" aria-hidden />}
            {playing ? <Square className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
          </button>
          {/* The tune as a signal: bars light up as it plays and move while it is playing. */}
          <SignalBars progress={progress} playing={playing} className="h-14 min-w-0 flex-1" />
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
          {heard && !playing && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
          {status}
        </p>
        <label className="flex w-full items-center gap-3 text-xs font-semibold text-muted-foreground">
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

function MicStep({ onRecorded, onBroken }: { onRecorded: () => void; onBroken: () => void }) {
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
      <StepHead title="Microphone check" />
      <Steps
        items={[
          <>Press Record and say “Testing, one, two, three”.</>,
          'Press Stop, then Play back to hear yourself.',
        ]}
      />
      <div className="mx-auto max-w-xl space-y-4">
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
    </>
  );
}

const KEY_ROWS = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

function KeyboardStep() {
  const [typed, setTyped] = useState('');
  const matched = typed.trim().toLowerCase() === 'qwerty';
  return (
    <>
      <StepHead title="Keyboard check" />
      <Steps
        items={[
          <>Type <span className="whitespace-nowrap font-mono font-bold">Q W E R T Y</span> in the box below.</>,
        ]}
      />
      <div aria-hidden className="mx-auto w-full max-w-xl space-y-1.5 rounded-2xl bg-slate-900 p-3 shadow-lg sm:p-4 dark:bg-slate-950">
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
      <div className="mx-auto max-w-xs space-y-1.5 text-center">
        <label htmlFor="keyboard-check" className="sr-only">
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
            placeholder="QWERTY"
            // A field must look like a field: white, with a blue outline that deepens when you type in it.
            className={`h-12 w-full rounded-xl bg-background px-4 text-center font-mono text-base font-bold uppercase tracking-[0.3em] text-foreground shadow-sm ring-2 transition placeholder:font-sans placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-primary ${
              matched ? 'ring-emerald-500' : 'ring-primary/40'
            }`}
          />
          {matched && <CheckCircle2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-500" />}
        </div>
        <p className="h-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400" aria-live="polite">
          {matched ? 'Your keyboard is ready.' : ''}
        </p>
      </div>
    </>
  );
}

function SpeakingStep({ exam }: { exam: 'PTE' | 'IELTS' }) {
  const pte = exam === 'PTE';
  // Each spoken item, in the order it runs, drawn as the test draws it.
  const flow = [
    { icon: <span className="text-lg font-extrabold tabular-nums">3</span>, tone: 'bg-amber-500/15 text-amber-600', title: 'Get ready', text: pte ? 'A short countdown before each item.' : 'The examiner asks the question. In Part 2 you get one minute to prepare.' },
    ...(pte ? [{ icon: <Headphones className="h-6 w-6" />, tone: 'bg-primary text-primary-foreground', title: 'Listen', text: 'Some items play a recording first. It plays once.' }] : []),
    { icon: <Mic className="h-6 w-6" />, tone: 'bg-rose-500 text-white', title: pte ? 'Speak after the beep' : 'Speak', text: pte ? 'Finish before the time runs out. 3 seconds of silence stops the recording.' : 'Your answer is recorded until its timer ends.' },
    { icon: <CheckCircle2 className="h-6 w-6" />, tone: 'bg-emerald-500/15 text-emerald-600', title: 'Done', text: pte ? 'Your answer is saved. Press Next to go on.' : 'The next question follows by itself.' },
  ];
  return (
    <>
      <StepHead title="How speaking works" />
      <ol className={`grid gap-6 ${flow.length === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
        {flow.map((stage, i) => (
          <li key={stage.title} className="flex flex-col items-center gap-3 text-center">
            <span aria-hidden className={`flex h-14 w-14 items-center justify-center rounded-full ${stage.tone}`}>{stage.icon}</span>
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Step {i + 1}</span>
            <span className="text-lg font-bold text-foreground">{stage.title}</span>
            <span className="text-base leading-relaxed text-muted-foreground">{stage.text}</span>
          </li>
        ))}
      </ol>
    </>
  );
}
