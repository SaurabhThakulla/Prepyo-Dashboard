import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const get = vi.fn();
const post = vi.fn();
const del = vi.fn();
const refreshUser = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    api: {
      ...actual.api,
      get: (...a: unknown[]) => get(...a),
      post: (...a: unknown[]) => post(...a),
      delete: (...a: unknown[]) => del(...a),
    },
  };
});
vi.mock('@/context/AppContext', () => ({ useApp: () => ({ refreshUser }) }));
vi.mock('@/pages/NotFoundPage', () => ({ default: () => <h1>Page not found</h1> }));

import { ApiError } from '@/lib/api';
import { institutionRoutes } from '@/institution/InstitutionRoutes';
import { isInstitutionPath } from '@/institution/paths';

const ACCOUNT = {
  admin: { name: 'Sita Sharma', email: 'sita@brightfuture.example' },
  institution: {
    name: 'Bright Future', code: 'bright-future', status: 'free', seatLimit: 2, onboarded: true,
    profile: { exams: ['PTE'], city: 'Kathmandu', branches: 1, monthlyStudents: 'under-25', brandColor: '#1d4ed8' },
  },
};
const RAM = { id: 'u1', name: 'Ram Thapa', username: 'ram', createdAt: '2026-10-14T00:00:00Z' };
const UNAUTHORIZED = new ApiError(401, { code: 'unauthorized', message: 'Please sign in to continue.' });

// server answers each GET by path; anything not listed is a 404.
function server(answers: Record<string, unknown>) {
  get.mockImplementation((path: string) =>
    path in answers
      ? answers[path] instanceof Error ? Promise.reject(answers[path]) : Promise.resolve(answers[path])
      : Promise.reject(new ApiError(404, { code: 'not_found', message: '' })),
  );
}
const signedOut = () => server({ '/institution/me': UNAUTHORIZED, '/institution/lookup/bright-future': { name: 'Bright Future', code: 'bright-future' } });
const signedIn = (students: unknown[] = []) => server({ '/institution/me': ACCOUNT, '/institution/students': { students } });

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

function open(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Where />
      <Routes>
        <Route path="/dashboard" element={<p>Learner app</p>} />
        {institutionRoutes}
      </Routes>
    </MemoryRouter>,
  );
}

const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const where = () => screen.getByTestId('where').textContent;

afterEach(() => {
  cleanup();
  get.mockReset();
  post.mockReset();
  del.mockReset();
  refreshUser.mockClear();
});

describe('institution admin login', () => {
  it("signs the admin in and opens their institution's own address", async () => {
    signedOut();
    post.mockResolvedValue(ACCOUNT);
    open('/institution/login');

    await screen.findByLabelText('Email');
    fill('Email', ' sita@brightfuture.example ');
    fill('Password', 'a-long-enough-password');
    signedIn();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(where()).toBe('/bright-future'));
    expect(post).toHaveBeenCalledWith('/institution/login', { email: 'sita@brightfuture.example', password: 'a-long-enough-password' });
    expect(await screen.findByText('Free plan')).toBeTruthy();
  });

  it('shows what the server said when the details are wrong', async () => {
    signedOut();
    post.mockRejectedValue(new ApiError(401, { code: 'unauthorized', message: 'That email and password do not match an institution account.' }));
    open('/institution/login');

    await screen.findByLabelText('Email');
    fill('Email', 'sita@brightfuture.example');
    fill('Password', 'wrong');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect((await screen.findByRole('alert')).textContent).toBe('That email and password do not match an institution account.');
  });
});

