# SHIVAM — n8n Automation Workflows

> **Role:** Automation Engineer (No-Code / Low-Code)  
> **Deadline:** April 1, 2026 (All 5 workflows live)  
> **Status:** 🟢 Can start TODAY — deploy n8n on Railway first

---

## The Big Picture — What is Vritti?

Vritti is **parametric income insurance for India's gig delivery workers.** Workers pay ₹35–₹80/week. When a disruption hits (flood, AQI spike, curfew), money lands in their UPI within 2 hours — fully automatic. No claim filing, no paperwork.

**The key word is "automatic."** That automation? That's YOUR job.

**Here's what happens without your workflows:** Someone would have to manually check weather every 5 minutes, manually trigger claims, manually call the fraud API, manually fire Razorpay payouts, manually send WhatsApp messages. All of that manual work is replaced by your 5 n8n workflows.

**You are the nervous system of Vritti.** Your workflows detect disruptions, route claims through fraud detection, trigger payouts, send notifications, and handle weekly renewals. Without you, nothing happens automatically.

---

## How Your Work Fits In

| Workflow | What it replaces | Who it talks to |
|---|---|---|
| **Workflow 1** (Weather) | Manual weather monitoring | OpenWeatherMap + AQI APIs → Nevil's DB → Workflow 3 |
| **Workflow 2** (Curfew) | Manual news scanning | News API → Nevil's DB → Workflow 3 |
| **Workflow 3** (Orchestrator) | Manual claim processing | Sairaj's `/fraud-validate` → routes to Workflow 4 or HOLD |
| **Workflow 4** (Payout) | Manual Razorpay + WhatsApp | Razorpay API + Twilio WhatsApp → Nevil's DB |
| **Workflow 5** (Renewal) | Manual Sunday reminders | Yuvraj's `/risk-score` + Twilio WhatsApp → Nevil's DB |

---

## Step 0 — Deploy n8n on Railway (Do This TODAY)

Before building any workflow, you need n8n running on the cloud.

**What is n8n?** It's a visual workflow automation tool. Think Zapier but self-hosted. You drag-and-drop "nodes" (boxes) and connect them with arrows. Each node does one thing — make an HTTP request, query a database, check a condition, send a message. No coding required.

**How to deploy:**

1. Go to railway.app → New Project → Deploy from Docker Image
2. Use the image: `n8nio/n8n`
3. Set these environment variables:
   - `N8N_BASIC_AUTH_ACTIVE` = `true`
   - `N8N_BASIC_AUTH_USER` = `admin`
   - `N8N_BASIC_AUTH_PASSWORD` = `vritti2026`
4. Set the port to `5678`
5. Railway will give you a public URL like `https://vritti-n8n.railway.app`
6. **Share this URL with the entire team immediately**

If you've never used n8n before, spend 15 minutes on the n8n.io quickstart tutorial. It's genuinely drag-and-drop.

---

## Workflow 1 — Weather & AQI Trigger

**Purpose:** Check weather and air quality every 5 minutes. If conditions cross a danger threshold in a delivery zone, fire a disruption event.

**Schedule:** Runs every 5 minutes, 24/7.

**The flow:**

1. **Schedule Trigger** fires every 5 minutes
2. **HTTP Request** to OpenWeatherMap API — gets current weather for Vadodara (for demo, hardcode this city; expand later). You need a free API key from openweathermap.org/api. Query parameter: `q=Vadodara`
3. **HTTP Request** to AQI API — gets air quality index. Free token from aqicn.org. Query: `feed/vadodara/`
4. **IF condition** — check these thresholds:
   - **T1 (Heavy Rain):** precipitation > 15mm in the response
   - **T2 (Severe AQI):** AQI reading > 300
   - **T3 (Extreme Heat):** heat index > 45°C
   - If NONE cross threshold → workflow ends here
5. **PostgreSQL query** — check Nevil's `disruption_events` table: has an event already been logged for this zone in the last 1 hour? This is your **deduplication** step. Without this, one rainstorm sends hundreds of duplicate events.
6. **IF condition** — if a recent event already exists → stop. If no recent event → proceed.
7. **HTTP Request** — POST to your Workflow 3 (Orchestrator) webhook URL. Send a DISRUPTION_EVENT JSON with: zone_id (VAD-04), trigger_id (T1/T2/T3 depending on which threshold fired), severity (based on how far over the threshold), disruption_start (now), and affected_workers (query from DB or leave empty for orchestrator to resolve).
8. **PostgreSQL insert** — log this event into the `disruption_events` table so future runs know not to duplicate it.

