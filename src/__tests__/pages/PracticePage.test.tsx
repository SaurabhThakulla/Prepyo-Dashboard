import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render as renderUI, screen, waitFor } from '@testing-library/react';
import QueryProvider from '@/context/QueryProvider';
const render = (ui: React.ReactNode) => renderUI(<QueryProvider>{ui}</QueryProvider>);
import { MemoryRouter, useNavigate } from 'react-router-dom';
import PracticePage from '@/pages/PracticePage';
import { api } from '@/lib/api';

const mocks = vi.hoisted(() => ({
  refreshUser: vi.fn(),
  toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn() },
  subscription: { dailySubTestsLimit: 1, dailySubTestsUsed: 0 },
  activeExam: 'IELTS',
}));
vi.mock('@/context/AppContext', () => ({
  useApp: () => ({
    activeExam: mocks.activeExam,
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
  mocks.activeExam = 'IELTS';
  mocks.subscription.dailySubTestsUsed = 0;
  mocks.refreshUser.mockResolvedValue(undefined);
});
afterEach(cleanup);

// The question list opens with the page; closing it starts the task.
const closeList = async () => fireEvent.click(await screen.findByTitle('Close drawer'));

async function openPractice(skill: string) {
  vi.mocked(api.get).mockResolvedValue({ questions: [{
    id: 'question-1', exam: 'IELTS', skill, title: 'Test task', typeName: 'Test task',
    prompt: 'Answer the task', timeLimitSeconds: 60,
    options: skill === 'listening' ? [{ id: 'a', text: 'Answer A' }] : [],
  }] });
  render(<MemoryRouter initialEntries={[`/practice?skill=${skill}`]}><PracticePage /></MemoryRouter>);
  return screen.findByTitle('Close drawer');
}

describe('PTE listening answer controls', () => {
  async function startListening(typeId: string, typeName: string, extra = {}) {
    mocks.activeExam = 'PTE';
    vi.mocked(api.get).mockResolvedValue({ questions: [{
      id: 'listening-1', exam: 'PTE', skill: 'listening', typeId, typeName,
      title: 'Listening task', prompt: 'Listen and answer', timeLimitSeconds: 600, ...extra,
    }] });
    vi.mocked(api.post).mockImplementation(async path => {
      if (path === '/practice/start') return { sessionId: 'session-1', remainingSubTests: 0 };
      throw new Error('Retry later');
    });
    render(<MemoryRouter initialEntries={['/practice?skill=listening']}><PracticePage /></MemoryRouter>);
    await closeList();
    return screen.findByRole('button', { name: 'Submit Answer' });
  }

  it.each([
    ['summarize-spoken-text', 'Summarize Spoken Text', 'Your summary'],
    ['write-from-dictation', 'Write from Dictation', 'Your dictation'],
  ])('accepts and submits text for %s', async (typeId, typeName, label) => {
    const submit = await startListening(typeId, typeName);
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    const input = screen.getByRole('textbox', { name: label });
    fireEvent.change(input, { target: { value: '   ' } });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    const text = 'Students learn through regular practice.';
    fireEvent.change(input, { target: { value: text } });
    expect(screen.getByText('5 words')).toBeDefined();
    expect((submit as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(submit);
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/practice/attempts', expect.objectContaining({
      questionId: 'listening-1', textResponse: text,
    })));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalled());
    expect((input as HTMLTextAreaElement).value).toBe(text);
  });

  it('submits positional word IDs without rendering a checkbox list or duplicate passage', async () => {
    const submit = await startListening('pte-highlight-incorrect-word', 'Highlight Incorrect Word', {
      contextPassage: 'The same word appears twice.',
      options: [{ id: 'w1', text: 'same' }, { id: 'w2', text: 'same' }, { id: 'w3', text: 'word.' }],
    });
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByText('The same word appears twice.')).toBeNull();
    const first = screen.getByRole('button', { name: 'same (word 1)' });
    const second = screen.getByRole('button', { name: 'same (word 2)' });
    fireEvent.click(second);
    expect(first.getAttribute('aria-pressed')).toBe('false');
    expect(second.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(second);
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(first);
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(screen.getByText('0 selected')).toBeDefined();
    fireEvent.click(second);
    fireEvent.click(submit);
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/practice/attempts', expect.objectContaining({
      selectedOptions: ['w2'],
    })));
  });

  it('renders inline blank inputs directly inside passage and hides separate blanks div', async () => {
    const submit = await startListening('listeningfillinblanks', 'Listening Fill in the Blanks', {
      contextPassage: 'Carbon dioxide enters the [[b1]] and reaches the [[b2]].',
      blanks: [{ id: 'b1' }, { id: 'b2' }],
    });
    // Separate blanks div must not be shown
    expect(screen.queryByText('Fill each blank:')).toBeNull();
    // Inline blank inputs inside passage must be present
    const blank1 = screen.getByRole('textbox', { name: 'Blank 1' });
    const blank2 = screen.getByRole('textbox', { name: 'Blank 2' });
    expect(blank1).toBeDefined();
    expect(blank2).toBeDefined();
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(blank1, { target: { value: 'atmosphere' } });
    fireEvent.change(blank2, { target: { value: 'ground' } });
    expect((submit as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(submit);
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/practice/attempts', expect.objectContaining({
      blankResponses: { b1: 'atmosphere', b2: 'ground' },
    })));
  });
});

