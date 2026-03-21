# NEVIL — Backend API & Database

> **Role:** Backend Engineer — Central API & Data Layer  
> **Deadline:** March 30, 2026 (API deployed on Railway)  
> **Status:** 🟡 Can start DB schema now. Needs Yuvraj's `/risk-score` URL by March 28.

---

## The Big Picture — What is Vritti?

Vritti is **parametric income insurance for India's gig delivery workers.** Workers pay ₹35–₹80/week. When their delivery zone gets hit by a flood, AQI spike, or curfew, money lands in their UPI within 2 hours — fully automatic.

**The full system has 5 pieces, and you are the central hub:**

1. **Bhunesh's mobile app** — what the worker sees. Calls YOUR API for everything.
2. **YOUR backend + database** — stores all data, orchestrates all flows, connects everything.
3. **Yuvraj's risk model** — YOU call his `/risk-score` during onboarding to get premium quotes.
4. **Sairaj's fraud engine** — YOU call his `/fraud-validate` when processing claims.
5. **Shivam's n8n workflows** — calls YOUR API to initiate claims. Reads/writes YOUR database directly.

**Everything flows through you.** If your API is down, the app shows nothing, claims can't be created, and payouts can't be tracked. If your database schema is wrong, Sairaj can't query worker history and Shivam can't update claim statuses.

---

## What You're Building

### The Database (PostgreSQL on Neon)

6 tables that store the entire state of the Vritti system:

| Table | What it stores | Who reads/writes it |
|---|---|---|
| `zones` | Geographic delivery zones with risk metadata | You seed it. Sairaj queries it. Shivam reads it. |
| `workers` | Gig worker profiles — phone, platform, zone, UPI, tenure | You create on onboard. Everyone reads. |
| `policies` | Weekly insurance policies — one per worker per week | You create on activation. Shivam updates on renewal. |
| `claims` | Auto-created claims per disruption event | You create. Sairaj's fraud score updates them. Shivam updates status. |
| `payouts` | UPI payout records with Razorpay references | Shivam creates after approval. Bhunesh reads for history. |
| `disruption_events` | Logged disruptions per zone | Shivam creates when triggers fire. Sairaj reads for Layer 4. |

### The API (Fastify on Node.js)

6 REST endpoints that the app, n8n, and admin tools call.

---

## Database Schema — Table by Table

### `zones` table

This is seeded by you on Day 1. It doesn't change during runtime.

| Column | Type | Purpose |
|---|---|---|
| `id` | VARCHAR(20), PRIMARY KEY | Zone code like "VAD-04" |
| `name` | VARCHAR(100) | Human-readable: "Vadodara Zone 4" |
| `city` | VARCHAR(100) | City name |
| `state` | VARCHAR(100) | State name |
| `polygon_coords` | JSONB | Array of lat/lng points defining zone boundary (nullable for MVP) |
| `flood_history` | BOOLEAN | Has this zone flooded before? |
| `avg_disruption_days` | INT | Average disruption days per year |
| `aqi_baseline` | INT | Average AQI reading |
| `is_high_risk` | BOOLEAN | Composite risk flag |
| `created_at` | TIMESTAMP | Auto-set |

**Seed with 5 real Indian zones:** Vadodara (VAD-04), Mumbai Andheri (MUM-07), Delhi Dwarka (DEL-12), Bangalore Whitefield (BLR-03), Chennai Tambaram (CHN-06). Look up realistic AQI and flood data for each.

### `workers` table

Created when a worker onboards through the app.

| Column | Type | Purpose | Notes |
|---|---|---|---|
| `id` | VARCHAR(20), PK | Worker ID | "w_0001" format |
| `phone` | VARCHAR(15), UNIQUE | Mobile number | Required, unique |
| `name` | VARCHAR(100) | Worker's name | Optional |
| `platform` | VARCHAR(20) | Amazon / Flipkart / Meesho / Other | Required |
| `partner_id` | VARCHAR(50), UNIQUE | Platform partner ID | From their delivery app |
| `zone_id` | VARCHAR(20), FK → zones | Delivery zone | Based on location |
| `language` | VARCHAR(10) | hi / gu / mr / ta / te | Default: "hi" |
| `device_fingerprint` | VARCHAR(100) | Unique device hash | For anti-spoofing |
| `upi_id` | VARCHAR(100) | Payment destination | e.g., "raju@upi" |
| `is_active` | BOOLEAN | Currently active? | Default: true |
| `tenure_weeks` | INT | Weeks on platform | Default: 0, incremented weekly |
| `avg_weekly_earnings` | FLOAT | Average weekly income | Default: 0 |
| `created_at` | TIMESTAMP | Registration time | Auto-set |

