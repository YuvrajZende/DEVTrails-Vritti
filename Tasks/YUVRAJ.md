# YUVRAJ — ML Risk Scoring Engine & Contracts Owner

> **Role:** ML Engineer — Risk Scoring  
> **Deadline:** March 28, 2026 (`/risk-score` live on Railway)  
> **Priority:** 🔴 Critical Path — everyone is blocked until your contracts ship today (March 21)

---

## The Big Picture — What is Vritti?

Vritti is **parametric income insurance for India's e-commerce delivery workers.** Think Amazon Flex, Flipkart Wishmaster, Meesho partners — people who earn ₹3,800/week delivering parcels on bikes. When their delivery zone gets hit by a flood, AQI spike, heatwave, or curfew, they lose a full day of income with zero safety net.

**What we're building:** The worker pays ₹35–₹80/week. When a disruption hits their zone, money lands in their UPI account within 2 hours — no paperwork, no claim filing, fully automatic.

**How the full system works:**

1. **Worker onboards via Bhunesh's mobile app** → app sends profile to Nevil's backend
2. **Nevil's backend calls YOUR `/risk-score` API** → you return the premium quote
3. **Worker pays weekly premium** → policy activates
4. **Shivam's n8n monitors weather/AQI/news every 5 minutes** → detects disruption
5. **n8n triggers a claim** → Nevil's backend creates claim records
6. **Sairaj's fraud engine validates** → returns approve/hold/partial
7. **If approved** → Razorpay payout fires → money hits worker's UPI

**Your model sits at Step 2.** Without a risk score, the worker can't onboard. Without your contracts, nobody knows how to talk to each other's services.

---

## What You're Building

### Deliverable 1: Shared Contract Schemas (Due TODAY)

You define the JSON shapes that every service uses. Three contracts go into `/contracts/`:

**Contract 1 — DISRUPTION_EVENT:** This is what Shivam's n8n sends when it detects a disruption. Fields: `type` (always "DISRUPTION_EVENT"), `zone_id` (like "VAD-04"), `trigger_id` (T1 through T5), `severity` (LOW/MEDIUM/HIGH), `disruption_start` and `disruption_end` (ISO 8601 timestamps), `affected_workers` (array of worker IDs).

**Contract 2 — RISK_SCORE response:** This is what YOUR API returns. Fields: `risk_score` (float 0.0–1.0), `premium_tier` (integer, the ₹ amount per week), `coverage_cap` (integer, max payout in ₹).

**Contract 3 — FRAUD_VALIDATE response:** This is what Sairaj's API returns. Fields: `fraud_score` (float 0.0–1.0), `recommendation` (string: AUTO_APPROVE / PARTIAL_PAYOUT / HOLD), `payout_amount` (float in ₹), `flags` (array of strings), `layers_triggered` (array of strings showing which validation layers fired).

Push these to `/contracts/` and message the group. Everyone builds to your schemas.

---

### Deliverable 2: The Risk Score API

A FastAPI microservice with one endpoint: `POST /risk-score`.

**What it receives:** A worker's profile — their tenure on the platform, daily active hours, weekly delivery days, average weekly earnings, earnings volatility, recent claim count, zone disruption history, zone AQI baseline, whether it's monsoon season, whether their zone is flood-prone, and whether they're part-time.

**What it returns:** A risk score (0.0 = very safe, 1.0 = very risky), the weekly premium in ₹, and the maximum coverage cap in ₹.

**The engine behind it:** An XGBoost classifier trained on 10,000 synthetic worker profiles. The model predicts the probability that a worker will file a legitimate claim in any given week. That probability IS the risk score.

---

## How to Build the ML Pipeline

### Step 1: Synthetic Dataset Generation

Create a Python script that generates 10,000 rows of simulated gig worker data and saves to CSV.

**The 16 columns you need:**

| Column | Purpose | Values |
|---|---|---|
| `worker_id` | Unique ID | Sequential: w_0001 through w_10000 |
| `zone_id` | Delivery zone | Pick from: VAD-04, MUM-07, DEL-12, BLR-03, CHN-06 |
| `city` | Must match zone | Vadodara, Mumbai, Delhi, Bangalore, Chennai |
| `tenure_weeks` | Time on platform | 1 to 104 weeks |
| `daily_active_hours` | Avg work per day | 2.0 to 12.0 hours |
| `weekly_delivery_days` | Days worked per week | 1 to 6 |
| `avg_weekly_earnings` | Income per week | ₹1,500 to ₹5,500 |
| `earnings_std_dev` | Income volatility | 5% to 30% of avg earnings |
| `claim_count_90d` | Recent claim frequency | 0 to 5 |
| `zone_disruption_days` | Annual disruptions in zone | 5 to 35 days |
| `zone_aqi_baseline` | Zone's average AQI | 50 to 300 |
| `is_monsoon_season` | June–September flag | 0 or 1 |
| `is_flood_prone_zone` | Historical flooding | 0 or 1 |
| `platform` | Which company | Amazon / Flipkart / Meesho |
| `is_part_time` | Works < 4 hrs/day | 0 or 1 |
| `risk_label` | **TARGET VARIABLE** | 0 = no claim, 1 = legit claim, 2 = fraud |

**Distribution of the target label:**
- 60% → label 0 (normal week, no claim)
- 30% → label 1 (legitimate disruption claim)
- 10% → label 2 (fraudulent claim attempt)

**Critical: Your data must have realistic correlations.** The model learns from patterns in YOUR data. If all three labels look statistically identical, XGBoost learns nothing and your AUC will be garbage. Ensure:

