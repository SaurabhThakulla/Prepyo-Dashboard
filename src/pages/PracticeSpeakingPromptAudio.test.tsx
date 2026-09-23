import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render as renderUI, screen } from '@testing-library/react';
import QueryProvider from '@/context/QueryProvider';
import { MemoryRouter } from 'react-router-dom';
import PracticePage from './PracticePage';
import { api } from '@/lib/api';

const render = (ui: React.ReactNode) => renderUI(<QueryProvider>{ui}</QueryProvider>);

const mocks = vi.hoisted(() => ({
  refreshUser: vi.fn(),
  toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn() },
  question: null as Record<string, unknown> | null,
}));
vi.mock('@/context/AppContext', () => ({
  useApp: () => ({
    activeExam: 'PTE',
    user: { id: 'learner', role: 'suru', subscription: { dailySubTestsLimit: 5, dailySubTestsUsed: 0 } },
    refreshUser: mocks.refreshUser,
  }),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => mocks.toast }));
vi.mock('@/lib/api', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/api')>(),
  api: { get: vi.fn(), post: vi.fn() },
}));
// The recorder reports whether it has been held back and whether it would
// start on its own; the prompt player can be "played to the end" on demand.
vi.mock('@/components/practice/AudioRecorder', () => ({
  default: ({ disabled, autoStart }: { disabled?: boolean; autoStart?: boolean }) => (
    <div data-testid="recorder" data-disabled={String(Boolean(disabled))} data-autostart={String(Boolean(autoStart))} />
  ),
}));
vi.mock('@/components/practice/PromptAudio', () => ({
  default: ({ onFinished }: { onFinished?: () => void }) => (
    <button onClick={() => onFinished?.()}>Finish prompt audio</button>
  ),
}));

const BASE = {
  exam: 'PTE', skill: 'speaking', prompt: 'Respond to what you hear.', timeLimitSeconds: 15, options: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.refreshUser.mockResolvedValue(undefined);
  vi.mocked(api.get).mockImplementation(async (path: string) => {
    if (path === '/ai/capabilities') return { writing: true, speaking: true, speakingTranscript: true, tutor: true };
    return { questions: [mocks.question] };
  });
  vi.mocked(api.post).mockResolvedValue({ sessionId: 'session-1', remainingSubTests: 4, scored: true });
});
afterEach(cleanup);

async function startTask() {
  render(<MemoryRouter initialEntries={['/practice?skill=speaking']}><PracticePage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: /Start Practice/ }));
  return screen.findByTestId('recorder');
}

describe('speaking tasks with prompt audio', () => {
  it('holds the recorder until the audio has played through', async () => {
    mocks.question = { ...BASE, id: 'rs-1', title: 'Repeat Sentence', typeName: 'Repeat Sentence', audioUrl: '/api/v1/questions/assets/rs-1' };

    const recorder = await startTask();
    expect(recorder.dataset.disabled).toBe('true');
    expect(screen.getByText(/Recording starts on its own when it finishes/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Finish prompt audio' }));
    expect(screen.getByTestId('recorder').dataset.disabled).toBe('false');
    expect(screen.getByTestId('recorder').dataset.autostart).toBe('true');
    expect(screen.queryByText(/Recording starts on its own when it finishes/)).toBeNull();
  });

  it('starts straight away when there is nothing to listen to', async () => {
    mocks.question = { ...BASE, id: 'di-1', title: 'Describe Image', typeName: 'Describe Image' };

    const recorder = await startTask();
    expect(recorder.dataset.disabled).toBe('false');
    expect(recorder.dataset.autostart).toBe('true');
  });
});
