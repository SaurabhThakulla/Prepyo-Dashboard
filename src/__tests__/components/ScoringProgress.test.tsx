import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ScoringProgress from '@/components/practice/ScoringProgress';

describe('ScoringProgress', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('moves through the steps and never reaches 100%', () => {
    render(<ScoringProgress />);
    expect(screen.getByRole('status').textContent).toContain('Uploading your recording');
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByRole('status').textContent).toContain('Listening to every word');
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByRole('status').textContent).toContain('Checking pronunciation and fluency');
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByRole('status').textContent).toContain('Marking the sounds in each word');
    act(() => vi.advanceTimersByTime(50000));
    expect(screen.getByRole('status').textContent).toContain('Almost done');
    const bar = screen.getByRole('progressbar');
    expect(Number(bar.getAttribute('aria-valuenow'))).toBeLessThan(100);
    expect(Number(bar.getAttribute('aria-valuenow'))).toBeGreaterThan(90);
  });
});
