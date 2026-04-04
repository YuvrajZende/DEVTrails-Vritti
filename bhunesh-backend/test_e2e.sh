#!/usr/bin/env bash
# ============================================================
# Vritti — End-to-End Flow Test Script
#
# Tests EVERY backend flow with a fresh user:
#   signup → verify OTP → login → onboard → policy → claim → payout
#
# Usage:
#   bash test_e2e.sh                                    # localhost:8000
#   BASE_URL=https://your-backend.railway.app bash test_e2e.sh
# ============================================================

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
PHONE="9999900000"
PASSWORD="test123456"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PASS=0
FAIL=0

step() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  STEP $1: $2${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

check() {
    local label=$1
    local status=$2
    if [ "$status" -eq 0 ]; then
        echo -e "  ${GREEN}✓ $label${NC}"
        PASS=$((PASS + 1))
    else
        echo -e "  ${RED}✗ $label${NC}"
        FAIL=$((FAIL + 1))
    fi
}

echo ""
echo -e "${YELLOW}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║       VRITTI — End-to-End Flow Tests                ║${NC}"
echo -e "${YELLOW}║       Backend: ${BASE_URL}              ${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════════╝${NC}"

# ----------------------------------------------------------
# STEP 0: Health Check
# ----------------------------------------------------------
step 0 "Health Check"
HEALTH=$(curl -s -w "\n%{http_code}" "${BASE_URL}/health" 2>/dev/null)
HTTP_CODE=$(echo "$HEALTH" | tail -1)
BODY=$(echo "$HEALTH" | head -1)
echo "  Response: $BODY"
[ "$HTTP_CODE" = "200" ] && check "Health endpoint" 0 || check "Health endpoint" 1

# ----------------------------------------------------------
# STEP 1: Signup
# ----------------------------------------------------------
step 1 "POST /auth/signup"
SIGNUP=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/auth/signup" \
    -H "Content-Type: application/json" \
    -d "{\"phone\":\"${PHONE}\",\"password\":\"${PASSWORD}\",\"name\":\"Test User Vritti\"}" 2>/dev/null)
HTTP_CODE=$(echo "$SIGNUP" | tail -1)
BODY=$(echo "$SIGNUP" | sed '$d')
echo "  HTTP: $HTTP_CODE"
echo "  Body: $BODY"

# 201 = new user, 409 = already exists (both OK for re-runs)
if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "409" ]; then
    check "Signup" 0
else
    check "Signup" 1
fi

# Extract OTP if signup was fresh
OTP_CODE=$(echo "$BODY" | grep -o '"otp_code":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
USER_ID=$(echo "$BODY" | grep -o '"user_id":[0-9]*' | head -1 | cut -d: -f2 || true)
echo "  OTP: ${OTP_CODE:-'(not returned — may already be verified)'}"

# ----------------------------------------------------------
# STEP 2: Verify OTP
# ----------------------------------------------------------
step 2 "POST /auth/verify-otp"
if [ -n "$OTP_CODE" ]; then
    VERIFY=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/auth/verify-otp" \
        -H "Content-Type: application/json" \
        -d "{\"phone\":\"${PHONE}\",\"otp_code\":\"${OTP_CODE}\"}" 2>/dev/null)
    HTTP_CODE=$(echo "$VERIFY" | tail -1)
    BODY=$(echo "$VERIFY" | sed '$d')
    echo "  HTTP: $HTTP_CODE"
    echo "  Body: $BODY"
    [ "$HTTP_CODE" = "200" ] && check "OTP Verify" 0 || check "OTP Verify" 1
else
    echo "  Skipped (OTP not available — user likely already verified)"
    check "OTP Verify (skip)" 0
fi

# ----------------------------------------------------------
# STEP 3: Login
# ----------------------------------------------------------
step 3 "POST /auth/login"
LOGIN=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"phone\":\"${PHONE}\",\"password\":\"${PASSWORD}\"}" 2>/dev/null)
HTTP_CODE=$(echo "$LOGIN" | tail -1)
BODY=$(echo "$LOGIN" | sed '$d')
echo "  HTTP: $HTTP_CODE"
echo "  Body: $BODY"

TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
echo "  Token: ${TOKEN:0:30}..."
[ "$HTTP_CODE" = "200" ] && [ -n "$TOKEN" ] && check "Login" 0 || check "Login" 1

# ----------------------------------------------------------
# STEP 4: Worker Onboard
# ----------------------------------------------------------
step 4 "POST /worker/onboard"
ONBOARD=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/worker/onboard" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "{
        \"phone\": \"${PHONE}\",
        \"name\": \"Test User Vritti\",
        \"platform\": \"Amazon\",
        \"partner_id\": \"AMZ-TEST-E2E-001\",
        \"zone_id\": \"VAD-04\",
        \"language\": \"en\",
        \"upi_id\": \"testuser@upi\",
        \"tenure_weeks\": 12,
        \"avg_weekly_earnings\": 3500
    }" 2>/dev/null)
HTTP_CODE=$(echo "$ONBOARD" | tail -1)
BODY=$(echo "$ONBOARD" | sed '$d')
echo "  HTTP: $HTTP_CODE"
echo "  Body: $BODY"

