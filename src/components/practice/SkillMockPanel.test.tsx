import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SkillMockPanel from './SkillMockPanel';

const mockUser = vi.hoisted(() => ({ current: { id: 'test-user', role: 'taiyari', subscription: { planId: 'pro', isActive: true } } as any }));

vi.mock('@/context/AppContext', () => ({ useApp: () => ({ user: mockUser.current }) }));
vi.mock('@/components/practice/PracticeMockPaywall', () => ({ default: ({ skill }: { skill: string }) => <div>Premium Exclusive Feature {skill}</div> }));

describe('SkillMockPanel', () => {
  beforeEach(() => {
    mockUser.current = { id: 'test-user', role: 'taiyari', subscription: { planId: 'pro', isActive: true } };
  });

  it('does not fabricate a skill mock or call a browser scoring flow', () => {
    render(<MemoryRouter><SkillMockPanel skill="speaking" exam="PTE" /></MemoryRouter>);
    expect(screen.getByText('PTE Speaking mock unavailable')).toBeDefined();
    expect(screen.queryByText(/OFFICIAL MOCK EXAM/i)).toBeNull();
    expect(screen.queryByText(/score report/i)).toBeNull();
  });

  it('discloses unavailability to free users without an upgrade gate', () => {
    mockUser.current = { id: 'free-user', role: 'suru', subscription: { planId: 'free', isActive: true } };
    render(<MemoryRouter><SkillMockPanel skill="writing" exam="IELTS" /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'IELTS Writing mock unavailable' })).toBeDefined();
    expect(screen.getByText(/Upgrading does not unlock it/)).toBeDefined();
    expect(screen.queryByText(/Premium Exclusive Feature/i)).toBeNull();
  });
});
