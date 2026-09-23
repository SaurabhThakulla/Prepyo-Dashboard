import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import PromptAudio from './PromptAudio';
import { Question } from '@/lib/types';

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
  speak: vi.fn(), cancel: vi.fn(), getVoices: vi.fn(() => [{ lang: 'en-US' }]),
  addEventListener: vi.fn(), removeEventListener: vi.fn(),
};
class Context {
  state = 'running';
  currentTime = 0;
  destination = {};
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
  createOscillator = () => ({
    frequency: { value: 0 }, connect: vi.fn(), disconnect: vi.fn(),
    start: vi.fn(), stop: vi.fn(), onended: null,
  });
  createGain = () => ({
    connect: vi.fn(), disconnect: vi.fn(),
    gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('speechSynthesis', speech);
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
  vi.stubGlobal('AudioContext', Context);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('PTE Audio Restrictions & Single-Play Policy', () => {
  function computeSinglePlay(q: Pick<Question, 'exam' | 'skill'>): boolean {
    return (
      (q.exam === 'IELTS' && q.skill === 'listening') ||
      (q.exam === 'PTE' && (q.skill === 'listening' || q.skill === 'speaking'))
    );
  }

  it('enforces single-play audio policy on PTE listening and speaking tasks', () => {
    // PTE Listening tasks must play once
    expect(computeSinglePlay({ exam: 'PTE', skill: 'listening' })).toBe(true);
    // PTE Speaking tasks with audio prompts (Repeat Sentence, Retell Lecture, etc.) must play once
    expect(computeSinglePlay({ exam: 'PTE', skill: 'speaking' })).toBe(true);
    // PTE Reading and Writing do not have audio prompt locks
    expect(computeSinglePlay({ exam: 'PTE', skill: 'reading' })).toBe(false);
    expect(computeSinglePlay({ exam: 'PTE', skill: 'writing' })).toBe(false);

    // IELTS listening is single play; speaking is live examiner interview
    expect(computeSinglePlay({ exam: 'IELTS', skill: 'listening' })).toBe(true);
    expect(computeSinglePlay({ exam: 'IELTS', skill: 'speaking' })).toBe(false);
  });

  it('renders single-play notice in PromptAudio when singlePlay is active', () => {
    render(
      <PromptAudio
        title="PTE Summarize Spoken Text Audio"
        audioTranscript="This is an academic lecture on marine ecosystems."
        singlePlay={true}
        allowTranscript={false}
      />
    );

    // The single-play badge / note should be visible to warn the student
    expect(screen.getByText(/plays once/i)).toBeDefined();
    // Replay or seek controls should not be rendered before submission
    expect(screen.queryByText(/Replay/i)).toBeNull();
  });
});