describe('writing minimum on the routed page', () => {
  it.each([
    ['PTE', 'summarize-written-text', 5],
    ['PTE', 'pte-write-essay', 20],
  ])('enforces %s %s minimum of %i words', async (exam, typeId, minimum) => {
    mocks.activeExam = exam;
    vi.mocked(api.get).mockResolvedValue({ questions: [{
      id: 'writing-1', exam, skill: 'writing', typeId, typeName: 'Writing task',
      title: 'Writing task', prompt: 'Write your answer', timeLimitSeconds: 600,
    }] });
    vi.mocked(api.post).mockImplementation(async path => {
      if (path === '/practice/start') return { sessionId: 'session-1', remainingSubTests: 0 };
      throw new Error('Retry later');
    });
    render(<MemoryRouter initialEntries={['/practice?skill=writing']}><PracticePage /></MemoryRouter>);
    await closeList();
    const input = await screen.findByPlaceholderText('Write your response here…');
    const submit = screen.getByRole('button', { name: 'Submit Answer' }) as HTMLButtonElement;
    for (const count of [0, minimum - 1]) {
      fireEvent.change(input, { target: { value: Array(count).fill('word').join(' ') } });
      expect(submit.disabled).toBe(true);
      fireEvent.click(submit);
      expect(api.post).toHaveBeenCalledTimes(1);
    }
    expect(screen.getByText(minimum === 5
      ? /Write one sentence of 5–75 words/
      : /At least 20 words for feedback/)).toBeDefined();
    const text = Array(minimum).fill('word').join(' ');
    fireEvent.change(input, { target: { value: text } });
    expect(submit.disabled).toBe(false);
    expect(screen.getByText(`${minimum} words`)).toBeDefined();
    fireEvent.click(submit);
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/evaluations/writing', {
      questionId: 'writing-1', text,
    }));
    if (minimum === 5) {
      await waitFor(() => expect(submit.disabled).toBe(false));
      fireEvent.change(input, { target: { value: Array(76).fill('word').join(' ') } });
      expect(submit.disabled).toBe(false);
    }
  });
});

// IELTS rates a response of 20 words or fewer at Band 1 rather than refusing
// it, so any answer can be sent; the badge counts towards the task's length.
describe('IELTS writing length on the routed page', () => {
  it('lets any answer be sent and counts towards 250 words for Task 2', async () => {
    mocks.activeExam = 'IELTS';
    vi.mocked(api.get).mockResolvedValue({ questions: [{
      id: 'writing-1', exam: 'IELTS', skill: 'writing', typeId: 'ielts-writing-task2-opinion', typeName: 'Writing task',
      title: 'Writing task', prompt: 'Write your answer', timeLimitSeconds: 2400,
    }] });
    vi.mocked(api.post).mockImplementation(async path => {
      if (path === '/practice/start') return { sessionId: 'session-1', remainingSubTests: 0 };
      throw new Error('Retry later');
    });
    render(<MemoryRouter initialEntries={['/practice?skill=writing']}><PracticePage /></MemoryRouter>);
    await closeList();
    const input = await screen.findByPlaceholderText('Write your response here…');
    const submit = screen.getByRole('button', { name: 'Submit Answer' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect(screen.getByText(/Write at least 250 words/)).toBeDefined();
    fireEvent.change(input, { target: { value: 'Too short' } });
    expect(submit.disabled).toBe(false);
    expect(screen.getByText('2 / 250 words')).toBeDefined();
    fireEvent.click(submit);
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/evaluations/writing', {
      questionId: 'writing-1', text: 'Too short',
    }));
  });
});

