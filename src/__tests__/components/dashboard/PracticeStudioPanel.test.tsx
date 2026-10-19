import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PracticeStudioPanel from '@/components/dashboard/PracticeStudioPanel';

afterEach(cleanup);

describe('PracticeStudioPanel score layout', () => {
  it.each(['0.0/9.0', '6.5/9.0', '90/90'])('stacks %s below the full-width bar without wrapping', scoreText => {
    render(
      <MemoryRouter>
        <PracticeStudioPanel mistakeCount={0} skills={[{
          name: 'Listening', sub: 'Sections 1–4', scoreText,
          percent: 50, href: '/practice?skill=listening',
        }]} />
      </MemoryRouter>,
    );

    const score = screen.getByText(scoreText);
    const stack = score.parentElement!;
    const bar = score.previousElementSibling as HTMLElement;
    // jsdom has no layout engine: guard the responsive layout classes directly.
    expect(stack.classList.contains('flex-col')).toBe(true);
    expect(bar.classList.contains('w-full')).toBe(true);
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('50%');
    expect(score.classList.contains('whitespace-nowrap')).toBe(true);
    expect(score.classList.contains('self-end')).toBe(true);
    expect(score.classList.contains('w-11')).toBe(false);
    expect(screen.getByRole('link', { name: 'Practice' }).getAttribute('href'))
      .toBe('/practice?skill=listening');
  });

  it('keeps the progress bar and practice link when no score is available', () => {
    const { container } = render(
      <MemoryRouter>
        <PracticeStudioPanel mistakeCount={0} skills={[{
          name: 'Reading', sub: 'Passages 1–3', scoreText: '',
          percent: 0, href: '/practice?skill=reading',
        }]} />
      </MemoryRouter>,
    );
    expect(container.querySelector('.font-mono')).toBeNull();
    expect(container.querySelector<HTMLElement>('[style]')?.style.width).toBe('0%');
    expect(screen.getByRole('link', { name: 'Practice' }).getAttribute('href'))
      .toBe('/practice?skill=reading');
  });
});
