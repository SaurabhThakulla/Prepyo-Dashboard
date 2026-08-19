-- Prepyo PostgreSQL Schema Definition (v1.0)

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    target_exam VARCHAR(32) NOT NULL DEFAULT 'PTE',
    target_score NUMERIC(4, 1) NOT NULL DEFAULT 79.0,
    estimated_score NUMERIC(4, 1) NOT NULL DEFAULT 68.0,
    readiness_percentage INT NOT NULL DEFAULT 70,
    exam_date DATE,
    nepal_region VARCHAR(64) NOT NULL DEFAULT 'Kathmandu',
    xp INT NOT NULL DEFAULT 0,
    level INT NOT NULL DEFAULT 1,
    streak_days INT NOT NULL DEFAULT 0,
    streak_frozen BOOLEAN NOT NULL DEFAULT FALSE,
    streak_last_active_date DATE DEFAULT CURRENT_DATE,
    subscription_tier VARCHAR(32) NOT NULL DEFAULT 'free',
    subscription_valid_until DATE,
    daily_evaluations_used INT NOT NULL DEFAULT 0,
    daily_evaluations_limit INT NOT NULL DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS questions (
    id VARCHAR(64) PRIMARY KEY,
    exam VARCHAR(32) NOT NULL,
    skill VARCHAR(32) NOT NULL,
    type_id VARCHAR(64) NOT NULL,
    type_name VARCHAR(128) NOT NULL,
    title VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    context_passage TEXT,
    audio_url TEXT,
    audio_transcript TEXT,
    image_url TEXT,
    prep_time_seconds INT DEFAULT 0,
    time_limit_seconds INT NOT NULL,
    options JSONB,
    correct_answers JSONB,
    blanks JSONB,
    model_answer TEXT,
    explanation TEXT,
    difficulty VARCHAR(32) NOT NULL DEFAULT 'medium',
    tags TEXT[] DEFAULT '{}',
    points INT NOT NULL DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS practice_attempts (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    question_id VARCHAR(64) REFERENCES questions(id) ON DELETE CASCADE,
    user_response TEXT,
    score NUMERIC(5, 2) NOT NULL,
    max_score NUMERIC(5, 2) NOT NULL,
    accuracy_percentage INT NOT NULL,
    feedback TEXT,
    time_spent_seconds INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mock_attempts (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    mock_id VARCHAR(64) NOT NULL,
    exam VARCHAR(32) NOT NULL,
    overall_score NUMERIC(5, 2) NOT NULL,
    skill_scores JSONB NOT NULL,
    enabling_skills JSONB,
    total_correct INT NOT NULL,
    total_questions INT NOT NULL,
    duration_seconds INT NOT NULL,
    target_gap NUMERIC(4, 1) NOT NULL,
    readiness_impact INT NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mistakes (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    question_id VARCHAR(64) REFERENCES questions(id) ON DELETE CASCADE,
    error_tag VARCHAR(64) NOT NULL,
    user_response TEXT,
    correct_response TEXT,
    explanation TEXT,
    failed_count INT NOT NULL DEFAULT 1,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    last_attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS xp_transactions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    amount INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_exam_skill ON questions(exam, skill);
CREATE INDEX IF NOT EXISTS idx_mistakes_user_resolved ON mistakes(user_id, resolved);
CREATE INDEX IF NOT EXISTS idx_users_region_xp ON users(nepal_region, xp DESC);
