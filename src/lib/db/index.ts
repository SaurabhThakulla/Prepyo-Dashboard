import {
  UserProfile,
  Question,
  MockExamBlueprint,
  MockAttemptResult,
  MistakeItem,
  LeaderboardUser,
  SubscriptionPlan,
  PaidTier,
  DailyMission,
  NotificationItem,
  AIEvaluationResult,
  XPTransaction,
  ExamType,
  SkillType,
  UserAnswerSubmission,
} from '../types';
import {
  SEED_QUESTIONS,
  SEED_MOCKS,
  SEED_LEADERBOARD,
  SUBSCRIPTION_PLANS,
  DEFAULT_DAILY_MISSIONS,
} from './seed';

// Initial default learner profile
const DEFAULT_USER: UserProfile = {
  id: 'usr-nepal-001',
  email: 'learner@prepyo.np',
  name: 'Bishal Thapa',
  targetExam: 'PTE',
  targetScore: 79,
  estimatedScore: 68,
  readinessPercentage: 72,
  examDate: '2026-10-15',
  nepalRegion: 'Kathmandu',
  xp: 1450,
  level: 5,
  streakDays: 6,
  streakFrozen: false,
  streakLastActiveDate: new Date().toISOString().split('T')[0],
  subscriptionTier: 'pro',
  subscriptionValidUntil: '2026-11-01',
  dailyEvaluationsUsed: 4,
  dailyEvaluationsLimit: 30,
  createdAt: '2026-07-01',
};

const SEED_MISTAKES: MistakeItem[] = [
  {
    id: 'mst-001',
    questionId: 'pte-rdg-001',
    questionTitle: 'Cognitive Benefits of Bilingualism',
    exam: 'PTE',
    skill: 'reading',
    typeName: 'Reading & Writing: Fill in the Blanks',
    prompt: 'Contemporary neurological research has [[blank2]] this misconception.',
    userResponse: 'reinforced',
    correctResponse: 'debunked',
    explanation: '"debunked" means exposed the falseness of a myth. "reinforced" means made it stronger, which contradicts the text.',
    errorTag: 'Vocabulary',
    failedCount: 2,
    resolved: false,
    lastAttemptedAt: '2026-08-17T14:20:00Z',
  },
  {
    id: 'mst-002',
    questionId: 'pte-lis-002',
    questionTitle: 'Academic Submission Guidelines',
    exam: 'PTE',
    skill: 'listening',
    typeName: 'Write from Dictation',
    prompt: 'All submitted assignments must contain appropriate academic citations and a comprehensive bibliography.',
    userResponse: 'All submitted assignment must contain appropriate academic citation and comprehensive bibliography.',
    correctResponse: 'All submitted assignments must contain appropriate academic citations and a comprehensive bibliography.',
    explanation: 'Missed plural "assignments" and "citations" and the article "a". In PTE dictation, every single word and plural form counts.',
    errorTag: 'Spelling',
    failedCount: 1,
    resolved: false,
    lastAttemptedAt: '2026-08-16T18:40:00Z',
  },
  {
    id: 'mst-003',
    questionId: 'ielts-rdg-001',
    questionTitle: 'The Mystery of the Indus Valley Script',
    exam: 'IELTS',
    skill: 'reading',
    typeName: 'Reading Passage & True/False/Not Given',
    prompt: '4. Most Indus script inscriptions were written primarily on papyrus scrolls.',
    userResponse: 'FALSE',
    correctResponse: 'NOT GIVEN',
    explanation: 'The passage mentions inscribed seals and pottery shards, but does not state whether papyrus scrolls were ever used or not. Hence, it is NOT GIVEN.',
    errorTag: 'Inference',
    failedCount: 1,
    resolved: false,
    lastAttemptedAt: '2026-08-15T11:15:00Z',
  }
];

const SEED_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-01',
    title: '🔥 6-Day Streak Alive!',
    message: 'Great work! Complete today’s mission to extend your streak to 7 days and earn a +50 XP bonus.',
    type: 'streak',
    read: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    actionUrl: '/dashboard',
  },
  {
    id: 'notif-02',
    title: '📝 AI Writing Evaluation Ready',
    message: 'Your PTE Essay on "AI in Education" has been evaluated. Estimated Score: 76/90 with 3 key suggestions.',
    type: 'evaluation',
    read: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    actionUrl: '/evaluations',
  },
  {
    id: 'notif-03',
    title: '🇳🇵 Leaderboard Update',
    message: 'You jumped 3 ranks in Kathmandu district! Keep practicing to enter the Top 10.',
    type: 'system',
    read: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    actionUrl: '/leaderboard',
  }
];

