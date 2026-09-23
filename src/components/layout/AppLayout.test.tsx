import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppLayout from './AppLayout';

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

vi.mock('./AppSidebar', () => ({
  default: () => (
    <aside data-sidebar="true">
      <a href="/mocks" data-testid="sidebar-mocks-link">Mocks</a>
      <button data-testid="sidebar-nav-button">Switch Section</button>
    </aside>
  ),
}));

vi.mock('./Header', () => ({
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

  it('asks before ending an active task and only leaves on yes', async () => {
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

    // Clicking inside the workspace is not interrupted.
    fireEvent.click(screen.getByTestId('practice-submit-button'));
    expect(screen.queryByText('Are you sure you want to end this task?')).toBeNull();

    // Clicking a sidebar button asks first, and "No" keeps the task running.
    fireEvent.click(screen.getByTestId('sidebar-nav-button'));
    expect(screen.getByText('Are you sure you want to end this task?')).toBeTruthy();
    expect(onNavButton).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('No, stay'));
    await waitFor(() => expect(screen.queryByText('Are you sure you want to end this task?')).toBeNull());
    expect(onStop).not.toHaveBeenCalled();

    // "Yes" ends the task, then carries out the original click.
    fireEvent.click(screen.getByTestId('sidebar-mocks-link'));
    fireEvent.click(screen.getByText('Yes, end task'));
    await waitFor(() => expect(mocks.setActiveTestSession).toHaveBeenCalledWith(null));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('replays the clicked control after the task ends', async () => {
    mocks.activeTestSession = { isActive: true, title: 'PTE Speaking Task' };
    const onNavButton = vi.fn();

    render(
      <MemoryRouter initialEntries={['/practice']}>
        <AppLayout>
          <div>Practice Screen</div>
        </AppLayout>
      </MemoryRouter>
    );
    screen.getByTestId('sidebar-nav-button').addEventListener('click', onNavButton);

    fireEvent.click(screen.getByTestId('sidebar-nav-button'));
    fireEvent.click(screen.getByText('Yes, end task'));
    await waitFor(() => expect(onNavButton).toHaveBeenCalledTimes(1));
  });
});
