// Browser-side audio for speaking practice.
//
// Two formats are in play and they are not interchangeable:
//
//   - MediaRecorder gives us WebM/Opus (or MP4/AAC on Safari). It is what the
//     browser records natively and what plays back cleanly in an <audio> tag,
//     so it is what the learner listens to.
//   - The API accepts WAV or MP3 only, because that is what the provider
//     accepts inline. Opus cannot be forwarded as-is, so the recording is
//     decoded and re-encoded before it is uploaded.
//
// 16 kHz mono is the standard rate for speech models. Recording at a higher
// rate would cost a learner on mobile data several times as much for no extra
// accuracy: the model is listening for pronunciation and fluency, not fidelity.
//
// WHY MP3 RATHER THAN WAV
// ----------------------
// WAV is uncompressed: 16 kHz 16-bit mono is 32 KB per second, and base64 adds
// a third on top, so a 40-second answer was ~1.7 MB on the wire. Most learners
// here are on mobile data. MP3 at 64 kbps is a quarter of that for audio the
// model cannot tell apart — at a 16 kHz sample rate the signal is already
// band-limited to 8 kHz, and 64 kbps is a generous budget for that.
//
// WAV is still supported and is the fallback. See encodeForUpload.

import type { EncodeRequest, EncodeResponse } from './audio.worker';

/** Formats the API accepts. Mirrors ai.AudioFormats in the backend. */
export type UploadFormat = 'mp3' | 'wav';

const TARGET_SAMPLE_RATE = 16000;

/**
 * Comfortably transparent for band-limited speech, and still 4x smaller than
 * WAV. Worth being generous here: this audio is scored on pronunciation, so
 * saving another 100 KB is not worth introducing artefacts the model might read
 * as a mispronunciation.
 */
const MP3_BITRATE_KBPS = 64;

/** Samples handed to the encoder per call. One MPEG frame's worth. */
const MP3_BLOCK_SIZE = 1152;

/**
 * Generous: the longest allowed answer is two minutes, which encodes in about
 * three seconds on a laptop and several times that on a budget phone. This is
 * here to catch a worker that never replies at all, not to police slow devices.
 */
const MP3_ENCODE_TIMEOUT_MS = 60_000;

/**
 * MediaRecorder container preferences, best first.
 *
 * Opus is the smallest at speech bitrates and is what Chrome, Edge and Firefox
 * produce. Safari only offers MP4/AAC. The empty string is the last resort: it
 * lets the browser pick its own default rather than failing to record at all.
 */
const RECORDER_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  '',
];

export function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  return RECORDER_MIME_TYPES.find(type => type === '' || MediaRecorder.isTypeSupported(type)) ?? '';
}

/** Whether this browser can record at all. Checked before asking for the mic. */
export function canRecord(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

type AudioContextCtor = typeof AudioContext;

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  return window.AudioContext ?? (window as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext ?? null;
}

export interface EncodedRecording {
  /** Base64 audio, with no data: URL prefix. */
  base64: string;
  /** What `base64` actually holds. Send this to the API, do not assume it. */
  format: UploadFormat;
  /** Rounded up, because the API validates against the task's time limit. */
  durationSeconds: number;
}

/**
 * Turns a recorded blob into audio the API accepts.
 *
 * Throws when the blob cannot be decoded, which in practice means the recording
 * never captured anything. The caller reports that rather than uploading an
 * empty file and paying an evaluation to be told it was silent.
 *
 * A failure to encode MP3 is not treated the same way. The encoder is a
 * third-party library loaded on demand, so it can fail for reasons that have
 * nothing to do with the learner — an offline chunk fetch, an exotic browser.
 * None of those are worth losing an answer over when the API takes WAV too, so
 * this falls back rather than throwing.
 */
export async function encodeForUpload(blob: Blob): Promise<EncodedRecording> {
  const Ctor = audioContextCtor();
  if (!Ctor) throw new Error('This browser cannot process audio.');

  const bytes = await blob.arrayBuffer();
  if (bytes.byteLength === 0) throw new Error('The recording is empty.');

  // A context is created only to decode; it is closed immediately after, since
  // browsers cap how many can be open at once and practice pages re-record a lot.
  const decodeContext = new Ctor();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeContext.decodeAudioData(bytes);
  } finally {
    void decodeContext.close();
  }

  const mono = await toMono16k(decoded);
  const durationSeconds = Math.max(1, Math.ceil(mono.length / TARGET_SAMPLE_RATE));
  const samples = toInt16(mono);

  try {
    return { base64: toBase64(await encodeMp3(samples)), format: 'mp3', durationSeconds };
  } catch (err) {
    console.error('MP3 encoding failed; uploading WAV instead:', err);
    return { base64: toBase64(encodeWav(samples, TARGET_SAMPLE_RATE)), format: 'wav', durationSeconds };
  }
}

