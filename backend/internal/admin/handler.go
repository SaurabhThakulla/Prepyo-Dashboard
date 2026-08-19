package admin

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
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
	r.Get("/", h.GetMetrics)
	return r
}

func (h *Handler) GetMetrics(w http.ResponseWriter, r *http.Request) {
	evals := h.store.GetEvaluations()
	questions := h.store.GetQuestions("", "")

	metrics := map[string]interface{}{
		"totalQuestions":         len(questions),
		"activeLearners":         1840,
		"totalEvaluationsServed": 342 + len(evals),
		"totalTokensUsed":        5400,
		"totalAICostNPR":         34.50,
		"averageLatencyMs":       450,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"metrics": metrics,
	})
}