describe('institution sign-up', () => {
  const fillForm = (confirm = 'a-long-enough-password') => {
    fill('Institution name', ' Bright Future ');
    fill('Your name', 'Sita Sharma');
    fill('Email', 'sita@brightfuture.example');
    fill('Phone', '9800000000');
    fill('Password', 'a-long-enough-password');
    fill('Confirm password', confirm);
  };

  it('checks the form before sending it', async () => {
    signedOut();
    open('/institution/signup');
    await screen.findByLabelText('Institution name');

    fillForm('a-different-password');
    fireEvent.click(screen.getByRole('button', { name: 'Register institution' }));

    expect(screen.getByText('The two passwords do not match.')).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
  });

  it('registers and opens the dashboard', async () => {
    signedOut();
    post.mockResolvedValue(ACCOUNT);
    open('/institution/signup');
    await screen.findByLabelText('Institution name');

    fillForm();
    fireEvent.click(screen.getByRole('checkbox'));
    signedIn();
    fireEvent.click(screen.getByRole('button', { name: 'Register institution' }));

    await waitFor(() => expect(where()).toBe('/bright-future'));
  });
});

describe("an institution's own address, for its admin", () => {
  it('keeps the admin on their own institution, whatever address was typed', async () => {
    signedIn();
    open('/someone-else');
    await waitFor(() => expect(where()).toBe('/bright-future'));
  });

  it('still answers at the address used before', async () => {
    signedIn();
    open('/institution/bright-future');
    await waitFor(() => expect(where()).toBe('/bright-future'));
  });

  it('adds a student and shows the password once', async () => {
    signedIn();
    post.mockResolvedValue({ student: RAM, password: 'abcd2345ef' });
    open('/bright-future');

    expect(await screen.findByText(/0 of 2 seats used/)).toBeTruthy();
    fill('Student name', ' Ram Thapa ');
    signedIn([RAM]);
    fireEvent.click(screen.getByRole('button', { name: 'Add student' }));

    expect(await screen.findByText('abcd2345ef')).toBeTruthy();
    expect(post).toHaveBeenCalledWith('/institution/students', { name: 'Ram Thapa' });
    expect(await screen.findByText(/1 of 2 seats used/)).toBeTruthy();
  });

  it('offers no more students once the seats are full', async () => {
    signedIn([RAM, { ...RAM, id: 'u2', username: 'ram2' }]);
    open('/bright-future');

    expect(await screen.findByText(/2 of 2 seats used/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add student' })).toBeNull();
  });

  it('signs out and returns to the admin login page', async () => {
    signedIn();
    post.mockResolvedValue(undefined);
    open('/bright-future');

    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(where()).toBe('/institution/login'));
  });
});

describe("an institution's own address, for its students", () => {
  it('is the student sign-in, and signing in opens the learner app', async () => {
    signedOut();
    post.mockResolvedValue(undefined);
    open('/bright-future');

    expect(await screen.findByRole('heading', { name: 'Bright Future' })).toBeTruthy();
    fill('Username', ' ram ');
    fill('Password', 'abcd2345ef');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(where()).toBe('/dashboard'));
    expect(post).toHaveBeenCalledWith('/institution/student-login', { code: 'bright-future', username: 'ram', password: 'abcd2345ef' });
    expect(refreshUser).toHaveBeenCalled();
  });

  it('is the ordinary not-found page when no institution has that name', async () => {
    signedOut();
    open('/no-such-place');
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeTruthy();
    expect(where()).toBe('/no-such-place');
  });
});

describe('telling institution addresses from app pages', () => {
  it('treats /institution/... and any unknown first word as an institution address', () => {
    expect(isInstitutionPath('/institution/login')).toBe(true);
    expect(isInstitutionPath('/bright-future')).toBe(true);
    expect(isInstitutionPath('/')).toBe(false);
    expect(isInstitutionPath('/practice/tasks')).toBe(false);
  });

  // A page added to App.tsx but not to APP_PAGES would lose its sidebar and header.
  it('knows every page in App.tsx', () => {
    const app = readFileSync(resolve(__dirname, '../../App.tsx'), 'utf8');
    const paths = [...app.matchAll(/path="(\/[^"*]*)"/g)].map(match => match[1]).filter(path => path !== '/');
    expect(paths.length).toBeGreaterThan(20);
    expect(paths.filter(isInstitutionPath)).toEqual([]);
  });
});