- Workers in flood-prone, high-disruption zones (MUM-07, DEL-12) should have higher rates of label 1
- Workers with short tenure (< 4 weeks) combined with high recent claims should skew toward label 2
- Monsoon season + flood-prone zone → more label 1
- High income volatility (high `earnings_std_dev`) → slightly more label 1

**Validation:** After generation, group by `risk_label` and check mean values. The averages MUST look different across labels. If they don't, your model won't learn.

---

### Step 2: Feature Engineering

Raw columns aren't predictive enough. Derive 5 features that the model trains on:

| Derived Feature | Formula | What It Captures |
|---|---|---|
| `zone_disruption_frequency` | `zone_disruption_days / 365` | How often does this zone get disrupted? (0.01 = rare, 0.10 = frequent) |
| `claim_velocity` | `claim_count_90d / tenure_weeks` (clip tenure ≥ 1) | Are they claiming too fast relative to how long they've been here? This is the #1 fraud signal. |
| `income_stability_score` | `1 - (earnings_std_dev / avg_weekly_earnings)` (clip earnings ≥ 1) | How stable is their income? 1.0 = rock solid, 0.5 = volatile |
| `behavioral_consistency_score` | `weekly_delivery_days / 6` | How consistently do they show up? 1.0 = every day, 0.33 = twice a week |
| `part_time_index` | `daily_active_hours / 10` | Normalized work intensity. Full-timers ≈ 1.0, part-timers ≈ 0.3 |

**The 10 features your model trains on:** The 5 derived features above + `tenure_weeks`, `zone_aqi_baseline`, `is_monsoon_season`, `is_flood_prone_zone`, `is_part_time`.

---

### Step 3: Model Training

**Algorithm:** XGBoost Classifier (binary classification)

**Target variable:** Convert `risk_label` to binary — label > 0 means "will claim" (1), label 0 means "won't claim" (0). You're predicting the probability of a claim, not distinguishing legit from fraud (that's Sairaj's job).

**Hyperparameters to start with:** 100 estimators, max depth 4, learning rate 0.1. These are conservative and should work well on 10K rows.

**Split:** 80% train, 20% test. Use a fixed random seed for reproducibility.

**Evaluation metric:** AUC-ROC. **Target: > 0.80.** If lower, the problem is almost certainly in your synthetic data, not in hyperparameters.

**Output:** Save the trained model as a pickle file (`risk_model.pkl`).

---

### Step 4: Premium Tier Mapping

Convert the model's risk score (a probability between 0 and 1) into a business-facing premium:

| Condition | Premium (₹/week) | Coverage Cap (₹) |
|---|---|---|
| Part-time worker | ₹55 | ₹500 |
| New worker (< 4 weeks tenure) | ₹79 | ₹400 |
| Risk score < 0.3 | ₹35 | ₹800 |
| Risk score 0.3–0.5 | ₹49 | ₹800 |
| Risk score 0.5–0.7 | ₹69 | ₹900 |
| Risk score > 0.7 | ₹79 | ₹400 |

**Logic:** Part-time and new-worker checks happen first (override the score). Otherwise, score maps to tiers. Low risk = cheap premium + full coverage. High risk = expensive premium + reduced coverage.

---

### Step 5: FastAPI Service

Build a FastAPI app with two endpoints:

**`POST /risk-score`** — Accepts a worker profile (all 11 input fields from the table above), runs feature engineering, gets the model's probability, maps to premium tier, returns the risk score + premium + coverage cap as JSON.

**`GET /health`** — Returns `{"status": "ok"}`. Used by Railway and the team to verify the service is alive.

**Important configurations:**
- Enable CORS (allow all origins) — Nevil's backend calls from a different domain
- Load the model once at startup, not on every request
- Use relative file paths with `os.path.dirname(__file__)` so it works both locally and inside Docker

---

### Step 6: Dockerize and Deploy

**Docker image:** Use `python:3.11-slim` base. Install dependencies from requirements.txt. Run uvicorn on port 8000.

**Dependencies:** fastapi, uvicorn, xgboost, scikit-learn, pandas, numpy (do NOT include pickle5 — standard pickle handles everything in Python 3.11).

**Deploy on Railway:** Connect your GitHub repo, set port to 8000, deploy. Railway gives you a public URL. **Send this URL to Nevil the second it's live.**

---

## Timeline

| Date | Deliverable |
|---|---|
| **Mar 21 (TODAY)** | `/contracts/` with all 3 JSON schemas pushed and shared with team |
| **Mar 24** | Dataset generated, model trained, AUC > 0.80 |
| **Mar 26** | API working locally, tested with curl |
| **Mar 28** | 🚨 **LIVE on Railway.** URL sent to Nevil. |
| **Apr 3** | Integration test with full system |

## Definition of Done

- [ ] All 3 contract schemas in `/contracts/`, pushed to main
- [ ] `synthetic_workers.csv` — 10,000 rows with realistic correlations
- [ ] `risk_model.pkl` — AUC-ROC > 0.80
- [ ] `POST /risk-score` returns correct JSON
- [ ] `GET /health` responds
- [ ] CORS enabled
- [ ] Deployed on Railway, URL shared with Nevil

## Things That Will Bite You

- **If your AUC is low,** the problem is your data, not your hyperparameters. Print group-by-label averages and verify the labels look different.
- **Model path breaks in Docker.** Use `os.path.dirname(__file__)` based relative paths, not hardcoded paths.
- **CORS will block Nevil.** If you forget the CORS middleware, his backend gets silent 403 errors and he'll spend hours debugging.
- **Railway cold starts.** First request after 15 min idle takes 2–5s. Normal for hackathon.
