import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { PracticeAttempt, Question, UserProfile } from '@/lib/types';

const askTutor = vi.fn();
let user: Partial<UserProfile> | null = null;
vi.mock('@/context/AppContext', () => ({ useApp: () => ({ user, askTutor }) }));

import ExplainMistake, { mistakeContext } from './ExplainMistake';

afterEach(() => {
  cleanup();
  askTutor.mockReset();
});

const attempt = {
  id: 'a1', questionId: 'q1', examVersionId: 'v', isCorrect: false, score: 0, maxScore: 1,
  accuracyPercentage: 0, feedback: 'You chose B. The answer is A.', userResponse: 'B',
  timeSpentSeconds: 30, createdAt: '',
} as PracticeAttempt;

const review = {
  id: 'q1', typeName: 'MCQ Single Answer', title: 'Pressure cookers',
  prompt: 'Why does food take longer to cook on high mountains?',
  audioTranscript: 'At sea level, water boils at one hundred degrees...',
  options: [{ id: 'A', text: 'Water boils at a lower temperature' }, { id: 'B', text: 'Pots lose heat faster' }],
  correctAnswers: ['A'],
  explanation: 'Lower air pressure lowers the boiling point.',
} as Question;

const premium = { role: 'learner', subscription: { isActive: true, planId: 'pro' } } as unknown as UserProfile;
const free = { role: 'learner', subscription: { isActive: true, planId: 'free' } } as unknown as UserProfile;

describe('Explain my mistake', () => {
  it('tells the coach the question, the correct answer, my answer and the explanation', () => {
    const context = mistakeContext(attempt, review);
    expect(context).toContain('Task type: MCQ Single Answer');
    expect(context).toContain('Correct answer: Water boils at a lower temperature');
    expect(context).toContain('My answer: B');
    expect(context).toContain('Explanation shown to me: Lower air pressure');
    expect(context.length).toBeLessThanOrEqual(3900);
  });

  it('stays within the server limit for long passages', () => {
    const long = { ...review, contextPassage: 'word '.repeat(3000), audioTranscript: 'word '.repeat(3000) };
    expect(mistakeContext(attempt, long).length).toBeLessThanOrEqual(3900);
  });

  it('opens the coach with the question for premium learners', () => {
    user = premium;
    render(<MemoryRouter><ExplainMistake attempt={attempt} review={review} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /explain my mistake/i }));
    expect(askTutor).toHaveBeenCalledTimes(1);
    expect(askTutor.mock.calls[0][0]).toContain('Pressure cookers');
  });

  it('shows nothing at all to free learners', () => {
    for (const u of [free, null]) {
      user = u;
      const { container } = render(<MemoryRouter><ExplainMistake attempt={attempt} review={review} /></MemoryRouter>);
      expect(container.innerHTML).toBe('');
      expect(screen.queryByText(/explain my mistake/i)).toBeNull();
      expect(screen.queryByText(/still unsure/i)).toBeNull();
      cleanup();
    }
    expect(askTutor).not.toHaveBeenCalled();
  });
});
