import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render as renderUI, screen } from '@testing-library/react';
import QueryProvider from '@/context/QueryProvider';
import { MemoryRouter } from 'react-router-dom';
import PracticePage from '@/pages/PracticePage';
import { api } from '@/lib/api';

const render = (ui: React.ReactNode) => renderUI(<QueryProvider>{ui}</QueryProvider>);

const mocks = vi.hoisted(() => ({
  refreshUser: vi.fn(),
  toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn() },
  subscription: { dailySubTestsLimit: 1, dailySubTestsUsed: 0 },
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
vi.mock('@/components/practice/AudioRecorder', () => ({
  default: ({ onRecorded }: { onRecorded: (blob: Blob) => void }) => (
    <button onClick={() => onRecorded(new Blob(['audio']))}>Record test audio</button>
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
});
afterEach(cleanup);

// Without an audio provider the server refuses to score a recording, and it
// charges nothing for one. The screen has to match: offering Submit sends the
// learner into a refusal, and the old credit wording told them they had paid.
// The normal path - a Submit for a speaking answer that will be scored - is
// covered in PracticePage.test.tsx. It cannot share this file: the capability
// answer is cached per module load, so the first case here decides it.
describe('speaking practice when nothing can score it', () => {
  it('offers recording practice instead of a submit, and claims no credit', async () => {
    vi.mocked(api.get).mockImplementation(async (path: string) => {
      if (path === '/ai/capabilities') return { writing: true, speaking: false, tutor: true };
      return { questions: [SPEAKING_QUESTION] };
    });
    vi.mocked(api.post).mockResolvedValue({ sessionId: '', remainingSubTests: null, scored: false });

    render(<MemoryRouter initialEntries={['/practice?skill=speaking']}><PracticePage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /Start Practice/ }));

    expect(await screen.findByText(/Scoring for speaking answers is being set up/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Submit recording' })).toBeNull();
    expect(mocks.toast.success).toHaveBeenCalledWith(
      'Practice started',
      expect.stringContaining('no sub-test credit'),
    );
  });
});
