-- ---------------------------------------------------------------------------
-- 000003: Referrals, Subscription Bonuses, and Weekly Plan
-- ---------------------------------------------------------------------------

-- 1. Extend users table for referral code and bonus tracking
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS referral_code TEXT,
    ADD COLUMN IF NOT EXISTS bonus_mock_tests INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS bonus_pro_days INT NOT NULL DEFAULT 0;

-- Backfill existing users with unique referral codes
UPDATE users
SET referral_code = 'PREP-' || upper(substr(md5(id::text || email), 1, 6))
WHERE referral_code IS NULL;

ALTER TABLE users
    ALTER COLUMN referral_code SET NOT NULL,
    ADD CONSTRAINT users_referral_code_unique UNIQUE (referral_code);

-- 2. Create referrals ledger table
CREATE TABLE IF NOT EXISTS referrals (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referee_id          UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    referral_code       TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'completed', 'cancelled')),
    reward_referrer_xp  INT NOT NULL DEFAULT 200,
    reward_referee_xp   INT NOT NULL DEFAULT 100,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at        TIMESTAMPTZ,
    CONSTRAINT chk_no_self_referral CHECK (referrer_id <> referee_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);

-- 3. Extend plans table with duration_days and purchase bonus_days
ALTER TABLE plans
    ADD COLUMN IF NOT EXISTS duration_days INT NOT NULL DEFAULT 30,
    ADD COLUMN IF NOT EXISTS bonus_days INT NOT NULL DEFAULT 0;

-- Update existing plans with exact duration and purchase bonus days
UPDATE plans SET duration_days = 0, bonus_days = 0, sort_order = 1 WHERE id = 'free';
UPDATE plans SET duration_days = 30, bonus_days = 3, sort_order = 3 WHERE id = 'pro';
UPDATE plans SET duration_days = 90, bonus_days = 7, sort_order = 4 WHERE id = 'elite';

-- Add Weekly Plan tier
INSERT INTO plans (id, name, price_npr, duration_months, duration_days, bonus_days, features, ai_evaluations_per_day, mock_tests_included, is_popular, sort_order)
VALUES (
    'weekly',
    'Weekly Sprint',
    499,
    0,
    7,
    0,
    ARRAY['7 days intensive sprint', '20 AI evaluations per day', '2 full mock exams', 'All practice question types'],
    20,
    2,
    FALSE,
    2
)
ON CONFLICT (id) DO UPDATE SET
    duration_days = EXCLUDED.duration_days,
    bonus_days = EXCLUDED.bonus_days,
    sort_order = EXCLUDED.sort_order;

-- 4. Create subscription_payments table for idempotent purchase/webhook confirmation
CREATE TABLE IF NOT EXISTS subscription_payments (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id           TEXT NOT NULL REFERENCES plans(id),
    payment_gateway   TEXT NOT NULL,
    transaction_id    TEXT NOT NULL UNIQUE,
    amount_npr        INT NOT NULL,
    status            TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'cancelled')),
    base_days         INT NOT NULL,
    bonus_days        INT NOT NULL DEFAULT 0,
    effective_days    INT NOT NULL,
    processed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_user ON subscription_payments(user_id, created_at DESC);

-- 5. Expand notifications check constraint to allow 'referral'
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('streak', 'evaluation', 'mission', 'system', 'referral'));
