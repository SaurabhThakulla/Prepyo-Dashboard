import { describe, expect, it } from 'vitest';
import { createDeliveryMeter } from '@/lib/delivery';

/** Drives the meter with a scripted clock: [level, milliseconds] per frame. */
function measure(frames: Array<[number, number]>) {
  let now = 0;
  const meter = createDeliveryMeter(() => now);
  for (const [level, ms] of frames) {
    now += ms;
    meter.sample(level);
  }
  return meter.finish();
}

const SPEECH = 0.3;
const SILENCE = 0.01;

// Frames arrive about every 16ms from the level meter; these use coarser steps
// so the intent of each case stays readable.
const speaking = (seconds: number): Array<[number, number]> =>
  Array.from({ length: seconds * 10 }, () => [SPEECH, 100] as [number, number]);
const silent = (seconds: number): Array<[number, number]> =>
  Array.from({ length: seconds * 10 }, () => [SILENCE, 100] as [number, number]);

describe('delivery meter', () => {
  it('counts a mid-answer hesitation and measures how long it ran', () => {
    const delivery = measure([...speaking(3), ...silent(2), ...speaking(3)]);

    expect(delivery.pauseCount).toBe(1);
    expect(delivery.longestPauseSeconds).toBeGreaterThanOrEqual(1.8);
    expect(delivery.durationSeconds).toBe(8);
    expect(delivery.speakingRatio).toBeGreaterThan(0.6);
  });

  it('ignores ordinary sentence breaks', () => {
    // 300ms is a breath, not a hesitation, and counting it would make every
    // learner look halting.
    const delivery = measure([...speaking(2), ...silent(0.3), ...speaking(2)]);
    expect(delivery.pauseCount).toBe(0);
  });

  it('does not count the silence before a learner starts', () => {
    const delivery = measure([...silent(3), ...speaking(4)]);
    expect(delivery.pauseCount).toBe(0);
    expect(delivery.speakingRatio).toBeLessThan(0.8);
  });

  it('drops frames from a backgrounded tab rather than scoring them', () => {
    // A hidden tab stops painting, so one frame can arrive a minute late.
    // Counting that as a silence would invent a pause nobody took.
    const delivery = measure([...speaking(2), [SILENCE, 60_000], ...speaking(2)]);
    expect(delivery.pauseCount).toBe(0);
    expect(delivery.durationSeconds).toBeLessThan(10);
  });

  it('reports nothing measurable for an empty recording', () => {
    const delivery = measure([]);
    expect(delivery.durationSeconds).toBe(0);
    expect(delivery.speakingRatio).toBe(0);
  });
});