/**
 * Encodes 16 kHz mono PCM as MP3 in a worker.
 *
 * The worker module — and the encoder library inside it, by far the largest
 * dependency in the app — is only fetched when someone actually submits a
 * speaking answer. Most sessions never touch it.
 *
 * `samples` is deliberately copied to the worker rather than transferred: the
 * WAV fallback in encodeForUpload still needs it if this fails, and a transfer
 * would leave the main thread holding a detached buffer.
 */
function encodeMp3(samples: Int16Array): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./audio.worker.ts', import.meta.url), { type: 'module' });

    // A worker that never answers must not strand a learner on a spinner
    // holding the only copy of their answer.
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error('The MP3 encoder timed out.'));
    }, MP3_ENCODE_TIMEOUT_MS);

    const finish = (settle: () => void) => {
      clearTimeout(timer);
      worker.terminate();
      settle();
    };

    worker.onmessage = (event: MessageEvent<EncodeResponse>) => {
      const data = event.data;
      finish(() =>
        data.ok ? resolve(data.mp3) : reject(new Error(data.error)),
      );
    };
    worker.onerror = event => {
      finish(() => reject(new Error(event.message || 'The MP3 encoder failed to start.')));
    };

    const request: EncodeRequest = {
      samples,
      sampleRate: TARGET_SAMPLE_RATE,
      bitrateKbps: MP3_BITRATE_KBPS,
      blockSize: MP3_BLOCK_SIZE,
    };
    worker.postMessage(request);
  });
}

/**
 * Downmixes to one channel and resamples to 16 kHz in a single offline render,
 * which is both faster and better filtered than resampling by hand.
 */
async function toMono16k(buffer: AudioBuffer): Promise<Float32Array> {
  const frames = Math.ceil((buffer.duration * TARGET_SAMPLE_RATE));
  if (frames <= 0) throw new Error('The recording is empty.');

  const offline = new OfflineAudioContext(1, frames, TARGET_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.connect(offline.destination);
  source.start();

  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}

/**
 * Converts normalised float samples to signed 16-bit PCM, which is what both
 * encoders below take. Samples outside [-1, 1] are clipped, not wrapped —
 * wrapping would turn a moment of clipping into a burst of noise.
 */
function toInt16(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    // Asymmetric on purpose: -1 maps to -32768 and +1 to 32767, the actual
    // range of a signed 16-bit sample.
    out[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  return out;
}

/** Writes a 16-bit PCM WAV around already-converted samples. */
function encodeWav(samples: Int16Array, sampleRate: number): ArrayBuffer {
  const bytesPerSample = 2;
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);

  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeText(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM header length
  view.setUint16(20, 1, true); // PCM, uncompressed
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
  view.setUint16(32, bytesPerSample, true); // block align
  view.setUint16(34, 8 * bytesPerSample, true); // bits per sample
  writeText(36, 'data');
  view.setUint32(40, samples.length * bytesPerSample, true);

  for (let i = 0; i < samples.length; i++) {
    view.setInt16(44 + i * bytesPerSample, samples[i], true);
  }

  return buffer;
}

/**
 * Base64 without btoa's argument limit.
 *
 * String.fromCharCode(...bytes) blows the call stack somewhere around 100k
 * arguments, and two minutes of 16 kHz audio is nearly 4 million, so this walks
 * the buffer in chunks instead.
 */
function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  return `${minutes}:${String(safe % 60).padStart(2, '0')}`;
}
