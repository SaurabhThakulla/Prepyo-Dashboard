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
  RotateCcw,
  History,
  Trophy,
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
import { lessonHref } from '@/data/learnKorean';
import { courseForExam, hasLearnCourse, LearnCourse, lessonCount } from '@/data/learnCourses';
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

export type PrimarySectionId = 'home' | 'practice' | 'learn' | 'mock' | 'tutorials';

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
  { skill: 'speaking', label: 'Speaking', icon: Mic, sublabel: 'Record your answer, get a score' },
  { skill: 'writing', label: 'Writing', icon: PenTool, sublabel: 'Type your answer, get feedback' },
  { skill: 'reading', label: 'Reading', icon: BookOpen, sublabel: 'Read and answer, marked instantly' },
  { skill: 'listening', label: 'Listening', icon: Headphones, sublabel: 'Listen and answer, marked instantly' },
];

/** The admin's Home section: their dashboards. */
function adminHomeSection(): PrimarySectionConfig {
  return {
    id: 'home',
    label: 'Home',
    icon: Home,
    title: 'Admin Hub',
    description: 'Users, plans, reports & consultancies',
    items: [
      { href: '/admin', label: 'Admin Dashboard', icon: ShieldCheck, sublabel: 'Users, plans & platform metrics', badge: 'Admin' },
      { href: '/admin/payments', label: 'Plan Management', icon: CreditCard, sublabel: 'Approve payments and grant plans', badge: 'Admin' },
      { href: '/admin/reports', label: 'Issue reports', icon: MessageSquareWarning, sublabel: 'What learners have reported', badge: 'Admin' },
      { href: '/admin/consultancies', label: 'Consultancies', icon: Building2, sublabel: 'Institutions, students & usage', badge: 'Admin' },
    ],
  };
}

/** Which primary section a URL belongs to. */
export function getSectionFromPathname(path: string, searchParams?: URLSearchParams | string): PrimarySectionId {
  const params = typeof searchParams === 'string' ? new URLSearchParams(searchParams) : searchParams;
  if (params?.get('mock') || params?.get('view') === 'full') return 'mock';
  if (path.startsWith('/admin')) return 'home';
  if (path.startsWith('/practice')) return 'practice';
  if (path.startsWith('/learn')) return 'learn';
  if (path.startsWith('/mocks') || path.startsWith('/diagnostic') || path.startsWith('/institute-mock')) return 'mock';
  if (path.startsWith('/tutorials') || path.startsWith('/videos')) return 'tutorials';
  return 'practice';
}

/**
 * The whole menu. Depends on the active exam because the practice section is
 * generated from that exam's syllabus.
 *
 * `onOpenTutor` is no longer used: the AI tutor opens from the question screens.
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
  // EPS-TOPIK and JLPT have no sectional mocks yet; their full mocks are to come.
  const isLanguageExam = activeExam === 'EPS_TOPIK' || activeExam === 'JLPT';

  return [
    // Admins keep their Home section; learners reach their dashboard from the logo.
    ...(isAdmin(user ?? null) ? [adminHomeSection()] : []),
    {
      id: 'practice',
      label: 'Practice',
      icon: FilePenLine,
      title: isPTE
        ? (pteVariant === 'core' ? 'PTE Core Practice Studio' : 'PTE Academic Practice Studio')
        : `${EXAM_LABELS[activeExam]} Practice Studio`,
      description: 'Practise one task type at a time',
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
          skill === 'reading' && availableReadingTypes && !isLanguageExam
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

        // Sectional mock tests live only in the Mock sidebar.
        return links;
      }),
    },
    // The beginner courses start from the alphabet: Korean for EPS-TOPIK,
    // Japanese for JLPT. The other exams have none.
    ...(hasLearnCourse(activeExam) ? [learnSection(learnProgress, courseForExam(activeExam))] : []),
    {
      id: 'mock',
      label: 'Mock',
      icon: Timer,
      title: 'Mock Exam Simulator',
      description: 'Timed full exams with scorecards',
      items: [
        // An institution's students see the tests their institution sets them first.
        ...(!isLanguageExam && user?.institution
          ? [{ href: '/institute-mock', label: 'Institute Mock', icon: ClipboardCheck, sublabel: `Tests set by ${user.institution.name}` }]
          : []),
        ...(isLanguageExam ? [] : isPTE ? pteMockItems(pteVariant) : ieltsMockItems()),
        {
          href: '/diagnostic',
          label: 'Level check',
          icon: Gauge,
          sublabel: 'Find your starting level',
          badge: '15 Min',
          group: 'Results',
        },
        {
          href: '/mocks?tab=reports',
          label: 'My mock results',
          icon: ChartColumn,
          sublabel: 'Scores from tests you took',
          group: 'Results',
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
          label: 'All videos',
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
      label: 'All mock tests',
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
      sublabel: 'Academic passages, timed and auto-graded',
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
      label: 'All mock tests',
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
 * A beginner course: the path first, then one heading per unit with its
 * lessons under it, the way Practice lists skills and their task types. Each
 * lesson shows whether it is done, open or still locked.
 */
function learnSection(progress: LearnProgress, course: LearnCourse): PrimarySectionConfig {
  const total = lessonCount(course);
  const done = Object.keys(progress.completed).length;
  return {
    id: 'learn',
    label: 'Learn',
    icon: GraduationCap,
    title: course.title,
    description: course.tagline,
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
        sublabel: reviewSublabel(progress, course),
      },
      ...course.units.flatMap(unit =>
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

function reviewSublabel(progress: LearnProgress, course: LearnCourse): string {
  const known = learnedWords(progress, course.units).length;
  if (known < 4) return 'Opens once you have learned a few words';
  const due = dueCount(progress, new Date(), course.units);
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
