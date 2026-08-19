package ai

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/prepyo/backend/internal/models"
)

type Handler struct {
	gateway *Gateway
}

func NewHandler(g *Gateway) *Handler {
	return &Handler{gateway: g}
}

func (h *Handler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Post("/tutor", h.ChatTutor)
	return r
}

func (h *Handler) ChatTutor(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Messages []struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"messages"`
		Exam models.ExamType `json:"exam"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	lastPrompt := ""
	if len(body.Messages) > 0 {
		lastPrompt = body.Messages[len(body.Messages)-1].Content
	}

	exam := body.Exam
	if exam == "" {
		exam = models.ExamPTE
	}

	reply := h.gateway.TutorReply(r.Context(), lastPrompt, exam)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"reply":   reply,
	})
}
