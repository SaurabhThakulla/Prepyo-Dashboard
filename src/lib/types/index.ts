// Prepyo domain types.
//
// These mirror backend/internal/models/models.go. The API is the only source of
// this data, so anything optional here is optional there too: a null score or an
// empty list means the learner has not generated that data yet, and the UI says
// so rather than substituting a number.

export type ExamType = 'PTE' | 'IELTS';
export type SkillType = 'speaking' | 'writing' | 'reading' | 'listening';

export type SubscriptionTier = 'free' | 'weekly' | 'pro' | 'elite';
/** Tiers that can actually be bought — 'free' is the default, not a purchase. */
export type PaidTier = Exclude<SubscriptionTier, 'free'>;

export const ALL_SKILLS: SkillType[] = ['speaking', 'writing', 'reading', 'listening'];

/** Width of one level in XP. Levels start at 1. Matches models.XPPerLevel. */
export const XP_PER_LEVEL = 400;

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

/**
 * The learner's current standing. `value` is null when there is not enough
 * evidence to estimate a score, which the UI must render as "not enough data".
 */
export interface ScoreEstimate {
  value: number | null;
  confidence: 'low' | 'medium' | 'high';
  /** Number of attempts behind the estimate. */
  basedOn: number;
  targetScore: number | null;
  targetGap: number | null;
  /** Percent of target reached, or null when there is no estimate yet. */
  readiness: number | null;
  updatedAt: string;
}

export interface SubscriptionState {
  planId: SubscriptionTier;
  planName: string;
  validUntil?: string;
  isActive: boolean;
  dailyEvaluationsUsed: number;
  dailyEvaluationsLimit: number;
  mockTestsIncluded: number;
  bonusMockTests: number;
  totalMockTestsAllowed: number;
  mockTestsUsed: number;
  bonusDays: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  targetExam: ExamType;
  targetScore: number | null;
  examDate?: string;
  nepalRegion: string;
  xp: number;
  streakDays: number;
  timezone: string;
  referralCode: string;
  bonusMockTests: number;
  bonusProDays: number;
  createdAt: string;

  // Derived by the server from XP.
  level: number;
  xpToNextLevel: number;

  /**
   * When a profile picture was last set, absent when there is none. Doubles as
   * the cache key for the image URL — see profileImageUrl in lib/api.
   */
  avatarUpdatedAt?: string;
  coverUpdatedAt?: string;

  // Only present on endpoints that ask for them.
  estimate?: ScoreEstimate;
  subscription?: SubscriptionState;
}

export function isAdmin(user: UserProfile | null): boolean {
  return user?.role === 'admin';
}

// ---------------------------------------------------------------------------
// Exam content
// ---------------------------------------------------------------------------

export interface ExamVersion {
  id: string;
  exam: ExamType;
  label: string;
  description: string;
  minScore: number;
  maxScore: number;
  scoreStep: number;
  isCurrent: boolean;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Blank {
  id: string;
  options?: string[];
  /** Only present on review responses, never while answering. */
  correctAnswer?: string;
}

export interface Question {
  id: string;
  examVersionId: string;
  exam: ExamType;
  skill: SkillType;
  typeId: string;
  typeName: string;
  title: string;
  prompt: string;
  contextPassage?: string;
  audioUrl?: string;
  audioTranscript?: string;
  imageUrl?: string;
  prepTimeSeconds?: number;
  timeLimitSeconds: number;
  options?: QuestionOption[];
  blanks?: Blank[];
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  points: number;

