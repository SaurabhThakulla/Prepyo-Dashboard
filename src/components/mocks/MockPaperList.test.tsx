import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MockPaperList from './MockPaperList';
import { MockPaperItem } from '@/lib/types';

afterEach(cleanup);

const mockPapers: MockPaperItem[] = [
  {
    id: 'paper-1',
    exam: 'ielts',
    section: 'speaking',
    module: 'any',
    number: 1,
    revision: 1,
    title: 'Speaking Practice Test 1',
    status: 'completed',
    score: 7.5,
    attemptCount: 1,
    lastAttemptSessionId: 'sess-1',
    isUpdated: false,
    lastAttemptAt: '2026-09-20T10:00:00Z',
  },
  {
    id: 'paper-2',
    exam: 'ielts',
    section: 'speaking',
    module: 'any',
    number: 2,
    revision: 2,
    title: 'Speaking Practice Test 2',
    status: 'in_progress',
    attemptCount: 1,
    sessionId: 'sess-2',
    isUpdated: true,
  },
  {
    id: 'paper-3',
    exam: 'ielts',
    section: 'speaking',
    module: 'any',
    number: 3,
    revision: 1,
    title: 'Speaking Practice Test 3',
    status: 'not_started',
    attemptCount: 0,
    isUpdated: false,
  },
];

describe('MockPaperList', () => {
  it('renders all tests with correct status and action buttons', () => {
    const onStart = vi.fn();
    const onResume = vi.fn();
    const onReview = vi.fn();
    const onRetake = vi.fn();

    render(
      <MockPaperList
        papers={mockPapers}
        exam="IELTS"
        section="Speaking"
        onStart={onStart}
        onResume={onResume}
        onReview={onReview}
        onRetake={onRetake}
      />
    );

    // Verify test titles
    expect(screen.getByText('Test 1')).toBeDefined();
    expect(screen.getByText('Test 2')).toBeDefined();
    expect(screen.getByText('Test 3')).toBeDefined();

    // Verify statuses
    expect(screen.getByText('Band 7.5')).toBeDefined();
    expect(screen.getByText(/In Progress/i)).toBeDefined();
    expect(screen.getByText('Not Started')).toBeDefined();

    // Verify Updated badge on Test 2
    expect(screen.getByText('Updated')).toBeDefined();

    // Verify Action Buttons
    const reviewBtn = screen.getByRole('button', { name: /Review/i });
    const retakeBtn = screen.getByRole('button', { name: /Retake/i });
    const resumeBtn = screen.getByRole('button', { name: /Resume/i });
    const startBtn = screen.getByRole('button', { name: /Start/i });

    expect(reviewBtn).toBeDefined();
    expect(retakeBtn).toBeDefined();
    expect(resumeBtn).toBeDefined();
    expect(startBtn).toBeDefined();

    // Test button clicks
    fireEvent.click(startBtn);
    expect(onStart).toHaveBeenCalledWith(mockPapers[2]);

    fireEvent.click(resumeBtn);
    expect(onResume).toHaveBeenCalledWith(mockPapers[1]);

    fireEvent.click(reviewBtn);
    expect(onReview).toHaveBeenCalledWith(mockPapers[0]);

    fireEvent.click(retakeBtn);
    expect(onRetake).toHaveBeenCalledWith(mockPapers[0]);
  });

  it('filters by tabs (All, Done, Remaining)', () => {
    render(
      <MockPaperList
        papers={mockPapers}
        exam="IELTS"
        section="Speaking"
        onStart={vi.fn()}
        onResume={vi.fn()}
        onReview={vi.fn()}
        onRetake={vi.fn()}
      />
    );

    // Default: All 3 visible
    expect(screen.getByText('Test 1')).toBeDefined();
    expect(screen.getByText('Test 2')).toBeDefined();
    expect(screen.getByText('Test 3')).toBeDefined();

    // Click "Done" tab
    const doneTab = screen.getByRole('button', { name: /Done/i });
    fireEvent.click(doneTab);

    // Test 1 is completed (Done), Tests 2 & 3 should not be shown
    expect(screen.getByText('Test 1')).toBeDefined();
    expect(screen.queryByText('Test 2')).toBeNull();
    expect(screen.queryByText('Test 3')).toBeNull();

    // Click "Remaining" tab
    const remainingTab = screen.getByRole('button', { name: /Remaining/i });
    fireEvent.click(remainingTab);

    // Tests 2 & 3 are Remaining, Test 1 should not be shown
    expect(screen.queryByText('Test 1')).toBeNull();
    expect(screen.getByText('Test 2')).toBeDefined();
    expect(screen.getByText('Test 3')).toBeDefined();
  });

  it('filters by search query', () => {
    render(
      <MockPaperList
        papers={mockPapers}
        exam="IELTS"
        section="Speaking"
        onStart={vi.fn()}
        onResume={vi.fn()}
        onReview={vi.fn()}
        onRetake={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search test number/i);
    fireEvent.change(searchInput, { target: { value: '3' } });

    expect(screen.queryByText('Test 1')).toBeNull();
    expect(screen.queryByText('Test 2')).toBeNull();
    expect(screen.getByText('Test 3')).toBeDefined();
  });
});
