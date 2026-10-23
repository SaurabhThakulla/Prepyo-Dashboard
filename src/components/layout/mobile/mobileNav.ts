import { FilePenLine, GraduationCap, Home, LucideIcon, PlayCircle, ShieldCheck, Timer, UserRound } from 'lucide-react';
import { EXAM_LABELS, ExamType, isAdmin, UserProfile } from '@/lib/types';

/**
 * The phone layout's bottom tab bar, and the top bar that goes with it.
 *
 * Like `sidebar/navigation.ts` this file has no JSX: which tab a URL belongs
 * to, which screens are a tab's own root, and which screens hide the bar are
 * all decided here, so they can be tested without rendering anything.
 */

export type MobileTabId = 'home' | 'practice' | 'mocks' | 'learn' | 'me';

export interface MobileTab {
  id: MobileTabId;
  label: string;
  icon: LucideIcon;
  href: string;
}

/** The practice hub: skills and their task types as cards. */
export const PRACTICE_HUB_HREF = '/practice/tasks';
/** The account screen: profile, plan, study tools and settings in one list. */
export const ME_HREF = '/me';

export function buildMobileTabs(activeExam: ExamType, user: UserProfile | null): MobileTab[] {
  const admin = isAdmin(user);
  // Only EPS-TOPIK has the beginner course; for the other exams the same slot
  // holds the video lessons.
  const learn: MobileTab =
    activeExam === 'EPS_TOPIK'
      ? { id: 'learn', label: 'Learn', icon: GraduationCap, href: '/learn' }
      : { id: 'learn', label: 'Videos', icon: PlayCircle, href: '/tutorials' };

  return [
    admin
      ? { id: 'home', label: 'Admin', icon: ShieldCheck, href: '/admin' }
      : { id: 'home', label: 'Home', icon: Home, href: '/dashboard' },
    { id: 'practice', label: 'Practice', icon: FilePenLine, href: PRACTICE_HUB_HREF },
    { id: 'mocks', label: 'Mocks', icon: Timer, href: '/mocks' },
    learn,
    { id: 'me', label: 'Me', icon: UserRound, href: ME_HREF },
  ];
}

const startsWithAny = (path: string, prefixes: string[]) =>
  prefixes.some(prefix => path === prefix || path.startsWith(`${prefix}/`));

/** Which tab a URL belongs to, so the right one is lit wherever you arrive. */
export function getMobileTab(pathname: string, searchParams: URLSearchParams): MobileTabId {
  if (searchParams.get('mock') || searchParams.get('view') === 'full') return 'mocks';
  if (startsWithAny(pathname, ['/mocks', '/diagnostic'])) return 'mocks';
  if (startsWithAny(pathname, ['/practice', '/mistakes'])) return 'practice';
  if (startsWithAny(pathname, ['/learn', '/tutorials', '/videos'])) return 'learn';
  if (startsWithAny(pathname, [ME_HREF, '/profile', '/subscription', '/account', '/referrals', '/reports'])) {
    return 'me';
  }
  return 'home';
}

/**
 * Whether a screen is the top of its tab. Those get a large title and no back
 * arrow; everything else is a screen pushed on top and gets the arrow.
 */
export function isTabRoot(pathname: string, searchParams: URLSearchParams): boolean {
  if (pathname === '/mocks') return !searchParams.get('view') && !searchParams.get('tab');
  if (pathname === '/tutorials') return !searchParams.get('video');
  return ['/', '/home', '/dashboard', '/admin', PRACTICE_HUB_HREF, '/learn', ME_HREF].includes(pathname);
}

/**
 * Screens that take the whole phone, like a lesson in a language app: the tab
 * bar would only invite a tap that ends the attempt, and some of these screens
 * have their own action bar along the bottom.
 */
export function isFocusRoute(pathname: string): boolean {
  if (pathname === '/learn/review') return true;
  if (/^\/learn\/[^/]+\/[^/]+/.test(pathname)) return true; // a lesson
  if (pathname.startsWith('/mocks/pte/') && !pathname.startsWith('/mocks/pte/report/')) return true;
  return false;
}

/** The short title the phone's top bar shows. */
export function mobileTitle(pathname: string, searchParams: URLSearchParams, activeExam: ExamType): string {
  const exam = EXAM_LABELS[activeExam];
  if (pathname === '/' || pathname === '/home' || pathname === '/dashboard') return 'Home';
  if (pathname === PRACTICE_HUB_HREF) return `${exam} Practice`;
  if (pathname.startsWith('/practice')) {
    if (searchParams.get('mistake')) return 'Retry mistake';
    if (searchParams.get('mock')) return 'Mock Test';
    const skill = searchParams.get('skill');
    return skill ? `${skill.charAt(0).toUpperCase()}${skill.slice(1)}` : 'Practice';
  }
  if (pathname.startsWith('/mocks/pte/report/')) return 'Score Report';
  if (pathname.startsWith('/mocks')) {
    if (searchParams.get('tab') === 'reports') return 'Score Reports';
    return searchParams.get('view') === 'full' ? 'Full Mock Test' : 'Mock Tests';
  }
  if (pathname === '/diagnostic') return 'Level check';
  if (pathname === '/learn/review') return 'Review words';
  if (pathname.startsWith('/learn')) return 'Learn Korean';
  if (pathname.startsWith('/tutorials')) return 'Video Lessons';
  if (pathname === ME_HREF) return 'Me';
  if (pathname === '/profile') return 'Profile & Goals';
  if (pathname === '/subscription' || pathname === '/account') return 'Your Plan';
  if (pathname === '/referrals') return 'Earn Rewards';
  if (pathname === '/reports') return 'My Reports';
  if (pathname === '/mistakes' || pathname === '/history') return 'Practice history';
  if (pathname === '/admin') return 'Admin';
  if (pathname === '/admin/payments') return 'Plan Management';
  if (pathname === '/admin/reports') return 'Issue Reports';
  return 'Prepyo';
}