describe('summary task links', () => {
  it.each(['summarisewrittentext', 'summarizewrittentext'])(
    'opens and submits only the summary task for ?type=%s', async key => {
      mocks.activeExam = 'PTE';
      vi.mocked(api.get).mockResolvedValue({ questions: [
        { id: 'essay-1', exam: 'PTE', skill: 'writing', typeId: 'write-essay',
          typeName: 'Write Essay', title: 'Unrelated essay', prompt: 'Write an essay', timeLimitSeconds: 600 },
        { id: 'summary-1', exam: 'PTE', skill: 'writing', typeId: 'summarize-written-text',
          typeName: 'Summarize Written Text', title: 'Summary task', prompt: 'Write one sentence', timeLimitSeconds: 600 },
      ] });
      vi.mocked(api.post).mockImplementation(async path => {
        if (path === '/practice/start') return { sessionId: 'session-1', remainingSubTests: 0 };
        throw new Error('Retry later');
      });
      render(<MemoryRouter initialEntries={[`/practice?skill=writing&type=${key}`]}><PracticePage /></MemoryRouter>);
      await closeList();
      const submit = await screen.findByRole('button', { name: 'Submit Answer' });
      expect(screen.getByText('Summary task')).toBeDefined();
      expect(screen.queryByText('Unrelated essay')).toBeNull();
      expect(api.post).toHaveBeenCalledWith('/practice/start', {
        exam: 'PTE', skill: 'writing', questionId: 'summary-1',
      });
      fireEvent.change(screen.getByPlaceholderText('Write your response here…'), {
        target: { value: 'This sentence contains five words.' },
      });
      fireEvent.click(submit);
      await waitFor(() => expect(api.post).toHaveBeenCalledWith('/evaluations/writing', {
        questionId: 'summary-1', text: 'This sentence contains five words.',
      }));
    },
  );
});

describe('practice bank indicators', () => {
  it.each([
    ['IELTS', 'listening'], ['IELTS', 'writing'], ['IELTS', 'speaking'],
    ['PTE', 'listening'], ['PTE', 'writing'], ['PTE', 'speaking'],
  ])('hides numbered bank navigation for %s %s and preserves progression', async (exam, skill) => {
    mocks.activeExam = exam;
    vi.mocked(api.get).mockResolvedValue({ questions: ['First task', 'Second task', 'Third task'].map((title, index) => ({
      id: `task-${index}`, exam, skill, title, typeName: 'Practice task',
      prompt: 'Answer this task', timeLimitSeconds: 600,
      options: skill === 'listening' ? [{ id: 'a', text: 'Answer A' }] : [],
    })) });
    vi.mocked(api.post).mockImplementation(async path => {
      if (path === '/practice/start') return { sessionId: 'session-1', remainingSubTests: 0 };
      return { evaluation: { summary: 'Feedback ready', criteria: [] }, xpAwarded: 10 };
    });
    render(<MemoryRouter initialEntries={[`/practice?skill=${skill}`]}><PracticePage /></MemoryRouter>);
    await closeList();
    const submit = await screen.findByRole('button', { name: skill === 'speaking' ? 'Submit recording' : 'Submit Answer' });
    expect(screen.queryByText(/Questions unlock one at a time/)).toBeNull();
    expect(screen.queryByRole('button', { name: /^\d+$/ })).toBeNull();
    expect(screen.queryByTitle('Answer the earlier questions first')).toBeNull();
    if (skill === 'writing') {
      fireEvent.change(screen.getByPlaceholderText('Write your response here…'), {
        target: { value: Array(20).fill('word').join(' ') },
      });
    } else if (skill === 'speaking') {
      fireEvent.click(screen.getByRole('button', { name: 'Record test audio' }));
    } else {
      fireEvent.click(screen.getByText('Answer A'));
    }
    fireEvent.click(submit);
    fireEvent.click(await screen.findByRole('button', { name: 'Next question' }));
    // Next opens the next task directly, still paying for it, with no start screen in between.
    expect(await screen.findByText('Second task')).toBeDefined();
    await waitFor(() => expect(api.post).toHaveBeenLastCalledWith('/practice/start', {
      exam, skill, questionId: 'task-1',
    }));
    expect(await screen.findByRole('button', { name: skill === 'speaking' ? 'Submit recording' : 'Submit Answer' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Start Practice (1 Credit)' })).toBeNull();
  });
});

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
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
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

    // Task 1 starts once the question list is closed
    await closeList();
    expect((await screen.findAllByText('Task 1 Title')).length).toBeGreaterThan(0);

    // Submit Task 1
    const textarea = await screen.findByPlaceholderText('Write your response here…');
    fireEvent.change(textarea, {
      target: { value: 'This is a long enough answer to satisfy the minimum word count requirement for writing evaluation with several supporting examples included.' },
    });
    const submit = screen.getByRole('button', { name: 'Submit Answer' });
    fireEvent.click(submit);

    // Verify finished state of Task 1
    await screen.findByText('Good job');

    // Navigate to subtask 2
    act(() => {
      navigateFn('/practice?skill=writing&type=tasktwo');
    });

    // Task 2 starts fresh once its question list is closed
    await closeList();
    expect(screen.queryByText('Good job')).toBeNull();
    expect((await screen.findAllByText('Task 2 Title')).length).toBeGreaterThan(0);
  });
});
