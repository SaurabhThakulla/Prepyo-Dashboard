import React, { useCallback, useEffect, useRef, useState } from 'react';
import { announceRecording, onPromptPlaying } from '@/lib/audioFocus';
import { Mic, MicOff, AlertCircle, Info, Square } from 'lucide-react';
import { canRecord, formatDuration, pickRecorderMimeType, beep } from '@/lib/audio';
import { startTranscribing, type TranscriptSession } from '@/lib/speech';
import { createDeliveryMeter, type Delivery, type DeliveryMeter } from '@/lib/delivery';
import { TestMicrophone } from '@/lib/pteMock/audio';

/**
 * The exam's own sequence: a fixed think time, then recording starts on its own
 * and stops on its own. Letting a learner start and stop at will would make
 * practice easier than the real thing in the one way that matters most.
 */
type Phase = 'idle' | 'prep' | 'recording' | 'review';

/** Where the recorder is, for controls drawn outside it. */
export interface RecorderStatus {
  phase: Phase;
  remaining: number;
}

interface AudioRecorderProps {
  /** Think time before recording begins. 0 means recording starts immediately. */
  prepSeconds: number;
  /** Recording stops itself here, as the exam does. */
  maxSeconds: number;
  disabled?: boolean;
  /**
   * Open the microphone and start the think-time countdown as soon as the
   * recorder appears, so the timer runs from the moment the task starts.
   */
  autoStart?: boolean;
  /**
   * Called with the finished recording, or null when it is discarded.
   *
   * `transcript` is what the browser's own speech recognition heard, when it
   * has any. It is what gets scored where no provider can listen to audio, and
   * it is empty on browsers without recognition — the caller decides what to
   * offer then, because a missing transcript is not a failed recording.
   */
  onRecorded: (recording: Blob | null, transcript?: string, delivery?: Delivery) => void;
  /** Set to what the mic button does now (start, start now, stop), so another control can do it too. */
  controlRef?: React.MutableRefObject<(() => void) | null>;
  /** Called with the phase and seconds left whenever either changes. */
  onStatus?: (status: RecorderStatus) => void;
  /**
   * Stop by itself after three seconds of silence, before the learner says
   * anything or after they stop, as PTE's microphone does.
   */
  stopAfterSilence?: boolean;
  /**
   * The question's audio is still playing (or has not been played). A click
   * then answers at once: the audio stops and recording starts, with no
   * think time. Left alone, the recorder waits for `autoStart` as before.
   */
  answerNow?: boolean;
}

