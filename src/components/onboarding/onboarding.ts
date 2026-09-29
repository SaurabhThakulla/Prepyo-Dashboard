import { EXAM_LABELS, ExamType, SkillType, UserProfile, isAdmin } from '@/lib/types';

export type StudyGoal = NonNullable<UserProfile['studyGoal']>;
export type Destination = NonNullable<UserProfile['destination']>;

export function shouldShowOnboarding(user: UserProfile | null): boolean {
  if (!user || isAdmin(user)) return false;
  return user.onboardingCompletedAt === null;
}

export interface ScoreScale {
  min: number;
  max: number;
  step: number;
  presets: number[];
  fallback: number;
}

export const SCORE_SCALE: Record<ExamType, ScoreScale> = {
  IELTS: { min: 4, max: 9, step: 0.5, presets: [6, 6.5, 7, 7.5], fallback: 6.5 },
  PTE: { min: 30, max: 90, step: 1, presets: [50, 58, 65, 79], fallback: 65 },
  // 40 items at 2.5 points. HRD Korea's minimum scores are 30 (fishery), 45
  // (most industries) and 60 (manufacturing); above that, places go by rank.
  EPS_TOPIK: { min: 30, max: 100, step: 2.5, presets: [45, 60, 70, 80], fallback: 60 },
};

export function clampScore(exam: ExamType, score: number): number {
  const { min, max, step } = SCORE_SCALE[exam];
  const snapped = Math.round(score / step) * step;
  return Math.min(max, Math.max(min, snapped));
}

export const formatScore = (exam: ExamType, score: number) => {
  if (exam === 'IELTS') return score.toFixed(1);
  // EPS-TOPIK moves in 2.5s, so a half point is a real score, not rounding noise.
  if (exam === 'EPS_TOPIK') return String(Math.round(score * 2) / 2);
  return String(Math.round(score));
};

const IELTS_BANDS: [number, string][] = [
  [9, 'Expert user'],
  [8, 'Very good user'],
  [7, 'Good user'],
  [6, 'Competent user'],
  [5, 'Modest user'],
  [4, 'Limited user'],
];

export function scoreLabel(exam: ExamType, score: number): string {
  if (exam === 'PTE') return `${Math.round(score)} out of 90`;
  if (exam === 'EPS_TOPIK') return `${formatScore(exam, score)} out of 100`;
  const band = IELTS_BANDS.find(([floor]) => score >= floor);
  return band ? `Band ${band[0]}: ${band[1]}` : '';
}

const pad = (value: number) => String(value).padStart(2, '0');

export const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export function isoDateAfterMonths(months: number, from = new Date()): string {
  return toIsoDate(new Date(from.getFullYear(), from.getMonth() + months, from.getDate()));
}

export function daysUntil(isoDate: string, from = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  const target = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function runwayAdvice(days: number): string {
  const weeks = Math.max(1, Math.round(days / 7));
  if (days === 0) return 'It is today. Good luck! A light warm-up is all you need.';
  if (days < 14) return 'A short sprint. Focus on mock tests and your weakest tasks.';
  if (days < 60) return `About ${weeks} weeks. Steady daily practice will get you there.`;
  return `About ${weeks} weeks. Plenty of time to build every skill properly.`;
}

export function formatExamDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const STUDY_GOALS: { id: StudyGoal; label: string; short: string; detail: string; emoji: string }[] = [
  {
    id: 'university',
    label: 'Study at a university',
    short: 'University',
    detail: 'Undergraduate, masters or PhD admission',
    emoji: '🎓',
  },
  {
    id: 'migration',
    label: 'Migrate or get PR',
    short: 'Migration',
    detail: 'Permanent residency or a visa application',
    emoji: '🏡',
  },
  {
    id: 'work',
    label: 'Work or register professionally',
    short: 'Work',
    detail: 'Nursing, engineering, teaching and similar',
    emoji: '💼',
  },
  { id: 'other', label: 'Something else', short: 'Personal', detail: 'A personal goal, or not sure yet', emoji: '✨' },
];

export const DESTINATIONS: { id: Destination; label: string; code: string }[] = [
  { id: 'australia', label: 'Australia', code: 'AU' },
  { id: 'uk', label: 'United Kingdom', code: 'UK' },
  { id: 'canada', label: 'Canada', code: 'CA' },
  { id: 'usa', label: 'United States', code: 'US' },
  { id: 'new-zealand', label: 'New Zealand', code: 'NZ' },
  { id: 'south-korea', label: 'South Korea', code: 'KR' },
  { id: 'other', label: 'Somewhere else', code: '•••' },
];

export const FOCUS_SKILLS: { id: SkillType; label: string; detail: string }[] = [
  { id: 'speaking', label: 'Speaking', detail: 'Fluency, pronunciation and thinking on the spot' },
  { id: 'writing', label: 'Writing', detail: 'Structure, grammar and hitting the word count' },
  { id: 'reading', label: 'Reading', detail: 'Speed, and finding the answer in long texts' },
  { id: 'listening', label: 'Listening', detail: 'Accents, pace and taking notes' },
];

export const DAILY_MINUTES = [15, 30, 45, 60, 90, 120];

export const dailyLabel = (minutes: number) =>
  minutes < 60 ? `${minutes} min` : `${minutes / 60} hr${minutes === 60 ? '' : 's'}`;

export function practiceHours(minutes: number, days: number | null): string {
  if (days !== null && days > 0) {
    return `That's about ${Math.round((minutes * days) / 60)} hours of practice before your exam.`;
  }
  return `That's about ${Math.round(((minutes * 7) / 60) * 10) / 10} hours of practice a week.`;
}

export const goalLabel = (goal?: StudyGoal) => STUDY_GOALS.find(item => item.id === goal)?.label;
export const destinationLabel = (destination?: Destination) =>
  DESTINATIONS.find(item => item.id === destination)?.label;
export const skillLabel = (skill?: SkillType) => FOCUS_SKILLS.find(item => item.id === skill)?.label;

export function planHeadline(user: UserProfile): string {
  const exam = EXAM_LABELS[user.targetExam] ?? 'IELTS';
  const target = user.targetScore != null ? ` ${formatScore(user.targetExam, user.targetScore)}` : '';
  const place = user.destination && user.destination !== 'other' ? destinationLabel(user.destination) : undefined;
  const parts = [`Aiming for ${exam}${target}`];

  if (user.studyGoal && user.studyGoal !== 'other') {
    const goal = goalLabel(user.studyGoal);
    parts.push(place ? `${goal} in ${place}` : goal!);
  } else if (place) {
    parts.push(`Heading to ${place}`);
  }

  return parts.join(' · ');
}
