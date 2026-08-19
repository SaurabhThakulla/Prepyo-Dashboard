package models

import "time"

type ExamType string

const (
	ExamPTE   ExamType = "PTE"
	ExamIELTS ExamType = "IELTS"
)

type SkillType string

const (
	SkillSpeaking  SkillType = "speaking"
	SkillWriting   SkillType = "writing"
	SkillReading   SkillType = "reading"
	SkillListening SkillType = "listening"
)

type UserProfile struct {
	ID                    string    `json:"id"`
	Email                 string    `json:"email"`
	Name                  string    `json:"name"`
	TargetExam            ExamType  `json:"targetExam"`
	TargetScore           float64   `json:"targetScore"`
	EstimatedScore        float64   `json:"estimatedScore"`
	ReadinessPercentage   int       `json:"readinessPercentage"`
	ExamDate              string    `json:"examDate,omitempty"`
	NepalRegion           string    `json:"nepalRegion"`
	XP                    int       `json:"xp"`
	Level                 int       `json:"level"`
	StreakDays            int       `json:"streakDays"`
	StreakFrozen          bool      `json:"streakFrozen"`
	StreakLastActiveDate  string    `json:"streakLastActiveDate"`
	SubscriptionTier      string    `json:"subscriptionTier"`
	SubscriptionValidUntil string   `json:"subscriptionValidUntil,omitempty"`
	DailyEvaluationsUsed  int       `json:"dailyEvaluationsUsed"`
	DailyEvaluationsLimit int       `json:"dailyEvaluationsLimit"`
	CreatedAt             time.Time `json:"createdAt"`
}

type QuestionOption struct {
	ID        string `json:"id"`
	Text      string `json:"text"`
	IsCorrect bool   `json:"isCorrect,omitempty"`
}

type BlankOption struct {
	ID            string   `json:"id"`
	Options       []string `json:"options"`
	CorrectAnswer string   `json:"correctAnswer"`
}

type Question struct {
	ID              string           `json:"id"`
	Exam            ExamType         `json:"exam"`
	Skill           SkillType        `json:"skill"`
	TypeID          string           `json:"typeId"`
	TypeName        string           `json:"typeName"`
	Title           string           `json:"title"`
	Prompt          string           `json:"prompt"`
	ContextPassage  string           `json:"contextPassage,omitempty"`
	AudioURL        string           `json:"audioUrl,omitempty"`
	AudioTranscript string           `json:"audioTranscript,omitempty"`
	ImageURL        string           `json:"imageUrl,omitempty"`
	PrepTimeSeconds int              `json:"prepTimeSeconds,omitempty"`
	TimeLimitSeconds int             `json:"timeLimitSeconds"`
	Options         []QuestionOption `json:"options,omitempty"`
	CorrectAnswers  interface{}      `json:"correctAnswers,omitempty"` // string or []string
	Blanks          []BlankOption    `json:"blanks,omitempty"`
	ModelAnswer     string           `json:"modelAnswer,omitempty"`
	Explanation     string           `json:"explanation,omitempty"`
	Difficulty      string           `json:"difficulty"`
	Tags            []string         `json:"tags"`
	Points          int              `json:"points"`
}

type UserAnswerSubmission struct {
	QuestionID           string            `json:"questionId"`
	Exam                 ExamType          `json:"exam"`
	Skill                SkillType         `json:"skill"`
	TypeID               string            `json:"typeId"`
	TextResponse         string            `json:"textResponse,omitempty"`
	SelectedOptions      []string          `json:"selectedOptions,omitempty"`
	BlankResponses       map[string]string `json:"blankResponses,omitempty"`
	AudioBlobURL         string            `json:"audioBlobUrl,omitempty"`
	AudioDurationSeconds int               `json:"audioDurationSeconds,omitempty"`
	TimeSpentSeconds     int               `json:"timeSpentSeconds"`
}

type EvaluationCriterion struct {
	Name     string  `json:"name"`
	Score    float64 `json:"score"`
	MaxScore float64 `json:"maxScore"`
	Feedback string  `json:"feedback"`
	Status   string  `json:"status"` // good, average, needs_work
}

type SentenceFeedback struct {
	Original    string `json:"original"`
	Correction  string `json:"correction"`
	IssueType   string `json:"issueType"`
	Explanation string `json:"explanation"`
}

