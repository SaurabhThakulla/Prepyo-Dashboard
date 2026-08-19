// Prepyo Core TypeScript Domain Types

export type ExamType = 'PTE' | 'IELTS';
export type SkillType = 'speaking' | 'writing' | 'reading' | 'listening';
export type IELTSType = 'academic' | 'general';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  targetExam: ExamType;
  ieltsType?: IELTSType;
  targetScore: number; // e.g. 79 for PTE, 7.5 for IELTS
  estimatedScore: number; // e.g. 68 for PTE, 6.5 for IELTS
  readinessPercentage: number;
  examDate?: string;
  nepalRegion: string; // e.g. 'Kathmandu', 'Pokhara', 'Chitwan', 'Lalitpur', 'Butwal'
  xp: number;
  level: number;
  streakDays: number;
  streakFrozen: boolean;
  streakLastActiveDate: string;
  subscriptionTier: 'free' | 'pro' | 'elite';
  subscriptionValidUntil?: string;
  dailyEvaluationsUsed: number;
  dailyEvaluationsLimit: number;
  createdAt: string;
}

export interface SkillScore {
  skill: SkillType;
  currentEstimate: number;
  targetScore: number;
  accuracy: number;
  questionsAttempted: number;
  timeSpentSeconds: number;
  status: 'strong' | 'moderate' | 'weak';
}

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  skill: SkillType;
  taskType: string;
  targetCount: number;
  completedCount: number;
  xpReward: number;
  completed: boolean;
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface Question {
  id: string;
  exam: ExamType;
  skill: SkillType;
  typeId: string; // e.g. 'read-aloud', 'summarize-written-text', 'ielts-writing-task2'
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
  correctAnswers?: string | string[];
  blanks?: { id: string; options: string[]; correctAnswer: string }[];
  modelAnswer?: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  points: number;
}

export interface UserAnswerSubmission {
  questionId: string;
  exam: ExamType;
  skill: SkillType;
  typeId: string;
  textResponse?: string;
  selectedOptions?: string[];
  blankResponses?: Record<string, string>;
  audioBlobUrl?: string;
  audioDurationSeconds?: number;
  timeSpentSeconds: number;
}

export interface EvaluationCriterion {
  name: string; // e.g. 'Task Response', 'Fluency', 'Grammar'
  score: number; // 0-10 or 0-9
  maxScore: number;
  feedback: string;
  status: 'good' | 'average' | 'needs_work';
}

export interface SentenceFeedback {
  original: string;
  correction: string;
  issueType: 'grammar' | 'vocabulary' | 'cohesion' | 'fluency';
  explanation: string;
}

export interface AIEvaluationResult {
  id: string;
  questionId: string;
  exam: ExamType;
  skill: SkillType;
  estimatedScore: number;
  overallBandOrPTE: number;
  scoreConfidence: 'high' | 'medium' | 'low';
  summary: string;
  criteria: EvaluationCriterion[];
  strengths: string[];
  weaknesses: string[];
  sentenceFeedback: SentenceFeedback[];
  modelRewrite?: string;
  vocabularySuggestions?: { original: string; betterAlternative: string; reason: string }[];
  evaluatedAt: string;
  providerModelUsed: string;
  tokenCostEstimateNPR: number;
}

export interface MistakeItem {
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
  errorTag: 'Grammar' | 'Vocabulary' | 'Time Pressure' | 'Collocation' | 'Inference' | 'Spelling' | 'Pronunciation';
  failedCount: number;
  resolved: boolean;
  lastAttemptedAt: string;
}

export interface MockExamSection {
  id: string;
  name: string;
  skill: SkillType;
  durationMinutes: number;
  questionIds: string[];
}

export interface MockExamBlueprint {
  id: string;
  exam: ExamType;
  title: string;
  description: string;
  totalDurationMinutes: number;
  totalQuestions: number;
  sections: MockExamSection[];
  isDiagnostic?: boolean;
}

export interface MockAttemptResult {
  id: string;
  mockId: string;
  exam: ExamType;
  userScore: number; // Estimated PTE overall or IELTS Overall Band
  skillScores: Record<SkillType, number>;
  enablingSkills?: {
    grammar: number;
    vocabulary: number;
    fluency: number;
    pronunciation: number;
    coherence: number;
  };
  totalCorrect: number;
  totalQuestions: number;
  durationSeconds: number;
  targetGap: number;
  readinessImpact: number;
  completedAt: string;
  sectionBreakdowns: {
    sectionName: string;
    skill: SkillType;
    score: number;
    maxScore: number;
  }[];
}

export interface XPTransaction {
  id: string;
  amount: number;
  reason: string; // e.g., 'Daily Mission Completed', 'PTE Read Aloud Practice', 'Mock Test Completed'
  timestamp: string;
}

export interface LeaderboardUser {
  rank: number;
  userId: string;
  name: string;
  nepalRegion: string;
  avatarUrl?: string;
  exam: ExamType;
  xp: number;
  level: number;
  streakDays: number;
  estimatedScore: number;
  tier: 'Diamond' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze';
}

export interface SubscriptionPlan {
  id: 'free' | 'pro' | 'elite';
  name: string;
  priceNPR: number;
  durationMonths: number;
  features: string[];
  aiEvaluationsPerDay: number;
  mockTestsIncluded: number;
  popular?: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'streak' | 'mission' | 'evaluation' | 'system';
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}
