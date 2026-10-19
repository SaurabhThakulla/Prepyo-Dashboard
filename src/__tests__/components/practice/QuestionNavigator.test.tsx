import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import QuestionNavigator from '@/components/practice/QuestionNavigator';
import { Question } from '@/lib/types';

afterEach(cleanup);

describe('QuestionNavigator', () => {
  it('shows task names without bank counts or numbered prefixes and still selects tasks', () => {
    const questions = ['Museum visit', 'Library tour'].map((title, index) => ({
      id: `task-${index}`, title, typeId: 'listening-choice', typeName: 'Multiple Choice',
      difficulty: 'medium',
    } as Question));
    const onSelect = vi.fn();
    const { container } = render(<QuestionNavigator skill="listening" questions={questions}
      currentQuestionId={questions[0].id} onSelect={onSelect} />);
    expect(container.querySelector('summary')?.textContent).toBe('Multiple Choice');
    expect(screen.queryByText(/1 type/)).toBeNull();
    expect(screen.queryByText(/^\d+$/)).toBeNull();
    expect(screen.queryByText(/^\d+\./)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Library tour medium' }));
    expect(onSelect).toHaveBeenCalledWith(questions[1]);
  });
});
