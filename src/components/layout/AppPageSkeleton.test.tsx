import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppPageSkeleton from './AppPageSkeleton';

const user = vi.hoisted(() => ({ current: null as { role?: string } | null }));

vi.mock('@/context/AppContext', () => ({
  useApp: () => ({ user: user.current }),
}));

function at(route: string) {
  render(
    <MemoryRouter initialEntries={[route]}>
      <AppPageSkeleton />
    </MemoryRouter>,
  );
}

// Loading a page used to run through two different skeletons: this one, shaped
// like the dashboard, and then the page's own. On reading that meant stat cards
// followed by a two-pane split.
describe('the route-level skeleton', () => {
  it('shows the reading layout while reading practice loads', () => {
    at('/practice?skill=reading&type=multiplechoice');
    expect(screen.getByText('Loading reading passage…')).toBeDefined();
  });

  it('shows the single-question layout for the other skills', () => {
    at('/practice?skill=speaking');
    expect(screen.getByText('Loading practice question…')).toBeDefined();
  });

  it('follows the path for pages with their own shape', () => {
    at('/mocks');
    expect(screen.getByText('Loading mock exams…')).toBeDefined();
  });

  it('falls back to the dashboard shape for anything else', () => {
    at('/');
    expect(screen.getByText('Loading dashboard…')).toBeDefined();
  });

  // Reading is the one place an admin gets a different page from a learner:
  // the authoring form, not a paper.
  it('shows the admin shape when an admin opens reading', () => {
    user.current = { role: 'admin' };
    at('/practice?skill=reading');
    expect(screen.getByText('Loading admin metrics…')).toBeDefined();
    user.current = null;
  });

  it('shows the admin shape when an admin opens any other skill', () => {
    user.current = { role: 'admin' };
    at('/practice?skill=listening');
    expect(screen.getByText('Loading admin metrics…')).toBeDefined();
    user.current = null;
  });
});
