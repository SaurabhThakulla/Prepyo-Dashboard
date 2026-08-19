package mocks

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/prepyo/backend/internal/models"
	"github.com/prepyo/backend/internal/store"
)

type Handler struct {
	store *store.Store
}

func NewHandler(s *store.Store) *Handler {
	return &Handler{store: s}
}

func (h *Handler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.GetMocks)
	r.Post("/", h.SubmitMock)
	return r
}

func (h *Handler) GetMocks(w http.ResponseWriter, r *http.Request) {
	exam := models.ExamType(r.URL.Query().Get("exam"))
	mocks := h.store.GetMocks(exam)
	attempts := h.store.GetMockAttempts()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":      true,
		"mocks":        mocks,
		"pastAttempts": attempts,
	})
}

func (h *Handler) SubmitMock(w http.ResponseWriter, r *http.Request) {
	var body struct {
		MockID          string `json:"mockId"`
		DurationSeconds int    `json:"durationSeconds"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	mock := h.store.GetMockByID(body.MockID)
	if mock == nil {
		http.Error(w, "Mock not found", http.StatusNotFound)
		return
	}

	isPTE := mock.Exam == models.ExamPTE
	userScore := 76.0
	if !isPTE {
		userScore = 7.5
	}

	skillScores := map[models.SkillType]float64{
		models.SkillSpeaking:  78,
		models.SkillWriting:   74,
		models.SkillReading:   75,
		models.SkillListening: 77,
	}

	attempt := models.MockAttemptResult{
		ID:              fmt.Sprintf("attempt-%d", time.Now().UnixMilli()),
		MockID:          mock.ID,
		Exam:            mock.Exam,
		UserScore:       userScore,
		SkillScores:     skillScores,
		TotalCorrect:    6,
		TotalQuestions:  mock.TotalQuestions,
		DurationSeconds: body.DurationSeconds,
		TargetGap:       3.0,
		ReadinessImpact: 5,
		CompletedAt:     time.Now(),
	}

	saved := h.store.SaveMockAttempt(attempt)
	h.store.AwardXP(300, "Full Mock Exam Completed")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"attempt": saved,
		"user":    h.store.GetUser(),
	})
}
