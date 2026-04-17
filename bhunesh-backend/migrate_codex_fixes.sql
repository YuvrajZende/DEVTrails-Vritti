-- Migration: Add missing columns flagged by Codex audit
-- Safe to run multiple times (IF NOT EXISTS / idempotent)

-- 1. Add sensor_source to disruption_events
ALTER TABLE disruption_events
ADD COLUMN IF NOT EXISTS sensor_source VARCHAR(20) NOT NULL DEFAULT 'MANUAL';

-- 2. Add breakdown to claims
ALTER TABLE claims
ADD COLUMN IF NOT EXISTS breakdown JSONB DEFAULT '{}';

-- 3. Add missing worker profile columns used by risk scoring and fraud validation
ALTER TABLE workers
ADD COLUMN IF NOT EXISTS daily_active_hours FLOAT NOT NULL DEFAULT 8;

ALTER TABLE workers
ADD COLUMN IF NOT EXISTS weekly_delivery_days INT NOT NULL DEFAULT 6;

ALTER TABLE workers
ADD COLUMN IF NOT EXISTS earnings_std_dev FLOAT NOT NULL DEFAULT 500;

ALTER TABLE workers
ADD COLUMN IF NOT EXISTS claim_count_90d INT NOT NULL DEFAULT 0;

ALTER TABLE workers
ADD COLUMN IF NOT EXISTS is_part_time BOOLEAN NOT NULL DEFAULT false;