**API keys to get:**
- OpenWeatherMap: free at openweathermap.org/api (60 calls/min on free tier — every 5 min for 1 zone is well within limits)
- AQI: free at aqicn.org/data-platform/token

---

## Workflow 2 — Curfew & Platform Outage Trigger

**Purpose:** Check news for curfew/bandh announcements and mock platform API for zero-order signals every 10 minutes.

**Schedule:** Runs every 10 minutes.

**The flow:**

1. **Schedule Trigger** fires every 10 minutes
2. **HTTP Request** to News API — search for articles containing keywords like "curfew vadodara", "bandh vadodara", "curfew gujarat" published in the last 30 minutes. Get a free API key from newsapi.org.
3. **HTTP Request** to Mock Platform API — this would be Amazon/Flipkart's internal API in production. For the hackathon, create a simple mock endpoint that returns a random order count. If orders = 0 for > 2 hours in a zone, that's trigger T5.
4. **IF condition** — news article found (T4 curfew) OR zero orders for > 2 hours (T5 platform outage)
5. **PostgreSQL query** — same dedup check as Workflow 1
6. **HTTP Request** — POST to Workflow 3 (Orchestrator) webhook with the appropriate trigger_id (T4 or T5)

---

## Workflow 3 — Orchestrator (Central Router)

**Purpose:** This is the brain. It receives a disruption event, calls the fraud engine, and routes the result to either payout, re-verification, or hold.

**Trigger:** Webhook (not scheduled). Receives POST requests from Workflows 1 and 2, and from Nevil's `/admin/override` endpoint.

**The webhook URL** for this workflow is important — share it with Nevil (he needs to forward admin overrides here) and note it for Workflows 1 and 2.

**The flow:**

1. **Webhook Trigger** — listens on `POST /webhook/disruption`. This URL is generated by n8n when you create the webhook node.
2. **HTTP Request** — POST to **Sairaj's `/fraud-validate`** endpoint (his Railway URL). Send the claim data from the webhook payload — claim_id, worker_id, zone_id, trigger_id, disruption times, and sensor data.
3. **Switch Node** — route based on the `fraud_score` returned by Sairaj:
   - **Branch A (score < 0.3 — AUTO_APPROVE):** POST to Workflow 4's webhook (payout). Send worker_id, payout_amount, UPI ID.
   - **Branch B (score 0.3–0.6 — PARTIAL_PAYOUT):** Send a WhatsApp message via Twilio asking the worker to re-verify by sharing their live location. Message in Hindi: *"Aapka claim verify ho raha hai. Apna live location bhejein."*
   - **Branch C (score > 0.6 — HOLD):** Update the claim status to HOLD in Nevil's PostgreSQL. Also send a Discord/Slack alert to the admin channel so a human can review.

---

## Workflow 4 — Payout & Notification

**Purpose:** An approved claim arrives → fire Razorpay payout → send WhatsApp confirmation → update database.

**Trigger:** Webhook. Receives POST from Workflow 3 (Branch A).

**The flow:**

1. **Webhook Trigger** — listens on `POST /webhook/payout`
2. **HTTP Request** — POST to Razorpay Payout API (test mode). You'll need a Razorpay test account from razorpay.com. Use their test API keys. The payout should target the worker's UPI ID with the approved amount.
3. **Twilio Node** — send WhatsApp message to the worker. Message in Hindi: *"Raju, ₹800 aapke account mein aa raha hai. 2 ghante mein milega. 🛡️"* Use the Twilio WhatsApp sandbox for testing (you need to register test phone numbers).
4. **PostgreSQL update** — update the `payouts` table: set `status = 'PAID'`, `paid_at = NOW()`
5. **PostgreSQL update** — update the `claims` table: set `status = 'COMPLETE'`

**Twilio WhatsApp Sandbox Setup:** Sign up at twilio.com. Go to Messaging → Try WhatsApp. Follow the sandbox setup to register your test phone numbers. The sandbox lets you send template messages without WhatsApp Business API approval.

---

## Workflow 5 — Weekly Renewal (Sunday 9 PM)

**Purpose:** Every Sunday evening, recalculate risk scores for all active workers and send WhatsApp renewal reminders.

**Schedule:** Runs every Sunday at 9:00 PM IST.

**The flow:**

