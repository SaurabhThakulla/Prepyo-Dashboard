package store

import (
	"sync"
	"time"

	"github.com/prepyo/backend/internal/models"
)

type Store struct {
	mu           sync.RWMutex
	user         *models.UserProfile
	questions    []models.Question
	mocks        []models.MockExamBlueprint
	mockAttempts []models.MockAttemptResult
	mistakes     []models.MistakeItem
	leaderboard  []models.LeaderboardUser
	missions     []models.DailyMission
	notifications []models.NotificationItem
	evaluations  []models.AIEvaluationResult
}

func New() *Store {
	s := &Store{
		user: &models.UserProfile{
			ID:                    "usr-nepal-001",
			Email:                 "learner@prepyo.np",
			Name:                  "Bishal Thapa",
			TargetExam:            models.ExamPTE,
			TargetScore:           79,
			EstimatedScore:        68,
			ReadinessPercentage:   72,
			ExamDate:              "2026-10-15",
			NepalRegion:           "Kathmandu",
			XP:                    1450,
			Level:                 5,
			StreakDays:            6,
			StreakFrozen:          false,
			StreakLastActiveDate:  time.Now().Format("2006-01-02"),
			SubscriptionTier:      "pro",
			SubscriptionValidUntil: "2026-11-01",
			DailyEvaluationsUsed:  4,
			DailyEvaluationsLimit: 30,
			CreatedAt:             time.Now().AddDate(0, -1, 0),
		},
		questions: []models.Question{
			{
				ID:              "pte-spk-001",
				Exam:            models.ExamPTE,
				Skill:           models.SkillSpeaking,
				TypeID:          "read-aloud",
				TypeName:        "Read Aloud",
				Title:           "Renewable Energy Transition in Developing Economies",
				Prompt:          "Look at the text below. In 35 seconds, read this text aloud as naturally and clearly as possible.",
				ContextPassage:  "The global transition toward sustainable energy sources represents not only an ecological imperative but also a significant economic opportunity for developing economies. By decentralizing power generation through solar microgrids and localized wind harvesting, rural communities can achieve uninterrupted electricity access while simultaneously reducing greenhouse gas emissions and fossil fuel dependencies.",
				PrepTimeSeconds: 35,
				TimeLimitSeconds: 40,
				ModelAnswer:     "Clear, fluid speech maintaining natural stress on keywords.",
				Explanation:     "Focus on oral fluency and clear pronunciation.",
				Difficulty:      "medium",
				Tags:            []string{"PTE Speaking", "Read Aloud", "Fluency"},
				Points:          15,
			},
			{
				ID:              "pte-wrt-001",
				Exam:            models.ExamPTE,
				Skill:           models.SkillWriting,
				TypeID:          "summarize-written-text",
				TypeName:        "Summarize Written Text",
				Title:           "Urban Heat Islands and Microclimates",
				Prompt:          "Read the passage below and summarize it using ONE single sentence between 5 and 75 words.",
				ContextPassage:  "Urban heat islands occur when cities replace natural land cover with dense concentrations of pavement and buildings that retain heat, increasing cooling energy costs and elevating heat-related illnesses.",
				TimeLimitSeconds: 600,
				ModelAnswer:     "Because dense urban surfaces absorb heat and elevate both energy costs and health risks, municipal planners are implementing reflective materials, green roofs, and expanded tree canopies to mitigate urban heat island effects.",
				Explanation:     "Must strictly be ONE sentence with 5-75 words.",
				Difficulty:      "medium",
				Tags:            []string{"PTE Writing", "Summarize Written Text"},
				Points:          10,
			},
			{
				ID:              "ielts-wrt-002",
				Exam:            models.ExamIELTS,
				Skill:           models.SkillWriting,
				TypeID:          "ielts-writing-task2",
				TypeName:        "Writing Task 2 (Essay)",
				Title:           "Remote Work vs Traditional Office Work",
				Prompt:          "In many countries, employees are working from home. Do the advantages outweigh the disadvantages? Write at least 250 words.",
				TimeLimitSeconds: 2400,
				ModelAnswer:     "In the contemporary digital era, telecommuting has transformed workplace dynamics globally...",
				Explanation:     "Evaluated on Task Achievement, Coherence, Lexical Resource, and Grammar.",
				Difficulty:      "hard",
				Tags:            []string{"IELTS Writing", "Task 2"},
				Points:          25,
			},
		},
		mocks: []models.MockExamBlueprint{
			{
				ID:                   "mock-pte-full-01",
				Exam:                 models.ExamPTE,
				Title:                "PTE Academic Official Simulation Mock #1",
				Description:          "Complete 2-hour simulated PTE Academic examination covering Speaking & Writing, Reading, and Listening.",
				TotalDurationMinutes: 120,
				TotalQuestions:       8,
				Sections: []models.MockExamSection{
					{ID: "sec-pte-spk-wrt", Name: "Section 1: Speaking & Writing", Skill: models.SkillSpeaking, DurationMinutes: 54, QuestionIDs: []string{"pte-spk-001", "pte-wrt-001"}},
				},
				IsDiagnostic: false,
			},
			{
				ID:                   "mock-ielts-full-01",
				Exam:                 models.ExamIELTS,
				Title:                "IELTS Academic Full Mock Exam #1",
				Description:          "Complete IELTS Academic simulation test.",
				TotalDurationMinutes: 160,
				TotalQuestions:       5,
				Sections: []models.MockExamSection{
					{ID: "sec-ielts-wrt", Name: "Writing (60 min)", Skill: models.SkillWriting, DurationMinutes: 60, QuestionIDs: []string{"ielts-wrt-002"}},
				},
				IsDiagnostic: false,
			},
		},
		leaderboard: []models.LeaderboardUser{
			{Rank: 1, UserID: "usr-001", Name: "Aarav Shrestha", NepalRegion: "Kathmandu", Exam: models.ExamPTE, XP: 4850, Level: 14, StreakDays: 28, EstimatedScore: 84, Tier: "Diamond"},
			{Rank: 2, UserID: "usr-002", Name: "Pooja Thapa", NepalRegion: "Pokhara", Exam: models.ExamIELTS, XP: 4420, Level: 13, StreakDays: 24, EstimatedScore: 8.0, Tier: "Diamond"},
			{Rank: 3, UserID: "usr-003", Name: "Bikash Adhikari", NepalRegion: "Chitwan", Exam: models.ExamPTE, XP: 3980, Level: 12, StreakDays: 19, EstimatedScore: 79, Tier: "Platinum"},
			{Rank: 4, UserID: "usr-004", Name: "Bishal Thapa", NepalRegion: "Kathmandu", Exam: models.ExamPTE, XP: 1450, Level: 5, StreakDays: 6, EstimatedScore: 68, Tier: "Gold"},
		},
		missions: []models.DailyMission{
			{ID: "mis-01", Title: "Master PTE Read Aloud / IELTS Speaking", Description: "Record 2 speaking practice tasks with clear oral fluency.", Skill: models.SkillSpeaking, TaskType: "read-aloud", TargetCount: 2, CompletedCount: 1, XPReward: 100, Completed: false},
			{ID: "mis-02", Title: "AI Essay Evaluation Challenge", Description: "Submit an essay draft to the AI writing evaluator.", Skill: models.SkillWriting, TaskType: "write-essay", TargetCount: 1, CompletedCount: 0, XPReward: 150, Completed: false},
			{ID: "mis-03", Title: "Reading Precision Drill", Description: "Complete 3 Reading Blanks with at least 80% accuracy.", Skill: models.SkillReading, TaskType: "fill-in-blanks-rw", TargetCount: 3, CompletedCount: 3, XPReward: 120, Completed: true},
		},
		notifications: []models.NotificationItem{
			{ID: "notif-01", Title: "🔥 6-Day Streak Alive!", Message: "Great work! Complete today's mission to extend your streak.", Type: "streak", Read: false, CreatedAt: time.Now().Add(-1 * time.Hour), ActionURL: "/dashboard"},
			{ID: "notif-02", Title: "📝 AI Writing Evaluation Ready", Message: "Your essay feedback is ready.", Type: "evaluation", Read: false, CreatedAt: time.Now().Add(-2 * time.Hour), ActionURL: "/evaluations"},
		},
	}
	return s
}

