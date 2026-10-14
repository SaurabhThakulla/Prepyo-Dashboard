// Prepyo domain types.
//
// These mirror backend/internal/models/models.go. The API is the only source of
// this data, so anything optional here is optional there too: a null score or an
// empty list means the learner has not generated that data yet, and the UI says
// so rather than substituting a number.

export type ExamType = 'PTE' | 'IELTS' | 'EPS_TOPIK';
export type SkillType = 'speaking' | 'writing' | 'reading' | 'listening';

/** Every exam, in the order they are offered. */
export const EXAM_TYPES: ExamType[] = ['IELTS', 'PTE', 'EPS_TOPIK'];

/** How an exam is named on screen. `EPS_TOPIK` is an identifier, not a name. */
export const EXAM_LABELS: Record<ExamType, string> = {
  IELTS: 'IELTS',
  PTE: 'PTE',
  EPS_TOPIK: 'EPS-TOPIK',
};

export const isExamType = (value: unknown): value is ExamType =>
  typeof value === 'string' && (EXAM_TYPES as string[]).includes(value);

/** The top of each exam's reporting scale. */
export const EXAM_MAX_SCORE: Record<ExamType, number> = { IELTS: 9, PTE: 90, EPS_TOPIK: 100 };

/** How many times a listening item's recording runs per play: EPS-TOPIK plays each one twice. */
export const listeningPlays = (question: { exam: ExamType; skill: SkillType }): number =>
  question.exam === 'EPS_TOPIK' && question.skill === 'listening' ? 2 : 1;

export type SubscriptionTier = 'free' | 'weekly' | 'pro' | 'elite';

export type UserRole = 'admin' | 'suru' | 'abhyas' | 'taiyari' | 'udaan';

export const ROLE_FOR_PLAN: Record<SubscriptionTier, Exclude<UserRole, 'admin'>> = {
  free: 'suru',
  weekly: 'abhyas',
  pro: 'taiyari',
  elite: 'udaan',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  suru: 'Suru',
  abhyas: 'Abhyas',
  taiyari: 'Taiyari',
  udaan: 'Udaan',
};
/** Tiers that can actually be bought — 'free' is the default, not a purchase. */
export type PaidTier = Exclude<SubscriptionTier, 'free'>;

export const ALL_SKILLS: SkillType[] = ['speaking', 'writing', 'reading', 'listening'];

/** The skills an exam tests. Matches models.SkillsFor: EPS-TOPIK has no speaking or writing. */
export const skillsFor = (exam: ExamType): SkillType[] =>
  exam === 'EPS_TOPIK' ? ['reading', 'listening'] : ALL_SKILLS;

/** Width of one level in XP. Levels start at 1. Matches models.XPPerLevel. */
export const XP_PER_LEVEL = 400;

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

/**
 * The learner's current standing. `value` is null when there is not enough
 * evidence to estimate a score, which the UI must render as "----".
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
  /**
   * How many skills the estimate rests on. An IELTS overall band needs all
   * four; until then `value` is null and these say what is missing.
   */
  skillsCovered?: number;
  skillsRequired?: number;
}

export interface SubscriptionState {
  planId: SubscriptionTier;
  planName: string;
  validUntil?: string;
  isActive: boolean;
  /** Task sets attempted in the learner's own day, across every skill. */
  dailySubTestsUsed: number;
  dailySubTestsLimit: number;
  /** @deprecated Duplicates of dailySubTests*, served while older builds exist. */
  dailyEvaluationsUsed?: number;
  /** @deprecated */
  dailyEvaluationsLimit?: number;
  mockTestsIncluded: number;
  bonusMockTests: number;
  totalMockTestsAllowed: number;
  mockTestsUsed: number;
  bonusDays: number;
  /** Daily practice sub-tests are not limited. Full mocks and AI gradings are always counted. */
  unlimited?: boolean;
  /**
   * AI gradings: speaking and writing answers the AI marks, from a pool per
   * plan period (the calendar month on the free plan). Used may be fractional:
   * a word-matched Read Aloud or Repeat Sentence answer costs a fifth.
   */
  aiGradingsUsed?: number;
  aiGradingsLimit?: number;
  /** The date the pool starts again (YYYY-MM-DD). */
  aiGradingsRenewOn?: string;
  /** How often the pool renews: daily at midnight, each plan term, or monthly. */
  aiGradingsPeriod?: AIGradingsPeriod;
  /** True for a student of an institution on the free plan: reading and listening only. */
  aiBlocked?: boolean;
}

