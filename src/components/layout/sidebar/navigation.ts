import {
  Home,
  Building2,
  Mic,
  PenTool,
  FilePenLine,
  BookOpen,
  BookOpenCheck,
  Headphones,
  Timer,
  ClipboardCheck,
  Gauge,
  ChartColumn,
  Sparkles,
  RotateCcw,
  History,
  Trophy,
  Bot,
  HelpCircle,
  CreditCard,
  MessageSquareWarning,
  ShieldCheck,
  Video,
  Tv,
  GraduationCap,
  Route,
  CheckCircle2,
  Lock,
  PlayCircle,
  LucideIcon,
} from 'lucide-react';
import { COURSE, lessonHref } from '@/data/learnKorean';
import { dueCount, EMPTY_PROGRESS, LearnProgress, learnedWords, lessonState } from '@/lib/learn/progress';
import { SYLLABUS, syllabusFor, taskSummary, typeKey } from '@/lib/syllabus';
import { typeIdsFor } from '@/lib/readingTypes';
import { EXAM_LABELS, ExamType, ieltsModuleOf, isAdmin, SkillType, skillsFor, UserProfile } from '@/lib/types';
import { PTE_MOCK_KINDS, pteMockHref } from '@/lib/pteMock/catalog';
import { getPteTaskWeight, getPteTaskContributions, isPteTaskAvailable, getPteTaskLockedReason, PteExamVariant, PteSkillContribution } from '@/lib/pteExamConfig';

/**
 * What goes in the sidebar, and which item is highlighted.
 *
 * This file has no JSX in it. The shape of the menu is data, so you can add a
 * link or change a label without touching any rendering code.
 */

export type PrimarySectionId = 'home' | 'practice' | 'learn' | 'aicoach' | 'mock' | 'tutorials';

export interface SecondaryNavItem {
  href?: string;
  onClick?: () => void;
  label: string;
  icon: LucideIcon;
  sublabel?: string;
  /** What the task asks for, in one line. The phone's practice hub shows it. */
  description?: string;
  badge?: string;
  count?: number;
  /** Starts a labelled run of items in the panel. Consecutive items sharing a
   *  group sit under one heading; ungrouped items lead the list. */
  group?: string;
  /** Makes the group heading itself a link — used by the skill headings, so
   *  "Reading" still opens reading practice without picking a task type. */
  groupHref?: string;
  /** Score weight shown alongside the task in the secondary sidebar (e.g. "16%", "4%"). */
  weight?: string;
  /** Share of each skill score the task makes up; shown instead of `weight`. */
  contributions?: PteSkillContribution[];
  /** Set when a task is not part of the active exam/variant. */
  isLocked?: boolean;
  /** Why the task is locked, e.g. "PTE Academic only". */
  lockedReason?: string;
}

export interface PrimarySectionConfig {
  id: PrimarySectionId;
  label: string;
  icon: LucideIcon;
  title: string;
  description: string;
  items: SecondaryNavItem[];
}

export const READING_PRACTICE_HREF = '/practice?skill=reading';
export const READING_MOCK_HREF = `${READING_PRACTICE_HREF}&mock=1`;
export const SPEAKING_MOCK_HREF = '/practice?skill=speaking&mock=1';
export const WRITING_MOCK_HREF = '/practice?skill=writing&mock=1';
export const LISTENING_MOCK_HREF = '/practice?skill=listening&mock=1';

/** The practice skills, in the order they head the secondary panel. */
const PRACTICE_SKILLS: { skill: SkillType; label: string; icon: LucideIcon; sublabel: string }[] = [
  { skill: 'speaking', label: 'Speaking', icon: Mic, sublabel: 'Recorded answer, scored from the transcript' },
  { skill: 'writing', label: 'Writing', icon: PenTool, sublabel: 'Written answer with rubric feedback' },
  { skill: 'reading', label: 'Reading', icon: BookOpen, sublabel: 'Passage questions, graded on the server' },
  { skill: 'listening', label: 'Listening', icon: Headphones, sublabel: 'Audio questions, graded on the server' },
];

