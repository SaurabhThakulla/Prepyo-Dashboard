// MP3 encoding, off the main thread.
//
// Encoding a two-minute answer is a few seconds of solid CPU work. On the main
// thread that freezes the page — including the spinner that is meant to say
// "this is working" — and it is worst on the low-end phones where most of this
// app is used.
//
// Yielding with setTimeout inside the loop was tried first and is a trap: a
// background tab clamps timers to one second, so a learner who submits and
// switches away turns a one-second encode into a twenty-second one. A worker
// has no such problem, and does not block the page at all.

import { Mp3Encoder } from '@breezystack/lamejs';

export interface EncodeRequest {
  samples: Int16Array;
  sampleRate: number;
  bitrateKbps: number;
  blockSize: number;
}

export type EncodeResponse =
  | { ok: true; mp3: ArrayBuffer }
  | { ok: false; error: string };

/**
 * tsconfig declares one `lib` list for the whole project and it contains "dom",
 * so TypeScript resolves `self` here as a Window. It is a worker scope, whose
 * postMessage takes a transfer list rather than a target origin.
 */
const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<EncodeRequest>) => void) | null;
  postMessage(message: EncodeResponse, transfer?: Transferable[]): void;
};

ctx.onmessage = (event: MessageEvent<EncodeRequest>) => {
  const { samples, sampleRate, bitrateKbps, blockSize } = event.data;

  try {
    const encoder = new Mp3Encoder(1, sampleRate, bitrateKbps);
    const frames: Uint8Array[] = [];
    let total = 0;

    const push = (frame: Uint8Array) => {
      if (frame.length > 0) {
        frames.push(frame);
        total += frame.length;
      }
    };

    for (let i = 0; i < samples.length; i += blockSize) {
      push(encoder.encodeBuffer(samples.subarray(i, i + blockSize)));
    }
    // Whatever is still buffered inside the encoder. Skipping this truncates
    // the last fraction of a second, which is exactly where a learner trails off.
    push(encoder.flush());

    if (total === 0) {
      const response: EncodeResponse = { ok: false, error: 'The MP3 encoder produced no output.' };
      ctx.postMessage(response);
      return;
    }

    const out = new Uint8Array(total);
    let offset = 0;
    for (const frame of frames) {
      out.set(frame, offset);
      offset += frame.length;
    }

    const response: EncodeResponse = { ok: true, mp3: out.buffer };
    // Transferred rather than copied: it is the only reference either side
    // needs, and a two-minute answer is over a megabyte.
    ctx.postMessage(response, [out.buffer]);
  } catch (err) {
    const response: EncodeResponse = { ok: false, error: String(err) };
    ctx.postMessage(response);
  }
};
