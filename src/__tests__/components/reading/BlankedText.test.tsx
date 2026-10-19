import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BlankedText from '@/components/reading/BlankedText';

describe('BlankedText', () => {
  it('uses drag and drop, not dropdowns, when there is a word bank', () => {
    render(
      <BlankedText
        text="The river [[b1]] slowly."
        blanks={[{ id: 'b1', options: ['flows', 'sank'], correctAnswer: 'flows' } as never]}
        value={{}}
        wordBank={[{ label: 'A', text: 'flows' }, { label: 'B', text: 'sank' }] as never}
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByText('drop a word')).toBeDefined();
    expect(screen.getByRole('button', { name: 'flows' })).toBeDefined();
  });

  it('keeps dropdowns for the dropdown task, which has no word bank', () => {
    render(
      <BlankedText
        text="The river [[b1]] slowly."
        blanks={[{ id: 'b1', options: ['flows', 'sank'], correctAnswer: 'flows' } as never]}
        value={{}}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('combobox')).toBeDefined();
  });
});