1. **Schedule Trigger** — Sunday 9 PM
2. **PostgreSQL query** — SELECT all workers who have active policies expiring this week (where `week_end` equals this Sunday)
3. **Split In Batches node** — process one worker at a time (don't overwhelm Yuvraj's API)
4. **HTTP Request** — POST to **Yuvraj's `/risk-score`** for each worker. Send their profile data (tenure, zone data, claim history). Get back the new risk_score and premium_tier.
5. **PostgreSQL update** — update the worker's policy with the new risk_score
6. **Twilio Node** — WhatsApp to each worker: *"Raju, tera shield ₹49 mein renew karo. Tap karo: [UPI deeplink]"*

---

## Critical n8n Rules

1. **Export workflow JSON after every work session.** n8n stores workflows internally. If your Railway deployment crashes, you lose everything. Export each workflow as JSON → save to `/n8n-workflows/workflow-name.json` → commit to GitHub.

2. **n8n is NOT a database.** Never rely on n8n internal data for state. Always write final state back to Nevil's PostgreSQL. n8n should be stateless.

3. **Credentials go in n8n Settings → Credentials.** Never hardcode API keys in node configurations. Store them as n8n credentials — OpenWeatherMap, AQI, News API, Razorpay, Twilio, PostgreSQL.

4. **Test each workflow individually** using n8n's "Execute Workflow" button before connecting workflows to each other. Verify each node's output step by step.

5. **Note your webhook URLs.** When you create Workflow 3 and 4, n8n generates webhook URLs. Write them down. Share Workflow 3's webhook URL with Nevil (he calls it from `/admin/override`) and reference it in Workflows 1 and 2.

6. **Deduplication prevents flooding.** Without the PostgreSQL dedup check in Workflows 1 and 2, a persistent rainstorm triggers hundreds of duplicate events. The dedup query checks if a disruption_event exists for this zone in the last 1 hour.

---

## Credentials You Need

| Service | What to sign up for | Free tier? |
|---|---|---|
| OpenWeatherMap | API key at openweathermap.org/api | Yes, 60 calls/min |
| AQI | Token at aqicn.org/data-platform/token | Yes |
| News API | Key at newsapi.org | Yes, 100 requests/day |
| Razorpay | Test account at razorpay.com | Yes (test mode) |
| Twilio | Account at twilio.com, WhatsApp sandbox | Yes (sandbox) |
| PostgreSQL | Connection string from Nevil (Neon) | N/A |

---

## Files to Commit

All workflow JSONs go in `/n8n-workflows/`:
- `workflow1-weather-trigger.json`
- `workflow2-curfew-trigger.json`
- `workflow3-orchestrator.json`
- `workflow4-payout.json`
- `workflow5-renewal.json`

---

## Timeline

| Date | Deliverable |
|---|---|
| **Mar 21 (TODAY)** | n8n deployed on Railway, URL shared with team |
| **Mar 25** | Connected to Nevil's PostgreSQL |
| **Mar 29** | Workflows 1 + 2 (triggers) firing correctly with test data |
| **Apr 1** | 🚨 Workflows 3 + 4 + 5 live and connected |
| **Apr 3** | Integration test with full system |

## Definition of Done

- [ ] n8n live on Railway, URL shared with team
- [ ] Workflow 1 (Weather + AQI) triggers correctly
- [ ] Workflow 2 (Curfew + Platform) triggers correctly
- [ ] Workflow 3 (Orchestrator) routes correctly based on fraud scores
- [ ] Workflow 4 (Payout) sends WhatsApp + updates DB
- [ ] Workflow 5 (Renewal) recalculates scores + sends WhatsApp
- [ ] All 5 workflow JSONs exported and committed to `/n8n-workflows/`
- [ ] Dedup logic prevents duplicate events

## Things That Will Bite You

- **No dedup = flood of events.** One rainstorm lasting 2 hours fires 24 triggers (every 5 min × 2 hours). The dedup check is not optional.
- **Free API rate limits.** OpenWeatherMap = 60/min (fine). News API = 100/day (be careful — don't poll every 1 minute, 10 minutes is enough).
- **Twilio WhatsApp sandbox requires phone registration.** You must join the sandbox with each test phone number before messages can be sent.
- **Webhook URLs may change on Railway redeploy.** Pin your Railway deployment version to avoid this, or use n8n's built-in webhook routing.
- **n8n RAM.** Railway free tier = 512MB. n8n needs ~512MB minimum. If it keeps crashing, you may need to upgrade to a paid plan or reduce concurrent workflow executions.
