import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MistakeRetry from './MistakeRetry';
import { Mistake, Question } from '@/lib/types';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), refreshUser: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: mocks, errorMessage: (err: Error) => err.message }));
vi.mock('@/context/AppContext', () => ({ useApp: () => ({ refreshUser: mocks.refreshUser }) }));
vi.mock('@/components/practice/PromptAudio', () => ({ default: () => null }));

const mistake: Mistake = {
  id: 'mistake-1', questionId: 'question-1', questionTitle: 'Library question', exam: 'IELTS',
  skill: 'reading', typeName: 'Multiple Choice', prompt: 'Why was it opened?', userResponse: 'A',
  correctResponse: 'B', explanation: 'SECRET EXPLANATION', errorTag: 'Detail', failedCount: 1,
  resolved: false, lastAttemptedAt: '2026-09-18T10:00:00Z',
};
const question: Question = {
  id: mistake.questionId, examVersionId: 'ielts-v1', exam: 'IELTS', skill: 'reading',
  typeId: 'reading-mcq-single', typeName: 'Multiple Choice', title: 'Library question',
  prompt: 'Why was it opened?', timeLimitSeconds: 60, difficulty: 'medium', tags: [], points: 1,
  options: [{ id: 'A', text: 'Wrong choice' }, { id: 'B', text: 'Right choice' }],
};
const task = {
  question,
  passage: { title: 'Library passage', paragraphs: [{ label: 'A', text: 'The full original task text.' }] },
  group: { instructions: 'Choose one answer.', passageDisplay: 'full' },
};
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  render(<QueryClientProvider client={client}><MistakeRetry mistake={mistake} /></QueryClientProvider>);
  return { user: userEvent.setup(), invalidate };
}
async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'View task & try again' }));
  await user.click(await screen.findByRole('button', { name: 'Start retry' }));
  await screen.findByRole('radio', { name: /Wrong choice/ });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.get.mockResolvedValue(task);
  mocks.refreshUser.mockResolvedValue(undefined);
  mocks.post.mockImplementation(async (path: string, payload: { selectedOptions?: string[] }) => {
    if (path === '/practice/start') return { sessionId: 'session-1' };
    if (path === '/practice/attempts') return {
      attempt: { isCorrect: payload.selectedOptions?.[0] === 'B' },
      review: { ...question, correctAnswers: ['B'], explanation: 'SECRET EXPLANATION' },
    };
    return {};
  });
});
afterEach(cleanup);

describe('Mistake Bank retry flow', () => {
  it('keeps a wrong attempt unresolved, then resolves only after a correct retry', async () => {
    const { user, invalidate } = mount();
    await open(user);
    expect(mocks.get).toHaveBeenCalledWith('/mistakes/mistake-1/task');
    expect(screen.getByText('The full original task text.', { exact: false })).toBeTruthy();
    await user.click(screen.getByRole('radio', { name: /Wrong choice/ }));
    await user.click(screen.getByRole('button', { name: 'Submit answer' }));
    await screen.findByText('Not correct yet. Try the task again to resolve this mistake.');
    expect(mocks.post).toHaveBeenCalledWith('/practice/attempts', expect.objectContaining({
      questionId: 'question-1', exam: 'IELTS', selectedOptions: ['A'],
    }));
    expect(mocks.post.mock.calls.some(([path]) => path.includes('/resolve'))).toBe(false);
    expect(screen.queryByText('Resolved')).toBeNull();
    expect(screen.queryByText('SECRET EXPLANATION')).toBeNull();
    expect(screen.queryByRole('button', { name: /show.*answer|hide.*answer/i })).toBeNull();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['mistakes'] });
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect((screen.getByRole('radio', { name: /Wrong choice/ }) as HTMLInputElement).checked).toBe(false);
    await user.click(screen.getByRole('radio', { name: /Right choice/ }));
    await user.click(screen.getByRole('button', { name: 'Submit answer' }));
    await screen.findByText('Resolved');
    expect(mocks.post).toHaveBeenCalledWith('/mistakes/mistake-1/resolve', {});
  });

  it('can retry saving a correct resolution without submitting the answer twice', async () => {
    const original = mocks.post.getMockImplementation()!;
    let saves = 0;
    mocks.post.mockImplementation(async (path, payload) => {
      if (path.includes('/resolve') && saves++ === 0) throw new Error('Connection lost');
      return original(path, payload);
    });
    const { user } = mount();
    await open(user);
    await user.click(screen.getByRole('radio', { name: /Right choice/ }));
    await user.click(screen.getByRole('button', { name: 'Submit answer' }));
    await screen.findByRole('alert');
    expect(screen.queryByText('Resolved')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Retry saving resolution' }));
    await screen.findByText('Resolved');
    expect(mocks.post.mock.calls.filter(([path]) => path === '/practice/attempts')).toHaveLength(1);
  });
});
