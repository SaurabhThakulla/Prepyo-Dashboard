package progress

import (
	"encoding/json"
	"net/http"

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
	r.Get("/", h.GetProgress)
	return r
}

func (h *Handler) GetProgress(w http.ResponseWriter, r *http.Request) {
	user := h.store.GetUser()
	isPTE := user.TargetExam == models.ExamPTE

	skillBreakdown := []map[string]interface{}{
		{"skill": "speaking", "name": "Speaking", "estimate": 76, "target": user.TargetScore, "accuracy": 82, "status": "strong"},
		{"skill": "writing", "name": "Writing", "estimate": 68, "target": user.TargetScore, "accuracy": 71, "status": "weak"},
		{"skill": "reading", "name": "Reading", "estimate": 72, "target": user.TargetScore, "accuracy": 78, "status": "moderate"},
		{"skill": "listening", "name": "Listening", "estimate": 75, "target": user.TargetScore, "accuracy": 84, "status": "strong"},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":        true,
		"user":           user,
		"skillBreakdown": skillBreakdown,
		"targetGapInfo": map[string]interface{}{
			"gap":           user.TargetScore - user.EstimatedScore,
			"formattedText": "3 points to target",
			"isTargetMet":   user.EstimatedScore >= user.TargetScore,
		},
		"readinessScore": user.ReadinessPercentage,
		"isPTE":          isPTE,
	})
}
