import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const get = vi.fn();

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...actual, api: { ...actual.api, get: (...a: unknown[]) => get(...a) } };
});

import AdminConsultanciesPage, { Consultancy, ConsultancyStudent } from '@/pages/AdminConsultanciesPage';

const usage = (practice: number) => ({ practiceAttempts: practice, mocksCompleted: 1, aiEvaluations: 2, tutorMessages: 3, lastActiveAt: '2026-10-15T10:00:00Z' });
const BRIGHT: Consultancy = {
  id: 'i1', name: 'Bright Future', code: 'bright-future', phone: '9800000000', status: 'active', validUntil: '2026-12-31',
  seatLimit: 10, createdAt: '2026-10-14T00:00:00Z', adminName: 'Sita Sharma', adminEmail: 'sita@example.com',
  students: 2, activeStudents: 1, usage: usage(12),
  profile: { exams: ['PTE', 'EPS_TOPIK'], city: 'Pokhara', branches: 2, monthlyStudents: '25-50', brandColor: '#1d4ed8' },
  onboarded: true,
};
const RAM: ConsultancyStudent = {
  userId: 'u1', name: 'Ram Thapa', username: 'ram', targetExam: 'EPS_TOPIK', planId: 'free', planValidUntil: null,
  addedAt: '2026-10-14T00:00:00Z', usage: usage(7),
};

afterEach(() => {
  cleanup();
  get.mockReset();
});

describe('AdminConsultanciesPage', () => {
  it('lists consultancies, changes period and opens one to show its students', async () => {
    get.mockImplementation((path: string) =>
      Promise.resolve(path.startsWith('/admin/consultancies/i1') ? { students: [RAM] } : { consultancies: [BRIGHT] }),
    );
    render(<AdminConsultanciesPage />);

    expect(await screen.findByText('Bright Future')).toBeTruthy();
    expect(screen.getByText('2 / 10')).toBeTruthy();
    expect(screen.getByText('1 active')).toBeTruthy();
    expect(get).toHaveBeenCalledWith('/admin/consultancies?days=30');

    fireEvent.click(screen.getByRole('button', { name: '7 days' }));
    await waitFor(() => expect(get).toHaveBeenCalledWith('/admin/consultancies?days=7'));

    fireEvent.click(screen.getByText('Bright Future'));
    expect(await screen.findByText('Ram Thapa')).toBeTruthy();
    expect(get).toHaveBeenCalledWith('/admin/consultancies/i1?days=7');
    expect(screen.getByText('EPS-TOPIK')).toBeTruthy();
  });

  it('says so when there are none', async () => {
    get.mockResolvedValue({ consultancies: [] });
    render(<AdminConsultanciesPage />);
    expect(await screen.findByText('No consultancies yet')).toBeTruthy();
  });
});
