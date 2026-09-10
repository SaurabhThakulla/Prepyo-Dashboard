import {
  Home,
  Zap,
  Mic,
  PenTool,
  BookOpen,
  Headphones,
  Award,
  Sparkles,
  RotateCcw,
  Trophy,
  Bot,
  HelpCircle,
  FileText,
  CreditCard,
  MessageSquareWarning,
  ShieldCheck,
  LucideIcon,
} from 'lucide-react';
import { SYLLABUS, typeKey } from '@/lib/syllabus';
import { typeIdsFor } from '@/lib/readingTypes';
import { ExamType, isAdmin, SkillType, UserProfile } from '@/lib/types';

/**
 * What goes in the sidebar, and which item is highlighted.
 *
 * This file has no JSX in it. The shape of the menu is data, so you can add a
 * link or change a label without touching any rendering code.
 */

export type PrimarySectionId = 'home' | 'practice' | 'aicoach' | 'mock';

export interface SecondaryNavItem {
  href?: string;
  onClick?: () => void;
  label: string;
  icon: LucideIcon;
  sublabel?: string;
  badge?: string;
  count?: number;
  /** Starts a labelled run of items in the panel. Consecutive items sharing a
   *  group sit under one heading; ungrouped items lead the list. */
  group?: string;
  /** Makes the group heading itself a link — used by the skill headings, so
   *  "Reading" still opens reading practice without picking a task type. */
  groupHref?: string;
}

export interface PrimarySectionConfig {
  id: PrimarySectionId;
  label: string;
  icon: LucideIcon;
  title: string;
  description: string;
  items: SecondaryNavItem[];
}

/** The practice skills, in the order they head the secondary panel. */
const PRACTICE_SKILLS: { skill: SkillType; label: string; icon: LucideIcon; sublabel: string }[] = [
  { skill: 'speaking', label: 'Speaking', icon: Mic, sublabel: 'Recorded answer, scored from the transcript' },
  { skill: 'writing', label: 'Writing', icon: PenTool, sublabel: 'Written answer with rubric feedback' },
  { skill: 'reading', label: 'Reading', icon: BookOpen, sublabel: 'Passage questions, graded on the server' },
  { skill: 'listening', label: 'Listening', icon: Headphones, sublabel: 'Audio questions, graded on the server' },
];

/** Which primary section a URL belongs to. */
export function getSectionFromPathname(path: string): PrimarySectionId {
  if (path.startsWith('/practice')) return 'practice';
  if (path.startsWith('/mocks') || path.startsWith('/diagnostic')) return 'mock';
  if (path.startsWith('/evaluations')) return 'aicoach';
  return 'home';
}

/**
 * The whole menu. Depends on the active exam because the practice section is
 * generated from that exam's syllabus.
 *
 * `onOpenTutor` is passed in rather than imported so this stays free of React
 * context and can be unit tested.
 */
