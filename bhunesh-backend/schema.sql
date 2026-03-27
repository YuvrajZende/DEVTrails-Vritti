-- ============================================================
-- Vritti Backend — Full Database Schema
-- 6 tables: zones, workers, policies, claims, payouts, disruption_events
-- ============================================================

-- Drop existing tables (in dependency order) for clean re-creation
DROP TABLE IF EXISTS payouts CASCADE;
DROP TABLE IF EXISTS claims CASCADE;
DROP TABLE IF EXISTS policies CASCADE;
DROP TABLE IF EXISTS disruption_events CASCADE;
DROP TABLE IF EXISTS workers CASCADE;
DROP TABLE IF EXISTS zones CASCADE;

-- 1. ZONES — Geographic delivery zones with risk metadata
CREATE TABLE zones (
    id              VARCHAR(20) PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    city            VARCHAR(100) NOT NULL,
    state           VARCHAR(100) NOT NULL,
    polygon_coords  JSONB,
    flood_history   BOOLEAN NOT NULL DEFAULT false,
    avg_disruption_days INT NOT NULL DEFAULT 0,
    aqi_baseline    INT NOT NULL DEFAULT 0,
    is_high_risk    BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. WORKERS — Gig worker profiles
CREATE TABLE workers (
    id                  VARCHAR(20) PRIMARY KEY,
    phone               VARCHAR(15) NOT NULL UNIQUE,
    name                VARCHAR(100),
    platform            VARCHAR(20) NOT NULL,
    partner_id          VARCHAR(50) NOT NULL UNIQUE,
    zone_id             VARCHAR(20) NOT NULL REFERENCES zones(id),
    language            VARCHAR(10) NOT NULL DEFAULT 'hi',
    device_fingerprint  VARCHAR(100),
    upi_id              VARCHAR(100),
    is_active           BOOLEAN NOT NULL DEFAULT true,
    tenure_weeks        INT NOT NULL DEFAULT 0,
    avg_weekly_earnings FLOAT NOT NULL DEFAULT 0,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. POLICIES — One per worker per week
CREATE TABLE policies (
    id              VARCHAR(30) PRIMARY KEY,
    worker_id       VARCHAR(20) NOT NULL REFERENCES workers(id),
    week_start      DATE NOT NULL,
    week_end        DATE NOT NULL,
    premium_paid    FLOAT NOT NULL,
    coverage_cap    FLOAT NOT NULL,
    risk_score      FLOAT,
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 4. CLAIMS — One per worker per disruption event
CREATE TABLE claims (
    id              VARCHAR(30) PRIMARY KEY,
    policy_id       VARCHAR(30) NOT NULL REFERENCES policies(id),
    worker_id       VARCHAR(20) NOT NULL REFERENCES workers(id),
    trigger_id      VARCHAR(5) NOT NULL,
    initiated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    fraud_score     FLOAT,
    recommendation  VARCHAR(20),
    payout_amount   FLOAT,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    flags           JSONB NOT NULL DEFAULT '[]'
);

-- 5. PAYOUTS — UPI payout records
CREATE TABLE payouts (
    id                  VARCHAR(30) PRIMARY KEY,
    claim_id            VARCHAR(30) NOT NULL REFERENCES claims(id),
    worker_id           VARCHAR(20) NOT NULL REFERENCES workers(id),
    amount              FLOAT NOT NULL,
    upi_id              VARCHAR(100) NOT NULL,
    razorpay_payout_id  VARCHAR(100),
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    paid_at             TIMESTAMP,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 6. DISRUPTION_EVENTS — Logged disruptions per zone
CREATE TABLE disruption_events (
    id          VARCHAR(30) PRIMARY KEY,
    zone_id     VARCHAR(20) NOT NULL REFERENCES zones(id),
    trigger_id  VARCHAR(5) NOT NULL,
    severity    VARCHAR(10) NOT NULL,
    started_at  TIMESTAMP NOT NULL,
    resolved_at TIMESTAMP,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
