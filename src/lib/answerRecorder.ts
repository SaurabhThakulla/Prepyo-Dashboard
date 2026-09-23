import { canRecord, pickRecorderMimeType } from '@/lib/audio';
import { startTranscribing, TranscriptSession } from '@/lib/speech';

/**
 * Records a run of spoken answers from one microphone, as a Speaking test
 * needs: the microphone is opened once, and each answer is its own recording
 * with the words the browser heard alongside it.
 */
export interface RecordedAnswer {
  blob: Blob;
  /** What the browser's recogniser heard; empty where it has none. */
  transcript: string;
  durationSeconds: number;
}

export class AnswerRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private transcriber: TranscriptSession | null = null;
  private startedAt = 0;
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;

  static supported(): boolean {
    return canRecord();
  }

  /** Asks for the microphone once, for the whole test. */
  async open(): Promise<void> {
    if (this.stream) return;
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctor) {
      this.context = new Ctor();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 1024;
      this.context.createMediaStreamSource(this.stream).connect(this.analyser);
    }
  }

  /** The current input level, 0 to 1, for a meter that shows the mic works. */
  level(): number {
    if (!this.analyser) return 0;
    const samples = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(samples);
    let sum = 0;
    for (const sample of samples) {
      const centred = (sample - 128) / 128;
      sum += centred * centred;
    }
    return Math.min(1, Math.sqrt(sum / samples.length) * 4);
  }

  start(): void {
    if (!this.stream) throw new Error('microphone is not open');
    const mimeType = pickRecorderMimeType();
    const recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
    this.chunks = [];
    recorder.ondataavailable = event => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };
    recorder.start();
    this.recorder = recorder;
    this.transcriber = startTranscribing();
    this.startedAt = Date.now();
  }

  get recording(): boolean {
    return this.recorder?.state === 'recording';
  }

  /** Ends the current answer and returns it with the browser's transcript. */
  stop(): Promise<RecordedAnswer> {
    const recorder = this.recorder;
    const transcriber = this.transcriber;
    this.recorder = null;
    this.transcriber = null;
    const durationSeconds = Math.max(1, Math.round((Date.now() - this.startedAt) / 1000));
    return new Promise((resolve, reject) => {
      if (!recorder) {
        reject(new Error('not recording'));
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: recorder.mimeType || 'audio/webm' });
        const finish = (transcript: string) => resolve({ blob, transcript: transcript.trim(), durationSeconds });
        if (transcriber) void transcriber.stop().then(finish, () => finish(''));
        else finish('');
      };
      recorder.stop();
    });
  }

  /** Releases the microphone. */
  close(): void {
    if (this.recorder?.state === 'recording') this.recorder.stop();
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
    void this.context?.close().catch(() => {});
    this.context = null;
    this.analyser = null;
  }
}
