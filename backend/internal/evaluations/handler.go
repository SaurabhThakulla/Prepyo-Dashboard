package evaluations

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/prepyo/backend/internal/ai"
	"github.com/prepyo/backend/internal/models"
	"github.com/prepyo/backend/internal/store"
)

type Handler struct {
	store     *store.Store
	aiGateway *ai.Gateway
}

func NewHandler(s *store.Store, g *ai.Gateway) *Handler {
	return &Handler{store: s, aiGateway: g}
}

func (h *Handler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.GetEvaluations)
	r.Post("/", h.CreateEvaluation)
	return r
}

func (h *Handler) GetEvaluations(w http.ResponseWriter, r *http.Request) {
	evals := h.store.GetEvaluations()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":     true,
		"evaluations": evals,
	})
}

func (h *Handler) CreateEvaluation(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Mode                 string           `json:"mode"`
		Exam                 models.ExamType  `json:"exam"`
		Skill                models.SkillType `json:"skill"`
		TypeID               string           `json:"typeId"`
		Prompt               string           `json:"prompt"`
		UserText             string           `json:"userText"`
		AudioDurationSeconds int              `json:"audioDurationSeconds"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	q := &models.Question{
		ID:     "custom-eval",
		Exam:   body.Exam,
		Skill:  body.Skill,
		TypeID: body.TypeID,
		Prompt: body.Prompt,
	}

	var evalResult *models.AIEvaluationResult
	if body.Mode == "speaking" || body.Skill == models.SkillSpeaking {
		evalResult, _ = h.aiGateway.EvaluateSpeaking(r.Context(), q, body.AudioDurationSeconds)
	} else {
		evalResult, _ = h.aiGateway.EvaluateWriting(r.Context(), q, body.UserText)
	}

	h.store.LogEvaluation(*evalResult)
	h.store.AwardXP(50, "AI Evaluation Completed")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":    true,
		"evaluation": evalResult,
		"user":       h.store.GetUser(),
	})
}
