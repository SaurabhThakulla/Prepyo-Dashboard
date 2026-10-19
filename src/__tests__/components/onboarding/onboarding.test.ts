import { describe, expect, it } from 'vitest';
import { UserProfile } from '@/lib/types';
import {
  clampScore,
  dailyLabel,
  daysUntil,
  isoDateAfterMonths,
  planHeadline,
  scoreLabel,
  shouldShowOnboarding,
} from '@/components/onboarding/onboarding';

const learner = { id: 'u2', role: 'suru', targetExam: 'IELTS', onboardingCompletedAt: null } as unknown as UserProfile;

describe('who sees the onboarding', () => {
  it('shows to a learner who has not finished it', () => {
    expect(shouldShowOnboarding(learner)).toBe(true);
  });

  it('stays hidden once the server has a completion time', () => {
    expect(shouldShowOnboarding({ ...learner, onboardingCompletedAt: '2026-09-11T10:00:00Z' })).toBe(false);
  });

  it('stays hidden while the server does not know about onboarding yet', () => {
    expect(shouldShowOnboarding({ ...learner, onboardingCompletedAt: undefined })).toBe(false);
  });

  it('is not shown to admins', () => {
    expect(shouldShowOnboarding({ ...learner, role: 'admin' } as UserProfile)).toBe(false);
  });

  it('shows nothing without a user', () => {
    expect(shouldShowOnboarding(null)).toBe(false);
  });
});

describe('score, date and time helpers', () => {
  it('snaps targets onto the exam scale', () => {
    expect(clampScore('IELTS', 6.7)).toBe(6.5);
    expect(clampScore('IELTS', 2)).toBe(4);
    expect(clampScore('PTE', 95)).toBe(90);
  });

  it('names IELTS bands', () => {
    expect(scoreLabel('IELTS', 7.5)).toBe('Band 7: Good user');
    expect(scoreLabel('PTE', 65)).toBe('65 out of 90');
  });

  it('counts the days to the exam', () => {
    const from = new Date(2026, 8, 11);
    expect(daysUntil('2026-09-21', from)).toBe(10);
    expect(daysUntil('not a date', from)).toBeNull();
    expect(isoDateAfterMonths(3, from)).toBe('2026-12-11');
  });

  it('writes daily time the way people say it', () => {
    expect(dailyLabel(45)).toBe('45 min');
    expect(dailyLabel(60)).toBe('1 hr');
    expect(dailyLabel(90)).toBe('1.5 hrs');
  });
});

describe('the dashboard headline', () => {
  it('reads back what the learner chose', () => {
    expect(
      planHeadline({ ...learner, targetScore: 7, studyGoal: 'university', destination: 'australia' } as UserProfile),
    ).toBe('Aiming for IELTS 7.0 · Study at a university in Australia');
  });

  it('says only what it knows', () => {
    expect(planHeadline({ ...learner, targetExam: 'PTE', targetScore: null } as UserProfile)).toBe('Aiming for PTE');
    expect(
      planHeadline({ ...learner, targetScore: 6.5, studyGoal: 'other', destination: 'canada' } as UserProfile),
    ).toBe('Aiming for IELTS 6.5 · Heading to Canada');
  });
});