class PrepyoDatabase {
  private user: UserProfile = { ...DEFAULT_USER };
  private questions: Question[] = [...SEED_QUESTIONS];
  private mocks: MockExamBlueprint[] = [...SEED_MOCKS];
  private mockAttempts: MockAttemptResult[] = [];
  private mistakes: MistakeItem[] = [...SEED_MISTAKES];
  private leaderboard: LeaderboardUser[] = [...SEED_LEADERBOARD];
  private dailyMissions: DailyMission[] = [...DEFAULT_DAILY_MISSIONS];
  private notifications: NotificationItem[] = [...SEED_NOTIFICATIONS];
  private aiEvaluationLogs: AIEvaluationResult[] = [];
  private xpTransactions: XPTransaction[] = [
    { id: 'xp-1', amount: 100, reason: 'Welcome to Prepyo Onboarding', timestamp: '2026-07-01T10:00:00Z' },
    { id: 'xp-2', amount: 150, reason: 'Completed PTE Diagnostic Test', timestamp: '2026-07-02T12:00:00Z' },
    { id: 'xp-3', amount: 200, reason: 'Full Mock Test Simulation', timestamp: '2026-08-10T16:00:00Z' },
  ];

  // User
  getUser(): UserProfile {
    return { ...this.user };
  }

  updateUser(updates: Partial<UserProfile>): UserProfile {
    this.user = { ...this.user, ...updates };
    return { ...this.user };
  }

