// Browser-side audio for speaking practice.
//
// Two formats are in play and they are not interchangeable:
//
//   - MediaRecorder gives us WebM/Opus (or MP4/AAC on Safari). It is what the
//     browser records natively and what plays back cleanly in an <audio> tag,
//     so it is what the learner listens to.
//   - The API accepts WAV or MP3 only, because that is what the provider
//     accepts inline. So the recording is decoded and re-encoded to 16 kHz mono
//     PCM before it is uploaded.
//
// 16 kHz mono is the standard rate for speech models and keeps a 40-second
// answer near 1.3 MB before base64. Recording at a higher rate and uploading it
// would cost a learner on mobile data several times that for no extra accuracy.

/** What the API accepts. Mirrors ai.AudioFormats in the backend. */
export const UPLOAD_FORMAT = 'wav';

const TARGET_SAMPLE_RATE = 16000;

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
  /** Base64 WAV, with no data: URL prefix. */
  base64: string;
  /** Rounded up, because the API validates against the task's time limit. */
  durationSeconds: number;
}

/**
 * Turns a recorded blob into the WAV the API expects.
 *
 * Throws when the blob cannot be decoded, which in practice means the recording
 * never captured anything. The caller reports that rather than uploading an
 * empty file and paying an evaluation to be told it was silent.
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
  return {
    base64: toBase64(encodeWav(mono, TARGET_SAMPLE_RATE)),
    durationSeconds: Math.max(1, Math.ceil(mono.length / TARGET_SAMPLE_RATE)),
  };
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

/** Writes a 16-bit PCM WAV. Samples outside [-1, 1] are clipped, not wrapped. */
function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
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
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    // Asymmetric on purpose: -1 maps to -32768 and +1 to 32767, the actual
    // range of a signed 16-bit sample.
    view.setInt16(44 + i * bytesPerSample, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
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
