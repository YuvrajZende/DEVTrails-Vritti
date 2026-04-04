-- ============================================================
-- Vritti Authentication Schema
-- Tables for user authentication and sessions
-- ============================================================

-- 1. AUTH_USERS - User authentication credentials
CREATE TABLE IF NOT EXISTS auth_users (
    id              SERIAL PRIMARY KEY,
    phone           VARCHAR(15) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    salt            VARCHAR(255) NOT NULL,
    is_verified     BOOLEAN NOT NULL DEFAULT false,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    last_login_at   TIMESTAMP
);

-- 2. OTP_VERIFICATIONS - OTP codes for phone verification
CREATE TABLE IF NOT EXISTS otp_verifications (
    id              SERIAL PRIMARY KEY,
    phone           VARCHAR(15) NOT NULL,
    otp_code        VARCHAR(6) NOT NULL,
    expires_at      TIMESTAMP NOT NULL,
    is_used         BOOLEAN NOT NULL DEFAULT false,
    attempts        INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. AUTH_SESSIONS - Active user sessions (JWT tokens)
CREATE TABLE IF NOT EXISTS auth_sessions (
    id              SERIAL PRIMARY KEY,
    user_id         INT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    token           VARCHAR(500) NOT NULL UNIQUE,
    refresh_token   VARCHAR(500),
    expires_at      TIMESTAMP NOT NULL,
    device_info     JSONB,
    ip_address      VARCHAR(45),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    last_used_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 4. Link auth_users to workers table
ALTER TABLE workers ADD COLUMN IF NOT EXISTS auth_user_id INT REFERENCES auth_users(id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_auth_users_phone ON auth_users(phone);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_verifications(phone, expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON auth_sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON auth_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_workers_auth_user ON workers(auth_user_id);
