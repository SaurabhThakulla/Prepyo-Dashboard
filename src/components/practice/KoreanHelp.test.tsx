import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const get = vi.fn();
vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...actual, api: { get: (...args: unknown[]) => get(...args) } };
});

import { ApiError } from '@/lib/api';
import KoreanHelp from './KoreanHelp';

afterEach(() => {
  cleanup();
  get.mockReset();
});

const renderHelp = (props: React.ComponentProps<typeof KoreanHelp>) =>
  render(<MemoryRouter><KoreanHelp {...props} /></MemoryRouter>);

describe('KoreanHelp', () => {
  it('shows a premium learner the English on request', async () => {
    get.mockResolvedValue({ text: 'Man: Where are you from?', audioUrl: '/api/v1/questions/assets/tts_en_1' });
    renderHelp({ questionId: 'q1', premium: true });
    fireEvent.click(screen.getByRole('button', { name: /help in english/i }));
    expect(await screen.findByText('Where are you from?')).toBeTruthy();
    expect(get).toHaveBeenCalledWith('/questions/q1/translation');
  });

  it('asks a free learner to upgrade, without fetching the English', () => {
    renderHelp({ questionId: 'q1', premium: false });
    fireEvent.click(screen.getByRole('button', { name: /help in english/i }));
    expect(screen.getByText(/premium feature/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /upgrade to use it/i }).getAttribute('href')).toBe('/subscription');
    expect(get).not.toHaveBeenCalled();
  });

  it('falls back to the upgrade box when the server refuses', async () => {
    get.mockRejectedValue(new ApiError(403, { code: 'forbidden', message: 'Premium only' }));
    renderHelp({ questionId: 'q1', premium: true });
    fireEvent.click(screen.getByRole('button', { name: /help in english/i }));
    expect(await screen.findByText(/premium feature/i)).toBeTruthy();
  });

  it('opens straight away with the English from the review', () => {
    renderHelp({ questionId: 'q1', premium: true, initial: { text: 'I drink milk.' } });
    expect(screen.getByText('I drink milk.')).toBeTruthy();
    expect(get).not.toHaveBeenCalled();
  });
});
