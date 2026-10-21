import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { buildSections } from '@/components/layout/sidebar/navigation';
import { UserProfile } from '@/lib/types';
import PracticeHubPage from '@/pages/PracticeHubPage';

const learner = { id: 'u1', role: 'taiyari', name: 'Learner' } as UserProfile;

vi.mock('@/context/AppContext', () => ({
  useApp: () => ({ user: learner }),
}));

vi.mock('@/components/layout/sidebar/useNavSections', () => ({
  useNavSections: () => buildSections('PTE', () => {}, learner),
}));

const renderAt = (route: string) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <PracticeHubPage />
    </MemoryRouter>,
  );

describe('the practice hub', () => {
  it('shows one tab per skill and opens on the first', () => {
    renderAt('/practice/tasks');
    const tabs = screen.getAllByRole('tab').map(tab => tab.textContent?.replace(/\d+$/, ''));
    expect(tabs).toEqual(['Speaking', 'Writing', 'Reading', 'Listening']);
    expect(screen.getByRole('tab', { name: /Speaking/ }).getAttribute('aria-selected')).toBe('true');
  });

  it('lists the skill’s tasks as cards, with sectional tests left to the Mock menu', () => {
    renderAt('/practice/tasks?skill=speaking');
    const panel = screen.getByRole('tabpanel', { name: 'Speaking' });
    expect(within(panel).getByRole('link', { name: /Read Aloud/ }).getAttribute('href')).toContain('skill=speaking');
    expect(within(panel).queryByRole('link', { name: /Sectional Test/ })).toBeNull();
  });

  it('switches skill from the tabs', () => {
    renderAt('/practice/tasks?skill=speaking');
    fireEvent.click(screen.getByRole('tab', { name: /Writing/ }));
    expect(screen.getByRole('tabpanel', { name: 'Writing' })).toBeDefined();
  });
});