  awardXP(amount: number, reason: string): { user: UserProfile; transaction: XPTransaction } {
    this.user.xp += amount;
    this.user.level = Math.floor(this.user.xp / 400) + 1;
    const tx: XPTransaction = {
      id: `xp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      amount,
      reason,
      timestamp: new Date().toISOString(),
    };
    this.xpTransactions.unshift(tx);
    return { user: { ...this.user }, transaction: tx };
  }

  // Questions
  getQuestions(filter?: { exam?: ExamType; skill?: SkillType; typeId?: string; difficulty?: string }): Question[] {
    let result = [...this.questions];
    if (filter?.exam) result = result.filter(q => q.exam === filter.exam);
    if (filter?.skill) result = result.filter(q => q.skill === filter.skill);
    if (filter?.typeId) result = result.filter(q => q.typeId === filter.typeId);
    if (filter?.difficulty) result = result.filter(q => q.difficulty === filter.difficulty);
    return result;
  }

  getQuestionById(id: string): Question | undefined {
    return this.questions.find(q => q.id === id);
  }

  addQuestion(question: Question): Question {
    this.questions.push(question);
    return question;
  }

  // Mocks
  getMocks(exam?: ExamType): MockExamBlueprint[] {
    if (exam) return this.mocks.filter(m => m.exam === exam);
    return [...this.mocks];
  }

  getMockById(id: string): MockExamBlueprint | undefined {
    return this.mocks.find(m => m.id === id);
  }

  saveMockAttempt(attempt: MockAttemptResult): MockAttemptResult {
    this.mockAttempts.unshift(attempt);
    // Update user estimated score based on attempt
    this.user.estimatedScore = attempt.userScore;
    this.user.readinessPercentage = Math.min(95, Math.round((attempt.userScore / this.user.targetScore) * 100));
    this.awardXP(300, `Completed Mock Exam: ${attempt.exam}`);
    return attempt;
  }

  getMockAttempts(): MockAttemptResult[] {
    return [...this.mockAttempts];
  }

  // Mistakes
  getMistakes(filter?: { exam?: ExamType; skill?: SkillType; tag?: string; unresolvedOnly?: boolean }): MistakeItem[] {
    let list = [...this.mistakes];
    if (filter?.exam) list = list.filter(m => m.exam === filter.exam);
    if (filter?.skill) list = list.filter(m => m.skill === filter.skill);
    if (filter?.tag) list = list.filter(m => m.errorTag === filter.tag);
    if (filter?.unresolvedOnly) list = list.filter(m => !m.resolved);
    return list;
  }

  addMistake(mistake: Omit<MistakeItem, 'id' | 'lastAttemptedAt'>): MistakeItem {
    const existing = this.mistakes.find(m => m.questionId === mistake.questionId);
    if (existing) {
      existing.failedCount += 1;
      existing.lastAttemptedAt = new Date().toISOString();
      existing.resolved = false;
      return existing;
    }
    const newItem: MistakeItem = {
      ...mistake,
      id: `mst-${Date.now()}`,
      lastAttemptedAt: new Date().toISOString(),
    };
    this.mistakes.unshift(newItem);
    return newItem;
  }

  resolveMistake(id: string): boolean {
    const item = this.mistakes.find(m => m.id === id);
    if (item) {
      item.resolved = true;
      this.awardXP(30, 'Resolved Mistake in Mistake Bank');
      return true;
    }
    return false;
  }

  // Leaderboard
  getLeaderboard(exam?: ExamType, region?: string): LeaderboardUser[] {
    let list = [...this.leaderboard];
    if (exam) list = list.filter(u => u.exam === exam);
    if (region && region !== 'all') list = list.filter(u => u.nepalRegion.toLowerCase() === region.toLowerCase());
    return list.sort((a, b) => b.xp - a.xp).map((u, i) => ({ ...u, rank: i + 1 }));
  }

  // Daily missions
  getDailyMissions(): DailyMission[] {
    return [...this.dailyMissions];
  }

  completeDailyMission(id: string): DailyMission | undefined {
    const mission = this.dailyMissions.find(m => m.id === id);
    if (mission && !mission.completed) {
      mission.completed = true;
      mission.completedCount = mission.targetCount;
      this.awardXP(mission.xpReward, `Completed Daily Mission: ${mission.title}`);
      return mission;
    }
    return mission;
  }

  // Notifications
  getNotifications(): NotificationItem[] {
    return [...this.notifications];
  }

  markNotificationRead(id: string): boolean {
    const n = this.notifications.find(item => item.id === id);
    if (n) {
      n.read = true;
      return true;
    }
    return false;
  }

  // AI Evaluation Logs
  logAIEvaluation(evalResult: AIEvaluationResult): AIEvaluationResult {
    this.aiEvaluationLogs.unshift(evalResult);
    this.user.dailyEvaluationsUsed += 1;
    this.awardXP(50, `AI Evaluation completed for ${evalResult.skill.toUpperCase()}`);
    return evalResult;
  }

  getAIEvaluationLogs(): AIEvaluationResult[] {
    return [...this.aiEvaluationLogs];
  }

  // Plans & Checkout
  getPlans(): SubscriptionPlan[] {
    return [...SUBSCRIPTION_PLANS];
  }

  upgradeSubscription(planId: PaidTier): UserProfile {
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan) {
      throw new Error(`Unknown plan: ${planId}`);
    }

    // Entitlements come from the plan itself rather than per-tier branches, so a
    // new tier can't silently inherit another tier's limits. Mirrors the day
    // maths in backend/internal/billing/billing.go.
    const baseDays = plan.durationDays || plan.durationMonths * 30;
    const effectiveDays = baseDays + (plan.bonusDays || 0);

    this.user.subscriptionTier = plan.id;
    this.user.dailyEvaluationsLimit = plan.aiEvaluationsPerDay;

    // Renewing early extends the remaining time instead of discarding it, which
    // is what the backend's GREATEST(plan_valid_until, CURRENT_DATE) does.
    const today = new Date();
    const currentExpiry = this.user.subscriptionValidUntil
      ? new Date(this.user.subscriptionValidUntil)
      : today;
    const expiry = currentExpiry > today ? new Date(currentExpiry) : new Date(today);
    expiry.setDate(expiry.getDate() + effectiveDays);
    this.user.subscriptionValidUntil = expiry.toISOString().split('T')[0];

    this.awardXP(250, `Subscribed to ${plan.name}`);

    const bonusNote = plan.bonusDays
      ? ` That includes ${plan.bonusDays} bonus days on top of the ${baseDays}-day plan.`
      : '';

    // Add notification
    this.notifications.unshift({
      id: `notif-${Date.now()}`,
      title: `🎉 Welcome to ${plan.name}!`,
      message: `Your payment was processed successfully via Nepal Payment Gateway. You now have ${effectiveDays} days of access and ${plan.aiEvaluationsPerDay} AI evaluations per day.${bonusNote}`,
      type: 'system',
      read: false,
      createdAt: new Date().toISOString(),
    });

    return { ...this.user };
  }
}

// Global Singleton for in-memory persistence during development/session
declare global {
  var __prepyo_db: PrepyoDatabase | undefined;
}

export const db: PrepyoDatabase = global.__prepyo_db ?? new PrepyoDatabase();
if (process.env.NODE_ENV !== 'production') {
  global.__prepyo_db = db;
}