**Seed 10 mock workers** across the 5 zones with realistic Indian names, phone numbers, UPI IDs, and varied tenure/earnings.

### `policies` table

One row per worker per week. Created when the worker pays their premium.

| Column | Type | Purpose |
|---|---|---|
| `id` | VARCHAR(30), PK | Policy ID |
| `worker_id` | FK → workers | Who this policy covers |
| `week_start` | DATE | Monday of coverage week |
| `week_end` | DATE | Sunday of coverage week |
| `premium_paid` | FLOAT | Amount paid in ₹ |
| `coverage_cap` | FLOAT | Max payout in ₹ |
| `risk_score` | FLOAT | Score from Yuvraj's model |
| `status` | VARCHAR(20) | ACTIVE / EXPIRED / CANCELLED |
| `created_at` | TIMESTAMP | Auto-set |

### `claims` table

Auto-created when a disruption event is detected. One claim per affected worker.

| Column | Type | Purpose |
|---|---|---|
| `id` | VARCHAR(30), PK | Claim ID |
| `policy_id` | FK → policies | Which policy this claim is against |
| `worker_id` | FK → workers | Who is claiming |
| `trigger_id` | VARCHAR(5) | T1/T2/T3/T4/T5 |
| `initiated_at` | TIMESTAMP | When claim was created |
| `fraud_score` | FLOAT | From Sairaj's engine (null initially) |
| `recommendation` | VARCHAR(20) | AUTO_APPROVE / PARTIAL_PAYOUT / HOLD |
| `payout_amount` | FLOAT | Calculated payout in ₹ |
| `status` | VARCHAR(20) | PENDING → APPROVED / PARTIAL / HOLD → PAID |
| `flags` | JSONB | Fraud flags array from Sairaj (default: empty array) |

### `payouts` table

Created after a claim is approved and the Razorpay payout is initiated.

| Column | Type | Purpose |
|---|---|---|
| `id` | VARCHAR(30), PK | Payout ID |
| `claim_id` | FK → claims | Which claim triggered this |
| `worker_id` | FK → workers | Who gets paid |
| `amount` | FLOAT | Payout amount in ₹ |
| `upi_id` | VARCHAR(100) | Where money goes |
| `razorpay_payout_id` | VARCHAR(100) | Razorpay reference |
| `status` | VARCHAR(20) | PENDING / PAID / FAILED |
| `paid_at` | TIMESTAMP | When payment confirmed (nullable) |
| `created_at` | TIMESTAMP | Auto-set |

### `disruption_events` table

Logged every time Shivam's n8n detects a disruption. Used by Sairaj's Layer 3/4 checks.

| Column | Type | Purpose |
|---|---|---|
| `id` | VARCHAR(30), PK | Event ID |
| `zone_id` | FK → zones | Which zone was affected |
| `trigger_id` | VARCHAR(5) | T1/T2/T3/T4/T5 |
| `severity` | VARCHAR(10) | LOW / MEDIUM / HIGH |
| `started_at` | TIMESTAMP | When disruption began |
| `resolved_at` | TIMESTAMP | When it ended (nullable) |
| `created_at` | TIMESTAMP | When we logged it |

---

## API Endpoints — What Each One Does

### `POST /worker/onboard`

**Called by:** Bhunesh's mobile app during onboarding

**What it does:**
1. Receives: phone number, name, platform (Amazon/Flipkart/Meesho), partner ID, zone ID, device fingerprint, UPI ID
2. Validates phone is 10 digits and partner ID is 6+ characters (mock verification — any valid format passes)
3. Creates a worker record in the database
4. Calls **Yuvraj's `POST /risk-score`** with the worker's profile data (tenure, zone disruption days, AQI baseline, etc.)
5. Returns: worker_id, risk_score, premium_tier (₹ amount), coverage_cap

**What Yuvraj's API needs from you:** tenure_weeks, daily_active_hours, weekly_delivery_days, avg_weekly_earnings, earnings_std_dev, claim_count_90d, zone_disruption_days, zone_aqi_baseline, is_monsoon_season, is_flood_prone_zone, is_part_time. For new workers, set sensible defaults (tenure=0, claim_count=0, earnings from zone average).

### `POST /policy/activate`

**Called by:** Bhunesh's mobile app after UPI payment

**What it does:**
1. Receives: worker_id, payment_reference (from UPI)
2. Creates a policy record with week_start = next Monday, week_end = following Sunday
3. Returns: policy_id, week_start, week_end, coverage_cap

### `GET /policy/status/:worker_id`

**Called by:** Bhunesh's mobile app on home screen load

**What it does:**
1. Fetches the most recent policy for this worker
2. Determines status: ACTIVE (valid this week), RENEW_TODAY (expires today), or EXPIRED
3. Returns: status, coverage_cap, renewal_date, last_payout (amount + date of most recent payout, if any)

