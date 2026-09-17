import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import PracticePage from './PracticePage';
import { api } from '@/lib/api';

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
vi.mock('@/lib/audio', () => ({
  encodeForUpload: vi.fn().mockResolvedValue({ base64: 'audio', format: 'mp3', durationSeconds: 10 }),
}));
vi.mock('@/components/practice/AudioRecorder', () => ({
  default: ({ onRecorded }: { onRecorded: (blob: Blob) => void }) => (
    <button onClick={() => onRecorded(new Blob(['audio']))}>Record test audio</button>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.subscription.dailySubTestsUsed = 0;
  mocks.refreshUser.mockResolvedValue(undefined);
});
afterEach(cleanup);

async function openPractice(skill: string) {
  vi.mocked(api.get).mockResolvedValue({ questions: [{
    id: 'question-1', exam: 'IELTS', skill, title: 'Test task', typeName: 'Test task',
    prompt: 'Answer the task', timeLimitSeconds: 60,
    options: skill === 'listening' ? [{ id: 'a', text: 'Answer A' }] : [],
  }] });
  render(<MemoryRouter initialEntries={[`/practice?skill=${skill}`]}><PracticePage /></MemoryRouter>);
  return screen.findByRole('button', { name: 'Start Practice (1 Credit)' });
}

describe('practice credit lifecycle', () => {
  it.each([
    ['writing', '/evaluations/writing'],
    ['speaking', '/evaluations/speaking'],
    ['listening', '/practice/attempts'],
  ])('starts %s once and permits free submit retries after the last credit', async (skill, endpoint) => {
    vi.mocked(api.post).mockImplementation(async path => {
      if (path === '/practice/start') {
        mocks.subscription.dailySubTestsUsed = 1;
        return { sessionId: 'session-1', remainingSubTests: 0 };
      }
      // Keep the answer visible after a grading failure so the learner can retry.
      throw new Error('Scoring temporarily unavailable');
    });
    const start = await openPractice(skill);
    expect(api.post).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Submit Answer' })).toBeNull();
    fireEvent.click(start);
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/practice/start', {
      exam: 'IELTS', skill, questionId: 'question-1',
    }));
    if (skill === 'writing') {
      fireEvent.change(await screen.findByPlaceholderText('Write your response here…'), {
        target: { value: 'This response is long enough to explain the idea clearly and provide a full answer to the question being asked today.' },
      });
    } else if (skill === 'speaking') {
      fireEvent.click(await screen.findByRole('button', { name: 'Record test audio' }));
    } else {
      fireEvent.click(await screen.findByText('Answer A'));
    }
    const submit = screen.getByRole('button', { name: skill === 'speaking' ? 'Submit recording' : 'Submit Answer' });
    fireEvent.click(submit);
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledTimes(1));
    fireEvent.click(submit);
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.post).mock.calls.map(([path]) => path)).toEqual([
      '/practice/start', endpoint, endpoint,
    ]);
  });

  it('sends only one start while a rapid second click is pending', async () => {
    let finishStart!: (value: unknown) => void;
    vi.mocked(api.post).mockReturnValue(new Promise(resolve => { finishStart = resolve; }));
    const start = await openPractice('writing');
    fireEvent.click(start);
    fireEvent.click(start);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(screen.queryByPlaceholderText('Write your response here…')).toBeNull();
    finishStart({ sessionId: 'session-1', remainingSubTests: 0 });
    expect(await screen.findByPlaceholderText('Write your response here…')).toBeDefined();
  });

  it('does not start a new task with no credits', async () => {
    mocks.subscription.dailySubTestsUsed = 1;
    vi.mocked(api.get).mockResolvedValue({ questions: [{
      id: 'question-1', exam: 'IELTS', skill: 'writing', title: 'Test task', typeName: 'Test task',
    }] });
    render(<MemoryRouter initialEntries={['/practice?skill=writing']}><PracticePage /></MemoryRouter>);
    expect(await screen.findByRole('link', { name: 'Upgrade for More Practice Tests' })).toBeDefined();
    expect(api.post).not.toHaveBeenCalled();
    expect(screen.queryByPlaceholderText('Write your response here…')).toBeNull();
  });

  it('keeps the task locked when starting fails', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('Start failed'));
    fireEvent.click(await openPractice('writing'));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalled());
    expect(screen.queryByPlaceholderText('Write your response here…')).toBeNull();
    expect(screen.getByRole('button', { name: 'Start Practice (1 Credit)' })).toBeDefined();
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('resets state and allows starting when navigating to another sub-task after completion', async () => {
    vi.mocked(api.get).mockResolvedValue({
      questions: [
        {
          id: 'q-1', exam: 'IELTS', skill: 'writing', title: 'Task 1 Title', typeName: 'Task One',
          prompt: 'Prompt 1', timeLimitSeconds: 60,
        },
        {
          id: 'q-2', exam: 'IELTS', skill: 'writing', title: 'Task 2 Title', typeName: 'Task Two',
          prompt: 'Prompt 2', timeLimitSeconds: 60,
        },
      ],
    });
    vi.mocked(api.post).mockImplementation(async path => {
      if (path === '/practice/start') {
        return { sessionId: 'session-1', remainingSubTests: 0 };
      }
      return { evaluation: { summary: 'Good job', criteria: [] }, xpAwarded: 10 };
    });

    let navigateFn!: (to: string) => void;
    function NavHelper() {
      navigateFn = useNavigate();
      return null;
    }

    render(
      <MemoryRouter initialEntries={['/practice?skill=writing&type=taskone']}>
        <NavHelper />
        <PracticePage />
      </MemoryRouter>,
    );

    // Start Task 1
    const start1 = await screen.findByRole('button', { name: 'Start Practice (1 Credit)' });
    expect(screen.getByText('Task 1 Title')).toBeDefined();
    fireEvent.click(start1);

    // Submit Task 1
    const textarea = await screen.findByPlaceholderText('Write your response here…');
    fireEvent.change(textarea, {
      target: { value: 'This is a long enough answer to satisfy the minimum word count requirement for writing evaluation.' },
    });
    const submit = screen.getByRole('button', { name: 'Submit Answer' });
    fireEvent.click(submit);

    // Verify finished state of Task 1
    await screen.findByText('Good job');

    // Navigate to subtask 2
    act(() => {
      navigateFn('/practice?skill=writing&type=tasktwo');
    });

    // Verify Task 2 is presented and ready with its own Start overlay
    expect(await screen.findByText('Task 2 Title')).toBeDefined();
    expect(screen.queryByText('Good job')).toBeNull();
    expect(screen.getByRole('button', { name: 'Start Practice (1 Credit)' })).toBeDefined();
  });
});
