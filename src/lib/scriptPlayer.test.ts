import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { speakScript, StoppedError } from './scriptPlayer';

/** An utterance as the fake engine sees it. */
class FakeUtterance {
  text: string;
  voice: unknown = null;
  lang = '';
  rate = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onboundary: ((event: { charIndex: number }) => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

/**
 * A speech engine whose behaviour each test chooses: speak normally, go quiet
 * without an end event, or never start.
 */
function installEngine(mode: 'normal' | 'lostEnd' | 'silent') {
  const spoken: string[] = [];
  const engine = {
    speaking: false,
    pending: false,
    getVoices: () => [{ name: 'Test', lang: 'en-GB' }],
    cancel: vi.fn(() => {
      engine.speaking = false;
    }),
    speak: (utterance: FakeUtterance) => {
      spoken.push(utterance.text);
      if (mode === 'silent') return;
      engine.speaking = true;
      setTimeout(() => utterance.onstart?.(), 10);
      setTimeout(() => {
        engine.speaking = false;
        if (mode === 'normal') utterance.onend?.();
      }, 300);
    },
  };
  vi.stubGlobal('speechSynthesis', engine);
  Object.defineProperty(window, 'speechSynthesis', { value: engine, configurable: true });
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  return spoken;
}

describe('speakScript', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('speaks each sentence in turn and resolves at the end', async () => {
    const spoken = installEngine('normal');
    const playback = speakScript('Where is your hometown? Tell me about it.');
    await vi.advanceTimersByTimeAsync(2000);
    await expect(playback.done).resolves.toBeUndefined();
    expect(spoken).toEqual(['Where is your hometown?', 'Tell me about it.']);
  });

  it('carries on when the engine goes quiet without an end event', async () => {
    const spoken = installEngine('lostEnd');
    const playback = speakScript('First sentence. Second sentence.');
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(playback.done).resolves.toBeUndefined();
    expect(spoken).toEqual(['First sentence.', 'Second sentence.']);
  });

  it('fails, rather than waiting for ever, when speech never starts', async () => {
    installEngine('silent');
    const playback = speakScript('Nothing will be heard.');
    const outcome = playback.done.catch(error => error);
    await vi.advanceTimersByTimeAsync(5000);
    expect(await outcome).toBeInstanceOf(Error);
    expect((await outcome).message).toBe('speech did not start');
  });

  it('rejects with StoppedError when stopped', async () => {
    installEngine('normal');
    const playback = speakScript('One. Two. Three.');
    const outcome = playback.done.catch(error => error);
    await vi.advanceTimersByTimeAsync(100);
    playback.stop();
    expect(await outcome).toBeInstanceOf(StoppedError);
  });
});
