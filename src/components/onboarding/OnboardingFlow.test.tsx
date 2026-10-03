import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import OnboardingFlow from './OnboardingFlow';
import { UserProfile } from '@/lib/types';

const completeOnboarding = vi.hoisted(() => vi.fn());

vi.mock('@/context/AppContext', () => ({
  useApp: () => ({ completeOnboarding }),
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ success: vi.fn(), warning: vi.fn(), error: vi.fn() }),
}));

vi.mock('@/lib/hooks/useResources', () => ({
  useSubscriptionPlans: () => ({ data: undefined, isPending: false, error: null }),
}));

const learner = {
  id: 'u1',
  name: 'Asha Gurung',
  role: 'suru',
  planId: 'free',
  paidPlanActive: false,
  targetExam: 'PTE',
  targetScore: null,
  nepalRegion: 'Kathmandu',
  onboardingCompletedAt: null,
} as unknown as UserProfile;

type Clicker = ReturnType<typeof userEvent.setup>;

function Landed() {
  const location = useLocation();
  return <p>Landed on {location.pathname + location.search}</p>;
}

function renderFlow() {
  const onDone = vi.fn();
  render(
    <MemoryRouter initialEntries={['/start']}>
      <Routes>
        <Route path="/start" element={<OnboardingFlow user={learner} onDone={onDone} />} />
        <Route path="*" element={<Landed />} />
      </Routes>
    </MemoryRouter>,
  );
  return onDone;
}

const next = (user: Clicker) => user.click(screen.getByRole('button', { name: /^continue$/i }));

