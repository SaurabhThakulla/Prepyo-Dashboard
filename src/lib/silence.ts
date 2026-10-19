// Cuts the silence before the first word and after the last, so the audio model is not paid to hear it.
// Pauses inside the answer are kept: fluency is judged on them.

const FRAME_SECONDS = 0.02;
const PAD_SECONDS = 0.5;
const MIN_SAVING_SECONDS = 0.5;
// A frame is speech when it is four times the background noise, so a soft word next to a loud one still counts.
const NOISE_MULTIPLE = 4;
const MIN_THRESHOLD = 0.003;

export function trimSilence(samples: Float32Array, sampleRate: number): Float32Array {
  const frameSize = Math.max(1, Math.round(sampleRate * FRAME_SECONDS));
  const frames = Math.floor(samples.length / frameSize);
  if (frames < 2) return samples;

  const levels = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    for (let i = f * frameSize; i < (f + 1) * frameSize; i++) sum += samples[i] * samples[i];
    levels[f] = Math.sqrt(sum / frameSize);
  }

  const sorted = Float32Array.from(levels).sort();
  const floor = sorted[Math.floor(frames * 0.1)];
  const peak = sorted[frames - 1];
  const threshold = Math.min(Math.max(MIN_THRESHOLD, floor * NOISE_MULTIPLE), peak / 2);

  let first = -1;
  let last = -1;
  for (let f = 0; f < frames; f++) {
    if (levels[f] >= threshold) {
      if (first < 0) first = f;
      last = f;
    }
  }
  // No speech found: leave it whole for the server to judge.
  if (first < 0) return samples;

  const pad = Math.round(sampleRate * PAD_SECONDS);
  const start = Math.max(0, first * frameSize - pad);
  const end = Math.min(samples.length, (last + 1) * frameSize + pad);
  if (samples.length - (end - start) < sampleRate * MIN_SAVING_SECONDS) return samples;
  return samples.subarray(start, end);
}
