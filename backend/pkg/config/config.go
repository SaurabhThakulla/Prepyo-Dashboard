package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port              string
	Environment       string
	DatabaseURL       string
	RedisURL          string
	OpenRouterAPIKey  string
	GeminiAPIKey      string
	AllowedOrigins    []string
	AIModelWriting    string
	AIModelSpeaking   string
	AIModelTutoring   string
}

func Load() *Config {
	port := getEnv("PORT", "8080")
	env := getEnv("APP_ENV", "development")
	dbURL := getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/prepyo?sslmode=disable")
	redisURL := getEnv("REDIS_URL", "redis://localhost:6379")
	openrouterKey := getEnv("OPENROUTER_API_KEY", "")
	geminiKey := getEnv("GEMINI_API_KEY", "")

	return &Config{
		Port:             port,
		Environment:      env,
		DatabaseURL:      dbURL,
		RedisURL:         redisURL,
		OpenRouterAPIKey: openrouterKey,
		GeminiAPIKey:     geminiKey,
		AllowedOrigins:   []string{"http://localhost:3000", "http://127.0.0.1:3000"},
		AIModelWriting:   getEnv("AI_MODEL_WRITING", "openai/gpt-4o-mini"),
		AIModelSpeaking:  getEnv("AI_MODEL_SPEAKING", "prepyo-acoustic-v2"),
		AIModelTutoring:  getEnv("AI_MODEL_TUTORING", "openai/gpt-4o-mini"),
	}
}

func getEnv(key, defaultVal string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	if val, ok := os.LookupEnv(key); ok {
		if intVal, err := strconv.Atoi(val); err == nil {
			return intVal
		}
	}
	return defaultVal
}
