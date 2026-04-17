# 📋 TASKS.md — Vritti

> **Hackathon:** Guidewire DEVTrails 2026  
> **Team:** QuantumForge — Yuvraj, Sairaj, Nevil, Shivam, Bhunesh  
> **Deadline:** April 4, 2026 (Full demo day)

---

## What is Vritti?

Vritti is **AI-powered parametric income insurance for India's gig delivery workers.** Amazon Flex, Flipkart, Meesho partners — people earning ₹3,800/week on bikes. When their delivery zone gets hit by a flood, AQI spike, heatwave, or curfew, money lands in their UPI within 2 hours. No claim filing, no paperwork, fully automatic.

**The user is Raju, 27, Vadodara.** Rides a bike 9 AM–8 PM delivering parcels. Speaks Hindi. Uses a budget Android phone. When his zone floods, he loses ₹600–800 that day with zero insurance or savings.

---

## System Architecture — How Everything Connects

```
┌────────────────────────────────────────────────────────────────────────┐
│                           VRITTI SYSTEM                                │
│                                                                        │
│  BHUNESH's Mobile App ←→ NEVIL's Backend API + PostgreSQL              │
│       (what Raju sees)      (central hub, stores everything)           │
│                                    ↕                                   │
│              YUVRAJ's Risk Score API    SAIRAJ's Fraud Detection API   │
│              (prices the premium)       (validates every claim)        │
│                                    ↕                                   │
│              SHIVAM's n8n Workflows                                    │
│              (weather monitoring, claim routing, payouts, renewals)    │
└────────────────────────────────────────────────────────────────────────┘
```

**End-to-end flow in plain English:**

1. Worker opens Bhunesh's app → enters phone, platform, partner ID
2. Nevil's backend calls Yuvraj's `/risk-score` → gets premium quote (₹49/week)
3. Worker pays via UPI → policy activates
4. Shivam's n8n monitors weather/AQI/news every 5 minutes
5. Disruption detected → n8n sends event to Nevil's backend → claims auto-created
6. Each claim goes to Sairaj's `/fraud-validate` → returns approve/partial/hold
7. Approved claims → n8n fires Razorpay payout → WhatsApp notification to worker
8. Worker opens app → sees "₹800 sent to your account"

---

## Team Assignments

| Member | What They're Building | Task File | Critical Deadline |
|---|---|---|---|
| **Yuvraj** | XGBoost risk model + FastAPI `/risk-score` endpoint + shared contract schemas | [YUVRAJ.md](./YUVRAJ.md) | Mar 28 — API live on Railway |
| **Sairaj** | 5-layer fraud detection engine + FastAPI `/fraud-validate` endpoint | [SAIRAJ.md](./SAIRAJ.md) | Apr 1 — API live on Railway |
| **Nevil** | Fastify REST API (6 endpoints) + PostgreSQL database (6 tables) on Neon | [NEVIL.md](./NEVIL.md) | Mar 30 — API live on Railway |
| **Shivam** | 5 n8n automation workflows (triggers, orchestrator, payout, renewal) | [SHIVAM.md](./SHIVAM.md) | Apr 1 — All workflows live |
| **Bhunesh** | React Native (Expo) Android app — 12 screens, 5 languages | [BHUNESH.md](./BHUNESH.md) | Apr 2 — App wired to live API |

**Read your task file completely before writing any code.**

---

## Dependency Chain — Who Blocks Whom

```
Yuvraj (contracts TODAY, Mar 21) ──→ Everyone can start building
Yuvraj (/risk-score Mar 28) ──→ Nevil (onboarding endpoint needs real scores)
Nevil (DB live Mar 25) ──→ Sairaj (fraud layers need worker history queries)
Nevil (API live Mar 30) ──→ Bhunesh (app needs real API to wire screens)
Sairaj (/fraud-validate Apr 1) ──→ Shivam (orchestrator needs real fraud scores)
```

**Rule:** If you're waiting on someone else's service, mock their response and keep building. Don't sit idle.

---

## Shared Contracts (Defined by Yuvraj)

These are the JSON shapes that every service uses to communicate. Committed to `/contracts/`.

**DISRUPTION_EVENT** — What a disruption looks like:
- `type` (always "DISRUPTION_EVENT"), `zone_id`, `trigger_id` (T1–T5), `severity` (LOW/MEDIUM/HIGH), `disruption_start`, `disruption_end`, `affected_workers` (array of worker IDs)

**RISK_SCORE response** — What Yuvraj's API returns:
- `risk_score` (0.0–1.0), `premium_tier` (₹ per week), `coverage_cap` (max payout ₹)

**FRAUD_VALIDATE response** — What Sairaj's API returns:
- `fraud_score` (0.0–1.0), `recommendation` (AUTO_APPROVE/PARTIAL_PAYOUT/HOLD), `payout_amount`, `flags` (array), `layers_triggered` (array)

---

## Master Timeline

| Date | Who | What ships |
|---|---|---|
| **Mar 21 (TODAY)** | Yuvraj | Contract schemas committed to `/contracts/` |
| **Mar 21** | Shivam | n8n deployed on Railway, URL shared |
| **Mar 25** | Nevil | PostgreSQL schema + seed data live on Neon |
| **Mar 25** | Bhunesh | Onboarding flow complete (mock API) |
| **Mar 28** | Yuvraj | 🚨 `/risk-score` live on Railway |
| **Mar 28** | Nevil | All 6 endpoints working locally |
| **Mar 29** | Shivam | Workflows 1 + 2 (weather/curfew triggers) live |
| **Mar 30** | Nevil | 🚨 API deployed on Railway |
| **Apr 1** | Sairaj | 🚨 `/fraud-validate` live on Railway |
| **Apr 1** | Shivam | Workflows 3 + 4 + 5 live |
| **Apr 2** | Bhunesh | 🚨 All screens wired to live API |
| **Apr 3** | **ALL** | End-to-end integration test |
| **Apr 4** | **ALL** | ✅ Demo: onboard → disruption → fraud check → payout |

---

## How to Use These Files

1. Find your name in the table above
2. Open your task file and read it **completely** — it explains the full Vritti product, your specific piece, and exactly what to build
3. Check your dependencies — if you need something from someone else, ping them
4. When your service deploys, **share the URL in the group chat immediately**
5. Mock any dependency you don't have yet — never sit idle waiting

> ⚠️ **Do not start building until Yuvraj has committed the JSON schemas to `/contracts/`.** Everything connects to those schemas.