func (s *Store) GetUser() *models.UserProfile {
	s.mu.RLock()
	defer s.mu.RUnlock()
	u := *s.user
	return &u
}

func (s *Store) UpdateUser(updates *models.UserProfile) *models.UserProfile {
	s.mu.Lock()
	defer s.mu.Unlock()
	if updates.Name != "" {
		s.user.Name = updates.Name
	}
	if updates.TargetExam != "" {
		s.user.TargetExam = updates.TargetExam
	}
	if updates.TargetScore > 0 {
		s.user.TargetScore = updates.TargetScore
	}
	if updates.EstimatedScore > 0 {
		s.user.EstimatedScore = updates.EstimatedScore
	}
	if updates.NepalRegion != "" {
		s.user.NepalRegion = updates.NepalRegion
	}
	if updates.ExamDate != "" {
		s.user.ExamDate = updates.ExamDate
	}
	if updates.StreakFrozen {
		s.user.StreakFrozen = true
	}
	u := *s.user
	return &u
}

func (s *Store) AwardXP(amount int, reason string) (*models.UserProfile, int) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.user.XP += amount
	s.user.Level = (s.user.XP / 400) + 1
	u := *s.user
	return &u, amount
}

func (s *Store) GetQuestions(exam models.ExamType, skill models.SkillType) []models.Question {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var res []models.Question
	for _, q := range s.questions {
		if (exam == "" || q.Exam == exam) && (skill == "" || q.Skill == skill) {
			res = append(res, q)
		}
	}
	return res
}