WORKER_ID=$(echo "$BODY" | grep -o '"worker_id":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
echo "  Worker ID: ${WORKER_ID:-'(check body)'}"

# 201 = new, 409 = already exists (both OK)
if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "409" ]; then
    check "Worker Onboard" 0
    # If 409, extract worker_id from the error response
    if [ -z "$WORKER_ID" ]; then
        WORKER_ID=$(echo "$BODY" | grep -o '"worker_id":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
    fi
else
    check "Worker Onboard" 1
fi

# Fallback worker ID
WORKER_ID="${WORKER_ID:-w_test_001}"
echo "  Using Worker ID: $WORKER_ID"

# ----------------------------------------------------------
# STEP 5: Activate Policy
# ----------------------------------------------------------
step 5 "POST /policy/activate"
POLICY=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/policy/activate" \
    -H "Content-Type: application/json" \
    -d "{
        \"worker_id\": \"${WORKER_ID}\",
        \"payment_reference\": \"PAY-TEST-E2E-001\"
    }" 2>/dev/null)
HTTP_CODE=$(echo "$POLICY" | tail -1)
BODY=$(echo "$POLICY" | sed '$d')
echo "  HTTP: $HTTP_CODE"
echo "  Body: $BODY"

POLICY_ID=$(echo "$BODY" | grep -o '"policy_id":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
echo "  Policy ID: ${POLICY_ID:-'(check body)'}"
[ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ] && check "Policy Activate" 0 || check "Policy Activate" 1

# ----------------------------------------------------------
# STEP 6: Check Policy Status
# ----------------------------------------------------------
step 6 "GET /policy/status/${WORKER_ID}"
STATUS=$(curl -s -w "\n%{http_code}" "${BASE_URL}/policy/status/${WORKER_ID}" 2>/dev/null)
HTTP_CODE=$(echo "$STATUS" | tail -1)
BODY=$(echo "$STATUS" | sed '$d')
echo "  HTTP: $HTTP_CODE"
echo "  Body: $BODY"
[ "$HTTP_CODE" = "200" ] && check "Policy Status" 0 || check "Policy Status" 1

# ----------------------------------------------------------
# STEP 7: Initiate Claim (simulate disruption)
# ----------------------------------------------------------
step 7 "POST /claim/initiate"
CLAIM=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/claim/initiate" \
    -H "Content-Type: application/json" \
    -d "{
        \"zone_id\": \"VAD-04\",
        \"trigger_id\": \"T1_HEAT_TEST\",
        \"severity\": \"HIGH\",
        \"disruption_start\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
        \"affected_workers\": [\"${WORKER_ID}\"]
    }" 2>/dev/null)
HTTP_CODE=$(echo "$CLAIM" | tail -1)
BODY=$(echo "$CLAIM" | sed '$d')
echo "  HTTP: $HTTP_CODE"
echo "  Body: $BODY"

CLAIM_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
echo "  Claim ID: ${CLAIM_ID:-'(check claims array in body)'}"
[ "$HTTP_CODE" = "200" ] && check "Claim Initiate" 0 || check "Claim Initiate" 1

# ----------------------------------------------------------
# STEP 8: Process Payout
# ----------------------------------------------------------
step 8 "POST /payout/process"
if [ -n "$CLAIM_ID" ]; then
    PAYOUT=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/payout/process" \
        -H "Content-Type: application/json" \
        -d "{
            \"claim_id\": \"${CLAIM_ID}\",
            \"worker_id\": \"${WORKER_ID}\",
            \"upi_id\": \"testuser@upi\",
            \"status\": \"PAID\"
        }" 2>/dev/null)
    HTTP_CODE=$(echo "$PAYOUT" | tail -1)
    BODY=$(echo "$PAYOUT" | sed '$d')
    echo "  HTTP: $HTTP_CODE"
    echo "  Body: $BODY"
    [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ] && check "Payout Process" 0 || check "Payout Process" 1
else
    echo "  Skipped — no claim ID from previous step"
    check "Payout Process (skip)" 1
fi

# ----------------------------------------------------------
# STEP 9: Payout History
# ----------------------------------------------------------
step 9 "GET /payout/history/${WORKER_ID}"
HISTORY=$(curl -s -w "\n%{http_code}" "${BASE_URL}/payout/history/${WORKER_ID}" 2>/dev/null)
HTTP_CODE=$(echo "$HISTORY" | tail -1)
BODY=$(echo "$HISTORY" | sed '$d')
echo "  HTTP: $HTTP_CODE"
echo "  Body: $BODY"
[ "$HTTP_CODE" = "200" ] && check "Payout History" 0 || check "Payout History" 1

# ----------------------------------------------------------
# STEP 10: Auth Me (session check)
# ----------------------------------------------------------
step 10 "GET /auth/me"
ME=$(curl -s -w "\n%{http_code}" "${BASE_URL}/auth/me" \
    -H "Authorization: Bearer ${TOKEN}" 2>/dev/null)
HTTP_CODE=$(echo "$ME" | tail -1)
BODY=$(echo "$ME" | sed '$d')
echo "  HTTP: $HTTP_CODE"
echo "  Body: $BODY"
[ "$HTTP_CODE" = "200" ] && check "Auth Me" 0 || check "Auth Me" 1

# ----------------------------------------------------------
# SUMMARY
# ----------------------------------------------------------
echo ""
echo -e "${YELLOW}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║                    TEST RESULTS                     ║${NC}"
echo -e "${YELLOW}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${YELLOW}║  ${GREEN}Passed: ${PASS}${YELLOW}                                        ║${NC}"
echo -e "${YELLOW}║  ${RED}Failed: ${FAIL}${YELLOW}                                        ║${NC}"
echo -e "${YELLOW}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${YELLOW}║  Test User Credentials:                             ║${NC}"
echo -e "${YELLOW}║    Phone:    ${PHONE}                          ║${NC}"
echo -e "${YELLOW}║    Password: ${PASSWORD}                        ║${NC}"
echo -e "${YELLOW}║    Worker:   ${WORKER_ID}                             ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$FAIL" -gt 0 ]; then
    exit 1
fi
