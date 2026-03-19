<p align="center">
  <img src="https://img.shields.io/badge/Guidewire-DEVTrails%202026-red?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Phase-1%20Submission-orange?style=for-the-badge" />
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

- Onboards in ~4 minutes via a vernacular app
- AI engine calculates a personalized weekly premium (₹35–₹80)
- 5 parametric triggers auto-detect disruptions in the worker's zone
- Automatic UPI payout within 2 hours — zero claim filing required
- 4-layer fraud detection protects the risk pool

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
- **Vernacular first** — auto-detects device locale; Hindi, Gujarati, Marathi, Tamil, Telugu
- **WhatsApp notifications** — not push (workers disable those)
- **Visual status** — Active · Renew Today · Expired
- **No jargon** — "weekly shield cost", "your protection", "we're sending your money"

---

## Tech Stack

| Layer | Stack |
|---|---|
| Mobile | React Native (Expo) · Android-only · i18next · expo-localization · Lottie |
| Backend | Node.js · Fastify · PostgreSQL · Redis · BullMQ |
| ML Service | Python · FastAPI · XGBoost · scikit-learn · Pandas |
| Integrations | OpenWeatherMap · CPCB AQI · News API · Razorpay (test) · Twilio WhatsApp |
| Infrastructure | Railway/Render · Neon Postgres · GitHub Actions |

---

## Roadmap

| Phase | Weeks | Deliverable |
|---|---|---|
| Phase 1 | 1–2 | Architecture, ML design, synthetic data, UI wireframes → This README + strategy video |
| Phase 2 | 3–4 | Core app: onboarding, policy engine, 5 triggers, claims flow → Working demo |
| Phase 3 | 5–6 | Fraud layer, payout simulation, admin dashboard, final polish → Full demo + pitch deck |

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

## Team

**Team Vritti** — Guidewire DEVTrails 2026 · [yuvraj, nevil, sairaj, shivam, bhunesh]

---

<p align="center"><strong>Vritti — Because every working day lost deserves a shield.</strong></p>