async function walkToPlan(user: Clicker, { retake = false, plan = /^start\s*normal/i } = {}) {
  await user.click(screen.getByRole('button', { name: /let's go/i }));
  await user.click(screen.getByRole('button', { name: /^IELTS/ }));
  await next(user);
  await user.click(screen.getByRole('button', { name: /study at a university/i }));
  await next(user);
  await user.click(screen.getByRole('button', { name: /australia/i }));
  await next(user);
  await user.click(screen.getByRole('button', { name: retake ? /taken it before/i : /first attempt/i }));
  await next(user);
  await user.click(screen.getByRole('button', { name: '7.0' }));
  await next(user);
  await user.click(screen.getByRole('button', { name: /not booked yet/i }));
  await next(user);
  await user.click(screen.getByRole('button', { name: /^writing/i }));
  await next(user);
  await user.click(screen.getByRole('button', { name: /^45 min/ }));
  await next(user);
  await user.click(screen.getByRole('button', { name: plan }));
  await next(user);
  await user.click(screen.getByRole('button', { name: /see my plan/i }));
}

beforeEach(() => {
  completeOnboarding.mockReset();
  completeOnboarding.mockResolvedValue(undefined);
});

describe('the first-run onboarding', () => {
  it('greets the learner by first name', () => {
    renderFlow();
    expect(screen.getByRole('heading', { name: /Namaste, Asha/ })).toBeDefined();
  });

  it('walks twelve screens and saves every answer', async () => {
    const user = userEvent.setup();
    const onDone = renderFlow();

    await walkToPlan(user);
    expect(screen.getByRole('heading', { name: /all set, Asha/ })).toBeDefined();
    await user.click(screen.getByRole('button', { name: /go to my dashboard/i }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(completeOnboarding).toHaveBeenCalledWith({
      targetExam: 'IELTS',
      targetModule: 'academic',
      targetScore: 7,
      studyGoal: 'university',
      destination: 'australia',
      priorAttempt: 'first',
      focusSkill: 'writing',
      dailyMinutes: 45,
    });
    expect(screen.getByText('Landed on /dashboard')).toBeDefined();
  });

  it('shows every plan and waits for the learner to pick one', async () => {
    const user = userEvent.setup();
    renderFlow();

    await user.click(screen.getByRole('button', { name: /let's go/i }));
    for (let i = 0; i < 8; i += 1) {
      if (screen.queryByRole('heading', { name: /choose how you want to prepare/i })) break;
      const buttons = screen.getAllByRole('button', { pressed: false });
      await user.click(buttons[0]);
      if (screen.queryByRole('button', { name: /not booked yet/i })) {
        await user.click(screen.getByRole('button', { name: /not booked yet/i }));
      }
      await next(user);
    }

    expect(screen.getByRole('heading', { name: /choose how you want to prepare/i })).toBeDefined();
    for (const name of [/Normal/, /Prepyo Go/, /Prepyo Plus/, /Prepyo Pro/]) {
      expect(screen.getByRole('button', { name })).toBeDefined();
    }
    expect(screen.getByText('NPR 299')).toBeDefined();
    expect(screen.getByRole('button', { name: /^continue$/i }).hasAttribute('disabled')).toBe(true);
  }, 15000);

  it('sends a learner who picks a paid plan to checkout', async () => {
    const user = userEvent.setup();
    const onDone = renderFlow();

    await walkToPlan(user, { plan: /Prepyo Plus/ });
    await user.click(screen.getByRole('button', { name: /continue to payment/i }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(completeOnboarding).toHaveBeenCalled();
    expect(screen.getByText('Landed on /subscription?plan=pro')).toBeDefined();
  });

  it('records the last score of a learner who is retaking', async () => {
    const user = userEvent.setup();
    renderFlow();

    await walkToPlan(user, { retake: true });
    await user.click(screen.getByRole('button', { name: /go to my dashboard/i }));

    await waitFor(() => expect(completeOnboarding).toHaveBeenCalled());
    expect(completeOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({ priorAttempt: 'retake', previousScore: 6 }),
    );
  });

  it('cannot be skipped, and waits for an answer on each question', async () => {
    const user = userEvent.setup();
    renderFlow();

    expect(screen.queryByText(/skip/i)).toBeNull();
    await user.click(screen.getByRole('button', { name: /let's go/i }));
    expect(screen.queryByText(/skip/i)).toBeNull();

    const continueButton = () => screen.getByRole('button', { name: /^continue$/i });
    expect(continueButton().hasAttribute('disabled')).toBe(true);
    await user.click(screen.getByRole('button', { name: /^PTE Academic/ }));
    expect(continueButton().hasAttribute('disabled')).toBe(false);

    await next(user);
    expect(continueButton().hasAttribute('disabled')).toBe(true);
  });

  it('lets the learner retry when saving fails', async () => {
    completeOnboarding.mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();
    const onDone = renderFlow();

    await walkToPlan(user);
    await user.click(screen.getByRole('button', { name: /go to my dashboard/i }));

    expect((await screen.findByRole('alert')).textContent).toMatch(/couldn't save your plan/i);
    expect(onDone).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(completeOnboarding).toHaveBeenCalledTimes(2);
  });
});

// EPS-TOPIK is for work in South Korea, tests reading and listening only, and
// has no diagnostic or mock tests yet: the flow skips the goal and destination
// questions, offers only its two skills, and starts the learner on the course.
describe('onboarding for EPS-TOPIK', () => {
  it('offers EPS-TOPIK as an exam, not as coming soon', async () => {
    const user = userEvent.setup();
    renderFlow();
    await user.click(screen.getByRole('button', { name: /let's go/i }));
    expect(screen.getByRole('button', { name: /^EPS-TOPIK/ })).toBeDefined();
    expect(screen.queryByText('Korean')).toBeNull();
  });

  it('walks the Korean path and saves work in South Korea', async () => {
    const user = userEvent.setup();
    const onDone = renderFlow();

    await user.click(screen.getByRole('button', { name: /let's go/i }));
    await user.click(screen.getByRole('button', { name: /^EPS-TOPIK/ }));
    await next(user);

    // Straight to experience: goal and destination are already answered.
    expect(screen.getByRole('heading', { name: /taken EPS-TOPIK before/i })).toBeDefined();
    await user.click(screen.getByRole('button', { name: /first attempt/i }));
    await next(user);

    expect(screen.getByText(/minimum score for each industry/i)).toBeDefined();
    await user.click(screen.getByRole('button', { name: '60' }));
    await next(user);
    await user.click(screen.getByRole('button', { name: /not booked yet/i }));
    await next(user);

    expect(screen.queryByRole('button', { name: /^speaking/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^writing/i })).toBeNull();
    await user.click(screen.getByRole('button', { name: /^listening/i }));
    await next(user);
    await user.click(screen.getByRole('button', { name: /^45 min/ }));
    await next(user);

    expect(screen.queryByText(/AI gradings for speaking/i)).toBeNull();
    expect(screen.getAllByText(/Help in English/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /^start\s*normal/i }));
    await next(user);

    expect(screen.getByRole('tab', { name: /Learn Korean/ })).toBeDefined();
    expect(screen.queryByRole('tab', { name: /Mock tests/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: /see my plan/i }));

    await user.click(screen.getByRole('button', { name: /start learn korean/i }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(completeOnboarding).toHaveBeenCalledWith({
      targetExam: 'EPS_TOPIK',
      targetScore: 60,
      studyGoal: 'work',
      destination: 'south-korea',
      priorAttempt: 'first',
      focusSkill: 'listening',
      dailyMinutes: 45,
    });
    expect(screen.getByText('Landed on /learn')).toBeDefined();
  }, 20000);
});
