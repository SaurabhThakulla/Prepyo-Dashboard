import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Square, RotateCcw, Loader2, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { canRecord, formatDuration, pickRecorderMimeType, beep } from '@/lib/audio';
import { startTranscribing, type TranscriptSession } from '@/lib/speech';
import { createDeliveryMeter, type Delivery, type DeliveryMeter } from '@/lib/delivery';

/**
 * The exam's own sequence: a fixed think time, then recording starts on its own
 * and stops on its own. Letting a learner start and stop at will would make
 * practice easier than the real thing in the one way that matters most.
 */
type Phase = 'idle' | 'prep' | 'recording' | 'review';

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
}

export default function AudioRecorder({
  prepSeconds,
  maxSeconds,
  disabled = false,
  autoStart = false,
  onRecorded,
}: AudioRecorderProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [remaining, setRemaining] = useState(0);
  const [level, setLevel] = useState(0);
  // Recent levels, oldest first: drawn as a waveform that scrolls left as you speak.
  const [wave, setWave] = useState<number[]>(() => Array(WAVE_BARS).fill(0));
  const waveRef = useRef<number[]>(Array(WAVE_BARS).fill(0));
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);

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
    setLevel(0);
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

  useEffect(() => {
    if (!playbackUrl) return;
    return () => URL.revokeObjectURL(playbackUrl);
  }, [playbackUrl]);

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

    // The scrolling wave runs on its own clock: a new column every 60ms, so it
    // moves at a readable pace whatever the frame rate, and React is not
    // re-rendering on every animation frame.
    waveRef.current = Array(WAVE_BARS).fill(0);
    setWave(waveRef.current);
    waveTimerRef.current = setInterval(() => {
      waveRef.current = [...waveRef.current.slice(1), measure()];
      setWave(waveRef.current);
    }, 60);

    const read = () => {
      const level = measure();
      setLevel(level);
      // The meter is already reading the microphone frame by frame, so timing
      // the silences costs nothing beyond this one call.
      deliveryRef.current?.sample(level);
      frameRef.current = requestAnimationFrame(read);
    };
    read();
  }, []);

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
      setPlaybackUrl(URL.createObjectURL(recording));
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

    recorder.start();
    isStartingRecordingRef.current = false;
    // Listening runs alongside the recording rather than over it: the learner
    // still gets the audio to play back, and the words go for marking.
    transcriberRef.current = startTranscribing();
    // Prep time is not part of the answer, so measurement starts here rather
    // than when the microphone opened.
    deliveryRef.current = createDeliveryMeter();
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

  const handleStart = useCallback(async () => {
    if (starting || disabled) return;
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

      if (prepSeconds > 0) startPrep();
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
  }, [beginRecording, disabled, prepSeconds, releaseMic, starting, startPrep, watchLevel]);

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

  const handleSkipPrep = useCallback(() => {
    clearTimer();
    void beginRecording();
  }, [beginRecording, clearTimer]);

  const handleRetake = useCallback(() => {
    isStartingRecordingRef.current = false;
    void transcriberRef.current?.stop();
    transcriberRef.current = null;
    deliveryRef.current = null;
    setPlaybackUrl(null);
    setPhase('idle');
    setRemaining(0);
    setError(null);
    onRecorded(null);
  }, [onRecorded]);

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

  // How far through the current countdown we are, for the ring and the bar.
  const phaseTotal = phase === 'prep' ? prepSeconds : phase === 'recording' ? maxSeconds : 0;
  const elapsed = phaseTotal > 0 ? Math.min(1, Math.max(0, 1 - remaining / phaseTotal)) : phase === 'review' ? 1 : 0;
  const live = phase === 'prep' || phase === 'recording';
  const silent = phase === 'recording' && level < 0.02;

  const status =
    phase === 'idle'
      ? prepSeconds > 0
        ? `You get ${formatDuration(prepSeconds)} to prepare, then recording starts on its own and stops after ${formatDuration(maxSeconds)}, the same as the exam.`
        : `Recording starts as soon as you press the button and stops after ${formatDuration(maxSeconds)}, the same as the exam.`
      : phase === 'prep'
        ? 'Read the task and plan your answer. Recording begins automatically.'
        : phase === 'recording'
          ? silent
            ? 'No sound is reaching your microphone yet.'
            : 'Speaking. Keep going until the timer ends.'
          : 'Listen back before you submit. Re-recording replaces this answer and costs nothing.';

  const tone =
    phase === 'recording'
      ? { orb: 'bg-rose-500 shadow-rose-500/30', bar: 'from-rose-500 to-rose-400', wave: 'bg-rose-400', panel: 'border-rose-500/40 bg-rose-500/[0.06]' }
      : phase === 'prep'
        ? { orb: 'bg-amber-500 shadow-amber-500/30', bar: 'from-amber-500 to-amber-300', wave: 'bg-amber-400/70', panel: 'border-amber-500/40 bg-amber-500/[0.06]' }
        : phase === 'review'
          ? { orb: 'bg-emerald-500 shadow-emerald-500/30', bar: 'from-emerald-500 to-emerald-400', wave: 'bg-emerald-500/40', panel: 'border-emerald-500/30 bg-emerald-500/[0.05]' }
          : { orb: 'bg-primary shadow-primary/30', bar: 'from-primary to-primary', wave: 'bg-muted-foreground/20', panel: 'border-primary/10 bg-primary/[0.06]' };

  // Left clock counts up through the current phase; right is that phase's length.
  const phaseLength = phase === 'prep' ? prepSeconds : maxSeconds;
  const shownElapsed = phase === 'idle' ? 0 : phaseLength - remaining;
  const headline =
    phase === 'idle'
      ? starting ? 'Opening microphone…' : 'Click to Start'
      : phase === 'prep'
        ? `Recording begins in ${remaining}s`
        : phase === 'recording'
          ? 'Recording…'
          : 'Completed';
  const micAction = phase === 'idle' ? handleStart : phase === 'prep' ? handleSkipPrep : phase === 'recording' ? handleStopEarly : undefined;
  const micLabel = phase === 'idle' ? 'Start recording' : phase === 'prep' ? 'Start now' : phase === 'recording' ? 'Stop recording' : 'Recorded';

  return (
    <div className={`relative overflow-hidden rounded-xl border p-4 transition-colors duration-500 sm:px-5 ${tone.panel}`}>
      <p className="text-center text-sm font-semibold text-foreground" aria-live="polite">{headline}</p>

      <div className="mt-2 flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={micAction}
          disabled={phase === 'review' || (phase === 'idle' && (disabled || starting))}
          aria-label={micLabel}
          title={micLabel}
          className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-md transition-transform duration-200 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 disabled:cursor-default ${tone.orb} ${
            phase === 'idle' && !disabled ? 'hover:scale-105' : ''
          } ${phase === 'idle' && disabled ? 'opacity-50' : ''}`}
        >
          {phase === 'recording' && (
            <span
              aria-hidden
              className="absolute inset-0 rounded-full bg-rose-500/30 transition-transform duration-75"
              style={{ transform: `scale(${1 + level * 0.6})` }}
            />
          )}
          <span className="relative">
            {phase === 'idle' && (starting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mic className="h-5 w-5" />)}
            {phase === 'prep' && <span className="text-base font-extrabold tabular-nums">{remaining}</span>}
            {phase === 'recording' && <Square className="h-4 w-4 fill-current" />}
            {phase === 'review' && <Check className="h-5 w-5" strokeWidth={3} />}
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between text-sm font-semibold tabular-nums text-foreground">
            <span>{clock(shownElapsed)}</span>
            <span>{clock(phaseLength)}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted-foreground/15">
            <div
              className={`h-full rounded-full bg-gradient-to-r transition-[width] duration-1000 ease-linear ${tone.bar}`}
              style={{ width: `${elapsed * 100}%` }}
            />
          </div>
          {/* Live level from the microphone, so a muted or wrong mic shows up during prep. */}
          {live && (
            <div aria-hidden className="mt-1.5 flex h-4 items-center gap-[2px]">
              {WAVE_SHAPE.map((shape, i) => (
                <span
                  key={i}
                  style={{ height: `${Math.round((0.15 + Math.min(1, wave[i] * 1.6) * (0.8 + 0.2 * shape)) * 100)}%` }}
                  className={`flex-1 rounded-full transition-[height] duration-100 ease-out ${tone.wave}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {phase === 'review' && playbackUrl && (
        <audio controls src={playbackUrl} className="mt-3 h-10 w-full">
          Audio can't play on this device.
        </audio>
      )}

      <p className={`mt-3 text-xs leading-relaxed ${silent ? 'font-semibold text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}`}>
        {status}
      </p>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
          <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">{error}</p>
        </div>
      )}

      {phase === 'review' && (
        <Button onClick={handleRetake} disabled={disabled} size="sm" variant="outline" className={`mt-3 ${ACTION}`}>
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Record again</span>
        </Button>
      )}
    </div>
  );
}

const clock = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

// The one action of each phase: the full width and a thumb-sized target on a phone.
const ACTION = 'h-11 w-full gap-1.5 rounded-full px-4 text-sm font-bold sm:h-8 sm:w-auto sm:text-[11px]';

// Resting shape, and a little per-bar texture on the live wave.
const WAVE_BARS = 40;
const WAVE_SHAPE = Array.from({ length: WAVE_BARS }, (_, i) => 0.35 + 0.65 * Math.abs(Math.sin(i * 0.8) * Math.cos(i * 0.33)));
