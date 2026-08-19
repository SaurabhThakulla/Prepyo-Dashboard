package billing

import (
	"encoding/json"
	"fmt"
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
	r.Get("/plans", h.GetPlans)
	r.Post("/checkout", h.Checkout)
	return r
}

func (h *Handler) GetPlans(w http.ResponseWriter, r *http.Request) {
	plans := []models.SubscriptionPlan{
		{ID: "free", Name: "Free Learner", PriceNPR: 0, DurationMonths: 0, Features: []string{"Core practice tasks", "3 AI evaluations/day", "1 Full Mock Exam"}, AIEvaluationsPerDay: 3, MockTestsIncluded: 1},
		{ID: "pro", Name: "Pro Prep (Monthly)", PriceNPR: 1499, DurationMonths: 1, Features: []string{"Unlimited practice", "30 AI evaluations/day", "5 Full Mock Exams", "Sentence rewrites"}, AIEvaluationsPerDay: 30, MockTestsIncluded: 5, Popular: true},
		{ID: "elite", Name: "Elite Master (3 Months)", PriceNPR: 2999, DurationMonths: 3, Features: []string{"90 days all access", "Unlimited AI evaluations", "15 Mock Exams", "Streak freeze packs"}, AIEvaluationsPerDay: 100, MockTestsIncluded: 15},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"plans":   plans,
	})
}

func (h *Handler) Checkout(w http.ResponseWriter, r *http.Request) {
	var body struct {
		PlanID         string `json:"planId"`
		PaymentGateway string `json:"paymentGateway"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	updated := h.store.UpgradeSubscription(body.PlanID)
	h.store.AwardXP(250, "Subscription Upgraded")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Payment successful via %s! Subscription upgraded to %s.", body.PaymentGateway, body.PlanID),
		"user":    updated,
	})
}
