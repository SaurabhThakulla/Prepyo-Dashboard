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
  transcript: 'i live near the ring road and it is very peaceful the people there are friendly',
  delivery: { durationSeconds: 24, pauseCount: 2, longestPauseSeconds: 1.1, speakingRatio: 0.78 },
}));
vi.mock('@/context/AppContext', () => ({
  useApp: () => ({
    activeExam: 'IELTS',
    user: { id: 'learner', role: 'suru', subscription: mocks.subscription },
    refreshUser: mocks.refreshUser,
  }),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => mocks.toast }));
vi.mock('@/lib/api', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/api')>(),
  api: { get: vi.fn(), post: vi.fn() },
}));
// Stands in for the browser's speech recognition: the recorder hands back the
// audio for playback and the words it heard for marking.
vi.mock('@/components/practice/AudioRecorder', () => ({
  default: ({
    onRecorded,
  }: {
    onRecorded: (blob: Blob | null, transcript?: string, delivery?: unknown) => void;
  }) => (
    <button onClick={() => onRecorded(new Blob(['audio']), mocks.transcript, mocks.delivery)}>
      Record test audio
    </button>
  ),
}));

const SPEAKING_QUESTION = {
  id: 'speaking-1', exam: 'IELTS', skill: 'speaking',
  title: 'Your neighbourhood', typeName: 'IELTS Speaking Part 1',
  prompt: 'What do you like about the area where you live?', timeLimitSeconds: 60, options: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.refreshUser.mockResolvedValue(undefined);
  mocks.transcript = 'i live near the ring road and it is very peaceful the people there are friendly';
  vi.mocked(api.get).mockImplementation(async (path: string) => {
    if (path === '/ai/capabilities') {
      return { writing: true, speaking: false, speakingTranscript: true, tutor: true };
    }
    return { questions: [SPEAKING_QUESTION] };
  });
});
afterEach(cleanup);

// With no provider that can hear a recording, the words are what gets marked:
// the browser transcribes while recording, and the transcript goes for scoring.
describe('speaking practice scored from the transcript', () => {
  it('submits the transcript and says pronunciation is not scored', async () => {
    vi.mocked(api.post).mockImplementation(async (path: string) => {
      if (path === '/practice/start') return { sessionId: 'session-1', remainingSubTests: 4, scored: true };
      return {
        evaluation: {
          id: 'e-1', exam: 'IELTS', skill: 'speaking', estimatedScore: 5.5, scoreConfidence: 'low',
          summary: 'Provisional estimate from a transcript; pronunciation was not assessed.',
          criteria: [], strengths: [], weaknesses: [], sentenceFeedback: [],
          transcript: mocks.transcript, createdAt: new Date().toISOString(),
        },
        xpAwarded: 25,
      };
    });

    render(<MemoryRouter initialEntries={['/practice?skill=speaking']}><PracticePage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /Start Practice/ }));

    expect(await screen.findByText(/Pronunciation is not scored here/)).toBeTruthy();

    fireEvent.click(await screen.findByRole('button', { name: 'Record test audio' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Submit recording' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/evaluations/speaking/transcript',
        expect.objectContaining({
          questionId: 'speaking-1',
          transcript: mocks.transcript,
          // Pace and pauses measured while recording travel with the words, so
          // fluency feedback rests on a measurement rather than a guess.
          delivery: mocks.delivery,
          durationSeconds: mocks.delivery.durationSeconds,
        }),
      );
    });
  });

  // A recording is always submittable: when nothing was heard the learner is
  // warned, but can still send it, and the server marks it at the bottom.
  it('still submits a recording nothing was heard in, with a warning', async () => {
    mocks.transcript = '';
    vi.mocked(api.post).mockImplementation(async (path: string) => {
      if (path === '/practice/start') return { sessionId: 'session-1', remainingSubTests: 4, scored: true };
      return {
        evaluation: {
          id: 'e-2', exam: 'IELTS', skill: 'speaking', estimatedScore: 0, scoreConfidence: 'low',
          summary: 'No words could be made out in your recording, so this answer gets the lowest score.',
          criteria: [], strengths: [], weaknesses: [], sentenceFeedback: [], transcript: '',
          createdAt: new Date().toISOString(),
        },
        xpAwarded: 0,
      };
    });

    render(<MemoryRouter initialEntries={['/practice?skill=speaking']}><PracticePage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /Start Practice/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Record test audio' }));

    expect(await screen.findByText(/could not make out any words/)).toBeTruthy();
    const submit = screen.getByRole('button', { name: 'Submit recording' });
    expect(submit).toHaveProperty('disabled', false);
    fireEvent.click(submit);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/evaluations/speaking/transcript',
        expect.objectContaining({ questionId: 'speaking-1', transcript: '' }),
      );
    });
    expect(await screen.findByText(/No words could be made out/)).toBeTruthy();
  });
});
