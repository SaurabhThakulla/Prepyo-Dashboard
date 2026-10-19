import { Question } from '@/lib/types';
import { AnswerRecorder } from '@/lib/answerRecorder';
import { createDeliveryMeter, Delivery, DeliveryMeter } from '@/lib/delivery';
import { Playback, playRecording, StoppedError } from '@/lib/scriptPlayer';

/**
 * Sound for the PTE test player: the prompt recordings, the beep before a
 * recording starts, and the microphone.
 */

export { beep } from '@/lib/audio';

/** Whether an item has a recording to play. */
export function hasPromptAudio(question: Question): boolean {
  return Boolean(question.audioUrl || question.audioTranscript?.trim());
}

/**
 * Plays an item's recording once, start to finish: the file where it has one,
 * otherwise its script spoken by the browser or, failing that, the server.
 */
export async function playPrompt(question: Question, onProgress?: (fraction: number) => void): Promise<Playback> {
  if (question.audioUrl) return playFile(question.audioUrl, onProgress);
  const script = question.audioTranscript?.trim();
  if (!script) return { done: Promise.resolve(), stop: () => {} };
  return playRecording({ script, audioUrl: `/questions/${question.id}/playback/audio` }, onProgress);
}

function playFile(url: string, onProgress?: (fraction: number) => void): Playback {
  const audio = new Audio(url);
  let reject: (err: Error) => void = () => {};
  const done = new Promise<void>((resolve, rej) => {
    reject = rej;
    audio.onended = () => resolve();
    audio.onerror = () => rej(new Error('The recording could not be played.'));
    audio.ontimeupdate = () => {
      if (audio.duration > 0) onProgress?.(audio.currentTime / audio.duration);
    };
  });
  void audio.play().catch(err => reject(err instanceof Error ? err : new Error(String(err))));
  return {
    done,
    stop: () => {
      audio.pause();
      reject(new StoppedError());
    },
  };
}

/**
 * The microphone for a whole test: opened once, one recording per spoken item.
 *
 * It keeps the test's rule that a recording stops by itself after three
 * seconds of silence, and measures pace and pauses while it listens, which
 * the rating uses.
 */
export class TestMicrophone {
  private recorder = new AnswerRecorder();
  private meter: DeliveryMeter | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastVoiceAt = 0;
  private heardVoice = false;

  /** Seconds of silence after which a recording stops itself. */
  static readonly SILENCE_SECONDS = 3;
  /** The level the delivery meter counts as speech. */
  static readonly VOICE_LEVEL = 0.06;

  static supported(): boolean {
    return AnswerRecorder.supported();
  }

  open(): Promise<void> {
    return this.recorder.open();
  }

  level(): number {
    return this.recorder.level();
  }

  get recording(): boolean {
    return this.recorder.recording;
  }

  /**
   * Starts a recording. `onSilence` is called once when the learner has been
   * silent for SILENCE_SECONDS — before they say anything, or after they stop.
   */
  start(onLevel: (level: number) => void, onSilence: () => void): void {
    this.recorder.start();
    this.meter = createDeliveryMeter();
    this.lastVoiceAt = performance.now();
    this.heardVoice = false;
    let fired = false;
    this.timer = setInterval(() => {
      const level = this.recorder.level();
      this.meter?.sample(level);
      onLevel(level);
      const now = performance.now();
      if (level >= TestMicrophone.VOICE_LEVEL) {
        this.lastVoiceAt = now;
        this.heardVoice = true;
      } else if (!fired && now - this.lastVoiceAt > TestMicrophone.SILENCE_SECONDS * 1000) {
        fired = true;
        onSilence();
      }
    }, 50);
  }

  /**
   * Ends the recording: the recording itself, for the server to transcribe,
   * with what the device heard, how long, and how it was said.
   */
  async stop(): Promise<{ blob: Blob; transcript: string; durationSeconds: number; delivery?: Delivery; heardVoice: boolean }> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const delivery = this.meter?.finish();
    this.meter = null;
    const answer = await this.recorder.stop();
    return {
      blob: answer.blob,
      transcript: answer.transcript,
      durationSeconds: answer.durationSeconds,
      delivery,
      heardVoice: this.heardVoice,
    };
  }

  close(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.recorder.close();
  }
}
