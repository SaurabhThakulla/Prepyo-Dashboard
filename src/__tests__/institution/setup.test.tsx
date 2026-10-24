import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const get = vi.fn();
const put = vi.fn();

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...actual, api: { ...actual.api, get: (...a: unknown[]) => get(...a), put: (...a: unknown[]) => put(...a) } };
});
vi.mock('@/context/AppContext', () => ({ useApp: () => ({ refreshUser: vi.fn() }) }));

import { institutionRoutes } from '@/institution/InstitutionRoutes';

const PROFILE = { exams: ['IELTS', 'EPS_TOPIK'], city: 'Pokhara', branches: 2, monthlyStudents: '25-50', brandColor: '#0f766e' };
const NEW = {
  admin: { name: 'Gita Rai', email: 'gita@example.com' },
  institution: {
    name: 'Himalaya Study Centre', code: 'himalaya', status: 'free', seatLimit: 2, onboarded: false,
    profile: { exams: [], city: '', branches: 1, monthlyStudents: '', brandColor: '' },
  },
};
const DONE = { ...NEW, institution: { ...NEW.institution, onboarded: true, profile: PROFILE } };

afterEach(() => {
  cleanup();
  get.mockReset();
  put.mockReset();
});

const open = () =>
  render(
    <MemoryRouter initialEntries={['/himalaya']}>
      <Routes>{institutionRoutes}</Routes>
    </MemoryRouter>,
  );
const press = (name: RegExp | string) => fireEvent.click(screen.getByRole('button', { name }));

describe('institution setup', () => {
  it('must be finished before the dashboard opens, and its answers show on the dashboard', async () => {
    get.mockImplementation((path: string) =>
      Promise.resolve(path === '/institution/me' ? NEW : { students: [] }),
    );
    put.mockResolvedValue(DONE);
    open();

    await screen.findByRole('heading', { name: /which exams do you prepare/i }, { timeout: 5000 });
    expect(screen.queryByRole('heading', { name: 'Overview' })).toBeNull();
    expect(screen.getByRole('button', { name: /continue/i }).hasAttribute('disabled')).toBe(true);

    press(/^IELTS/);
    press(/^EPS-TOPIK/);
    press(/continue/i);
    press('Pokhara');
    press('More branches');
    press(/continue/i);
    press(/^25 to 50/);
    press(/continue/i);
    press('Colour #0f766e');
    press(/continue/i);
    press(/finish setup/i);

    await waitFor(() => expect(put).toHaveBeenCalledWith('/institution/profile', PROFILE));
    await screen.findByRole('heading', { name: 'Overview' });
    expect(screen.getByText(/Pokhara · 2 branches · 25 to 50 students a month/)).toBeTruthy();
    expect(screen.getByText('EPS-TOPIK')).toBeTruthy();
  }, 20_000);

  it('can be edited from the dashboard and cancelled', async () => {
    get.mockImplementation((path: string) => Promise.resolve(path === '/institution/me' ? DONE : { students: [] }));
    open();

    fireEvent.click(await screen.findByRole('link', { name: 'Settings' }, { timeout: 5000 }));
    fireEvent.click(await screen.findByRole('button', { name: /edit details/i }));
    expect((await screen.findByRole('button', { name: /^IELTS/ })).getAttribute('aria-pressed')).toBe('true');
    press(/cancel/i);
    await screen.findByRole('heading', { name: 'Settings' });
    expect(put).not.toHaveBeenCalled();
  });
});
