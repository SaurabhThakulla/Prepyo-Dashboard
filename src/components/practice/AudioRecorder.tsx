import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Square, RotateCcw, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { canRecord, formatDuration, pickRecorderMimeType } from '@/lib/audio';

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
  /** Called with the finished recording, or null when it is discarded. */
  onRecorded: (recording: Blob | null) => void;
}

export default function AudioRecorder({
  prepSeconds,
  maxSeconds,
  disabled = false,
  onRecorded,
}: AudioRecorderProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [remaining, setRemaining] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remainingRef = useRef(0);
  const supported = canRecord();

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

  useEffect(() => releaseMic, [releaseMic]);

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
    const read = () => {
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (const sample of samples) {
        const centred = (sample - 128) / 128;
        sum += centred * centred;
      }
      // Root mean square, scaled so ordinary speech fills most of the bar.
      setLevel(Math.min(1, Math.sqrt(sum / samples.length) * 4));
      frameRef.current = requestAnimationFrame(read);
    };
    read();
  }, []);

  const beginRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;

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
      onRecorded(recording);
    };

    recorder.start();
    setPhase('recording');

    // The exam cuts the answer off at the limit, so this does too.
    runCountdown(maxSeconds, () => {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    });
  }, [maxSeconds, onRecorded, releaseMic, runCountdown]);

  const startPrep = useCallback(() => {
    setPhase('prep');
    runCountdown(prepSeconds, beginRecording);
  }, [beginRecording, prepSeconds, runCountdown]);

  const handleStart = useCallback(async () => {
    if (starting || disabled) return;
    setError(null);
    setStarting(true);

    try {
      // These three are on by default in most browsers, but naming them means a
      // learner on a laptop mic in a noisy room gets the same treatment
      // everywhere rather than depending on the browser's defaults.
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      watchLevel(streamRef.current);

      if (prepSeconds > 0) startPrep();
      else beginRecording();
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

  const handleStopEarly = useCallback(() => {
    clearTimer();
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, [clearTimer]);

  const handleSkipPrep = useCallback(() => {
    clearTimer();
    beginRecording();
  }, [beginRecording, clearTimer]);

  const handleRetake = useCallback(() => {
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

  return (
    <div className="p-4 rounded-xl bg-background border border-border space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <Mic className="w-4 h-4 text-primary" /> Your answer
        </span>

        {phase === 'prep' && (
          <Badge variant="warning">Prepare · {formatDuration(remaining)}</Badge>
        )}
        {phase === 'recording' && (
          <Badge variant="destructive" className="gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            Recording · {formatDuration(remaining)}
          </Badge>
        )}
        {phase === 'review' && <Badge variant="success">Recorded</Badge>}
      </div>

      {phase === 'idle' && (
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {prepSeconds > 0
            ? `You get ${formatDuration(prepSeconds)} to prepare, then recording starts on its own and stops after ${formatDuration(maxSeconds)} — the same as the exam.`
            : `Recording starts as soon as you press the button and stops after ${formatDuration(maxSeconds)}, the same as the exam.`}
        </p>
      )}

      {(phase === 'prep' || phase === 'recording') && (
        <div className="space-y-2">
          {/* Input meter. A flat bar while speaking means the wrong microphone
              is selected, which is worth seeing before the answer is spent. */}
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width] duration-75 ${
                phase === 'recording' ? 'bg-rose-500' : 'bg-primary/40'
              }`}
              style={{ width: `${Math.round(level * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {phase === 'prep'
              ? 'Read the task. Recording begins automatically.'
              : level < 0.02
                ? 'No sound is reaching your microphone yet.'
                : 'Speaking — keep going until the timer ends.'}
          </p>
        </div>
      )}

      {phase === 'review' && playbackUrl && (
        <div className="space-y-2">
          <audio controls src={playbackUrl} className="w-full">
            Your browser does not support audio playback.
          </audio>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Listen back before you submit. Re-recording replaces this answer and costs nothing.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-2">
        {phase === 'idle' && (
          <Button onClick={handleStart} disabled={disabled || starting} size="sm" className="font-bold gap-1.5">
            {starting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mic className="w-3.5 h-3.5" />}
            <span>{starting ? 'Opening microphone…' : 'Start recording'}</span>
          </Button>
        )}

        {phase === 'prep' && (
          <Button onClick={handleSkipPrep} size="sm" variant="outline" className="font-bold gap-1.5">
            <Mic className="w-3.5 h-3.5" />
            <span>Start now</span>
          </Button>
        )}

        {phase === 'recording' && (
          <Button onClick={handleStopEarly} size="sm" variant="destructive" className="font-bold gap-1.5">
            <Square className="w-3.5 h-3.5" />
            <span>Stop</span>
          </Button>
        )}

        {phase === 'review' && (
          <Button onClick={handleRetake} disabled={disabled} size="sm" variant="outline" className="font-bold gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Record again</span>
          </Button>
        )}
      </div>
    </div>
  );
}
