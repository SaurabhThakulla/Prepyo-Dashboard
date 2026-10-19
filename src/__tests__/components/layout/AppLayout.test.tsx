import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';

const mocks = vi.hoisted(() => ({
  toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn(), info: vi.fn() },
  activeTestSession: null as { isActive: boolean; title?: string; skill?: string; onStop?: () => void } | null,
  setActiveTestSession: vi.fn(),
  user: { id: 'user-1', name: 'Test User', role: 'student', email: 'test@example.com' },
}));

vi.mock('@/context/AppContext', () => ({
  useApp: () => ({
    user: mocks.user,
    loading: false,
    isAuthenticated: true,
    activeTestSession: mocks.activeTestSession,
    setActiveTestSession: mocks.setActiveTestSession,
    unreadCount: 0,
    theme: 'light',
    activeExam: 'PTE',
  }),
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => mocks.toast,
}));

vi.mock('@/components/layout/AppSidebar', () => ({
  default: () => (
    <aside data-sidebar="true">
      <a href="/mocks" data-testid="sidebar-mocks-link">Mocks</a>
      <button data-testid="sidebar-nav-button">Switch Section</button>
    </aside>
  ),
}));

vi.mock('@/components/layout/Header', () => ({
  default: () => (
    <header>
      <button data-testid="header-button">Toggle Menu</button>
    </header>
  ),
}));

vi.mock('@/components/onboarding/onboarding', () => ({
  shouldShowOnboarding: () => false,
}));

describe('AppLayout active test session protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activeTestSession = null;
  });

  it('allows navigation clicks when no test session is active', () => {
    render(
      <MemoryRouter initialEntries={['/practice']}>
        <AppLayout>
          <div>Practice Screen</div>
        </AppLayout>
      </MemoryRouter>
    );

    const link = screen.getByTestId('sidebar-mocks-link');
    fireEvent.click(link);
    expect(mocks.toast.error).not.toHaveBeenCalled();
  });

  it('ends an active task without asking, then carries out the click', async () => {
    const onStop = vi.fn();
    mocks.activeTestSession = {
      isActive: true,
      title: 'PTE Speaking Task',
      skill: 'speaking',
      onStop,
    };
    const onNavButton = vi.fn();

    render(
      <MemoryRouter initialEntries={['/practice']}>
        <AppLayout>
          <div data-practice-workspace>
            <button data-testid="practice-submit-button">Submit Answer</button>
          </div>
        </AppLayout>
      </MemoryRouter>
    );
    screen.getByTestId('sidebar-nav-button').addEventListener('click', onNavButton);

    // Clicking inside the workspace does not end the task.
    fireEvent.click(screen.getByTestId('practice-submit-button'));
    expect(onStop).not.toHaveBeenCalled();

    // Clicking a sidebar button ends the task with no dialog, then the click goes through.
    fireEvent.click(screen.getByTestId('sidebar-nav-button'));
    expect(screen.queryByText('End this task?')).toBeNull();
    await waitFor(() => expect(onNavButton).toHaveBeenCalledTimes(1));
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(mocks.setActiveTestSession).toHaveBeenCalledWith(null);
  });
});

describe('the phone tab bar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activeTestSession = null;
  });

  const renderAt = (route: string) =>
    render(
      <MemoryRouter initialEntries={[route]}>
        <AppLayout>
          <div>Screen</div>
        </AppLayout>
      </MemoryRouter>,
    );

  it('shows the five tabs and lights the current one', () => {
    renderAt('/practice/tasks');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(nav.querySelectorAll('a')).toHaveLength(5);
    expect(screen.getByRole('link', { name: 'Practice' }).getAttribute('aria-current')).toBe('page');
  });

  it('steps aside while a task is running', () => {
    mocks.activeTestSession = { isActive: true, title: 'PTE Speaking Task' };
    renderAt('/practice?skill=speaking');
    expect(screen.queryByRole('navigation', { name: 'Main' })).toBeNull();
  });

  it('steps aside on a lesson', () => {
    renderAt('/learn/unit-1/lesson-1');
    expect(screen.queryByRole('navigation', { name: 'Main' })).toBeNull();
  });
});