func (s *Store) GetQuestionByID(id string) *models.Question {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, q := range s.questions {
		if q.ID == id {
			return &q
		}
	}
	return nil
}

func (s *Store) AddQuestion(q models.Question) models.Question {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.questions = append(s.questions, q)
	return q
}

func (s *Store) GetMocks(exam models.ExamType) []models.MockExamBlueprint {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var res []models.MockExamBlueprint
	for _, m := range s.mocks {
		if exam == "" || m.Exam == exam {
			res = append(res, m)
		}
	}
	return res
}

func (s *Store) GetMockByID(id string) *models.MockExamBlueprint {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, m := range s.mocks {
		if m.ID == id {
			return &m
		}
	}
	return nil
}

func (s *Store) SaveMockAttempt(attempt models.MockAttemptResult) models.MockAttemptResult {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.mockAttempts = append([]models.MockAttemptResult{attempt}, s.mockAttempts...)
	s.user.EstimatedScore = attempt.UserScore
	return attempt
}

func (s *Store) GetMockAttempts() []models.MockAttemptResult {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.mockAttempts
}

func (s *Store) GetMistakes(exam models.ExamType) []models.MistakeItem {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var res []models.MistakeItem
	for _, m := range s.mistakes {
		if exam == "" || m.Exam == exam {
			res = append(res, m)
		}
	}
	return res
}

func (s *Store) AddMistake(m models.MistakeItem) models.MistakeItem {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.mistakes = append([]models.MistakeItem{m}, s.mistakes...)
	return m
}

func (s *Store) ResolveMistake(id string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i, m := range s.mistakes {
		if m.ID == id {
			s.mistakes[i].Resolved = true
			return true
		}
	}
	return false
}

func (s *Store) GetLeaderboard(exam models.ExamType, region string) []models.LeaderboardUser {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var res []models.LeaderboardUser
	for _, u := range s.leaderboard {
		if (exam == "" || u.Exam == exam) && (region == "" || region == "all" || u.NepalRegion == region) {
			res = append(res, u)
		}
	}
	return res
}

func (s *Store) GetMissions() []models.DailyMission {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.missions
}

func (s *Store) CompleteMission(id string) *models.DailyMission {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i, m := range s.missions {
		if m.ID == id {
			s.missions[i].Completed = true
			s.missions[i].CompletedCount = s.missions[i].TargetCount
			return &s.missions[i]
		}
	}
	return nil
}

func (s *Store) GetNotifications() []models.NotificationItem {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.notifications
}

func (s *Store) MarkNotificationRead(id string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i, n := range s.notifications {
		if n.ID == id {
			s.notifications[i].Read = true
			return true
		}
	}
	return false
}

func (s *Store) LogEvaluation(eval models.AIEvaluationResult) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.evaluations = append([]models.AIEvaluationResult{eval}, s.evaluations...)
	s.user.DailyEvaluationsUsed++
}

func (s *Store) GetEvaluations() []models.AIEvaluationResult {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.evaluations
}

func (s *Store) UpgradeSubscription(plan string) *models.UserProfile {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.user.SubscriptionTier = plan
	s.user.DailyEvaluationsLimit = 30
	if plan == "elite" {
		s.user.DailyEvaluationsLimit = 100
	}
	s.user.SubscriptionValidUntil = time.Now().AddDate(0, 1, 0).Format("2006-01-02")
	u := *s.user
	return &u
}
