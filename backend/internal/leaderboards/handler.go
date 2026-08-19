package leaderboards

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
	r.Get("/", h.GetLeaderboard)
	return r
}

func (h *Handler) GetLeaderboard(w http.ResponseWriter, r *http.Request) {
	exam := models.ExamType(r.URL.Query().Get("exam"))
	region := r.URL.Query().Get("region")

	users := h.store.GetLeaderboard(exam, region)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":     true,
		"count":       len(users),
		"leaderboard": users,
		"regions":     []string{"all", "Kathmandu", "Pokhara", "Chitwan", "Lalitpur", "Butwal", "Dharan"},
	})
}
