package notifications

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
	r.Get("/", h.GetNotifications)
	r.Post("/", h.MarkRead)
	return r
}

func (h *Handler) GetNotifications(w http.ResponseWriter, r *http.Request) {
	notifs := h.store.GetNotifications()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":       true,
		"count":         len(notifs),
		"notifications": notifs,
	})
}

func (h *Handler) MarkRead(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Action string `json:"action"`
		ID     string `json:"id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if body.Action == "mark-read" && body.ID != "" {
		h.store.MarkNotificationRead(body.ID)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "Notification marked as read",
		})
		return
	}

	http.Error(w, "Invalid action", http.StatusBadRequest)
}
