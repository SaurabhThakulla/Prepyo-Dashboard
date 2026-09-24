import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import QueryProvider from '@/context/QueryProvider';
import MistakePracticeLink from './MistakePracticeLink';
import PracticePage from '@/pages/PracticePage';
import { Mistake } from '@/lib/types';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(),
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() },
  refreshUser: vi.fn().mockResolvedValue(undefined), setSession: vi.fn(),
}));
vi.mock('@/lib/api', async original => ({
  ...await original<typeof import('@/lib/api')>(), api: { get: mocks.get, post: mocks.post },
}));
vi.mock('@/context/AppContext', () => ({ useApp: () => ({
  activeExam: 'PTE', user: { id: 'u', role: 'taiyari', subscription: { dailySubTestsLimit: 20, dailySubTestsUsed: 0 } },
  refreshUser: mocks.refreshUser, setActiveTestSession: mocks.setSession,
}) }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => mocks.toast }));
vi.mock('@/components/practice/PromptAudio', () => ({ default: () => null }));
afterEach(cleanup);

describe('Mistake Bank navigates to the real Practice screen', () => {
  it.each(['reading', 'listening'] as const)('retries the exact %s task and resolves only after a correct answer', async skill => {
    vi.clearAllMocks();
    const mistake: Mistake = {
      id: 'm-1', questionId: 'q-1', questionTitle: 'Missed task', exam: 'IELTS', skill,
      typeName: 'Multiple Choice', prompt: 'Choose the reason', userResponse: 'A', correctResponse: 'B',
      explanation: 'Secret answer', errorTag: '', failedCount: 1, resolved: false, lastAttemptedAt: '',
    };
    const question = {
      id: 'q-1', exam: 'IELTS', skill, typeId: skill === 'reading' ? 'reading-mcq-single' : 'ielts-listening-mcq-single',
      typeName: 'Multiple Choice', title: 'Missed task', prompt: 'Choose the reason', timeLimitSeconds: 60,
      points: 1, difficulty: 'medium', options: [{ id: 'A', text: 'Wrong choice' }, { id: 'B', text: 'Right choice' }],
    };
    mocks.get.mockImplementation(async path => {
      if (path === '/reading/types') return { types: [] };
      if (path !== '/mistakes/m-1/task') throw new Error(`Unexpected task request: ${path}`);
      return { question, passage: skill === 'reading' ? {
        id: 'p-1', title: 'Original passage', paragraphs: [{ label: 'A', text: 'The original passage text.' }],
        wordCount: 5, difficulty: 'medium', tags: [],
      } : undefined, group: { id: 'g-1', typeId: question.typeId, typeName: question.typeName,
        instructions: 'Choose one answer', passageDisplay: 'full' } };
    });
    mocks.post.mockImplementation(async (path, payload) => {
      if (path === '/practice/start') return { sessionId: 's-1' };
      if (path === '/practice/attempts') return { attempt: {
        isCorrect: payload.selectedOptions[0] === 'B', accuracyPercentage: payload.selectedOptions[0] === 'B' ? 100 : 0,
      }, review: { ...question, correctAnswers: ['B'] }, xpAwarded: 0 };
      return {};
    });
    render(<QueryProvider><MemoryRouter initialEntries={['/mistakes']}><Routes>
      <Route path="/mistakes" element={<MistakePracticeLink mistake={mistake} />} />
      <Route path="/practice" element={<PracticePage />} />
    </Routes></MemoryRouter></QueryProvider>);
    expect(screen.queryByRole('radio')).toBeNull();
    const link = screen.getByRole('link', { name: 'Try again in Practice' });
    expect(link.getAttribute('href')).toContain(`skill=${skill}&type=multiplechoice`);
    expect(mocks.get).not.toHaveBeenCalled();
    fireEvent.click(link);
    fireEvent.click(await screen.findByRole('button', { name: /Start Practice/ }, { timeout: 5000 }));
    const wrong = await screen.findByRole('radio', { name: /Wrong choice/ });
    if (skill === 'reading') expect(screen.getByText('The original passage text.')).toBeDefined();
    fireEvent.click(wrong);
    fireEvent.click(screen.getByRole('button', { name: skill === 'reading' ? 'Check answers' : 'Submit Answer' }));
    const retry = await screen.findByRole('button', { name: 'Try again' });
    expect(mocks.post.mock.calls.some(([path]) => path.includes('/resolve'))).toBe(false);
    fireEvent.click(retry);
    if (skill === 'listening') fireEvent.click(await screen.findByRole('button', { name: /Start Practice/ }, { timeout: 5000 }));
    fireEvent.click(await screen.findByRole('radio', { name: /Right choice/ }));
    fireEvent.click(screen.getByRole('button', { name: skill === 'reading' ? 'Check answers' : 'Submit Answer' }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/mistakes/m-1/resolve', {}));
    expect(mocks.post).toHaveBeenCalledWith('/practice/attempts', expect.objectContaining({ questionId: 'q-1', exam: 'IELTS' }));
    expect(mocks.post.mock.calls.some(([path]) => path === '/reading/practice')).toBe(false);
  });
});
