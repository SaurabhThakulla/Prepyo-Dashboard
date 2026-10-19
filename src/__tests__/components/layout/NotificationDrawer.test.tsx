import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import NotificationDrawer from '@/components/layout/NotificationDrawer';

const mocks = vi.hoisted(() => ({
  app: {
    notifications: [] as Array<Record<string, unknown>>,
    unreadCount: 0,
    hasMoreNotifications: false,
    loadMoreNotifications: vi.fn(),
    markNotificationAsRead: vi.fn(),
    markAllNotificationsAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    clearAllNotifications: vi.fn(),
  },
}));
vi.mock('@/context/AppContext', () => ({ useApp: () => mocks.app }));

const notice = (id: string, read: boolean, actionUrl?: string) => ({
  id, title: `Notice ${id}`, message: 'Details', type: 'report', read, actionUrl,
  createdAt: new Date().toISOString(),
});

function renderDrawer(onClose = vi.fn()) {
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<NotificationDrawer open onClose={onClose} />} />
        <Route path="/reports" element={<p>Reports page</p>} />
      </Routes>
    </MemoryRouter>,
  );
  return onClose;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.app.notifications = [];
  mocks.app.unreadCount = 0;
  mocks.app.hasMoreNotifications = false;
  mocks.app.loadMoreNotifications.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe('NotificationDrawer', () => {
  it('shows an empty state', () => {
    renderDrawer();
    expect(screen.getByText('No notifications yet')).toBeTruthy();
    expect(screen.getByText('All caught up')).toBeTruthy();
  });

  it('uses the server unread count and offers Show more', () => {
    mocks.app.notifications = [notice('a', false), notice('b', true)];
    mocks.app.unreadCount = 12;
    mocks.app.hasMoreNotifications = true;
    renderDrawer();

    expect(screen.getByText('12 unread')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Show more' }));
    expect(mocks.app.loadMoreNotifications).toHaveBeenCalledTimes(1);
  });

  it('marks a notice read and opens its page', () => {
    mocks.app.notifications = [notice('a', false, '/reports')];
    mocks.app.unreadCount = 1;
    const onClose = renderDrawer();

    fireEvent.click(screen.getByRole('button', { name: /^Notice a/ }));
    expect(mocks.app.markNotificationAsRead).toHaveBeenCalledWith('a');
    expect(onClose).toHaveBeenCalled();
    expect(screen.getByText('Reports page')).toBeTruthy();
  });

  it('does not mark an already-read notice again', () => {
    mocks.app.notifications = [notice('a', true)];
    renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: /^Notice a/ }));
    expect(mocks.app.markNotificationAsRead).not.toHaveBeenCalled();
  });

  it('deletes one notice without opening it', () => {
    mocks.app.notifications = [notice('a', false, '/reports')];
    mocks.app.unreadCount = 1;
    const onClose = renderDrawer();

    fireEvent.click(screen.getByRole('button', { name: 'Delete notification: Notice a' }));
    expect(mocks.app.deleteNotification).toHaveBeenCalledWith('a');
    expect(mocks.app.markNotificationAsRead).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('asks before clearing everything', () => {
    mocks.app.notifications = [notice('a', false), notice('b', true)];
    renderDrawer();

    fireEvent.click(screen.getByRole('button', { name: /Clear all/ }));
    expect(mocks.app.clearAllNotifications).not.toHaveBeenCalled();
    expect(screen.getByText(/Delete all notifications\?/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText(/Delete all notifications\?/)).toBeNull();
    expect(mocks.app.clearAllNotifications).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Clear all/ }));
    const confirm = screen.getAllByRole('button', { name: 'Clear all' }).at(-1)!;
    fireEvent.click(confirm);
    expect(mocks.app.clearAllNotifications).toHaveBeenCalledTimes(1);
  });

  it('hides Clear all when there is nothing to clear', () => {
    renderDrawer();
    expect(screen.queryByRole('button', { name: /Clear all/ })).toBeNull();
  });
});
