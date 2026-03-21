# SAIRAJ — Fraud Detection Engine

> **Role:** ML Engineer — Fraud Detection  
> **Deadline:** April 1, 2026 (`/fraud-validate` live on Railway)  
> **Status:** 🟡 Can start structure now. Needs Nevil's DB connection by March 25.

---

## The Big Picture — What is Vritti?

Vritti is **parametric income insurance for India's gig delivery workers.** A delivery partner (Amazon Flex, Flipkart, Meesho) pays ₹35–₹80/week. When a disruption hits their delivery zone — flood, AQI spike, heatwave, curfew — money lands in their UPI automatically within 2 hours. No paperwork, no claim filing.

**The end-to-end flow:**

1. Worker onboards via mobile app → risk model prices their premium → worker pays
2. n8n workflows monitor weather/AQI/news every 5 minutes
3. Disruption detected in a zone → claim auto-created for every active worker in that zone
4. **YOUR fraud engine validates each claim** → returns approve / partial / hold
5. If approved → payout fires to worker's UPI

**You sit at Step 4.** Every single claim passes through YOUR service before any money moves. You are the gatekeeper between a disruption event and a payout.

---

## What You're Building

A FastAPI service with one endpoint: `POST /fraud-validate`.

**What it receives:** A claim object from Shivam's n8n orchestrator workflow. This contains the claim ID, worker ID, zone ID, which trigger fired (T1–T5), the disruption time window, and sensor data — the worker's GPS coordinates, GPS accuracy in meters, whether their phone's accelerometer shows stationary movement, whether their cell tower matches their zone, their device fingerprint, and their Wi-Fi BSSID.

**What it returns:** A fraud score (0.0–1.0), a recommendation (AUTO_APPROVE / PARTIAL_PAYOUT / HOLD), the calculated payout amount, any fraud flags raised, and which validation layers were triggered.

**How it decides:** You run 4 validation layers + 1 anti-spoofing layer. Each layer checks one dimension of fraud. Each layer can add to a cumulative fraud score. The final score (capped at 1.0) determines the action.

---

## The 5 Validation Layers — What Each One Does and Why

### Layer 1: Zone Match

**The question:** Was this worker actually in their delivery zone when the disruption happened?

**Why it matters:** The most basic fraud is claiming a payout for a disruption in Zone A while physically sitting at home in Zone B. GPS spoofing apps make this trivially easy.

**Three checks in this layer:**

| Check | What you're looking at | Fraud signal | Score to add |
|---|---|---|---|
| GPS inside zone polygon | Is the phone's GPS within the zone's geographic boundary? | GPS outside zone | +0.40 |
| Cell tower match | Does the network tower data agree with the GPS? Spoofers change GPS but can't change which tower their phone connects to. | Cell tower doesn't match zone | +0.35 |
| GPS precision during weather | Real GPS accuracy degrades during rain (20–50m drift). A phone reporting <10m accuracy during a T1 (heavy rain) or T2 (AQI) event is suspiciously precise — likely a spoofing app. | Accuracy < 10m during weather event | +0.25 |

**For the MVP:** Full polygon-based zone checking requires the `shapely` library. Start with a simple bounding box or radius check. If the zone has polygon coordinates in the database, use them; otherwise, check if GPS is within ~11km (0.1 degrees) of the zone center.

---

### Layer 2: Behavioral Baseline Deviation

**The question:** Does the claimed loss match the actual disruption duration?

**Why it matters:** A disruption that lasted 2 hours (9 AM – 11 AM) shouldn't produce a full-day payout. Workers have a 10-hour shift. If the disruption was 2 hours, the expected loss is 2/10 of daily income, not the full coverage cap.

**The calculation:** Take disruption duration in hours, divide by standard shift (10 hours), multiply by the worker's coverage cap. That's the expected payout. If the policy's coverage cap is more than 1.5× the expected payout, flag as overclaim.

**Score to add if triggered:** +0.20, flag: `OVERCLAIM_DETECTED`

**Edge case:** If the worker has no active policy (new worker, policy expired), skip this layer entirely. Don't crash — return a SKIP flag.

---

### Layer 3: Cluster Consensus

**The question:** If this disruption is real, are other workers in the zone also inactive?

**Why it matters:** This is the most powerful fraud signal. A real flood affects EVERYONE in the zone. If one worker is claiming while 90% of the zone kept working normally, the disruption was probably fake or didn't impact them.

