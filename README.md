<p align="center">
  <img src="https://img.shields.io/badge/Guidewire-DEVTrails%202026-red?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Phase-2%20Submission-orange?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Status-Active%20Development-green?style=for-the-badge" />
</p>

<h1 align="center">🛡️ Vritti</h1>
<h3 align="center">AI-Powered Parametric Income Insurance for E-Commerce Delivery Partners</h3>

<p align="center"><em>Insurance that understands the gig worker's life — not just their postcode.</em></p>

<p align="center">
  <a href="#-the-problem">Problem</a> •
  <a href="#-solution">Solution</a> •
  <a href="#-how-it-works">How It Works</a> •
  <a href="#-aiml-architecture">AI/ML</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-roadmap">Roadmap</a> •
  <a href="#-team">Team</a>
</p>

---

## The Problem

India's e-commerce delivery partners (Amazon, Flipkart, Meesho, AJIO) earn **₹15,000–₹25,000/month** with no fixed salary, no benefits, and no financial cushion. Unlike food delivery, e-commerce routes are multi-stop and hub-to-customer — one mid-shift disruption collapses the entire day's work.

When a flood blocks a zone, AQI spikes, or a curfew hits — the worker loses a full day of batched deliveries. **There is no financial safety net for this loss.**

---

## Who We Built This For

> Raju, 27 — Amazon Flex partner, Vadodara. Earns ~₹3,800/week. Works 9 AM–8 PM on Android, 4G. Speaks Hindi. If his zone floods, he loses ₹600–800 that day with no insurance, no savings buffer, and no recourse.

Every design decision in Vritti traces back to Raju.

---

## Solution

Vritti is a mobile-first parametric income insurance platform for gig delivery workers — built for Android, available in 5 Indian languages.

-  Onboards in ~4 minutes via a vernacular app
-  AI engine calculates a personalized weekly premium (₹35–₹80)
-  5 parametric triggers auto-detect disruptions in the worker's zone
-  Automatic UPI payout within 2 hours — zero claim filing required
-  4-layer fraud detection protects the risk pool

---

## How It Works

**Onboarding (one-time, ~4 min):** Language select → OTP → Platform + Partner ID → Location permission → AI generates premium quote → UPI payment → Policy active.

**Every Sunday night:** Risk score recalculated → WhatsApp message sent: *"Raju, your shield for next week is ₹49. Tap to renew."* → One-tap UPI → Coverage activates Monday 6 AM.

**Always-on monitoring:** Vritti watches weather, AQI, news, and platform signals across the worker's registered zone. When a threshold is breached → claim auto-initiated → fraud engine validates → payout triggered. Zero action required from the worker.

---

## Weekly Premium Model

Weekly premiums (₹35–₹80) align with how gig workers actually earn and spend — weekly. The AI engine builds a composite risk score from three buckets:

| Bucket | Weight | Key Signals |
|---|---|---|
| External Zone Risk | 40% | Flood history, disruption days/year, AQI baseline, season |
| Worker Behavioral Profile | 40% | Tenure, active hours, delivery consistency, claim history |
| Platform & Zone Intelligence | 20% | Zone risk class, platform tenure, cluster density |

**Pricing tiers (indicative):**

| Worker Profile | Weekly Premium | Coverage Cap |
|---|---|---|
| Full-time, low-risk zone, 6+ months | ₹35 | ₹800 |
| Full-time, medium-risk zone | ₹49 | ₹800 |
| Full-time, high-risk zone (monsoon) | ₹69 | ₹900 |
| Part-time, any zone | ₹55 | ₹500 |
| New worker (< 4 weeks) | ₹79 | ₹400 |

---

## AI/ML Architecture

### Risk Score Engine
**XGBoost / LightGBM** trained on 10,000 synthetic worker profiles. Outputs a `risk_score` (0.0–1.0) → maps to premium tier.

Key engineered features: `zone_disruption_frequency`, `claim_velocity` (fraud signal), `income_stability_score`, `behavioral_consistency_score`.

### Parametric Triggers (5 automated)

| ID | Condition | Source | Threshold |
|---|---|---|---|
| T1 | Heavy Rainfall | OpenWeatherMap | >15mm in 3-hr window |
| T2 | Severe AQI | CPCB API | AQI >300 for >4 hrs |
| T3 | Extreme Heat | OpenWeatherMap | Heat index >45°C, 10AM–4PM |
| T4 | Curfew / Bandh | News API | Govt-declared curfew in zone |
| T5 | Platform Outage | Mock API | Zero orders pushed for >2 hrs |

### Fraud Detection (4-layer)

| Layer | Check |
|---|---|
| Zone Match | GPS must place worker in registered zone during disruption |
| Behavioral Deviation | Partial loss calculated if disruption window < full shift |
| Cluster Consensus | ≥60% of zone workers must show inactivity |
| Temporal Anomaly | New accounts, consecutive-week claims, unmatched spikes → human review |

**Fraud score output:** `0.0–0.3` auto-approve · `0.3–0.6` reduced payout + flag · `0.6–1.0` manual hold