/** Which primary section a URL belongs to. */
export function getSectionFromPathname(path: string, searchParams?: URLSearchParams | string): PrimarySectionId {
  const params = typeof searchParams === 'string' ? new URLSearchParams(searchParams) : searchParams;
  if (params?.get('mock') || params?.get('view') === 'full') return 'mock';
  if (path.startsWith('/practice')) return 'practice';
  if (path.startsWith('/learn')) return 'learn';
  if (path.startsWith('/mocks') || path.startsWith('/diagnostic')) return 'mock';
  if (path.startsWith('/evaluations')) return 'aicoach';
  if (path.startsWith('/tutorials') || path.startsWith('/videos')) return 'tutorials';
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
  hasMistake = false,
  learnProgress: LearnProgress = EMPTY_PROGRESS,
  pteVariant: PteExamVariant = 'academic',
): PrimarySectionConfig[] {
  const isPTE = activeExam === 'PTE';
  // EPS-TOPIK has no sectional mocks yet; its full 40-question mock is to come.
  const isEPS = activeExam === 'EPS_TOPIK';

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
              label: 'Plan Management',
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
              {
                href: '/admin/consultancies',
                label: 'Consultancies',
                icon: Building2,
                sublabel: 'Institutions, students & usage',
                badge: 'Admin',
              },
            ]
          : []),
        {
          href: '/history',
          label: 'History Bank',
          icon: History,
          sublabel: 'All questions you have practiced',
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
      icon: FilePenLine,
      title: isPTE
        ? (pteVariant === 'core' ? 'PTE Core Practice Studio' : 'PTE Academic Practice Studio')
        : `${EXAM_LABELS[activeExam]} Practice Studio`,
      description: 'Exam-format tasks & AI rubric feedback',
      // One heading per skill, one item per task type underneath — the exam's
      // own shape, straight from the syllabus, so PTE and IELTS each list their
      // own tasks and a change there needs no edit here.
      items: PRACTICE_SKILLS.flatMap(({ skill, label, icon, sublabel }) => {
        // Admins author both IELTS modules' tasks; a learner sees their own.
        const rawNames = isAdmin(user ?? null)
          ? SYLLABUS[activeExam][skill] ?? []
          : syllabusFor(activeExam, skill, ieltsModuleOf(user));
        const isRepeatedEssay = (n: string) => /repeated\s*essay/i.test(n);
        // Writing and speaking answers are marked by AI; reading and listening are marked in code.
        const aiBadge = skill === 'writing' || skill === 'speaking' ? 'AI' : undefined;
        const names = rawNames.filter(name => {
          if (isRepeatedEssay(name)) {
            return hasMistake;
          }
          return true;
        });

        if (isAdmin(user ?? null)) {
          return names.map(name => {
            const pteWeight = isPTE ? getPteTaskWeight(pteVariant, name) : undefined;
            const pteAvailable = isPTE ? isPteTaskAvailable(pteVariant, name) : true;
            const pteLockedReason = isPTE && !pteAvailable ? getPteTaskLockedReason(pteVariant, name) : undefined;
            return {
              href: `/practice?skill=${skill}&type=${typeKey(name)}`,
              label: name,
              icon,
              sublabel: pteLockedReason ?? `Author questions for ${name}`,
              description: taskSummary(activeExam, skill, name),
              badge: !pteAvailable ? (pteVariant === 'core' ? 'PTEA' : 'CORE') : aiBadge,
              group: label,
              groupHref: `/practice?skill=${skill}`,
              weight: pteWeight,
              contributions: isPTE ? getPteTaskContributions(pteVariant, name) : undefined,
              isLocked: !pteAvailable,
              lockedReason: pteLockedReason,
            };
          });
        }

        // Reading is the one skill whose bank can be empty behind a heading, so
        // its links are checked against what the server will actually deal.
        // Undefined means the answer has not arrived yet: show everything
        // rather than blink the menu down to nothing and back.
        // EPS-TOPIK reading is not on passages, so the passage bank says
        // nothing about it.
        const offered =
          skill === 'reading' && availableReadingTypes && !isEPS
            ? names.filter(name =>
                typeIdsFor(typeKey(name)).some(id => availableReadingTypes.includes(id)),
              )
            : names;

        const links: SecondaryNavItem[] = offered.map(name => {
          const pteWeight = isPTE ? getPteTaskWeight(pteVariant, name) : undefined;
          const pteAvailable = isPTE ? isPteTaskAvailable(pteVariant, name) : true;
          const pteLockedReason = isPTE && !pteAvailable ? getPteTaskLockedReason(pteVariant, name) : undefined;
          return {
            href: `/practice?skill=${skill}&type=${typeKey(name)}`,
            label: name,
            icon,
            sublabel: pteLockedReason ?? sublabel,
            description: taskSummary(activeExam, skill, name),
            badge: !pteAvailable ? (pteVariant === 'core' ? 'PTEA' : 'CORE') : aiBadge,
            group: label,
            groupHref: `/practice?skill=${skill}`,
            weight: pteWeight,
            contributions: isPTE ? getPteTaskContributions(pteVariant, name) : undefined,
            isLocked: !pteAvailable,
            lockedReason: pteLockedReason,
          };
        });

        // Mock tests sit under the same heading as the practice tasks for each skill.
        // PTE runs every sectional test on its own test player. The IELTS mocks
        // below are IELTS papers, so an EPS-TOPIK heading lists practice only.
        if (isEPS) return links;
        if (isPTE && links.length > 0) {
          links.push({
            href: pteMockHref(skill),
            label: `${label} Sectional Test`,
            icon: BookOpenCheck,
            sublabel: 'Timed, in test order, scored 10-90',
            badge: 'MOCK',
            group: label,
            groupHref: `/practice?skill=${skill}`,
          });
        } else if (skill === 'reading' && mockPassageCount > 0 && links.length > 0) {
          links.push({
            href: READING_MOCK_HREF,
            label: 'Reading Mock Test',
            icon: BookOpenCheck,
            sublabel: `${mockPassageCount} full passages, timed and graded on the server`,
            badge: 'MOCK',
            group: label,
            groupHref: `/practice?skill=${skill}`,
          });
        } else if (skill === 'speaking' && links.length > 0) {
          links.push({
            href: SPEAKING_MOCK_HREF,
            label: 'Speaking Mock Test',
            icon: BookOpenCheck,
            sublabel: 'Full speaking section, timed and evaluated',
            badge: 'MOCK',
            group: label,
            groupHref: `/practice?skill=${skill}`,
          });
        } else if (skill === 'writing' && links.length > 0) {
          links.push({
            href: WRITING_MOCK_HREF,
            label: 'Writing Mock Test',
            icon: BookOpenCheck,
            sublabel: 'Full writing tasks, timed and evaluated',
            badge: 'MOCK',
            group: label,
            groupHref: `/practice?skill=${skill}`,
          });
        } else if (skill === 'listening' && links.length > 0) {
          links.push({
            href: LISTENING_MOCK_HREF,
            label: 'Listening Mock Test',
            icon: BookOpenCheck,
            sublabel: 'Full listening section, timed and graded',
            badge: 'MOCK',
            group: label,
            groupHref: `/practice?skill=${skill}`,
          });
        }

        return links;
      }),
    },
    // The beginner course is Korean from the alphabet up, so only EPS-TOPIK has it.
    ...(isEPS ? [learnSection(learnProgress)] : []),
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
      label: 'Mock',
      icon: Timer,
      title: 'Mock Exam Simulator',
      description: 'Timed full exams with scorecards',
      items: [
        ...(isEPS ? [] : isPTE ? pteMockItems(pteVariant) : ieltsMockItems()),
        {
          href: '/diagnostic',
          label: 'Diagnostic Test',
          icon: Gauge,
          sublabel: 'Short initial baseline test',
          badge: '15 Min',
          group: 'Results & Baseline',
        },
        {
          href: '/mocks?tab=reports',
          label: 'Mock Score Reports',
          icon: ChartColumn,
          sublabel: 'Review previous exam scores',
          group: 'Results & Baseline',
        },
      ],
    },
    {
      id: 'tutorials',
      label: 'Tutorials',
      icon: Video,
      title: `${EXAM_LABELS[activeExam]} Video Tutorials`,
      description: 'Masterclass video lessons for every section',
      items: [
        {
          href: '/tutorials',
          label: `${EXAM_LABELS[activeExam]} Video Hub`,
          icon: Tv,
          sublabel: 'All sections & video masterclasses',
        },
        ...[
        {
          href: '/tutorials?skill=speaking',
          label: 'Speaking Lessons',
          icon: Mic,
          sublabel: 'Pronunciation, fluency & answer structures',
          group: 'Section Lessons',
        },
        {
          href: '/tutorials?skill=writing',
          label: 'Writing Lessons',
          icon: PenTool,
          sublabel: 'Task templates, essay structures & grammar',
          group: 'Section Lessons',
        },
        {
          href: '/tutorials?skill=reading',
          label: 'Reading Lessons',
          icon: BookOpen,
          sublabel: 'Skimming, scanning & tricky question tricks',
          group: 'Section Lessons',
        },
        {
          href: '/tutorials?skill=listening',
          label: 'Listening Lessons',
          icon: Headphones,
          sublabel: 'Accent practice, note-taking & trap avoidance',
          group: 'Section Lessons',
        },
        ].filter(item => skillsFor(activeExam).some(skill => item.href.endsWith(`skill=${skill}`))),
      ],
    },
  ];
}