**How to check:** Query all active workers in the same zone. Count how many also have claims or show inactivity during the disruption window. Calculate the inactive percentage.

| Zone inactive % | What it means | Score |
|---|---|---|
| < 30% | Almost nobody stopped working. Strong fraud signal. | +0.45 |
| 30–60% | Some stopped, not enough for full confidence. | +0.20 |
| > 60% | Majority inactive. Disruption was real and impactful. | +0.00 (pass) |

**Edge case:** If fewer than 3 workers are in the zone, skip this layer — insufficient data for consensus.

**Why spoofers can't beat this:** A Telegram syndicate can spoof GPS for 50 people, but they can't fake 50 people's delivery app activity going dark simultaneously. Real disruptions cause correlated inactivity.

---

### Layer 4: Temporal Anomaly

**The question:** Are there suspicious timing patterns that indicate gaming behavior?

**Three timing checks:**

| Pattern | What to look for | Why it's suspicious | Score |
|---|---|---|---|
| New account early claim | Worker has < 2 weeks tenure | Someone signed up just to collect a payout | +0.50 |
| Consecutive claims without events | 2+ claims in 14 days, but < 2 actual disruption events logged in their zone | Claiming without matching disruptions = fabricated | +0.35 |
| Claim burst (syndicate signal) | > 10 claims from the same zone within a 5-minute window | Real disruptions produce claims trickling in over 20–40 minutes. A Telegram group broadcasting "claim now!" produces a sub-5-minute spike. | +0.40 |

**The data you need:** Recent claims for the worker (last 14 days), recent disruption events in their zone (last 14 days), and a count of all claims in the zone within a 5-minute window around the disruption start time.

---

### Anti-Spoofing Layer

**The question:** Is the worker's device data consistent with someone who was actually working, or does it look like a spoofing app?

**Three device checks:**

| Check | What to look at | Why it catches spoofers | Score |
|---|---|---|---|
| Accelerometer stationary | The claim input includes an `accelerometer_stationary` boolean. If true: the phone didn't move all shift. | A genuine delivery worker on a bike has constant motion. A phone sitting on a desk at home is stationary. | +0.40 |
| Same Wi-Fi BSSID | Count claims from the same Wi-Fi access point (BSSID) within 4 hours. If > 3 claims from the same BSSID: coordinated fraud. | Multiple "workers" all connected to the same home Wi-Fi = they're all in the same room. | +0.50 |
| Device fingerprint duplicate | Count workers using the same device fingerprint. If > 1: same phone, multiple accounts. | One person running multiple fake accounts from one device. | +0.45 |

---

## Combining the Layers

Run all 5 layers sequentially. Sum the scores from every layer that fires. Cap the total at 1.0 (since multiple layers can fire, raw sum can exceed 1.0).

**Final decision mapping:**

| Fraud Score | Recommendation | Payout |
|---|---|---|
| < 0.3 | AUTO_APPROVE | Full coverage cap |
| 0.3 – 0.6 | PARTIAL_PAYOUT | 80% of coverage cap |
| > 0.6 | HOLD | ₹0 (manual review queue) |

**The response JSON should include:** the rounded fraud score, the recommendation string, the calculated payout amount, an array of flag strings from layers that fired, and an array of all layer results (pass or flag message for each).

---

## Your Input/Output Contract

**Input fields your endpoint must accept:**

| Field | Type | Description |
|---|---|---|
| `claim_id` | string | Unique claim identifier (e.g., "clm_0042") |
| `worker_id` | string | Worker identifier (e.g., "w_0001") |
| `zone_id` | string | Zone where disruption occurred (e.g., "VAD-04") |
| `trigger_id` | string | Which trigger: T1/T2/T3/T4/T5 |
| `disruption_start` | ISO 8601 datetime | When disruption began |
| `disruption_end` | ISO 8601 datetime | When disruption ended |
| `worker_gps_lat` | float | Worker's latitude |
| `worker_gps_lng` | float | Worker's longitude |
| `gps_accuracy_meters` | float | GPS accuracy reading |
| `accelerometer_stationary` | boolean | Was the phone stationary all shift? |
| `cell_tower_zone_match` | boolean | Does cell tower data match the zone? |
| `device_fingerprint` | string | Unique device identifier |
| `wifi_bssid` | string | Wi-Fi access point identifier |