type AIEvaluationResult struct {
	ID                   string                `json:"id"`
	QuestionID           string                `json:"questionId"`
	Exam                 ExamType              `json:"exam"`
	Skill                SkillType             `json:"skill"`
	EstimatedScore       float64               `json:"estimatedScore"`
	OverallBandOrPTE     float64               `json:"overallBandOrPTE"`
	ScoreConfidence      string                `json:"scoreConfidence"`
	Summary              string                `json:"summary"`
	Criteria             []EvaluationCriterion `json:"criteria"`
	Strengths            []string              `json:"strengths"`
	Weaknesses           []string              `json:"weaknesses"`
	SentenceFeedback     []SentenceFeedback    `json:"sentenceFeedback"`
	ModelRewrite         string                `json:"modelRewrite,omitempty"`
	EvaluatedAt          time.Time             `json:"evaluatedAt"`
	ProviderModelUsed    string                `json:"providerModelUsed"`
	TokenCostEstimateNPR float64               `json:"tokenCostEstimateNPR"`
}

type MistakeItem struct {
	ID              string    `json:"id"`
	QuestionID      string    `json:"questionId"`
	QuestionTitle   string    `json:"questionTitle"`
	Exam            ExamType  `json:"exam"`
	Skill           SkillType `json:"skill"`
	TypeName        string    `json:"typeName"`
	Prompt          string    `json:"prompt"`
	UserResponse    string    `json:"userResponse"`
	CorrectResponse string    `json:"correctResponse"`
	Explanation     string    `json:"explanation"`
	ErrorTag        string    `json:"errorTag"`
	FailedCount     int       `json:"failedCount"`
	Resolved        bool      `json:"resolved"`
	LastAttemptedAt time.Time `json:"lastAttemptedAt"`
}

type MockExamSection struct {
	ID              string    `json:"id"`
	Name            string    `json:"name"`
	Skill           SkillType `json:"skill"`
	DurationMinutes int       `json:"durationMinutes"`
	QuestionIDs     []string  `json:"questionIds"`
}

type MockExamBlueprint struct {
	ID                   string            `json:"id"`
	Exam                 ExamType          `json:"exam"`
	Title                string            `json:"title"`
	Description          string            `json:"description"`
	TotalDurationMinutes int               `json:"totalDurationMinutes"`
	TotalQuestions       int               `json:"totalQuestions"`
	Sections             []MockExamSection `json:"sections"`
	IsDiagnostic         bool              `json:"isDiagnostic"`
}

type MockAttemptResult struct {
	ID                string             `json:"id"`
	MockID            string             `json:"mockId"`
	Exam              ExamType           `json:"exam"`
	UserScore         float64            `json:"userScore"`
	SkillScores       map[SkillType]float64 `json:"skillScores"`
	EnablingSkills    map[string]int     `json:"enablingSkills,omitempty"`
	TotalCorrect      int                `json:"totalCorrect"`
	TotalQuestions    int                `json:"totalQuestions"`
	DurationSeconds   int                `json:"durationSeconds"`
	TargetGap         float64            `json:"targetGap"`
	ReadinessImpact   int                `json:"readinessImpact"`
	CompletedAt       time.Time          `json:"completedAt"`
}

type LeaderboardUser struct {
	Rank           int      `json:"rank"`
	UserID         string   `json:"userId"`
	Name           string   `json:"name"`
	NepalRegion    string   `json:"nepalRegion"`
	Exam           ExamType `json:"exam"`
	XP             int      `json:"xp"`
	Level          int      `json:"level"`
	StreakDays     int      `json:"streakDays"`
	EstimatedScore float64  `json:"estimatedScore"`
	Tier           string   `json:"tier"`
}

type SubscriptionPlan struct {
	ID                  string   `json:"id"`
	Name                string   `json:"name"`
	PriceNPR            int      `json:"priceNPR"`
	DurationMonths      int      `json:"durationMonths"`
	Features            []string `json:"features"`
	AIEvaluationsPerDay int      `json:"aiEvaluationsPerDay"`
	MockTestsIncluded   int      `json:"mockTestsIncluded"`
	Popular             bool     `json:"popular,omitempty"`
}

type DailyMission struct {
	ID             string    `json:"id"`
	Title          string    `json:"title"`
	Description    string    `json:"description"`
	Skill          SkillType `json:"skill"`
	TaskType       string    `json:"taskType"`
	TargetCount    int       `json:"targetCount"`
	CompletedCount int       `json:"completedCount"`
	XPReward       int       `json:"xpReward"`
	Completed      bool      `json:"completed"`
}

type NotificationItem struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	Message   string    `json:"message"`
	Type      string    `json:"type"`
	Read      bool      `json:"read"`
	CreatedAt time.Time `json:"createdAt"`
	ActionURL string    `json:"actionUrl,omitempty"`
}
