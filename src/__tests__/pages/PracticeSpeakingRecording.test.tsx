import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render as renderUI, screen, waitFor } from '@testing-library/react';
import QueryProvider from '@/context/QueryProvider';
import { MemoryRouter } from 'react-router-dom';
import PracticePage from '@/pages/PracticePage';
import { api } from '@/lib/api';

const render = (ui: React.ReactNode) => renderUI(<QueryProvider>{ui}</QueryProvider>);

const mocks = vi.hoisted(() => ({
  refreshUser: vi.fn(),
  toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn() },
  subscription: { dailySubTestsLimit: 5, dailySubTestsUsed: 0 },
  delivery: { durationSeconds: 40, pauseCount: 9, longestPauseSeconds: 2.4, speakingRatio: 0.64 },
}));
vi.mock('@/context/AppContext', () => ({
  useApp: () => ({
    activeExam: 'PTE',
    user: { id: 'learner', role: 'suru', subscription: mocks.subscription },
    refreshUser: mocks.refreshUser,
  }),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => mocks.toast }));
vi.mock('@/lib/api', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/api')>(),
  api: { get: vi.fn(), post: vi.fn() },
}));
vi.mock('@/lib/audio', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/audio')>(),
  encodeForUpload: vi.fn(async () => ({ base64: 'AAAA', format: 'wav', durationSeconds: 40 })),
}));
// Stands in for the microphone: hands back a recording and what was measured.
vi.mock('@/components/practice/AudioRecorder', () => ({
  default: ({ onRecorded }: { onRecorded: (blob: Blob | null, transcript?: string, delivery?: unknown) => void }) => (
    <button onClick={() => onRecorded(new Blob(['audio']), undefined, mocks.delivery)}>Record test audio</button>
  ),
}));

const SPEAKING_QUESTION = {
  id: 'speaking-1', exam: 'PTE', skill: 'speaking',
  title: 'Rainfall chart', typeName: 'Describe Image',
  prompt: 'Describe the chart.', timeLimitSeconds: 40, options: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.refreshUser.mockResolvedValue(undefined);
  vi.mocked(api.get).mockImplementation(async (path: string) => {
    if (path === '/ai/capabilities') return { writing: true, speaking: true, speakingTranscript: false, tutor: true };
    return { questions: [SPEAKING_QUESTION] };
  });
});
afterEach(cleanup);

// A recording sent to Whisper carries the pauses the browser measured, so
// fluency is judged on evidence rather than on a smooth-looking transcript.
describe('speaking practice scored from the recording', () => {
  it('sends the measured delivery with the recording', async () => {
    vi.mocked(api.post).mockImplementation(async (path: string) => {
      if (path === '/practice/start') return { sessionId: 'session-1', remainingSubTests: 4, scored: true };
      return {
        evaluation: {
          id: 'e-1', exam: 'PTE', skill: 'speaking', estimatedScore: 54, scoreConfidence: 'low',
          summary: 'Provisional estimate.', criteria: [], strengths: [], weaknesses: [], sentenceFeedback: [],
          transcript: 'the chart shows rainfall', createdAt: new Date().toISOString(),
        },
        xpAwarded: 25,
      };
    });

    render(<MemoryRouter initialEntries={['/practice?skill=speaking']}><PracticePage /></MemoryRouter>);
    fireEvent.click(await screen.findByTitle('Close drawer'));
    fireEvent.click(await screen.findByRole('button', { name: 'Record test audio' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Submit recording' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/evaluations/speaking',
        expect.objectContaining({ questionId: 'speaking-1', audio: 'AAAA', format: 'wav', delivery: mocks.delivery }),
      );
    });
  });
});
