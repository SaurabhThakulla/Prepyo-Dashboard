import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { beep, TestMicrophone } from '@/lib/pteMock/audio';
import { encodeForUpload } from '@/lib/audio';
import { Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import QuestionFigure from '@/components/practice/QuestionFigure';
import { PteAnswer } from '@/lib/pteMock/types';
import { AudioStatusPanel, RecorderPhase, RecorderStatusPanel } from './StatusPanels';
import { usePromptPlayback } from './usePromptPlayback';
import { isRepeatSentenceTask, passageText } from '@/lib/listening';
import { ItemHandle, ItemProps } from './types';

/**
 * Every PTE speaking task, run the way the test runs it:
 *
 *   the recording plays once (Repeat Sentence, Re-tell Lecture, ...) →
 *   the preparation countdown (Read Aloud, Describe Image, ...) →
 *   a beep, and the microphone opens by itself →
 *   it closes when the time is up, or after three seconds of silence.
 *
 * There is no re-recording. As in the IELTS speaking mock, each answer is sent
 * with its recording, which the server transcribes (Whisper), and with what
 * the device heard, which is kept if the server cannot. The pace and pauses
 * measured while it listened go with it.
 */
const SpeakingItem = forwardRef<ItemHandle, ItemProps>(function SpeakingItem({ item, mic, sessionId }, ref) {
  const { task, question } = item;
  const prep = task.prepSeconds ?? 0;
  const response = task.responseSeconds ?? 40;

  const [phase, setPhase] = useState<RecorderPhase>('waiting');
  const [countdown, setCountdown] = useState(prep);
  const [level, setLevel] = useState(0);
  const [note, setNote] = useState<string | undefined>();
  const answer = useRef<PteAnswer | null>(null);
  const stopping = useRef<Promise<PteAnswer> | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (mic?.recording) void mic.stop().catch(() => {});
    };
  }, [mic]);

  const stopRecording = useCallback(
    (why?: string): Promise<PteAnswer> => {
      if (stopping.current) return stopping.current;
      if (!mic || !mic.recording) return Promise.resolve(answer.current ?? {});
      stopping.current = mic.stop().then(async result => {
        const recorded: PteAnswer = {
          transcript: result.transcript,
          durationSeconds: result.durationSeconds,
          delivery: result.delivery,
        };
        if (result.blob.size > 0) {
          try {
            const encoded = await encodeForUpload(result.blob);
            recorded.audio = encoded.base64;
            recorded.format = encoded.format;
            recorded.durationSeconds = encoded.durationSeconds || recorded.durationSeconds;
          } catch {
            // No usable audio was captured; the browser's transcript is still sent.
          }
        }
        answer.current = recorded;
        if (alive.current) {
          setPhase('done');
          setNote(why);
        }
        return recorded;
      });
      return stopping.current;
    },
    [mic],
  );

  const startRecording = useCallback(async () => {
    if (!alive.current || phaseRef.current === 'recording') return;
    if (!mic) {
      setPhase('skipped');
      setNote('The microphone is not available, so this answer could not be recorded.');
      return;
    }
    await beep();
    if (!alive.current) return;
    try {
      mic.start(setLevel, () => void stopRecording('The microphone closed after three seconds of silence.'));
    } catch {
      setPhase('skipped');
      setNote('Recording could not start. Check that your microphone is still connected.');
      return;
    }
    setCountdown(response);
    setPhase('recording');
  }, [mic, response, stopRecording]);

  const beginPrep = useCallback(() => {
    if (!alive.current) return;
    if (prep <= 0) {
      void startRecording();
      return;
    }
    setCountdown(prep);
    setPhase('prep');
  }, [prep, startRecording]);

  const playback = usePromptPlayback(question, task.audioDelaySeconds ?? 3, beginPrep, `${sessionId}:${item.position}`);

  // One countdown drives both windows: preparation, then the recording.
  useEffect(() => {
    if (phase !== 'prep' && phase !== 'recording') return;
    if (countdown <= 0) {
      if (phase === 'prep') void startRecording();
      else void stopRecording();
      return;
    }
    const timer = setTimeout(() => setCountdown(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown, startRecording, stopRecording]);

  useImperativeHandle(
    ref,
    () => ({
      hasAnswer: () =>
        phaseRef.current === 'recording' ||
        Boolean(answer.current?.transcript || answer.current?.audio || answer.current?.durationSeconds),
      collect: async () => {
        playback.stop();
        if (phaseRef.current === 'recording') return stopRecording();
        return answer.current ?? {};
      },
    }),
    [playback, stopRecording],
  );

  const isAudioTask = playback.present;
  // The task text is in the runner's header. Here: the recording, what to speak about, then the microphone.
  return (
    <div className="space-y-4">
      {isAudioTask && <AudioStatusPanel phase={playback.phase} countdown={playback.countdown} />}

      {question.imageUrl && (
        // The practice figure: drawn large, with zoom in and out and a full view.
        <QuestionFigure src={question.imageUrl} alt={question.title || 'Image to describe'} className="-mx-4 w-auto rounded-none sm:mx-auto sm:w-full sm:rounded-xl" />
      )}

      {question.contextPassage && !isRepeatSentenceTask(question) && (
        <div className="rounded-xl bg-muted/40 p-4 text-[15px] leading-relaxed text-foreground whitespace-pre-line select-none sm:p-5 sm:text-base">
          {passageText(question)}
        </div>
      )}

      {/* While the recording plays it is the only status on screen; the microphone's comes after it. */}
      {!(isAudioTask && phase === 'waiting') && (
        <RecorderStatusPanel phase={phase} countdown={countdown} total={response} prepTotal={prep} level={level} note={note} />
      )}

      {mic && (phase === 'waiting' || phase === 'prep') && (
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
          <span>Ready already?</span>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-full"
            title={`${isAudioTask ? 'The recording stops and ' : ''}your microphone opens straight away.`}
            onClick={() => {
              playback.stop();
              void startRecording();
            }}
          >
            <Mic className="h-3.5 w-3.5" /> Answer now
          </Button>
        </div>
      )}

      {phase === 'recording' && (
        <p className="text-center text-sm text-muted-foreground">
          Speak clearly. Recording stops by itself when the time is up or after {TestMicrophone.SILENCE_SECONDS} seconds of silence, or press Next.
        </p>
      )}
    </div>
  );
});

export default SpeakingItem;
