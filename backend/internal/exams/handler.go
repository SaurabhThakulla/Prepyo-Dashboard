package exams

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

type Handler struct{}

func NewHandler() *Handler {
	return &Handler{}
}

func (h *Handler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.GetExams)
	return r
}

func (h *Handler) GetExams(w http.ResponseWriter, r *http.Request) {
	exams := []map[string]interface{}{
		{
			"id":          "PTE",
			"name":        "PTE Academic",
			"version":     "v2026.1",
			"description": "Pearson Test of English Academic preparation with 2-hour full simulation.",
			"skills": []string{"speaking", "writing", "reading", "listening"},
		},
		{
			"id":          "IELTS",
			"name":        "IELTS Academic",
			"version":     "v2026.1",
			"description": "IELTS Academic examination simulator with Band 0-9 rubric evaluation.",
			"skills": []string{"listening", "reading", "writing", "speaking"},
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"exams":   exams,
	})
}
