import { describe, expect, it } from 'vitest';
import { UserProfile } from '@/lib/types';
import { buildMobileTabs, getMobileTab, isFocusRoute, isTabRoot, mobileTitle, PRACTICE_HUB_HREF } from './mobileNav';

const at = (url: string) => {
  const [path, query = ''] = url.split('?');
  return [path, new URLSearchParams(query)] as const;
};
const learner = { role: 'taiyari' } as UserProfile;
const admin = { role: 'admin' } as UserProfile;

describe('the phone tab bar', () => {
  it('has five tabs, with the Korean course only for EPS-TOPIK', () => {
    expect(buildMobileTabs('PTE', learner).map(t => t.label)).toEqual(['Home', 'Practice', 'Mocks', 'Videos', 'Me']);
    const eps = buildMobileTabs('EPS_TOPIK', learner);
    expect(eps.find(t => t.id === 'learn')).toMatchObject({ label: 'Learn', href: '/learn' });
  });

  it('sends an admin home to the admin dashboard', () => {
    expect(buildMobileTabs('IELTS', admin)[0]).toMatchObject({ label: 'Admin', href: '/admin' });
    expect(buildMobileTabs('IELTS', learner)[0].href).toBe('/dashboard');
  });

  it.each([
    ['/dashboard', 'home'],
    ['/leaderboard', 'home'],
    [PRACTICE_HUB_HREF, 'practice'],
    ['/practice?skill=speaking&type=read-aloud', 'practice'],
    ['/mistakes', 'practice'],
    // A mock opened through the practice page is still a mock.
    ['/practice?skill=reading&mock=1', 'mocks'],
    ['/mocks?view=full', 'mocks'],
    ['/mocks/pte/report/abc', 'mocks'],
    ['/diagnostic', 'mocks'],
    ['/learn/u1/l2', 'learn'],
    ['/tutorials?skill=writing', 'learn'],
    ['/me', 'me'],
    ['/subscription', 'me'],
    ['/referrals', 'me'],
  ])('lights the right tab on %s', (url, tab) => {
    expect(getMobileTab(...at(url))).toBe(tab);
  });
});

describe('the phone top bar', () => {
  it('treats each tab’s own screen as a root, with no back arrow', () => {
    for (const url of ['/dashboard', PRACTICE_HUB_HREF, '/mocks', '/learn', '/tutorials', '/me', '/admin']) {
      expect(isTabRoot(...at(url))).toBe(true);
    }
  });

  it('gives screens opened from a tab a back arrow', () => {
    for (const url of ['/practice?skill=speaking', '/mocks?tab=reports', '/mocks?view=full', '/profile', '/tutorials?video=x', '/mistakes']) {
      expect(isTabRoot(...at(url))).toBe(false);
    }
  });

  it('titles screens briefly', () => {
    expect(mobileTitle(...at(PRACTICE_HUB_HREF), 'PTE')).toBe('PTE Practice');
    expect(mobileTitle(...at('/practice?skill=writing&type=essay'), 'IELTS')).toBe('Writing');
    expect(mobileTitle(...at('/practice?skill=writing&mock=1'), 'IELTS')).toBe('Mock Test');
    expect(mobileTitle(...at('/mocks?tab=reports'), 'PTE')).toBe('Score Reports');
  });
});

describe('focus screens', () => {
  it('hide the tab bar for lessons, word review and the PTE test runner', () => {
    expect(isFocusRoute('/learn/unit-1/lesson-2')).toBe(true);
    expect(isFocusRoute('/learn/review')).toBe(true);
    expect(isFocusRoute('/mocks/pte/full')).toBe(true);
  });

  it('keep it everywhere else, including a finished PTE report', () => {
    expect(isFocusRoute('/learn')).toBe(false);
    expect(isFocusRoute('/mocks/pte/report/abc')).toBe(false);
    expect(isFocusRoute('/practice')).toBe(false);
  });
});
