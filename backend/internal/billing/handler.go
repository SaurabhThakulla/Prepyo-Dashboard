package billing

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prepyo/backend/internal/reqctx"
	"github.com/prepyo/backend/pkg/httpx"
)

type Handler struct {
	db      *pgxpool.Pool
	repo    *Repository
	service *Service
	log     *slog.Logger
}

func NewHandler(db *pgxpool.Pool, repo *Repository, service *Service, log *slog.Logger) *Handler {
	return &Handler{db: db, repo: repo, service: service, log: log}
}

// Routes: /plans is public so the pricing page works signed out; the rest need
// a session.
func (h *Handler) Routes(requireUser func(http.Handler) http.Handler) chi.Router {
	r := chi.NewRouter()
	r.Get("/plans", h.plans)

	r.Group(func(private chi.Router) {
		private.Use(requireUser)
		private.Get("/", h.state)
		private.Post("/checkout", h.checkout)
	})
	return r
}

func (h *Handler) plans(w http.ResponseWriter, r *http.Request) {
	plans, err := h.repo.Plans(r.Context())
	if err != nil {
		httpx.Internal(w, h.log, "billing.plans", err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"plans": plans})
}

func (h *Handler) state(w http.ResponseWriter, r *http.Request) {
	user := reqctx.MustUser(r.Context())

	state, err := h.service.State(r.Context(), h.db, user)
	if err != nil {
		httpx.Internal(w, h.log, "billing.state", err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"subscription": state})
}

// checkout is intentionally unimplemented.
//
// Granting a plan here without a verified payment would be the same bug the
// previous version had: an endpoint anyone could call to upgrade themselves for
// free. Wiring this up needs a payment provider, a webhook that verifies its
// signature, and only then a plan change.
func (h *Handler) checkout(w http.ResponseWriter, r *http.Request) {
	httpx.Error(w, http.StatusNotImplemented, httpx.CodeInternal,
		"Payments are not available yet. No charge was made and your plan is unchanged.")
}
