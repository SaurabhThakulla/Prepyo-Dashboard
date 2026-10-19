import { describe, expect, it } from 'vitest';
import { trimSilence } from '@/lib/silence';

const RATE = 16000;

// Builds audio from [seconds, amplitude] parts: 0 is silence, anything else a tone.
function audio(...parts: [number, number][]): Float32Array {
  const out: number[] = [];
  for (const [seconds, amp] of parts) {
    for (let i = 0; i < Math.round(seconds * RATE); i++) {
      out.push(amp === 0 ? (Math.random() - 0.5) * 0.002 : amp * Math.sin((2 * Math.PI * 220 * i) / RATE));
    }
  }
  return Float32Array.from(out);
}

describe('trimSilence', () => {
  it('cuts lead and tail silence, keeping half a second of padding', () => {
    const trimmed = trimSilence(audio([3, 0], [5, 0.3], [4, 0]), RATE);
    expect(trimmed.length / RATE).toBeCloseTo(6, 1);
  });

  it('keeps a pause inside the answer', () => {
    const trimmed = trimSilence(audio([2, 0], [2, 0.3], [2, 0], [2, 0.3], [2, 0]), RATE);
    expect(trimmed.length / RATE).toBeCloseTo(7, 1);
  });

  it('keeps quiet speech next to loud speech', () => {
    const trimmed = trimSilence(audio([2, 0], [1, 0.05], [3, 0.6], [2, 0]), RATE);
    expect(trimmed.length / RATE).toBeCloseTo(5, 1);
  });

  it('trims in a noisy room', () => {
    const clean = audio([2, 0], [3, 0.15], [2, 0]);
    const noisy = clean.map(s => s + (Math.random() - 0.5) * 0.04);
    expect(trimSilence(noisy, RATE).length / RATE).toBeCloseTo(4, 1);
  });

  it('leaves silent and already tight recordings whole', () => {
    const silent = audio([5, 0]);
    expect(trimSilence(silent, RATE)).toBe(silent);
    const tight = audio([0.2, 0], [4, 0.3], [0.2, 0]);
    expect(trimSilence(tight, RATE)).toBe(tight);
  });
});