/**
 * The IELTS mock tests in three groups: full test simulator, sectional tests
 * for each skill, and results. Mirrors the PTE mock menu layout.
 */
function ieltsMockItems(): SecondaryNavItem[] {
  return [
    {
      href: '/mocks',
      label: 'IELTS Mock Test Centre',
      icon: Timer,
      sublabel: 'Every test, your progress and results',
    },
    {
      href: '/mocks?view=full',
      label: 'Full Mock Test',
      icon: ClipboardCheck,
      sublabel: 'All four skills with an overall band',
      badge: '3h',
      group: 'Full Mock Test',
    },
    {
      href: SPEAKING_MOCK_HREF,
      label: 'Speaking Test',
      icon: Mic,
      sublabel: 'Full speaking interview, evaluated by AI',
      group: 'Sectional Tests',
    },
    {
      href: WRITING_MOCK_HREF,
      label: 'Writing Test',
      icon: PenTool,
      sublabel: 'Task 1 & Task 2 with rubric feedback',
      group: 'Sectional Tests',
    },
    {
      href: READING_MOCK_HREF,
      label: 'Reading Test',
      icon: BookOpen,
      sublabel: 'Academic / GT passages, timed and auto-graded',
      group: 'Sectional Tests',
    },
    {
      href: LISTENING_MOCK_HREF,
      label: 'Listening Test',
      icon: Headphones,
      sublabel: 'Full listening section, timed and auto-graded',
      group: 'Sectional Tests',
    },
  ];
}

