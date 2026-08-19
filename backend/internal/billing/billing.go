// Package billing owns plans and entitlements.
//
// Entitlements are read from the database on every check rather than cached on
// the user row, so a plan change takes effect immediately and a stale counter
// cannot grant access nobody paid for.
//
// No payment provider is wired up yet (the spec still lists that as an open
// decision), so checkout returns "not implemented". It deliberately does not
// grant a plan for free.
package billing

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/prepyo/backend/internal/database"
	"github.com/prepyo/backend/internal/models"
)

var ErrPlanNotFound = errors.New("plan not found")

type Repository struct {
	db database.DB
}

func NewRepository(db database.DB) *Repository {
	return &Repository{db: db}
}

const planFields = `id, name, price_npr, duration_months, features, ai_evaluations_per_day, mock_tests_included, is_popular`

func (r *Repository) Plans(ctx context.Context) ([]models.Plan, error) {
	rows, err := r.db.Query(ctx, `SELECT `+planFields+` FROM plans ORDER BY sort_order`)
	if err != nil {
		return nil, fmt.Errorf("list plans: %w", err)
	}
	defer rows.Close()

	plans := []models.Plan{}
	for rows.Next() {
		var p models.Plan
		if err := rows.Scan(&p.ID, &p.Name, &p.PriceNPR, &p.DurationMonths, &p.Features,
			&p.AIEvaluationsPerDay, &p.MockTestsIncluded, &p.IsPopular); err != nil {
			return nil, fmt.Errorf("scan plan: %w", err)
		}
		plans = append(plans, p)
	}
	return plans, rows.Err()
}

func (r *Repository) Plan(ctx context.Context, id string) (models.Plan, error) {
	var p models.Plan
	err := r.db.QueryRow(ctx, `SELECT `+planFields+` FROM plans WHERE id = $1`, id).
		Scan(&p.ID, &p.Name, &p.PriceNPR, &p.DurationMonths, &p.Features,
			&p.AIEvaluationsPerDay, &p.MockTestsIncluded, &p.IsPopular)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Plan{}, ErrPlanNotFound
	}
	if err != nil {
		return models.Plan{}, fmt.Errorf("get plan: %w", err)
	}
	return p, nil
}

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// State returns the learner's plan together with today's usage.
func (s *Service) State(ctx context.Context, db database.DB, user models.User) (models.SubscriptionState, error) {
	plan, err := s.effectivePlan(ctx, user)
	if err != nil {
		return models.SubscriptionState{}, err
	}

	// Counting today's rows is the source of truth for usage. A stored counter
	// would need a daily reset job and would drift when one fails.
	var evaluationsToday, mocksThisMonth int
	err = db.QueryRow(ctx, `
		SELECT
			(SELECT count(*) FROM ai_evaluations
			  WHERE user_id = $1 AND created_at >= date_trunc('day', now())),
			(SELECT count(*) FROM mock_attempts
			  WHERE user_id = $1 AND completed_at >= date_trunc('month', now()))`,
		user.ID).Scan(&evaluationsToday, &mocksThisMonth)
	if err != nil {
		return models.SubscriptionState{}, fmt.Errorf("read usage: %w", err)
	}

	state := models.SubscriptionState{
		PlanID:                plan.ID,
		PlanName:              plan.Name,
		IsActive:              planIsActive(user),
		DailyEvaluationsUsed:  evaluationsToday,
		DailyEvaluationsLimit: plan.AIEvaluationsPerDay,
		MockTestsIncluded:     plan.MockTestsIncluded,
		MockTestsUsed:         mocksThisMonth,
	}
	if user.PlanValidUntil != nil {
		state.ValidUntil = user.PlanValidUntil.Format(time.DateOnly)
	}
	return state, nil
}

// ErrLimitReached is returned when an action would exceed the plan allowance.
var ErrLimitReached = errors.New("plan limit reached")

// CheckEvaluationAllowance returns an error when the learner has used up
// today's AI evaluations.
//
// Callers must run this before calling the gateway, not after: the point is to
// avoid paying for a request the plan does not cover.
func (s *Service) CheckEvaluationAllowance(ctx context.Context, db database.DB, user models.User) (models.SubscriptionState, error) {
	state, err := s.State(ctx, db, user)
	if err != nil {
		return state, err
	}
	if state.DailyEvaluationsUsed >= state.DailyEvaluationsLimit {
		return state, ErrLimitReached
	}
	return state, nil
}

// effectivePlan falls back to the free plan once a paid plan has lapsed, so an
// expired subscription cannot keep its higher limits.
func (s *Service) effectivePlan(ctx context.Context, user models.User) (models.Plan, error) {
	if !planIsActive(user) {
		return s.repo.Plan(ctx, "free")
	}
	plan, err := s.repo.Plan(ctx, user.PlanID)
	if errors.Is(err, ErrPlanNotFound) {
		return s.repo.Plan(ctx, "free")
	}
	return plan, err
}

func planIsActive(user models.User) bool {
	if user.PlanID == "free" {
		return true
	}
	if user.PlanValidUntil == nil {
		return false
	}
	return user.PlanValidUntil.After(time.Now())
}
