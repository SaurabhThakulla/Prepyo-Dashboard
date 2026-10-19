import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import InlineBlankPassage, { passageHasGaps } from '@/components/practice/InlineBlankPassage';

// IELTS note-completion passages write gaps as "____ (1)".
const notes = 'Watering time: ____ (1)\nEntrance beside the: ____ (2)';

describe('numbered note gaps', () => {
  it('counts as a gapped passage', () => {
    expect(passageHasGaps(notes)).toBe(true);
    expect(passageHasGaps('Plain text (1) with no gap')).toBe(false);
  });

  it('puts an input in each gap, keyed by blank id', () => {
    const onChange = vi.fn();
    render(<InlineBlankPassage passage={notes} blanks={[{ id: '1' }, { id: '2' }] as any} responses={{}} onChange={onChange} />);
    expect(screen.queryByText(/____/)).toBeNull();
    fireEvent.change(screen.getByLabelText('Blank 2'), { target: { value: 'bakery' } });
    expect(onChange).toHaveBeenCalledWith({ '2': 'bakery' });
  });
});
