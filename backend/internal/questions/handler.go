package questions

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
	r.Get("/", h.GetQuestions)
	r.Post("/", h.CreateQuestion)
	return r
}

func (h *Handler) GetQuestions(w http.ResponseWriter, r *http.Request) {
	exam := models.ExamType(r.URL.Query().Get("exam"))
	skill := models.SkillType(r.URL.Query().Get("skill"))
	id := r.URL.Query().Get("id")

	if id != "" {
		q := h.store.GetQuestionByID(id)
		if q == nil {
			http.Error(w, "Question not found", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":  true,
			"question": q,
		})
		return
	}

	questions := h.store.GetQuestions(exam, skill)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"count":     len(questions),
		"questions": questions,
	})
}

func (h *Handler) CreateQuestion(w http.ResponseWriter, r *http.Request) {
	var q models.Question
	if err := json.NewDecoder(r.Body).Decode(&q); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	created := h.store.AddQuestion(q)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"question": created,
	})
}
