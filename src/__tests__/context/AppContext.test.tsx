import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';

const get = vi.fn();
vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...actual, api: { ...actual.api, get: (...args: unknown[]) => get(...args) } };
});

import { AppProvider, useApp } from '@/context/AppContext';

afterEach(() => {
  cleanup();
  get.mockReset();
});

const user = { id: 'u1', name: 'Learner', role: 'suru', targetExam: 'EPS_TOPIK' };
const page = (ids: string[]) => ({
  notifications: ids.map(id => ({ id, title: id, message: '', type: 'info', read: false, createdAt: '' })),
  unreadCount: ids.length,
  pagination: { total: ids.length },
});

describe('AppProvider', () => {
  it('re-renders readers only when a notification check finds something new', async () => {
    let notices = page(['n1']);
    // Like a real response, every call parses into new objects.
    get.mockImplementation((path: string) =>
      Promise.resolve(JSON.parse(JSON.stringify(path === '/profile' ? { user } : notices))),
    );

    let renders = 0;
    const seen: unknown[] = [];
    function Reader() {
      const app = useApp();
      renders += 1;
      seen.push(app);
      return <span>{app.notifications.length}</span>;
    }
    render(<AppProvider><Reader /></AppProvider>);
    await waitFor(() => expect(seen.at(-1)).toMatchObject({ loading: false, unreadCount: 1 }));

    const settled = renders;
    const value = seen.at(-1);
    // The minute poll (here, the tab becoming visible) brings the same list.
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });
    await waitFor(() => expect(get).toHaveBeenCalledTimes(3));
    // Let the response land and any state it sets render.
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    expect(renders).toBe(settled);
    expect(seen.at(-1)).toBe(value);

    // A new notice does reach the readers.
    notices = page(['n2', 'n1']);
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });
    await waitFor(() => expect(seen.at(-1)).toMatchObject({ unreadCount: 2 }));
    expect(seen.at(-1)).not.toBe(value);
  });
});
