package auth

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
	r.Get("/", h.GetSession)
	r.Post("/", h.HandleAuth)
	return r
}

func (h *Handler) GetSession(w http.ResponseWriter, r *http.Request) {
	user := h.store.GetUser()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"user":    user,
	})
}

func (h *Handler) HandleAuth(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Action      string          `json:"action"`
		Email       string          `json:"email"`
		Name        string          `json:"name"`
		TargetExam  models.ExamType `json:"targetExam"`
		TargetScore float64         `json:"targetScore"`
		NepalRegion string          `json:"nepalRegion"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if body.Action == "register" || body.Action == "signup" {
		updated := h.store.UpdateUser(&models.UserProfile{
			Email:       body.Email,
			Name:        body.Name,
			TargetExam:  body.TargetExam,
			TargetScore: body.TargetScore,
			NepalRegion: body.NepalRegion,
		})
		h.store.AwardXP(100, "Registration Complete")

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"user":    updated,
			"message": "Account created successfully",
		})
		return
	}

	user := h.store.GetUser()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"user":    user,
	})
}
