import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import PromptAudio from '@/components/practice/PromptAudio';

class Utterance {
  text: string;
  voice: unknown;
  lang = '';
  rate = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) { this.text = text; }
}
const speech = {
  speak: vi.fn(), cancel: vi.fn(), getVoices: vi.fn(() => [{ lang: 'en-GB', name: 'Voice' }]),
  addEventListener: vi.fn(), removeEventListener: vi.fn(), speaking: false, pending: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('speechSynthesis', speech);
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const script = 'Our study measured noise. It worked best with hedges.';

describe('transcript answers', () => {
  it('marks each answer in the transcript', () => {
    render(<PromptAudio questionId="q" title="Task" audioTranscript={script} allowTranscript highlights={['noise', 'Hedges']} />);
    fireEvent.click(screen.getByText('Show transcript'));
    const marked = [...document.querySelectorAll('mark')].map(mark => mark.textContent);
    expect(marked).toEqual(['noise', 'hedges']);
  });

  it('marks nothing without answers', () => {
    render(<PromptAudio questionId="q" title="Task" audioTranscript={script} allowTranscript />);
    fireEvent.click(screen.getByText('Show transcript'));
    expect(document.querySelectorAll('mark')).toHaveLength(0);
  });
});

describe('stored recording that will not load', () => {
  it('switches to the server voice', () => {
    render(<PromptAudio questionId="q" title="Task" audioUrl="/api/v1/questions/assets/tts_missing" />);
    expect(document.querySelector('audio')).not.toBeNull();
    act(() => { fireEvent.error(document.querySelector('audio')!); });
    expect(document.querySelector('audio')).toBeNull();
    expect(screen.queryByText(/couldn't load/)).toBeNull();
    expect(screen.getByRole('button', { name: /Play Task/ })).toBeDefined();
  });
});

describe('browser voice dropping out part-way', () => {
  it('hands over to the server voice instead of showing an error', () => {
    render(<PromptAudio questionId="q" title="Task" audioTranscript={script} />);
    fireEvent.click(screen.getByRole('button', { name: 'Play Task' }));
    const first = speech.speak.mock.calls.at(-1)![0] as Utterance;
    act(() => { first.onstart?.(); first.onerror?.(); });
    expect(screen.queryByText(/Check your sound/)).toBeNull();
    expect(screen.getByRole('button', { name: /Play Task/ })).toBeDefined();
  });
});
