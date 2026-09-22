import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import PromptAudio from './PromptAudio';

class Utterance {
  text: string;
  lang = '';
  rate = 1;
  voice: unknown;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) { this.text = text; }
}
const speech = {
  speak: vi.fn(), cancel: vi.fn(), getVoices: vi.fn(() => [] as { lang: string }[]),
  addEventListener: vi.fn(), removeEventListener: vi.fn(),
};
const tone = {
  frequency: { value: 0 }, connect: vi.fn(), disconnect: vi.fn(),
  start: vi.fn(), stop: vi.fn(), onended: null as (() => void) | null,
};
const close = vi.fn().mockResolvedValue(undefined);
class Context {
  state = 'running';
  currentTime = 0;
  destination = {};
  resume = vi.fn().mockResolvedValue(undefined);
  close = close;
  createOscillator = () => tone;
  createGain = () => ({
    connect: vi.fn(), disconnect: vi.fn(),
    gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
  });
}
const latest = () => speech.speak.mock.calls.at(-1)![0] as Utterance;
const play = () => fireEvent.click(screen.getByRole('button', { name: 'Play Task' }));

beforeEach(() => {
  vi.clearAllMocks();
  speech.getVoices.mockReturnValue([]);
  tone.onended = null;
  vi.stubGlobal('speechSynthesis', speech);
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
  vi.stubGlobal('AudioContext', Context);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('browser TTS lifecycle', () => {
  it('starts only on Play and selects a voice loaded after mount', () => {
    render(<PromptAudio questionId="one" title="Task" audioTranscript="A complete sentence." />);
    expect(speech.speak).not.toHaveBeenCalled();
    const voice = { lang: 'en-GB' };
    speech.getVoices.mockReturnValue([voice]);
    play();
    expect(latest().text).toBe('A complete sentence.');
    expect(latest().voice).toBe(voice);
    act(() => latest().onend?.());
    expect(screen.getByRole('button', { name: 'Play Task' })).toBeDefined();
  });

  it('cancels on question change even for identical scripts and ignores stale callbacks', () => {
    const { rerender, unmount } = render(<PromptAudio questionId="one" title="Task" audioTranscript="Same script." allowTranscript />);
    fireEvent.click(screen.getByText('Show transcript'));
    play();
    const staleEnd = latest().onend;
    rerender(<PromptAudio questionId="two" title="Task" audioTranscript="Same script." allowTranscript />);
    expect(speech.cancel).toHaveBeenCalled();
    expect(screen.queryByText('Hide transcript')).toBeNull();
    play();
    act(() => staleEnd?.());
    expect(screen.getByRole('button', { name: 'Stop reading Task' })).toBeDefined();
    const calls = speech.cancel.mock.calls.length;
    unmount();
    expect(speech.cancel.mock.calls.length).toBeGreaterThan(calls);
  });

  it('surfaces errors and allows retry without showing a mock transcript', () => {
    render(<PromptAudio title="Task" audioTranscript="Hidden script." allowTranscript={false} />);
    expect(screen.queryByText('Show transcript')).toBeNull();
    play();
    act(() => latest().onerror?.());
    expect(screen.getByRole('alert').textContent).toContain("The audio couldn't play");
    play();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('plays a tone after speech instead of pronouncing the beep marker', async () => {
    render(<PromptAudio title="Task" audioTranscript="Finish this [beep]" />);
    await act(async () => play());
    expect(latest().text).toBe('Finish this');
    expect(tone.start).not.toHaveBeenCalled();
    act(() => latest().onend?.());
    expect(tone.start).toHaveBeenCalledOnce();
    expect(speech.speak).toHaveBeenCalledOnce();
    act(() => tone.onended?.());
    expect(close).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Play Task' })).toBeDefined();
  });

  it('stops a tone without queuing the following words', async () => {
    render(<PromptAudio title="Task" audioTranscript="Before [beep] after" />);
    await act(async () => play());
    act(() => latest().onend?.());
    fireEvent.click(screen.getByRole('button', { name: 'Stop reading Task' }));
    act(() => tone.onended?.());
    expect(close).toHaveBeenCalled();
    expect(speech.speak).toHaveBeenCalledOnce();
  });

  it('keeps the transcript hidden when speech is unsupported in a mock', () => {
    vi.stubGlobal('speechSynthesis', undefined);
    // The browser API may be entirely absent, not just waiting for voices.
    Reflect.deleteProperty(window, 'speechSynthesis');
    render(<PromptAudio title="Task" audioTranscript="Hidden script." allowTranscript={false} />);
    expect(screen.queryByText(/Hidden script/)).toBeNull();
    expect(screen.getByText(/can't play on this device/)).toBeDefined();
  });
});
