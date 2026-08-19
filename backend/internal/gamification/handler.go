package gamification

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
	r.Get("/", h.GetGamification)
	r.Post("/", h.HandleAction)
	return r
}

func (h *Handler) GetGamification(w http.ResponseWriter, r *http.Request) {
	user := h.store.GetUser()
	missions := h.store.GetMissions()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"user": map[string]interface{}{
			"xp":                   user.XP,
			"level":                user.Level,
			"streakDays":           user.StreakDays,
			"streakFrozen":         user.StreakFrozen,
			"streakLastActiveDate": user.StreakLastActiveDate,
		},
		"dailyMissions":  missions,
		"xpToNextLevel": (user.Level * 400) - user.XP,
	})
}

func (h *Handler) HandleAction(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Action    string `json:"action"`
		MissionID string `json:"missionId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if body.Action == "complete-mission" && body.MissionID != "" {
		mission := h.store.CompleteMission(body.MissionID)
		if mission != nil {
			h.store.AwardXP(mission.XPReward, "Daily Mission Completed")
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"mission": mission,
			"user":    h.store.GetUser(),
		})
		return
	}

	if body.Action == "freeze-streak" {
		updated := h.store.UpdateUser(&models.UserProfile{StreakFrozen: true})
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"user":    updated,
			"message": "Streak Freeze activated for 24 hours!",
		})
		return
	}

	http.Error(w, "Invalid action", http.StatusBadRequest)
}