  // Present only after submission, on review responses.
  correctAnswers?: string[];
  modelAnswer?: string;
  explanation?: string;
}

export interface MockSection {
  id: string;
  name: string;
  skill: SkillType;
  durationMinutes: number;
  questionIds: string[];
}

export interface Mock {
  id: string;
  examVersionId: string;
  exam: ExamType;
  title: string;
  description: string;
  totalDurationMinutes: number;
  totalQuestions: number;
  isDiagnostic: boolean;
  /**
   * The paper is composed per learner when they start it, so `sections` and
   * `totalQuestions` are empty here — there is no fixed question list to
   * report. These go through the reading mock endpoints, not GET /mocks/:id,
   * which refuses them with a 409.
   */
  isGenerated: boolean;
  sections: MockSection[];
}

// ---------------------------------------------------------------------------
// Reading passages
// ---------------------------------------------------------------------------

/**
 * One labelled block of a passage. The label carries meaning: a Matching
 * Information answer *is* a paragraph label, and Find the Writer answers point
 * at a source label.
 */
export interface ReadingParagraph {
  label: string;
  text: string;
}

export interface ReadingPassage {
  id: string;
  examVersionId: string;
  exam: ExamType;
  title: string;
  subtitle?: string;
  paragraphs: ReadingParagraph[];
  /** Attributed excerpts, for passages written in several voices. */
  sources?: ReadingParagraph[];
  wordCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  topic?: string;
  tags: string[];
}

/** One task set on a passage: a type, its instruction line, its questions. */
export interface ReadingGroup {
  id: string;
  passageId: string;
  position: number;
  typeId: string;
  typeName: string;
  instructions: string;
  /** Material belonging to the task, not the passage — the boxes to order. */
  resources?: ReadingParagraph[];
  timeLimitSeconds?: number;
  questions: Question[];
}

/** A passage with some of its groups: one for practice, all for a mock. */
export interface ReadingSet {
  passage: ReadingPassage;
  groups: ReadingGroup[];
  totalQuestions: number;
}

/** An entry in the "what can I practise?" menu, with the size of the bank. */
export interface ReadingTaskType {
  typeId: string;
  typeName: string;
  passageCount: number;
  questionCount: number;
}

/** One generated reading paper. `sets` is filled only when it is being sat. */
export interface ReadingMockSession {
  id: string;
  mockId: string;
  mockTitle?: string;
  exam: ExamType;
  examVersionId: string;
  status: 'in_progress' | 'submitted' | 'abandoned';
  durationMinutes: number;
  totalQuestions: number;
  passageIds: string[];
  createdAt: string;
  submittedAt?: string;
  /**
   * True when the bank had no unseen passages left and one had to be repeated.
   * Shown to the learner rather than hidden — a repeat is not a bug, but it
   * looks like one if nothing says so.
   */
  reusedPassages: boolean;
  sets?: ReadingSet[];
}

// ---------------------------------------------------------------------------
// Learner activity
// ---------------------------------------------------------------------------

/**
 * One answer as sent to the server. Note what is absent: no score and no
 * correctness flag — the server decides both.
 */
export interface AnswerSubmission {
  questionId: string;
  textResponse?: string;
  selectedOptions?: string[];
  blankResponses?: Record<string, string>;
  timeSpentSeconds?: number;
}

export interface PracticeAttempt {
  id: string;
  questionId: string;
  examVersionId: string;
  isCorrect: boolean;
  score: number;
  maxScore: number;
  accuracyPercentage: number;
  feedback: string;
  userResponse?: string;
  timeSpentSeconds: number;
  createdAt: string;
}

export interface MockAttempt {
  id: string;
  mockId: string;
  examVersionId: string;
  exam: ExamType;
  userScore: number;
  skillScores: Partial<Record<SkillType, number>>;
  totalCorrect: number;
  totalQuestions: number;
  durationSeconds: number;
  completedAt: string;
}

/**
 * What POST /mocks/:id/submit returns. Richer than the stored attempt because
 * it also reports what the score did *not* cover — speaking and writing are
 * not auto-graded, so they are excluded rather than guessed at.
 */
export interface MockSubmitOutcome {
  attempt: MockAttempt;
  xpAwarded: number;
  scoredQuestions: number;
  ungradedQuestions: number;
  scoreConfidence: string;
  /**
   * The paper with its answer key restored, in the order it was dealt. Only
   * generated reading mocks return this; it is safe because the paper is
   * already graded and closed by the time it is sent.
   */
  review?: Question[];
}

export interface Mistake {
  id: string;
  questionId: string;
  questionTitle: string;
  exam: ExamType;
  skill: SkillType;
  typeName: string;
  prompt: string;
  userResponse: string;
  correctResponse: string;
  explanation: string;
  errorTag: string;
  failedCount: number;
  resolved: boolean;
  lastAttemptedAt: string;
}

// ---------------------------------------------------------------------------
// AI evaluation
// ---------------------------------------------------------------------------

export interface EvaluationCriterion {
  name: string;
  score: number;
  maxScore: number;
  feedback: string;
}

export interface SentenceFeedback {
  original: string;
  correction: string;
  issueType: string;
  explanation: string;
}

export interface Evaluation {
  id: string;
  questionId?: string;
  exam: ExamType;
  skill: SkillType;
  evaluationVersion: string;
  /** Null when the model could not produce a defensible score. */
  estimatedScore: number | null;
  scoreConfidence: 'low' | 'medium' | 'high';
  summary: string;
  criteria: EvaluationCriterion[];
  strengths: string[];
  weaknesses: string[];
  sentenceFeedback: SentenceFeedback[];
  modelRewrite?: string;
  transcript?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Progress, gamification and notifications
// ---------------------------------------------------------------------------

export interface SkillProgress {
  skill: SkillType;
  attempts: number;
  accuracy: number;
  estimate: number | null;
  /** 'no_data' until the learner has attempted something in this skill. */
  status: 'no_data' | 'needs_work' | 'steady' | 'strong';
}

export interface ProgressSummary {
  estimate: ScoreEstimate;
  skills: SkillProgress[];
}

/**
 * One practised day, bucketed in the learner's own timezone by the server.
 *
 * Only days with attempts are sent, so the heatmap fills its own blanks. An
 * absent date means no practice, never "not loaded yet".
 */
export interface ActivityDay {
  /** YYYY-MM-DD in the learner's timezone. */
  date: string;
  count: number;
  minutes: number;
  skills: Partial<Record<SkillType, number>>;
}

export interface ActivitySummary {
  from: string;
  to: string;
  days: ActivityDay[];
  totalSessions: number;
  totalMinutes: number;
  currentStreak: number;
  longestStreak: number;
}

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  skill: SkillType;
  taskType?: string;
  targetCount: number;
  completedCount: number;
  xpReward: number;
  completed: boolean;
}

export interface GamificationSummary {
  xp: number;
  level: number;
  xpToNextLevel: number;
  streakDays: number;
  dailyMissions: DailyMission[];
}

export interface XPTransaction {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  nepalRegion: string;
  exam: ExamType;
  xp: number;
  level: number;
  streakDays: number;
  isYou: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Billing and referrals
// ---------------------------------------------------------------------------

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  priceNPR: number;
  durationMonths: number;
  durationDays: number;
  bonusDays: number;
  features: string[];
  aiEvaluationsPerDay: number;
  mockTestsIncluded: number;
  isPopular: boolean;
}

export interface ReferralMilestone {
  required: number;
  current: number;
  completed: boolean;
}

export interface ReferralMilestones {
  threeReferrals: ReferralMilestone;
  fiveReferrals: ReferralMilestone;
}

export interface ReferralStats {
  totalInvited: number;
  pending: number;
  completed: number;
  totalXpEarned: number;
}

export interface RecentReferralItem {
  id: string;
  friendName: string;
  status: 'pending' | 'completed' | 'cancelled' | string;
  createdAt: string;
  completedAt?: string;
}

export interface ReferralOverview {
  referralCode: string;
  shareLink: string;
  stats: ReferralStats;
  milestones: ReferralMilestones;
  recentReferrals: RecentReferralItem[];
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface SkillQuestionStat {
  skill: SkillType;
  label: string;
  completedQuestions: number;
  totalQuestions: number;
  accuracyPercentage: number;
  trend: string;
  latestScore: string;
  targetScore: number;
  readinessPercent: number;
  sub: string;
  actionHref: string;
}

export interface StudyPlanEvent {
  id: string;
  date: string;
  title: string;
  type: 'diagnostic' | 'mock' | 'practice' | 'review' | string;
  completed: boolean;
}

export interface StudyPlanData {
  currentMonth: string;
  selectedDate: string;
  activeDays: string[];
  dailyTargetMinutes: number;
  completedMinutesToday: number;
  scheduledEvents: StudyPlanEvent[];
}

export interface WeakestSkillFocus {
  skill: SkillType;
  taskTypeName: string;
  latestScore: string;
  maxScore: number;
  analysis: string;
  actionText: string;
  actionHref: string;
  period: string;
}

export interface DashboardData {
  user: {
    id: string;
    name: string;
    email: string;
    targetExam: ExamType;
    targetScore: number;
    estimatedScore: number;
    examDate?: string;
    nepalRegion: string;
    xp: number;
    level: number;
    streakDays: number;
    rank: number;
    readinessPercentage: number;
  };
  skillStats: Record<SkillType, SkillQuestionStat>;
  studyPlan: StudyPlanData;
  weakestSkill: WeakestSkillFocus;
  unresolvedMistakesCount: number;
}