/**
 * The PTE mock tests, in the two groups a learner chooses between: the whole
 * test, or one section of it. The mock centre (/mocks) heads the list.
 */
function pteMockItems(variant: PteExamVariant = 'academic'): SecondaryNavItem[] {
  const isCore = variant === 'core';
  return [
    {
      href: '/mocks',
      label: isCore ? 'PTE Core Mock Centre' : 'PTE Mock Test Centre',
      icon: Timer,
      sublabel: `Every ${isCore ? 'PTE Core' : 'PTE Academic'} test, your progress and results`,
    },
    ...PTE_MOCK_KINDS.map(meta => ({
      href: pteMockHref(meta.kind),
      label: meta.kind === 'full'
        ? (isCore ? 'PTE Core Full Mock' : 'Full Mock Test')
        : `${meta.shortLabel} Test`,
      icon: meta.icon,
      sublabel: isCore && meta.kind === 'full'
        ? 'All three parts, timed for PTE Core, scored 10-90'
        : meta.blurb,
      badge: meta.kind === 'full' ? '2h' : undefined,
      group: meta.kind === 'full' ? 'Full Mock Test' : 'Sectional Tests',
    })),
  ];
}

/**
 * The beginner Korean course: the path first, then one heading per unit with
 * its lessons under it, the way Practice lists skills and their task types.
 * Each lesson shows whether it is done, open or still locked.
 */