export function buildSections(
  activeExam: ExamType,
  onOpenTutor: () => void,
  user?: UserProfile | null,
  availableReadingTypes?: string[],
  mockPassageCount = 0,
): PrimarySectionConfig[] {
  const isPTE = activeExam === 'PTE';

  return [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      title: 'Learner Hub',
      description: 'Progress, study resources & recent activity',
      items: [
        // An admin has no practice history of their own, so the learner's
        // score breakdown would be an empty page. They get the dashboard they
        // actually work from instead.
        isAdmin(user ?? null)
          ? {
              href: '/admin',
              label: 'Admin Dashboard',
              icon: ShieldCheck,
              sublabel: 'Users, plans & platform metrics',
              badge: 'Admin',
            }
          : {
              href: '/dashboard',
              label: 'Home Overview',
              icon: Home,
              sublabel: 'Target gaps & score breakdown',
            },
        // An admin has no plan of their own to look at. The equivalent page for
        // them is everyone else's purchases waiting to be approved.
        isAdmin(user ?? null)
          ? {
              href: '/admin/payments',
              label: 'Purchase requests',
              icon: CreditCard,
              sublabel: 'Approve payments and grant plans',
              badge: 'Admin',
            }
          : {
              href: '/subscription',
              label: 'Your Current Plan',
              icon: CreditCard,
              sublabel: user?.subscription?.planName
                ? `${user.subscription.planName} · ${user.subscription.isActive ? 'Active' : 'Expired'}`
                : 'Plan tier, quotas & billing',
              badge: user?.subscription?.isActive ? 'Active' : 'Free',
            },
        ...(isAdmin(user ?? null)
          ? [
              {
                href: '/admin/reports',
                label: 'Issue reports',
                icon: MessageSquareWarning,
                sublabel: 'What learners have reported',
                badge: 'Admin',
              },
            ]
          : []),
        {
          href: '/mistakes',
          label: 'Mistake Bank',
          icon: RotateCcw,
          sublabel: 'Retry saved weak questions',
          group: 'Study Resources',
        },
        {
          href: '/leaderboard',
          label: 'Nepal Study Challenge',
          icon: Trophy,
          sublabel: 'Compete with peers in Nepal',
          group: 'Study Resources',
        },
      ],
    },
    {
      id: 'practice',
      label: 'Practice',
      icon: PenTool,
      title: `${activeExam} Practice Studio`,
      description: 'Official test modules & AI rubric',
      // One heading per skill, one item per task type underneath — the exam's
      // own shape, straight from the syllabus, so PTE and IELTS each list their
      // own tasks and a change there needs no edit here.
      items: PRACTICE_SKILLS.flatMap(({ skill, label, icon, sublabel }) => {
        // The reading section is where an admin adds content rather than sits
        // it, so the task-type links are replaced by the one thing that page
        // does for them. Every other skill still lists its tasks.
        if (skill === 'reading' && isAdmin(user ?? null)) {
          return [
            {
              href: '/practice?skill=reading',
              label: 'Add passage & questions',
              icon: ShieldCheck,
              sublabel: 'Author a reading passage and its task sets',
              badge: 'Admin',
              group: label,
              groupHref: '/practice?skill=reading',
            },
          ];
        }

        // Reading is the one skill whose bank can be empty behind a heading, so
        // its links are checked against what the server will actually deal.
        // Undefined means the answer has not arrived yet: show everything
        // rather than blink the menu down to nothing and back.
        const names = SYLLABUS[activeExam][skill] ?? [];
        const offered =
          skill === 'reading' && availableReadingTypes
            ? names.filter(name =>
                typeIdsFor(typeKey(name)).some(id => availableReadingTypes.includes(id)),
              )
            : names;

        const links: SecondaryNavItem[] = offered.map(name => ({
          href: `/practice?skill=${skill}&type=${typeKey(name)}`,
          label: name,
          icon,
          sublabel,
          group: label,
          groupHref: `/practice?skill=${skill}`,
        }));

        // The generated reading paper sits under the same heading as the tasks
        // it is built from, because a learner works up to it from them. It is
        // only offered once the bank can actually deal one.
        if (skill === 'reading' && mockPassageCount > 0 && links.length > 0) {
          links.push({
            href: `/mocks?start=mock-${activeExam.toLowerCase()}-reading-gen`,
            label: 'Reading Mock Test',
            icon: Award,
            sublabel: `${mockPassageCount} full passages, timed and graded on the server`,
            badge: 'MOCK',
            group: label,
            groupHref: `/practice?skill=${skill}`,
          });
        }

        return links;
      }),
    },
    {
      id: 'aicoach',
      label: 'AI Coach',
      icon: Bot,
      title: 'Prepyo AI Tutor',
      description: '24/7 intelligent tutoring & coaching',
      items: [
        {
          onClick: onOpenTutor,
          label: 'AI Chat Coach',
          icon: Bot,
          sublabel: 'Open live tutoring assistant',
          badge: 'Live',
        },
        {
          href: '/evaluations',
          label: 'AI Evaluator Lab',
          icon: Sparkles,
          sublabel: 'Detailed rubric feedback',
        },
        {
          onClick: onOpenTutor,
          label: 'Practice Help',
          icon: HelpCircle,
          sublabel: 'In-context question guidance',
        },
      ],
    },
    {
      id: 'mock',
      label: 'Mock Exam',
      icon: Award,
      title: 'Mock Exam Simulator',
      description: 'Timed full exams with scorecards',
      items: [
        {
          href: '/mocks',
          label: 'Full Mock Simulator',
          icon: Award,
          sublabel: isPTE ? '2-Hour scored PTE simulation' : 'Full band IELTS simulation',
          badge: '2h Full',
        },
        {
          href: '/diagnostic',
          label: 'Diagnostic Test',
          icon: Zap,
          sublabel: 'Short initial baseline test',
          badge: '15 Min',
        },
        {
          href: '/mocks?tab=reports',
          label: 'Mock Score Reports',
          icon: FileText,
          sublabel: 'Review previous exam scores',
        },
      ],
    },
  ];
}

/**
 * Whether a nav item points at the page you are currently on.
 *
 * Most items are a plain path match. The exceptions are items whose href
 * carries a query string, because several of them share one path:
 *
 *   /practice?skill=reading&type=x   — skill AND type must match, or every
 *                                      task type under a skill lights up at once
 *   /mocks?tab=reports               — tab must match; no tab means "catalog"
 */
export function isNavItemActive(
  item: SecondaryNavItem,
  pathname: string,
  searchParams: URLSearchParams,
): boolean {
  if (!item.href) return false;

  if (item.href.includes('skill=')) {
    const itemSkill = item.href.split('skill=')[1]?.split('&')[0];
    const itemType = item.href.split('type=')[1]?.split('&')[0] ?? null;
    const currentSkill = searchParams.get('skill') || (pathname === '/practice' ? 'speaking' : null);
    return pathname === '/practice' && currentSkill === itemSkill && itemType === searchParams.get('type');
  }

  if (item.href.includes('tab=')) {
    const itemTab = item.href.split('tab=')[1]?.split('&')[0];
    return pathname === item.href.split('?')[0] && (searchParams.get('tab') || 'catalog') === itemTab;
  }

  if (item.href === '/mocks') {
    return pathname === '/mocks' && (searchParams.get('tab') || 'catalog') === 'catalog';
  }

  // Pairs of routes that mean the same place to a learner.
  if (item.href === '/home' || item.href === '/dashboard') {
    return pathname === '/home' || pathname === '/dashboard';
  }
  if (item.href === '/subscription' || item.href === '/account') {
    return pathname === '/subscription' || pathname === '/account';
  }

  return pathname === item.href;
}
