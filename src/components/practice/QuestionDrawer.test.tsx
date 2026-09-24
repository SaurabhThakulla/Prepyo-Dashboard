import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QuestionDrawer from './QuestionDrawer';
import { Question } from '@/lib/types';
import { recordQuestionAttempt } from '@/lib/questionStorage';

describe('QuestionDrawer Component', () => {
  const mockQuestions: Question[] = [
    {
      id: 'q-1',
      exam: 'PTE',
      examVersionId: 'v1',
      skill: 'speaking',
      typeId: 'pte-read-aloud',
      typeName: 'Read Aloud',
      title: 'Black Hole',
      prompt: 'Astronomers have discovered a supermassive black hole.',
      timeLimitSeconds: 40,
      difficulty: 'hard',
      tags: [],
      points: 1,
    },
    {
      id: 'q-2',
      exam: 'PTE',
      examVersionId: 'v1',
      skill: 'speaking',
      typeId: 'pte-read-aloud',
      typeName: 'Read Aloud',
      title: 'Urban Forests',
      prompt: 'Urban forests provide environmental and health benefits.',
      timeLimitSeconds: 40,
      difficulty: 'medium',
      tags: [],
      points: 1,
    },
    {
      id: 'q-3',
      exam: 'PTE',
      examVersionId: 'v1',
      skill: 'speaking',
      typeId: 'pte-read-aloud',
      typeName: 'Read Aloud',
      title: 'Food Waste',
      prompt: 'Reducing food waste is critical for sustainability.',
      timeLimitSeconds: 40,
      difficulty: 'easy',
      tags: [],
      points: 1,
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders floating toggle button and opens/closes drawer', () => {
    const onToggle = vi.fn();
    const onClose = vi.fn();

    const { rerender } = render(
      <QuestionDrawer
        isOpen={false}
        onToggle={onToggle}
        onClose={onClose}
        exam="PTE"
        skill="speaking"
        typeKey="readaloud"
        questions={mockQuestions}
        completedIds={[]}
        onSelectQuestion={vi.fn()}
      />,
    );

    const toggleBtn = screen.getByRole('button', { name: 'Browse Questions List' });
    expect(toggleBtn).toBeDefined();
    fireEvent.click(toggleBtn);
    expect(onToggle).toHaveBeenCalledTimes(1);

    // Re-render as open
    rerender(
      <QuestionDrawer
        isOpen={true}
        onToggle={onToggle}
        onClose={onClose}
        exam="PTE"
        skill="speaking"
        typeKey="readaloud"
        questions={mockQuestions}
        completedIds={[]}
        onSelectQuestion={vi.fn()}
      />,
    );

    expect(screen.getByText('Read Aloud')).toBeDefined();
    expect(screen.getByText(/Score Weight Overall/i)).toBeDefined();
    expect(screen.getByText(/Black Hole/i)).toBeDefined();
    expect(screen.getByText(/Urban Forests/i)).toBeDefined();
    expect(screen.getByText(/Food Waste/i)).toBeDefined();

    // Close button
    const closeBtn = screen.getByTitle('Close drawer');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('filters questions by search query', () => {
    render(
      <QuestionDrawer
        isOpen={true}
        onToggle={vi.fn()}
        onClose={vi.fn()}
        exam="PTE"
        skill="speaking"
        typeKey="readaloud"
        questions={mockQuestions}
        completedIds={[]}
        onSelectQuestion={vi.fn()}
      />,
    );

    const searchInput = screen.getByPlaceholderText(/Question Content/i);
    fireEvent.change(searchInput, { target: { value: 'Urban' } });

    expect(screen.getByText(/Urban Forests/i)).toBeDefined();
    expect(screen.queryByText(/Black Hole/i)).toBeNull();
    expect(screen.queryByText(/Food Waste/i)).toBeNull();
  });

  it('allows picking a question and calling onSelectQuestion', () => {
    const onSelect = vi.fn();
    render(
      <QuestionDrawer
        isOpen={true}
        onToggle={vi.fn()}
        onClose={vi.fn()}
        exam="PTE"
        skill="speaking"
        typeKey="readaloud"
        questions={mockQuestions}
        completedIds={[]}
        onSelectQuestion={onSelect}
      />,
    );

    const questionCard = screen.getByText(/Black Hole/i);
    fireEvent.click(questionCard);

    expect(onSelect).toHaveBeenCalledWith(mockQuestions[0]);
  });

  it('renders question card action button without bookmark button or empty dash', async () => {
    render(
      <QuestionDrawer
        isOpen={true}
        onToggle={vi.fn()}
        onClose={vi.fn()}
        exam="PTE"
        skill="speaking"
        typeKey="readaloud"
        questions={mockQuestions}
        completedIds={[]}
        onSelectQuestion={vi.fn()}
      />,
    );

    const card = screen.getByText(/Black Hole/i).closest('.group');
    expect(card).toBeDefined();
    // Practice button is present
    expect(screen.getAllByText('Practice').length).toBeGreaterThan(0);
    // Bookmark button is removed
    const bookmarkBtn = card?.querySelector('button[title*="bookmark"]');
    expect(bookmarkBtn).toBeNull();
  });

  it('displays recorded user score and practice attempt count', () => {
    // Record score for q-1
    recordQuestionAttempt('PTE', 'q-1', 79, 90);

    render(
      <QuestionDrawer
        isOpen={true}
        onToggle={vi.fn()}
        onClose={vi.fn()}
        exam="PTE"
        skill="speaking"
        typeKey="readaloud"
        questions={mockQuestions}
        completedIds={['q-1']}
        onSelectQuestion={vi.fn()}
      />,
    );

    expect(screen.getByText('79')).toBeDefined();
    expect(screen.getByText('/90')).toBeDefined();
    expect(screen.getByText('Practice * 1')).toBeDefined();
  });

  it('filters by Done and Remaining tabs', () => {
    render(
      <QuestionDrawer
        isOpen={true}
        onToggle={vi.fn()}
        onClose={vi.fn()}
        exam="PTE"
        skill="speaking"
        typeKey="readaloud"
        questions={mockQuestions}
        completedIds={['q-1']}
        onSelectQuestion={vi.fn()}
      />,
    );

    // Initial state: All Questions (3 total)
    expect(screen.getByText(/Black Hole/i)).toBeDefined();
    expect(screen.getByText(/Urban Forests/i)).toBeDefined();
    expect(screen.getByText(/Food Waste/i)).toBeDefined();

    // Click "Done" tab
    const doneTab = screen.getByRole('button', { name: /^Done/i });
    fireEvent.click(doneTab);

    // Only q-1 (Black Hole) is completed
    expect(screen.getByText(/Black Hole/i)).toBeDefined();
    expect(screen.queryByText(/Urban Forests/i)).toBeNull();
    expect(screen.queryByText(/Food Waste/i)).toBeNull();

    // Click "Remaining" tab
    const remainingTab = screen.getByRole('button', { name: /^Remaining/i });
    fireEvent.click(remainingTab);

    // q-2 and q-3 are remaining, q-1 is done
    expect(screen.queryByText(/Black Hole/i)).toBeNull();
    expect(screen.getByText(/Urban Forests/i)).toBeDefined();
    expect(screen.getByText(/Food Waste/i)).toBeDefined();
  });

  it('handles infinite scroll slice of questions', () => {
    // Generate 35 dummy questions
    const manyQuestions: Question[] = Array.from({ length: 35 }, (_, i) => ({
      id: `q-many-${i + 1}`,
      exam: 'PTE',
      examVersionId: 'v1',
      skill: 'speaking',
      typeId: 'pte-read-aloud',
      typeName: 'Read Aloud',
      title: `Topic ${i + 1}`,
      prompt: `Prompt text ${i + 1}`,
      timeLimitSeconds: 40,
      difficulty: 'medium',
      tags: [],
      points: 1,
    }));

    render(
      <QuestionDrawer
        isOpen={true}
        onToggle={vi.fn()}
        onClose={vi.fn()}
        exam="PTE"
        skill="speaking"
        typeKey="readaloud"
        questions={manyQuestions}
        completedIds={[]}
        onSelectQuestion={vi.fn()}
      />,
    );

    // By default first batch (PAGE_SIZE = 20 items) is rendered
    const cards = document.querySelectorAll('#question-drawer-panel .divide-y > .group');
    expect(cards.length).toBe(20);
    expect(screen.getByText(/Scroll for more/i)).toBeDefined();
  });
});