export type AIGradingsPeriod = 'day' | 'plan' | 'month';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  planId: SubscriptionTier;
  /** Start of the current plan period, reset on every purchase. */
  planStartedAt: string;
  /** Absent on the free plan, which never expires. */
  planValidUntil?: string;
  paidPlanActive: boolean;
  daysRemaining: number;
  targetExam: ExamType;
  /**
   * The IELTS module: Academic or General Training. Reading texts, Writing
   * Task 1 and the Reading band table differ between them. Absent on servers
   * that predate it, which means Academic.
   */
  targetModule?: IELTSModule;
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

  /** Null until the learner finishes or skips onboarding; absent on servers that predate it. */
  onboardingCompletedAt?: string | null;
  studyGoal?: 'university' | 'migration' | 'work' | 'other';
  destination?: 'australia' | 'uk' | 'canada' | 'usa' | 'new-zealand' | 'south-korea' | 'other';
  priorAttempt?: 'first' | 'retake';
  previousScore?: number | null;
  focusSkill?: SkillType;
  dailyMinutes?: number | null;

  // Only present on endpoints that ask for them.
  estimate?: ScoreEstimate;
  subscription?: SubscriptionState;
}

export type IELTSModule = 'academic' | 'general_training';

/** The learner's IELTS module, Academic unless they chose General Training. */
export function ieltsModuleOf(user: Pick<UserProfile, 'targetModule'> | null | undefined): IELTSModule {
  return user?.targetModule === 'general_training' ? 'general_training' : 'academic';
}

export const IELTS_MODULE_LABEL: Record<IELTSModule, string> = {
  academic: 'Academic',
  general_training: 'General Training',
};

export function isAdmin(user: UserProfile | null): boolean {
  return user?.role === 'admin';
}

export function isPremiumUser(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const sub = user.subscription;
  return Boolean(sub?.isActive && sub.planId && sub.planId !== 'free');
}

