import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import {
  browserCanSpeak,
  browserVoiceBroken,
  playRecording,
  resetBrowserVoice,
  speakScript,
  SpeechUnavailableError,
  StoppedError,
} from '@/lib/scriptPlayer';

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }));

/** An audio element that plays each clip for a tenth of a second. */
const played: string[] = [];
class FakeAudio {
  src = '';
  paused = true;
  duration = 0.1;
  currentTime = 0;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeupdate: (() => void) | null = null;
  play() {
    played.push(this.src);
    this.paused = false;
    setTimeout(() => {
      this.paused = true;
      this.onended?.();
    }, 100);
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

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
    resetBrowserVoice();
    played.length = 0;
    vi.stubGlobal('Audio', FakeAudio);
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response())));
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
    expect(await outcome).toBeInstanceOf(SpeechUnavailableError);
    expect(browserVoiceBroken()).toBe(true);
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

describe('playRecording', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetBrowserVoice();
    played.length = 0;
    vi.stubGlobal('Audio', FakeAudio);
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response())));
    vi.mocked(api.get).mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("uses the browser's voice where it works", async () => {
    const spoken = installEngine('normal');
    const playback = await playRecording({ script: 'Where is your hometown?', audioUrl: '/clips' });
    await vi.advanceTimersByTimeAsync(2000);
    await expect(playback.done).resolves.toBeUndefined();
    expect(spoken).toEqual(['Where is your hometown?']);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('switches to the server voice when the browser voice never starts, and stays with it', async () => {
    installEngine('silent');
    vi.mocked(api.get).mockResolvedValue({ segments: [{ url: '/speech/a' }, { url: '/speech/b' }] });
    const playback = await playRecording({ script: 'Where is your hometown?', audioUrl: '/clips' });
    await vi.advanceTimersByTimeAsync(5000);
    await expect(playback.done).resolves.toBeUndefined();
    expect(api.get).toHaveBeenCalledWith('/clips');
    expect(played).toEqual(['/speech/a', '/speech/b']);
    // The next recording goes straight to the server's voice.
    expect(await browserCanSpeak()).toBe(false);
  });

  it('goes straight to the server voice in a browser with no voices', async () => {
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
    Object.defineProperty(window, 'speechSynthesis', {
      value: { getVoices: () => [], addEventListener: () => {}, removeEventListener: () => {} },
      configurable: true,
    });
    vi.mocked(api.get).mockResolvedValue({ segments: [{ url: '/speech/a' }] });
    const pending = playRecording({ scriptUrl: '/script', audioUrl: '/clips' });
    await vi.advanceTimersByTimeAsync(2000);
    const playback = await pending;
    await vi.advanceTimersByTimeAsync(500);
    await expect(playback.done).resolves.toBeUndefined();
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/clips');
    expect(played).toEqual(['/speech/a']);
  });
});