### `POST /claim/initiate`

**Called by:** Shivam's n8n Orchestrator (Workflow 3)

**What it does:**
1. Receives: a DISRUPTION_EVENT payload (zone_id, trigger_id, severity, start/end times, affected worker list)
2. Finds all workers in the affected zone who have active policies
3. Creates a claim record for EACH worker (status: PENDING)
4. Calls **Sairaj's `POST /fraud-validate`** for each claim, passing the claim data + sensor data
5. Updates each claim with the returned fraud_score, recommendation, and flags
6. Returns: number of claims created, number auto-approved, number held

**Important:** Use a database transaction for the bulk create. If 3 out of 10 claims fail to process, you don't want 7 orphaned claims with no fraud scores.

### `GET /payout/history/:worker_id`

**Called by:** Bhunesh's mobile app on payout history screen

**What it does:**
1. Fetches all payouts for this worker, ordered by date (most recent first)
2. Returns: array of { amount, trigger_id (so app can show 🌧️ or 🌫️ icon), paid_at, status }

### `POST /admin/override`

**Called by:** Admin dashboard (or manual curl for demo)

**What it does:**
1. Receives: zone_id, trigger_id, severity (for manually triggering T4 curfew events)
2. Creates a disruption_event record in the database
3. Forwards the event to Shivam's n8n Orchestrator webhook URL
4. Returns: event_id, status: "forwarded"

---

## Tech Stack Details

**Framework:** Fastify (Node.js) — fast, lightweight, built-in schema validation. Install: `fastify`, `@fastify/postgres`, `@fastify/cors`, `axios`, `dotenv`

**Database:** Neon PostgreSQL (free tier at neon.tech). Serverless Postgres, no server management.

**Environment variables you'll need:**
- `DATABASE_URL` — Neon connection string
- `RISK_SCORE_URL` — Yuvraj's Railway URL (available March 28; use mock until then)
- `FRAUD_VALIDATE_URL` — Sairaj's Railway URL (available April 1; use mock until then)
- `N8N_ORCHESTRATOR_URL` — Shivam's n8n webhook URL
- `PORT` — 3000

**Deployment:** Dockerize with `node:20-slim`. Run on Railway. Share the base URL with Bhunesh and Shivam immediately.

---

## What to Mock Until Dependencies Are Ready

| Dependency | Available | Mock behavior until then |
|---|---|---|
| Yuvraj's `/risk-score` | March 28 | Return `{ risk_score: 0.40, premium_tier: 49, coverage_cap: 800 }` for any input |
| Sairaj's `/fraud-validate` | April 1 | Return `{ fraud_score: 0.15, recommendation: "AUTO_APPROVE", payout_amount: 800, flags: [], layers_triggered: ["LAYER_1_PASS"] }` |
| Shivam's n8n webhook | March 29 | Log the payload and skip the HTTP forward |

---

## Timeline

| Date | Deliverable |
|---|---|
| **Mar 21** | Start schema.sql + seed.sql |
| **Mar 25** | 🚨 DB live on Neon. Connection string shared with Sairaj + Shivam. |
| **Mar 28** | All 6 endpoints working locally (with mocks for ML services) |
| **Mar 30** | 🚨 **API deployed on Railway.** URL shared with Bhunesh + Shivam. |
| **Apr 3** | Integration test with all services |

## Definition of Done

- [ ] Schema SQL committed and running on Neon
- [ ] Seed data: 5 zones + 10 workers
- [ ] All 6 endpoints working locally
- [ ] Mock responses for risk-score and fraud-validate until real services are live
- [ ] Deployed on Railway
- [ ] Base URL shared with Bhunesh and Shivam
- [ ] Connection string shared with Sairaj and Shivam
- [ ] `GET /health` responding

## Things That Will Bite You

- **Don't wait for Yuvraj or Sairaj.** Mock their APIs. Build and test your entire flow without them. Swap in real URLs when they deploy.
- **Enable CORS.** Bhunesh's app calls from a different origin. Use `@fastify/cors` with `allow_origins: ["*"]`. Without this, every request from the mobile app silently fails.
- **Neon cold starts.** Free tier databases sleep after 5 min idle. First query takes ~2 seconds. Add connection retry logic or accept the latency for the hackathon.
- **Date math.** Week boundaries are Monday 00:00 UTC to Sunday 23:59 UTC. Indian workers are UTC+5:30, so be deliberate about timezone handling.
- **Bulk claim creation.** `/claim/initiate` creates claims for EVERY worker in a zone. Wrap in a transaction — partial creates will cause inconsistent state.
- **Store dates in UTC.** Convert to local time only in the mobile app.
