-- ============================================================
-- Vritti — Test User Seed Data
-- Creates a COMPLETE test user across all tables for E2E testing
--
-- Credentials:
--   Phone:    9999900000
--   Password: test123456
--   Worker:   w_test_001  (Amazon, Vadodara VAD-04)
-- ============================================================

-- ===================== CLEANUP (idempotent) =====================
DELETE FROM payouts WHERE id = 'pay_test_001';
DELETE FROM claims WHERE id = 'clm_test_001';
DELETE FROM policies WHERE id = 'pol_test_001';
DELETE FROM disruption_events WHERE id = 'evt_test_001';
DELETE FROM workers WHERE id = 'w_test_001';
DELETE FROM auth_sessions WHERE user_id IN (SELECT id FROM auth_users WHERE phone = '9999900000');
DELETE FROM otp_verifications WHERE phone = '9999900000';
DELETE FROM auth_users WHERE phone = '9999900000';

-- ===================== 1. AUTH USER =====================
-- Password: test123456
-- Salt: vritti_test_salt_2024  (fixed for reproducibility)
-- Hash: pbkdf2(test123456, vritti_test_salt_2024, 10000 iterations, 64 bytes, sha512)
-- NOTE: The actual hash is generated at runtime by the /seed-test-user endpoint.
--       This SQL uses a placeholder that gets replaced by the backend.
INSERT INTO auth_users (phone, password_hash, salt, is_verified, is_active)
VALUES (
    '9999900000',
    '__PASSWORD_HASH_PLACEHOLDER__',
    '__SALT_PLACEHOLDER__',
    true,
    true
);

-- ===================== 2. WORKER =====================
-- Ensure zone VAD-04 exists (should already exist from seed.sql)
INSERT INTO workers (
    id, phone, name, platform, partner_id, zone_id,
    language, device_fingerprint, upi_id,
    tenure_weeks, avg_weekly_earnings,
    latest_risk_score, latest_premium_tier, latest_coverage_cap,
    last_quote_at, auth_user_id
) VALUES (
    'w_test_001',
    '9999900000',
    'Test User Vritti',
    'Amazon',
    'AMZ-TEST-001',
    'VAD-04',
    'en',
    'fp_test_device_001',
    'testuser@upi',
    12,
    3500,
    0.35,
    25,
    500,
    NOW(),
    (SELECT id FROM auth_users WHERE phone = '9999900000')
);

-- ===================== 3. ACTIVE POLICY =====================
INSERT INTO policies (
    id, worker_id, week_start, week_end,
    premium_paid, coverage_cap, risk_score, status
) VALUES (
    'pol_test_001',
    'w_test_001',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '6 days',
    25.0,
    500.0,
    0.35,
    'ACTIVE'
);

-- ===================== 4. DISRUPTION EVENT =====================
INSERT INTO disruption_events (
    id, zone_id, trigger_id, severity,
    disruption_start, started_at
) VALUES (
    'evt_test_001',
    'VAD-04',
    'T1_HEAT',
    'HIGH',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '2 hours'
);

-- ===================== 5. CLAIM (APPROVED) =====================
INSERT INTO claims (
    id, policy_id, worker_id, trigger_id,
    initiated_at, fraud_score, recommendation,
    payout_amount, status, flags
) VALUES (
    'clm_test_001',
    'pol_test_001',
    'w_test_001',
    'T1_HEAT',
    NOW() - INTERVAL '1 hour',
    0.08,
    'AUTO_APPROVE',
    500.0,
    'PAID',
    '[]'
);

-- ===================== 6. PAYOUT (PAID) =====================
INSERT INTO payouts (
    id, claim_id, worker_id, amount,
    upi_id, razorpay_payout_id, status, paid_at
) VALUES (
    'pay_test_001',
    'clm_test_001',
    'w_test_001',
    500.0,
    'testuser@upi',
    'rzp_test_mock_001',
    'PAID',
    NOW() - INTERVAL '30 minutes'
);