**Output fields your endpoint must return:**

| Field | Type | Description |
|---|---|---|
| `fraud_score` | float | 0.0–1.0, rounded to 4 decimals |
| `recommendation` | string | AUTO_APPROVE / PARTIAL_PAYOUT / HOLD |
| `payout_amount` | float | Calculated payout in ₹ |
| `flags` | array of strings | Only the flags that fired |
| `layers_triggered` | array of strings | Result of every layer (pass or flag) |

---

## Database Queries You'll Need

You'll connect to Nevil's PostgreSQL (Neon). He'll share the connection string by March 25. The queries you need:

- **Get zone data** (zones table) — for polygon/boundary check
- **Get worker profile** (workers table) — for tenure, zone
- **Get active policy** (policies table) — for coverage cap
- **Get active workers in zone** (workers table) — for cluster consensus
- **Get recent claims for worker** (claims table, last 14 days) — for temporal anomaly
- **Get recent disruption events in zone** (disruption_events table, last 14 days) — for temporal anomaly
- **Count claims in zone within time window** (claims + workers tables) — for burst detection
- **Count claims from device fingerprint** (workers table) — for anti-spoofing

**Until Nevil's DB is live:** Build a mock database layer that returns hardcoded data. Swap it for real queries on March 25. Design your code so the DB layer is a separate file — makes the swap trivial.

---

## 5 Test Scenarios You Must Validate

| # | Scenario | Expected Result |
|---|---|---|
| 1 | **Legitimate claim:** Worker in zone, sensors normal, first claim in 30 days | Score < 0.3, AUTO_APPROVE |
| 2 | **GPS spoofer:** GPS outside zone, phone stationary all shift | Score > 0.6, HOLD, flags include GPS_OUTSIDE_ZONE and ACCELEROMETER_STATIONARY |
| 3 | **Telegram syndicate:** 15 claims from same zone in 5 minutes, same WiFi BSSID | Score > 0.6, flags include CLAIM_BURST and WIFI_BSSID |
| 4 | **New account gaming:** 1-week tenure, filing first claim | Flags include NEW_ACCOUNT_EARLY_CLAIM |
| 5 | **Overclaim:** 2-hour disruption but claiming full-day coverage | Flags include OVERCLAIM_DETECTED |

---

## Tech Stack and Deployment

**Framework:** FastAPI (Python). Use Pydantic for request/response validation.

**Database driver:** `psycopg2-binary` (NOT `psycopg2` — the binary version doesn't need PostgreSQL dev headers, which the slim Docker image doesn't have).

**Deployment:** Dockerize with `python:3.11-slim`. Run uvicorn on port 8001. Deploy on Railway. Share the live URL with Shivam — he wires it into n8n Workflow 3.

Also add a `GET /health` endpoint for uptime checks.

---

## Timeline

| Date | Deliverable |
|---|---|
| **Mar 21** | Project structure, Pydantic schemas, mock DB layer |
| **Mar 25** | Switch to Nevil's live PostgreSQL |
| **Mar 28** | All 5 layers working locally |
| **Mar 30** | All 5 test scenarios passing |
| **Apr 1** | 🚨 **LIVE on Railway.** URL sent to Shivam. |
| **Apr 3** | Integration test with full system |

## Definition of Done

- [ ] `POST /fraud-validate` returns correct JSON for all 5 test scenarios
- [ ] All 4 layers + anti-spoofing layer implemented
- [ ] Mock DB layer works for local testing
- [ ] Real DB queries work against Nevil's Neon PostgreSQL
- [ ] Deployed on Railway, URL shared with Shivam
- [ ] New worker with no DB history handled gracefully (skip Layer 2, rely on Layer 3/4)
- [ ] `GET /health` responding

## Things That Will Bite You

- **Don't block on Nevil's DB.** 80% of your code works with mock data. Layers 1, 3, 4, and anti-spoofing don't need real worker history.
- **Score can exceed 1.0.** Multiple layers fire = scores add up past 1.0. Always cap at 1.0.
- **New workers crash Layer 2.** If `get_active_policy()` returns nothing, skip the layer. Don't let a NoneType error take down the whole service.
- **Use `psycopg2-binary` in your requirements**, not `psycopg2`. The non-binary version fails to install in slim Docker containers.
