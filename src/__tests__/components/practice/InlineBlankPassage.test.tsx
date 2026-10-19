import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InlineBlankPassage, { passageHasGaps } from '@/components/practice/InlineBlankPassage';

describe('InlineBlankPassage', () => {
  it('detects passage with gaps correctly', () => {
    expect(passageHasGaps('This has [[b1]] gap.')).toBe(true);
    expect(passageHasGaps('This has [[1]] gap.')).toBe(true);
    expect(passageHasGaps('No gap here.')).toBe(false);
    expect(passageHasGaps(undefined)).toBe(false);
  });

  it('renders inline inputs inside the passage and handles typing', () => {
    const onChange = vi.fn();
    const passage = 'Before it enters the [[b1]], it is compressed and sent to [[b2]].';
    const blanks = [{ id: 'b1' }, { id: 'b2' }];
    const responses = { b1: 'atmosphere' };

    render(
      <InlineBlankPassage
        passage={passage}
        blanks={blanks}
        responses={responses}
        onChange={onChange}
      />
    );

    expect(screen.getByText(/Before it enters the/)).toBeDefined();
    expect(screen.getByText(/, it is compressed and sent to/)).toBeDefined();

    const input1 = screen.getByRole('textbox', { name: 'Blank 1' }) as HTMLInputElement;
    const input2 = screen.getByRole('textbox', { name: 'Blank 2' }) as HTMLInputElement;

    expect(input1.value).toBe('atmosphere');
    expect(input2.value).toBe('');

    fireEvent.change(input2, { target: { value: 'storage' } });
    expect(onChange).toHaveBeenCalledWith({ b1: 'atmosphere', b2: 'storage' });
  });

  it('shows correct and incorrect status on review', () => {
    const onChange = vi.fn();
    const passage = 'Before it enters the [[b1]], it is compressed and sent to [[b2]].';
    const blanks = [{ id: 'b1' }, { id: 'b2' }];
    const reviewBlanks = [
      { id: 'b1', correctAnswer: 'atmosphere' },
      { id: 'b2', correctAnswer: 'underground' },
    ];
    const responses = { b1: 'atmosphere', b2: 'wrong_place' };

    render(
      <InlineBlankPassage
        passage={passage}
        blanks={blanks}
        responses={responses}
        disabled={true}
        reviewBlanks={reviewBlanks}
        onChange={onChange}
      />
    );

    const input1 = screen.getByRole('textbox', { name: 'Blank 1' }) as HTMLInputElement;
    const input2 = screen.getByRole('textbox', { name: 'Blank 2' }) as HTMLInputElement;

    expect(input1.disabled).toBe(true);
    expect(input2.disabled).toBe(true);

    expect(screen.getByTitle('Correct')).toBeDefined();
    expect(screen.getByTitle('Incorrect')).toBeDefined();
    expect(screen.getByText('underground')).toBeDefined();
  });
});
