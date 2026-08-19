package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/prepyo/backend/internal/admin"
	"github.com/prepyo/backend/internal/ai"
	"github.com/prepyo/backend/internal/auth"
	"github.com/prepyo/backend/internal/billing"
	"github.com/prepyo/backend/internal/exams"
	"github.com/prepyo/backend/internal/evaluations"
	"github.com/prepyo/backend/internal/gamification"
	"github.com/prepyo/backend/internal/leaderboards"
	"github.com/prepyo/backend/internal/mistakes"
	"github.com/prepyo/backend/internal/mocks"
	"github.com/prepyo/backend/internal/notifications"
	"github.com/prepyo/backend/internal/practice"
	"github.com/prepyo/backend/internal/progress"
	"github.com/prepyo/backend/internal/questions"
	"github.com/prepyo/backend/internal/store"
	"github.com/prepyo/backend/pkg/config"
	"github.com/prepyo/backend/pkg/logger"
)

func main() {
	cfg := config.Load()
	log := logger.New(cfg.Environment)

	log.Info("Starting Prepyo Go Backend API",
		"env", cfg.Environment,
		"port", cfg.Port,
	)

	// Initialize Store and AI Gateway
	appStore := store.New()
	aiGateway := ai.NewGateway(cfg)

	// Setup Router
	r := chi.NewRouter()

	// Global Middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	// CORS Configuration
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health Check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"healthy","service":"prepyo-go-backend","version":"1.0.0"}`))
	})

	// Mount REST APIs at /api/v1
	r.Route("/api/v1", func(api chi.Router) {
		api.Mount("/auth", auth.NewHandler(appStore).Routes())
		api.Mount("/exams", exams.NewHandler().Routes())
		api.Mount("/questions", questions.NewHandler(appStore).Routes())
		api.Mount("/practice", practice.NewHandler(appStore, aiGateway).Routes())
		api.Mount("/mocks", mocks.NewHandler(appStore).Routes())
		api.Mount("/evaluations", evaluations.NewHandler(appStore, aiGateway).Routes())
		api.Mount("/ai", ai.NewHandler(aiGateway).Routes())
		api.Mount("/progress", progress.NewHandler(appStore).Routes())
		api.Mount("/mistakes", mistakes.NewHandler(appStore).Routes())
		api.Mount("/gamification", gamification.NewHandler(appStore).Routes())
		api.Mount("/leaderboards", leaderboards.NewHandler(appStore).Routes())
		api.Mount("/subscriptions", billing.NewHandler(appStore).Routes())
		api.Mount("/notifications", notifications.NewHandler(appStore).Routes())
		api.Mount("/admin", admin.NewHandler(appStore).Routes())
	})

	server := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful Shutdown Channel
	serverErrors := make(chan error, 1)
	go func() {
		log.Info(fmt.Sprintf("Prepyo Go Server listening on port %s", cfg.Port))
		serverErrors <- server.ListenAndServe()
	}()

	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)

	select {
	case err := <-serverErrors:
		log.Error("Error starting server", "error", err)
	case sig := <-shutdown:
		log.Info("Shutdown signal received", "signal", sig)

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := server.Shutdown(ctx); err != nil {
			log.Error("Graceful shutdown failed, forcing close", "error", err)
			server.Close()
		}
		log.Info("Prepyo Go Server exited cleanly")
	}
}