---

## UX Principles

Built for someone checking their phone at a red light, not a developer on a MacBook.

- **3-tap rule** — renew, check status, view payout: all ≤3 taps
- **WhatsApp notifications** — not push (workers disable those)
- **Visual status** — Active · Renew Today · Expired
- **No jargon** — "weekly shield cost", "your protection", "we're sending your money"

---

## Tech Stack

| Layer | Stack |
|---|---|
| Mobile | React Native (Expo) · Android-only · i18next · expo-localization · Lottie |
| Backend | Node.js · Fastify · PostgreSQL · Neon · n8n |
| Orchestrator | Python · LangGraph · FastAPI |
| ML Service | Python · FastAPI · XGBoost · scikit-learn · Pandas |
| Integrations | OpenWeatherMap · CPCB AQI · News API |
| Infrastructure | Railway · Neon Postgres |

---

## How to Run Locally

Vritti runs as a set of interconnected microservices. You need to start all 4 components for the full end-to-end flow.

### 1. Node.js Backend (Port 3000)
Handles DB connections, worker onboarding, policies, and claims.
```bash
cd bhunesh-backend
npm install
# Ensure you have a .env file with DATABASE_URL and RISK_SCORE_URL=http://localhost:8001/risk-score
npm start
```

### 2. ML Risk Score Service (Port 8001)
Generates dynamic insurance premiums and risk scores using XGBoost during onboarding.
```bash
cd risk-score-service
python -m venv venv
.\venv\Scripts\activate  # or `source venv/bin/activate` on Mac/Linux
pip install -r requirements.txt
python main.py
```

### 3. LangGraph Orchestrator (Port 8000)
The AI brain that intercepts n8n webhook disruption triggers, evaluates severity, fetches impacted workers, and initiates payouts.
```bash
cd langgraph-orchestrator
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### 4. VrittiApp (React Native Frontend)
The worker-facing Android application.
```bash
cd VrittiApp
npm install
# Important: Update API_BASE in `src/services/api.ts` to point to your computer's local IP address (e.g. http://192.168.1.100:3000)
npx expo start
```

---

## What Makes Vritti Different

| | Generic Parametric Insurance | Vritti |
|---|---|---|
| Premium basis | City-level weather | Your zone, schedule, income history |
| Fraud detection | Did the event happen? | Were *you* in your zone, working, actually impacted? |
| Claim process | Worker files claim | Fully automatic |
| Payment cycle | Monthly | Weekly (aligned with gig income) |
| Notifications | Push / email | WhatsApp |

---

## Adversarial Defense & Anti-Spoofing Strategy

> **The threat:** A coordinated syndicate using GPS-spoofing apps to fake presence in a disrupted zone — triggering mass false payouts and draining the liquidity pool.

### 1. Genuine Worker vs. GPS Spoofer

Same coordinates, completely different device fingerprint:

| Signal | Genuine Worker | GPS Spoofer |
|---|---|---|
| GPS accuracy | Degrades in rain (>20m drift) | Artificially locked — suspiciously precise |
| Accelerometer | Bike motion up to disruption, then stops | Stationary from shift start |
| Cell tower history | Consistent with delivery zone | Consistent with home location |
| Delivery app activity | Hub check-ins, order scans | Zero platform activity |

Vritti cross-references GPS against **cell tower triangulation + accelerometer logs**. A phone that never left a cell cluster 8km from the claimed zone is flagged regardless of GPS output.

### 2. Detecting a Coordinated Fraud Ring

Syndicate fraud has a statistical signature isolated fraud doesn't:

- **Claim burst pattern** — real disruptions produce claims over 20–40 min; syndicate Telegram broadcasts produce a sub-5-minute claim spike
- **Zone claim density** — claims spiking >2 standard deviations above historical rate triggers a zone-level hold
- **New account surge** — accounts registered in the same zone within 7 days of a forecast high-risk event are placed on a 14-day claim lockout
- **Device overlap** — multiple claims from the same Wi-Fi BSSID or identical device fingerprint are flagged as coordinated

### 3. Flagging Bad Actors Without Punishing Honest Workers

Vritti uses a **tiered response**, not a binary block:

| Fraud Score | Action |
|---|---|
| 0.0–0.3 | Auto-approve → payout in 2 hrs |
| 0.3–0.6 | 80% payout + WhatsApp re-verify request |
| 0.6–1.0 | Hold → human review queue (4hr SLA) |

**The re-verify step:** A genuine worker sends a WhatsApp live location in 3 taps. A spoofer at home cannot match their claimed zone. Minimal friction for honest workers — very hard to defeat at scale.

> Vritti assumes the worker is honest until the data says otherwise — and even then, it asks before it blocks.

---

## Team

**Team QuantumForge** — Guidewire DEVTrails 2026 · [yuvraj, nevil, sairaj, shivam, bhunesh]

---

<p align="center"><strong>Vritti — Because every working day lost deserves a shield.</strong></p>