export default function AudioRecorder({
  prepSeconds,
  maxSeconds,
  disabled = false,
  autoStart = false,
  onRecorded,
  controlRef,
  onStatus,
  stopAfterSilence = false,
  answerNow = false,
}: AudioRecorderProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [remaining, setRemaining] = useState(0);
  // Levels of the answer so far, newest first: drawn from the cursor and scrolling right as you speak.
  const traceRef = useRef<number[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  // Set after 2 s with no sound, so short pauses do not flip the note back and forth.
  const [quiet, setQuiet] = useState(false);
  const lastSoundRef = useRef(0);
  // Last time the level reached speech (the mock test's threshold), for the silence stop.
  const lastVoiceRef = useRef(0);
  const stopAfterSilenceRef = useRef(stopAfterSilence);
  stopAfterSilenceRef.current = stopAfterSilence;
  const [silenceStopped, setSilenceStopped] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const transcriberRef = useRef<TranscriptSession | null>(null);
  // Pace and pauses, measured from the same meter that draws the level bar.
  const deliveryRef = useRef<DeliveryMeter | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);
  const waveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remainingRef = useRef(0);
  const mountedRef = useRef(true);
  const autoStartedRef = useRef(false);
  const supported = canRecord();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const clearTimer = useCallback(() => {
    if (tickRef.current !== null) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  /**
   * Counts down and calls onDone once at zero.
   *
   * The countdown lives in a ref rather than being derived inside a setState
   * updater. React runs updaters twice in development to surface impure ones,
   * and "start the recorder" firing twice would open two MediaRecorders on one
   * stream — a bug that would never show up in production and would be
   * miserable to track down.
   */
  const runCountdown = useCallback(
    (seconds: number, onDone: () => void) => {
      remainingRef.current = seconds;
      setRemaining(seconds);

      clearTimer();
      tickRef.current = setInterval(() => {
        remainingRef.current -= 1;
        setRemaining(remainingRef.current);
        if (remainingRef.current <= 0) {
          clearTimer();
          onDone();
        }
      }, 1000);
    },
    [clearTimer],
  );

  /**
   * Drops the microphone and everything hanging off it.
   *
   * Stopping the tracks is what turns off the browser's recording indicator. A
   * learner who has finished an answer should not be left with a live mic while
   * they read their feedback.
   */
  const releaseMic = useCallback(() => {
    if (waveTimerRef.current !== null) {
      clearInterval(waveTimerRef.current);
      waveTimerRef.current = null;
    }
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    clearTimer();
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    recorderRef.current = null;
  }, [clearTimer]);

  // Leaving the screen mid-answer must also stop the recogniser, which holds
  // the microphone indicator up on its own.
  useEffect(
    () => () => {
      void transcriberRef.current?.stop();
      transcriberRef.current = null;
      releaseMic();
    },
    [releaseMic],
  );

  /** Baseline, the answer's waveform starting at the cursor, and the cursor on top. */
  const drawTrace = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const mid = h / 2;
    const cursor = Math.round(w * 0.2);
    ctx.fillStyle = TRACE_GREEN;
    ctx.fillRect(0, mid - 0.5, w, 1);
    const trace = traceRef.current;
    for (let i = 0; i < trace.length && cursor + i < w; i++) {
      const half = Math.min(1, trace[i] * 1.6) * (mid - 2);
      if (half > 0.5) ctx.fillRect(cursor + i, mid - half, 1, half * 2);
    }
    ctx.fillStyle = getComputedStyle(canvas).color;
    ctx.fillRect(cursor - 1, 0, 2, h);
  }, []);

  useEffect(drawTrace, [drawTrace]);

  /** Drives the input meter, so a muted or unplugged mic is visible immediately. */
  const watchLevel = useCallback((stream: MediaStream) => {
    const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;

    const context = new Ctor();
    audioContextRef.current = context;
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    context.createMediaStreamSource(stream).connect(analyser);

    const samples = new Uint8Array(analyser.fftSize);
    // Root mean square of one buffer, scaled so ordinary speech fills most of the range.
    const measure = () => {
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (const sample of samples) {
        const centred = (sample - 128) / 128;
        sum += centred * centred;
      }
      return Math.min(1, Math.sqrt(sum / samples.length) * 4);
    };

    waveTimerRef.current = setInterval(() => {
      setQuiet(Date.now() - lastSoundRef.current > 2000);
      const recorder = recorderRef.current;
      if (
        stopAfterSilenceRef.current &&
        recorder?.state === 'recording' &&
        Date.now() - lastVoiceRef.current > TestMicrophone.SILENCE_SECONDS * 1000
      ) {
        setSilenceStopped(true);
        recorder.stop();
      }
    }, 60);

    const read = () => {
      const level = measure();
      if (level >= 0.02) lastSoundRef.current = Date.now();
      if (level >= TestMicrophone.VOICE_LEVEL) lastVoiceRef.current = Date.now();
      // The meter is already reading the microphone frame by frame, so timing
      // the silences costs nothing beyond this one call.
      deliveryRef.current?.sample(level);
      // One 1px column per frame while recording; silence below the noise floor stays a flat line.
      // shortcut: scroll speed follows the display's frame rate, use a time-based step if 120Hz screens look too fast.
      if (recorderRef.current?.state === 'recording') {
        traceRef.current.unshift(level < 0.02 ? 0 : level);
        if (traceRef.current.length > 3000) traceRef.current.length = 3000;
        drawTrace();
      }
      frameRef.current = requestAnimationFrame(read);
    };
    read();
  }, [drawTrace]);

  const isStartingRecordingRef = useRef(false);

  const beginRecording = useCallback(async () => {
    if (!mountedRef.current || isStartingRecordingRef.current) return;
    if (recorderRef.current?.state === 'recording') return;
    isStartingRecordingRef.current = true;
    clearTimer();

    const stream = streamRef.current;
    if (!stream) {
      isStartingRecordingRef.current = false;
      return;
    }

    // Play tone when the actual recording/answering starts (not during preparation)
    try {
      await beep();
    } catch {
      // non-fatal
    }

    if (!mountedRef.current) {
      isStartingRecordingRef.current = false;
      return;
    }

    const mimeType = pickRecorderMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;

    const chunks: Blob[] = [];
    recorder.ondataavailable = event => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      const recording = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      releaseMic();
      setPhase('review');

      // The recogniser needs a moment to flush its last phrase, so the answer
      // is handed over once it has, not the instant the recorder stops.
      const delivery = deliveryRef.current?.finish();
      deliveryRef.current = null;

      const transcriber = transcriberRef.current;
      transcriberRef.current = null;
      if (!transcriber) {
        onRecorded(recording, undefined, delivery);
        return;
      }
      void transcriber.stop().then(transcript => onRecorded(recording, transcript, delivery));
    };

    announceRecording();
    traceRef.current = [];
    recorder.start();
    isStartingRecordingRef.current = false;
    // Listening runs alongside the recording rather than over it: the learner
    // still gets the audio to play back, and the words go for marking.
    transcriberRef.current = startTranscribing();
    // Prep time is not part of the answer, so measurement starts here rather
    // than when the microphone opened.
    deliveryRef.current = createDeliveryMeter();
    lastSoundRef.current = Date.now();
    lastVoiceRef.current = Date.now();
    setQuiet(false);
    setSilenceStopped(false);
    setPhase('recording');

    // The exam cuts the answer off at the limit, so this does too.
    runCountdown(maxSeconds, () => {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    });
  }, [clearTimer, maxSeconds, onRecorded, releaseMic, runCountdown]);

  const startPrep = useCallback(() => {
    setPhase('prep');
    runCountdown(prepSeconds, () => {
      void beginRecording();
    });
  }, [beginRecording, prepSeconds, runCountdown]);

  // Read inside handleStart: a second start (the prompt finishing just after a
  // click) must not open the microphone again.
  const phaseNow = useRef<Phase>('idle');
  phaseNow.current = phase;
  const handleStart = useCallback(async () => {
    if (starting || disabled || phaseNow.current !== 'idle') return;
    // Started by hand: the automatic start must not follow it.
    autoStartedRef.current = true;
    const skipPrep = answerNow;
    // The question's audio stops the moment the learner chooses to answer.
    if (skipPrep) announceRecording();
    setError(null);
    setStarting(true);

    try {
      // These three are on by default in most browsers, but naming them means a
      // learner on a laptop mic in a noisy room gets the same treatment
      // everywhere rather than depending on the browser's defaults.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      // The learner may have left while the permission prompt was open.
      if (!mountedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current = stream;
      watchLevel(streamRef.current);

      if (prepSeconds > 0 && !skipPrep) startPrep();
      else void beginRecording();
    } catch (err) {
      releaseMic();
      setPhase('idle');
      setError(
        err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError')
          ? 'Prepyo needs microphone access to record your answer. Allow it in your browser’s address bar, then try again.'
          : 'We could not reach your microphone. Check that one is connected and not in use by another app.',
      );
    } finally {
      setStarting(false);
    }
  }, [answerNow, beginRecording, disabled, prepSeconds, releaseMic, starting, startPrep, watchLevel]);

  // Deferred a tick so React's development double-mount cancels the first
  // attempt instead of opening the microphone twice.
  useEffect(() => {
    if (!autoStart || !supported || disabled || autoStartedRef.current) return;
    const id = setTimeout(() => {
      autoStartedRef.current = true;
      void handleStart();
    }, 0);
    return () => clearTimeout(id);
  }, [autoStart, supported, disabled, handleStart]);

  const handleStopEarly = useCallback(() => {
    clearTimer();
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, [clearTimer]);

  // The learner plays the question's audio: a recording in progress stops (the
  // answer so far is kept), and preparation goes back to the start button.
  useEffect(
    () =>
      onPromptPlaying(() => {
        if (phaseNow.current === 'recording') handleStopEarly();
        else if (phaseNow.current === 'prep') {
          clearTimer();
          releaseMic();
          setPhase('idle');
        }
      }),
    [clearTimer, handleStopEarly, releaseMic],
  );

  const handleSkipPrep = useCallback(() => {
    clearTimer();
    void beginRecording();
  }, [beginRecording, clearTimer]);

  useEffect(() => {
    if (!controlRef) return;
    controlRef.current =
      phase === 'idle' ? () => void handleStart() : phase === 'prep' ? handleSkipPrep : phase === 'recording' ? handleStopEarly : null;
    return () => {
      controlRef.current = null;
    };
  }, [controlRef, phase, handleStart, handleSkipPrep, handleStopEarly]);

  useEffect(() => {
    if (supported) onStatus?.({ phase, remaining });
  }, [onStatus, phase, remaining, supported]);

  if (!supported) {
    return (
      <div className="p-4 rounded-xl bg-background border border-border space-y-1.5">
        <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <MicOff className="w-4 h-4 text-muted-foreground" /> Recording is not available
        </span>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          This browser cannot record audio. Speaking practice needs a recent version of Chrome,
          Edge, Firefox or Safari, served over HTTPS.
        </p>
      </div>
    );
  }

  const silent = phase === 'recording' && quiet;

  const status =
    phase === 'idle'
      ? answerNow
        ? `Listen first, or click to answer now: the audio stops and recording starts at once, for up to ${formatDuration(maxSeconds)}.`
        : prepSeconds > 0
        ? `You get ${formatDuration(prepSeconds)} to prepare, then recording starts on its own and stops after ${formatDuration(maxSeconds)}, the same as the exam.`
        : `Recording starts as soon as you press the button and stops after ${formatDuration(maxSeconds)}, the same as the exam.`
      : phase === 'prep'
        ? 'Read the task and plan your answer. Recording begins automatically.'
        : phase === 'recording'
          ? silent
            ? 'No sound is reaching your microphone yet.'
            : stopAfterSilence
              ? 'Speaking. Stops on its own when the timer ends or after 3 seconds of silence, as in the test.'
              : 'Speaking. Stops on its own when the timer ends, or click anywhere here to stop now.'
          : silenceStopped
            ? 'The microphone closed after 3 seconds of silence, as it does in the test.'
            : '';

  const tone =
    phase === 'recording'
      ? { panel: 'bg-rose-500/[0.07]' }
      : phase === 'prep'
        ? { panel: 'bg-amber-500/[0.07]' }
        : phase === 'review'
          ? { panel: 'bg-emerald-500/[0.06]' }
          : { panel: 'bg-primary/[0.06]' };

  // Left clock counts up through the current phase; right is that phase's length.
  const phaseLength = phase === 'prep' ? prepSeconds : maxSeconds;
  const shownElapsed = phase === 'idle' ? 0 : phaseLength - remaining;
  const headline =
    phase === 'idle'
      ? starting ? 'Opening microphone…' : 'Click to Start'
      : phase === 'prep'
        ? `Recording begins in ${remaining}s`
        : phase === 'recording'
          ? 'Click here to stop'
          : 'Completed';
  // The whole panel is the button: it starts recording, and while recording it stops it.
  const panelStarts = phase === 'idle' && !disabled && !starting;
  const panelStops = phase === 'recording';
  const panelAction = panelStarts ? handleStart : panelStops ? handleStopEarly : undefined;

  return (
    <div
      onClick={panelAction}
      role={panelAction ? 'button' : undefined}
      // The panel is the only control now that the mic button is gone, so it takes the keyboard too.
      tabIndex={panelAction ? 0 : undefined}
      onKeyDown={e => {
        if (panelAction && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          void panelAction();
        }
      }}
      aria-label={panelStops ? 'Stop recording' : panelStarts ? 'Start recording' : undefined}
      className={`relative overflow-hidden rounded-xl border border-border px-3 py-2.5 transition-colors duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:px-4 ${tone.panel} dark:bg-white/[0.03] ${
        panelStarts ? 'cursor-pointer hover:bg-primary/[0.1]' : panelStops ? 'cursor-pointer hover:bg-rose-500/[0.12]' : ''
      }`}
    >
      {/* One row: what is happening in the middle, the time on the right (an empty column
          on the left keeps the middle centred). */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <span aria-hidden />
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-1" aria-live="polite">
          {phase === 'idle' || phase === 'recording' ? (
            // To start and to stop: one big round button in the middle, what it does under it.
            <p className="flex flex-col items-center gap-1.5 py-1 text-sm font-bold text-foreground sm:text-base">
              <span
                className={`inline-flex h-14 w-14 items-center justify-center rounded-full text-white shadow-md ring-4 transition-colors ${
                  phase === 'recording' ? 'animate-pulse bg-rose-500 ring-rose-500/20' : 'bg-primary ring-primary/15'
                }`}
              >
                {phase === 'recording' ? <Square className="h-5 w-5 fill-current" aria-hidden /> : <Mic className="h-6 w-6" aria-hidden />}
              </span>
              {headline}
            </p>
          ) : (
            <p className="inline-flex items-center gap-2 text-sm font-bold text-foreground sm:text-base">{headline}</p>
          )}
          {phase === 'prep' && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                handleSkipPrep();
              }}
              className="text-xs font-semibold text-amber-700 underline-offset-4 hover:underline dark:text-amber-400"
            >
              Start now
            </button>
          )}
        </div>
        <span className="shrink-0 justify-self-end text-xs font-semibold tabular-nums text-muted-foreground">
          {clock(shownElapsed)} / {clock(phaseLength)}
        </span>
      </div>

      {/* The answer's waveform: it grows from the cursor and scrolls right while the learner speaks. */}
      <canvas aria-hidden ref={canvasRef} className="mt-2 block h-10 w-full rounded-md bg-background/80 text-foreground" />

      {/* Playback and redo live in the practice action bar, not here. */}
      {status && (
        <p className={`mt-1.5 flex items-start gap-1.5 text-[11px] leading-relaxed ${silent ? 'font-semibold text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}`}>
          <Info className="mt-px h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          {status}
        </p>
      )}

      {error && (
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
          <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">{error}</p>
        </div>
      )}
    </div>
  );
}

const clock = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

const TRACE_GREEN = '#16a34a';