export function roleLabel(user: UserProfile | null): string {
  return user ? ROLE_LABELS[user.role] ?? user.role : '';
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
  /** Set when the option is a picture (EPS-TOPIK "choose the picture"); `text` is then its label. */
  imageUrl?: string;
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
  /**
   * The listening script in English, and a recording of it, for a learner who
   * did not follow the Korean. Only review responses carry them.
   */
  audioTranslation?: string;
  translationAudioUrl?: string;
  /** An English version exists; premium learners can open it with Help. */
  hasTranslation?: boolean;
  imageUrl?: string;
  prepTimeSeconds?: number;
  timeLimitSeconds: number;
  options?: QuestionOption[];
  blanks?: Blank[];
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  points: number;
  /**
   * Which exams set this question. It lives on the question, not on its
   * passage: one passage is shared, and the questions on it are not.
   */
  supportedExams?: ExamType[];
  /**
   * How many options an IELTS multiple-answer item asks for ("Choose TWO
   * letters"). Absent where the exam does not say, as in PTE.
   */
  selectCount?: number;
  /**
   * The listening script is the answer key, so it is not sent with an IELTS
   * item. The player fetches it from /questions/{id}/playback on play; review
   * responses carry it in audioTranscript.
   */
  scriptOnRequest?: boolean;

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
 * Information or Match The Heading answer *is* a paragraph label.
 */
export interface ReadingParagraph {
  label: string;
  text: string;
}

/**
 * Reusable reading content. It has no exam: the same text is set by IELTS and by
 * PTE with different tasks on it, and which exam may deal a task is recorded on
 * the questions (`Question.supportedExams`).
 */
export interface ReadingPassage {
  id: string;
  examVersionId: string;
  title: string;
  subtitle?: string;
  paragraphs: ReadingParagraph[];
  /** Attributed excerpts, for passages written in several voices. */
  sources?: ReadingParagraph[];
  wordCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  topic?: string;
  tags: string[];
  passageSlot?: 'A' | 'B' | 'C' | 'custom';
}

/** One task set on a passage: a type, its instruction line, its questions. */
export interface ReadingGroup {
  id: string;
  passageId: string;
  position: number;
  typeId: string;
  typeName: string;
  instructions: string;
  /** Heads the box a summary set is printed in, the way a real paper titles one. */
  boxTitle?: string;
  /** Material belonging to the task, not the passage — the boxes to order. */
  resources?: ReadingParagraph[];
  /**
   * Whether to render the passage this group hangs from.
   *
   * 'hidden' is for tasks whose text is a gapped rewrite of the passage: the
   * learner works on `question.contextPassage`, and showing the clean original
   * beside it would give away every gap.
   */
  passageDisplay?: 'full' | 'hidden';
  timeLimitSeconds?: number;
  questions: Question[];
}

/**
 * A passage with some of its groups: one for practice, one section for a mock.
 *
 * `passage` is optional because a set does not always have one. Re-order
 * Paragraphs is dealt as groups with no passage — its boxes are the whole task.
 */
export interface ReadingSet {
  passage?: ReadingPassage;
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

/** A passage the practice list offers for a reading task type. */
export interface ReadingPracticePassage {
  id: string;
  title: string;
  topic?: string;
  difficulty: string;
  wordCount: number;
  /** Questions of the chosen task type on this passage. */
  questionCount: number;
  /** When this learner last practised it, if ever. */
  practisedAt?: string;
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
  /** When the paper's time runs out, kept by the server. */
  expiresAt?: string;
  /** Time left on the server's clock when this session was read. */
  secondsRemaining?: number;
  /** Answers saved so far, restored when the paper is reopened. */
  draftAnswers?: AnswerSubmission[];
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

export interface TimelinePoint {
  label: string;
  date: string;
  count: number;
  resolved: number;
}

export interface TagStat {
  tag: string;
  count: number;
}

export interface MistakeAnalytics {
  period: 'weekly' | 'monthly';
  total: number;
  unresolved: number;
  resolved: number;
  repeatCount: number;
  bySkill: Partial<Record<SkillType, number>>;
  byTag: TagStat[];
  timeline: TimelinePoint[];
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
  /** Read Aloud / Repeat Sentence: the given text marked word by word. */
  words?: WordMark[];
  createdAt: string;
}

export interface WordMark {
  text: string;
  said: boolean;
  pauseAfter?: boolean;
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
  /** Published questions in the bank for this skill and the learner's exam. */
  available: number;
  /** Distinct questions of this skill the learner has answered, all-time. */
  completed: number;
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
  /** Daily allowance of task sets, in any skill. */
  subTestsPerDay: number;
  /** @deprecated Duplicate of subTestsPerDay, served while older builds exist. */
  aiEvaluationsPerDay?: number;
  mockTestsIncluded: number;
  isPopular: boolean;
  /** Speaking and writing answers the AI may mark per aiGradingsPeriod. */
  aiGradingsPerPeriod?: number;
  aiGradingsPeriod?: AIGradingsPeriod;
  /** No daily sub-test or tutor limit. Full mocks and AI gradings are counted on every plan. */
  unlimited?: boolean;
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
  totalBonusDaysEarned: number;
  totalInvited: number;
  pending: number;
  completed: number;
  totalXpEarned: number;
}

export interface RecentReferralItem {
  rewardDays: number;
  paymentStatus?: string;
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
  myReferralStatus: string;
  canRedeem: boolean;
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

// ---------------------------------------------------------------------------
// Mock Papers (Numbered Tests)
// ---------------------------------------------------------------------------

export type MockPaperStatus = 'not_started' | 'in_progress' | 'completed';

export interface MockPaperItem {
  id: string;
  exam: string;
  section: string;
  module: string;
  number: number;
  revision: number;
  title: string;
  status: MockPaperStatus;
  sessionId?: string;
  lastAttemptSessionId?: string;
  /** The mock_attempts row of the last completed attempt; IELTS Review opens it. */
  attemptId?: string;
  score?: number | null;
  lastAttemptAt?: string;
  attemptCount: number;
  isUpdated: boolean;
}