function learnSection(progress: LearnProgress): PrimarySectionConfig {
  const total = COURSE.reduce((sum, unit) => sum + unit.lessons.length, 0);
  const done = Object.keys(progress.completed).length;
  return {
    id: 'learn',
    label: 'Learn',
    icon: GraduationCap,
    title: 'Learn Korean',
    description: 'Hangul to exam-ready, one small lesson at a time',
    items: [
      {
        href: '/learn',
        label: 'My Path',
        icon: Route,
        sublabel: `${progress.xp} XP · ${done} of ${total} lessons done`,
      },
      {
        href: '/learn/review',
        label: 'Review words',
        icon: RotateCcw,
        sublabel: reviewSublabel(progress),
      },
      ...COURSE.flatMap(unit =>
        unit.lessons.map((lesson, i): SecondaryNavItem => {
          const state = lessonState(progress, unit, i);
          return {
            href: lessonHref(unit.id, lesson.id),
            label: lesson.title,
            icon: state === 'done' ? CheckCircle2 : state === 'locked' ? Lock : PlayCircle,
            sublabel: state === 'locked' ? `Locked · finish “${unit.lessons[i - 1].title}” first` : lesson.summary,
            badge: state === 'done' ? 'Done' : undefined,
            group: `Unit ${unit.number} · ${unit.title}`,
            groupHref: `/learn?unit=${unit.id}`,
          };
        }),
      ),
    ],
  };
}

function reviewSublabel(progress: LearnProgress): string {
  const known = learnedWords(progress).length;
  if (known < 4) return 'Opens once you have learned a few words';
  const due = dueCount(progress);
  return due > 0 ? `${due} of ${known} words due` : `All ${known} words fresh`;
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

  if (item.href.startsWith('/tutorials')) {
    if (pathname !== '/tutorials') return false;
    const itemSkill = item.href.includes('skill=') ? item.href.split('skill=')[1]?.split('&')[0] : null;
    const currentSkill = searchParams.get('skill');
    if (!itemSkill) return !currentSkill;
    return itemSkill === currentSkill;
  }

  if (item.href.includes('view=')) {
    const itemView = item.href.split('view=')[1]?.split('&')[0];
    return pathname === item.href.split('?')[0] && searchParams.get('view') === itemView;
  }

  if (item.href.includes('skill=')) {
    const itemSkill = item.href.split('skill=')[1]?.split('&')[0];
    const itemType = item.href.split('type=')[1]?.split('&')[0] ?? null;
    const itemMock = item.href.split('mock=')[1]?.split('&')[0] ?? null;
    const currentSkill = searchParams.get('skill') || (pathname === '/practice' ? 'speaking' : null);
    return (
      pathname === '/practice' &&
      currentSkill === itemSkill &&
      itemType === searchParams.get('type') &&
      itemMock === searchParams.get('mock')
    );
  }

  if (item.href.includes('tab=')) {
    const itemTab = item.href.split('tab=')[1]?.split('&')[0];
    return pathname === item.href.split('?')[0] && (searchParams.get('tab') || 'catalog') === itemTab;
  }

  if (item.href === '/mocks') {
    return (
      pathname === '/mocks' &&
      (searchParams.get('tab') || 'catalog') === 'catalog' &&
      !searchParams.get('view')
    );
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
