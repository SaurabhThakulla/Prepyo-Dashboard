package mistakes

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
	r.Get("/", h.GetMistakes)
	r.Post("/", h.ResolveMistake)
	return r
}

func (h *Handler) GetMistakes(w http.ResponseWriter, r *http.Request) {
	exam := models.ExamType(r.URL.Query().Get("exam"))
	mistakes := h.store.GetMistakes(exam)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"count":    len(mistakes),
		"mistakes": mistakes,
	})
}

func (h *Handler) ResolveMistake(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Action string `json:"action"`
		ID     string `json:"id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if body.Action == "resolve" && body.ID != "" {
		ok := h.store.ResolveMistake(body.ID)
		h.store.AwardXP(30, "Resolved Mistake in Mistake Bank")

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": ok,
			"user":    h.store.GetUser(),
			"message": "Mistake marked as resolved! +30 XP",
		})
		return
	}

	http.Error(w, "Invalid action", http.StatusBadRequest)
}
