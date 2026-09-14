import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SkillMockPanel from './SkillMockPanel';
import { Question, UserProfile } from '@/lib/types';

const mockUser = vi.hoisted(() => ({
  current: {
    id: 'test-user',
    email: 'test@example.com',
    role: 'taiyari',
    subscription: { planId: 'pro', isActive: true },
  } as unknown as UserProfile | null,
}));

vi.mock('@/context/AppContext', () => ({
  useApp: () => ({
    user: mockUser.current,
    refreshUser: vi.fn().mockResolvedValue(undefined),
    activeTestSession: null,
    setActiveTestSession: vi.fn(),
  }),
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
  }),
}));

const sampleQuestions: Question[] = [
  {
    id: 'q1',
    examVersionId: 'ev-pte',
    exam: 'PTE',
    skill: 'speaking',
    typeId: 'read_aloud',
    typeName: 'Read Aloud',
    title: 'Climate Shift Impact',
    prompt: 'Read the text aloud as naturally as possible.',
    contextPassage: 'Changes in climate patterns are affecting marine ecosystems around the world.',
    timeLimitSeconds: 40,
    difficulty: 'medium',
    tags: ['speaking'],
    points: 10,
  },
  {
    id: 'q2',
    examVersionId: 'ev-pte',
    exam: 'PTE',
    skill: 'speaking',
    typeId: 'repeat_sentence',
    typeName: 'Repeat Sentence',
    title: 'Lecture Repetition',
    prompt: 'Repeat the sentence after the audio completes.',
    timeLimitSeconds: 15,
    difficulty: 'easy',
    tags: ['speaking'],
    points: 10,
  },
];

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn().mockImplementation((path: string) => {
      if (path === '/questions') {
        return Promise.resolve({ questions: sampleQuestions });
      }
      return Promise.resolve({});
    }),
    post: vi.fn().mockResolvedValue({}),
  },
  errorMessage: (err: unknown) => String(err),
}));

function renderComponent(skill: 'speaking' | 'writing' | 'listening' = 'speaking') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SkillMockPanel skill={skill} exam="PTE" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SkillMockPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders briefing with question count and start button', async () => {
    renderComponent('speaking');

    await waitFor(() => {
      expect(screen.getByText('PTE Speaking Mock Test')).toBeDefined();
    });

    expect(screen.getByText('2 Tasks')).toBeDefined();
    expect(screen.getByText('Start Speaking Mock Test')).toBeDefined();
  });

  it('starts the exam and displays the first question', async () => {
    renderComponent('speaking');

    await waitFor(() => {
      expect(screen.getByText('Start Speaking Mock Test')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Start Speaking Mock Test'));

    await waitFor(() => {
      expect(screen.getByText('Climate Shift Impact')).toBeDefined();
    });

    expect(screen.getByText(/Read Aloud/i)).toBeDefined();
    expect(screen.getByText('Next Question')).toBeDefined();
    expect(screen.getByText('Finish & Submit')).toBeDefined();
  });

  it('shows the premium paywall when the user is on the free plan', async () => {
    mockUser.current = {
      id: 'free-user',
      role: 'suru',
      subscription: { planId: 'free', isActive: true },
    } as unknown as UserProfile;

    renderComponent('speaking');

    await waitFor(() => {
      expect(screen.getByText('Speaking Mock Test')).toBeDefined();
    });

    expect(screen.getByText('Premium Exclusive Feature')).toBeDefined();
    expect(screen.getByText('Upgrade to Unlock All Practice Mocks')).toBeDefined();
    expect(screen.getByText('Practice Speaking Sub-Tests (Free)')).toBeDefined();

    // Reset back to premium
    mockUser.current = {
      id: 'test-user',
      role: 'taiyari',
      subscription: { planId: 'pro', isActive: true },
    } as unknown as UserProfile;
  });
});
