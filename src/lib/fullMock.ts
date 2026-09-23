import { SkillType } from '@/lib/types';

/**
 * The IELTS full mock: the four section mocks as one test, taken in the order
 * of the test, with an overall band. Mirrors internal/fullmock on the server.
 */
export type FullMockSkill = Extract<SkillType, 'listening' | 'reading' | 'writing' | 'speaking'>;

export type FullMockSectionStatus = 'not_started' | 'in_progress' | 'submitted' | 'closed';

export interface FullMockSectionState {
  skill: FullMockSkill;
  sessionId?: string;
  status: FullMockSectionStatus;
  band: number | null;
}

export interface FullMockSession {
  id: string;
  module: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  /** The section the learner is on; absent once all four are done. */
  stage?: FullMockSkill;
  sections: FullMockSectionState[];
  overallBand: number | null;
  attemptId?: string;
  createdAt: string;
  completedAt?: string;
}

/** How a section mock runs inside a full mock rather than on its own. */
export interface FullMockSection<S> {
  /** The paper the full mock dealt for this section. */
  session: S;
  /** The section is over: submitted, or closed without a result. */
  onSubmitted: () => void;
  /** Leaves the full mock; the section stays open to resume. */
  onLeave: () => void;
}

export const FULL_MOCK_SECTIONS: { skill: FullMockSkill; label: string; timing: string; about: string }[] = [
  {
    skill: 'listening',
    label: 'Listening',
    timing: 'about 30 minutes, plus 2 minutes to check',
    about: 'Four recordings, each heard once, and 40 questions.',
  },
  {
    skill: 'reading',
    label: 'Reading',
    timing: '60 minutes',
    about: 'Three sections and 40 questions.',
  },
  {
    skill: 'writing',
    label: 'Writing',
    timing: '60 minutes',
    about: 'Task 1 and Task 2; Task 2 counts twice as much.',
  },
  {
    skill: 'speaking',
    label: 'Speaking',
    timing: '11 to 14 minutes',
    about: 'Three parts with the examiner, recorded. You can take it later, as IELTS allows.',
  },
];

export function sectionLabel(skill: FullMockSkill): string {
  return FULL_MOCK_SECTIONS.find(section => section.skill === skill)?.label ?? skill;
}

/** Full mocks left in the plan; Infinity when unlimited. */
export function fullMocksLeft(sub?: { unlimited?: boolean; totalMockTestsAllowed: number; mockTestsUsed: number } | null): number {
  if (!sub) return 0;
  if (sub.unlimited) return Number.POSITIVE_INFINITY;
  return Math.max(0, (sub.totalMockTestsAllowed ?? 0) - (sub.mockTestsUsed ?? 0));
}
