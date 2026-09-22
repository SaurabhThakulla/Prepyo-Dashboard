import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppLayout from './AppLayout';

const mocks = vi.hoisted(() => ({
  toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn(), info: vi.fn() },
  activeTestSession: null as { isActive: boolean; title?: string; skill?: string } | null,
  user: { id: 'user-1', name: 'Test User', role: 'student', email: 'test@example.com' },
}));

vi.mock('@/context/AppContext', () => ({
  useApp: () => ({
    user: mocks.user,
    loading: false,
    isAuthenticated: true,
    activeTestSession: mocks.activeTestSession,
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

  it('blocks navigation and pops error toast when test session is active', () => {
    mocks.activeTestSession = {
      isActive: true,
      title: 'PTE Speaking Task',
      skill: 'speaking',
    };

    render(
      <MemoryRouter initialEntries={['/practice']}>
        <AppLayout>
          <div data-practice-workspace>
            <button data-testid="practice-submit-button">Submit Answer</button>
          </div>
        </AppLayout>
      </MemoryRouter>
    );

    // Clicking sidebar navigation link should be blocked and show toast error
    const link = screen.getByTestId('sidebar-mocks-link');
    fireEvent.click(link);
    expect(mocks.toast.error).toHaveBeenCalledWith(
      'Finish the exercise first',
      expect.stringContaining('Please complete or submit')
    );

    // Clicking header / sidebar button should also be blocked
    mocks.toast.error.mockClear();
    const button = screen.getByTestId('sidebar-nav-button');
    fireEvent.click(button);
    expect(mocks.toast.error).toHaveBeenCalledWith(
      'Finish the exercise first',
      expect.stringContaining('Please complete or submit')
    );

    // Clicking inside data-practice-workspace should NOT be blocked and NOT show toast
    mocks.toast.error.mockClear();
    const submitBtn = screen.getByTestId('practice-submit-button');
    fireEvent.click(submitBtn);
    expect(mocks.toast.error).not.toHaveBeenCalled();
  });
});
