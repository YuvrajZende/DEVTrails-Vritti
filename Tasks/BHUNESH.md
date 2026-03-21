# BHUNESH — Mobile App (Android)

> **Role:** Mobile App Developer  
> **Deadline:** April 2, 2026 (All screens wired to live API)  
> **Status:** 🟢 Can start immediately — build all UI first, wire API after March 30

---

## The Big Picture — What is Vritti?

Vritti is **parametric income insurance for India's gig delivery workers** — Amazon Flex, Flipkart, Meesho partners earning ₹3,800/week on bikes. When their delivery zone gets hit by a flood, AQI spike, heatwave, or curfew, money lands in their UPI within 2 hours. No claim filing. Fully automatic.

**Your app is the ONLY thing the worker ever sees.** They will never interact with the backend, the ML models, n8n, or the database. To them, Vritti IS your app.

**The user you're building for:**

> **Raju, 27.** Amazon Flex partner, Vadodara. Earns ₹3,800/week delivering packages on a bike, 9 AM to 8 PM. Uses a budget Android phone on 4G. Speaks Hindi. His tech skills: WhatsApp, Google Maps, the Amazon delivery app. That's it. He checks his phone at red lights. He doesn't read English documentation. He doesn't understand the word "premium" or "parametric". He needs to renew his protection in 3 taps between deliveries.

If your app confuses Raju, you've failed. If he can't figure out how to renew in 10 seconds, you've failed.

---

## How Your Work Connects

You are the frontend. Everyone else is invisible infrastructure behind you.

| What happens in the system | What Raju sees in your app |
|---|---|
| Yuvraj's model calculates risk score | Raju sees "₹49/week for ₹800 protection" |
| Nevil's backend creates a policy | Raju sees "🟢 Your shield is active" |
| Shivam's n8n detects a flood | Raju sees nothing (it's automatic) |
| Sairaj's fraud engine approves | Raju sees nothing (it's automatic) |
| Razorpay sends money | Raju gets a WhatsApp: "₹800 sent to your account" |
| Raju opens the app next day | Raju sees "Last payout: ₹800 (Monday)" |

**You call Nevil's REST API for everything.** His URL will be available March 30. Until then, build every screen with hardcoded mock data and swap in API calls later.

---

## What You're Building

**1 onboarding flow (7 screens) + 5 core screens = 12 screens total.**

All in React Native (Expo), Android-only, supporting 5 Indian languages.

---

## The Tech Stack You'll Use

| Tool | Purpose |
|---|---|
| **Expo (React Native)** | Framework — single codebase, Android-first |
| **i18next + react-i18next** | Multilingual support (5 languages) |
| **expo-localization** | Detect device language |
| **lottie-react-native** | Animated shield icon on home screen |
| **axios** | HTTP requests to Nevil's API |
| **@react-navigation** | Screen navigation (stack navigator) |
| **AsyncStorage** | Offline caching of policy status |
| **expo-av** | Voice playback for Hindi FAQ on help screen |

---

## Multilingual Support — 5 Languages

The app must support Hindi (hi), Gujarati (gu), Marathi (mr), Tamil (ta), and Telugu (te). Hindi is the primary and fallback.

**How it works:** On first launch, the app reads the device's language setting using `expo-localization`. If the device is set to Hindi, the app shows Hindi. If set to an unsupported language, it defaults to Hindi.

**What you need to translate:** Every user-facing string. Create a `locales/` folder with 5 JSON files (one per language). Each file has the same keys with translated values.

**Key strings to translate:**

| Key | Hindi | Purpose |
|---|---|---|
| `shield_active` | आपका शील्ड सक्रिय है | Home screen status |
| `shield_renew` | आज रिन्यू करें | Renewal prompt |
| `shield_expired` | शील्ड समाप्त | Expired status |
| `next_renewal` | अगला रिन्यूअल | Next renewal date label |
| `last_payout` | आखिरी भुगतान | Last payout label |
| `select_language` | भाषा चुनें | Onboarding step 1 |
| `enter_phone` | मोबाइल नंबर दर्ज करें | Onboarding step 2 |
| `enter_otp` | OTP दर्ज करें | Onboarding step 3 |
| `select_platform` | अपना प्लेटफ़ॉर्म चुनें | Onboarding step 4 |
| `enter_partner_id` | पार्टनर ID दर्ज करें | Onboarding step 5 |
| `activate` | शील्ड सक्रिय करें | Activation button |
| `money_sent` | पैसे भेज दिए गए | Payout confirmation |
| `per_week` | प्रति सप्ताह | Premium label |

Use Google Translate for the other 4 languages. It's a hackathon — accuracy matters less than coverage.

The Language Select screen (onboarding step 1) lets the worker override the device default. Store their choice in AsyncStorage and use it for all future sessions.

---

## Onboarding Flow — 7 Screens

This is a one-time flow. After onboarding, the worker goes straight to the home screen on every future launch.

### Screen 1: Language Select
- Show 5 large buttons, one for each language. Each button shows the language name IN THAT LANGUAGE (e.g., "हिन्दी", "ગુજરાતી", "मराठी", "தமிழ்", "తెలుగు")
- On tap → set the i18n language and navigate forward
- This is the first thing Raju sees. Make the buttons BIG and colorful.

### Screen 2: Phone Entry
- Large numeric keypad. 10-digit Indian mobile number.
- "Send OTP" button. For the hackathon, this doesn't call a real OTP service. Accept any valid 10-digit number.
- After entering the phone number, call Nevil's `POST /worker/onboard` (or mock it until March 30)

### Screen 3: OTP Verification
- 6-digit OTP input. Use 6 separate input boxes (like every OTP screen you've seen).
- For the hackathon demo: ANY 6-digit code passes. Don't implement real SMS verification.

### Screen 4: Platform Select
- 4 big buttons: Amazon, Flipkart, Meesho, Other
- Each with the platform's logo/color so Raju recognizes it instantly
- Store the selection — it's sent to Nevil's backend

### Screen 5: Partner ID
- Text input field. This is the ID from their delivery app (e.g., "AMZ-001")
- Show a loading spinner while "verifying" (mock: any 6+ character string passes)
- Partner ID is unique per worker — tell Raju where to find it in their delivery app

### Screen 6: Location Permission
- Explain in the worker's language WHY you need location: "We need your location to match you with your delivery zone and protect you during disruptions"
- Request Expo location permission
- Show a simple illustration or icon, not just text

### Screen 7: Premium Quote
- This is the money screen. Show what came back from Yuvraj's risk model (via Nevil's API):
  - "₹49 per week" — large, centered, prominent
  - "Protects up to ₹800 of your earnings" — below, in simpler text
  - Use worker's language, NOT "premium" or "coverage". Say "weekly shield cost" and "your protection"
- Big "Activate Shield" button → triggers a UPI deeplink
- **UPI deeplink format:** `upi://pay?pa=vritti@razorpay&pn=Vritti&am={premium_amount}&tn=WeeklyShield&cu=INR`
- This opens GPay/PhonePe on the worker's phone for one-tap payment

---

## 5 Core Screens — What Each Shows

### Home Screen (Main Dashboard)

This is what Raju sees every time he opens the app after onboarding.

**Layout:**
- **Top:** Animated shield icon (Lottie animation, < 100KB)
  - 🟢 Green = policy ACTIVE
  - 🟡 Yellow (pulsing) = RENEW_TODAY (policy expires today)
  - 🔴 Red = EXPIRED
- **Middle:** Status text in Hindi: "आपका शील्ड सक्रिय है" (Your shield is active)
- **Below status:**
  - Next renewal: "Sunday" (or the actual date)
  - Last payout: "₹800 (Monday)" or "No payouts yet"
- **Bottom:** 3 navigation buttons — "My Week", "Renew", "Help"

**Data source:** `GET /policy/status/:worker_id` from Nevil's API. Call on screen mount.

**Offline behavior:** Cache the last response in AsyncStorage. If there's no network, show cached data with a subtle "Last updated X minutes ago" label. Do NOT show an error screen — Raju may have no network mid-delivery.

### My Week Screen

- Weekly summary: estimated earnings this week, how many disruption days were covered, days active
- Simple, visual. Use progress bars or simple numbers, not charts.
- Data from `GET /policy/status` + any locally cached data

### Renew Screen

- Shows the premium amount prominently: "₹49 per week"
- One big button → UPI deeplink (same format as onboarding)
- Optional toggle: "Auto-renew every week" (save preference in AsyncStorage — tell Nevil's backend)
- This is the screen Raju hits when he gets the Sunday WhatsApp: "Tap to renew"

### Payout History Screen

- Flat list of all past payouts, most recent first
- Each row shows: trigger icon (🌧️ rain / 🌫️ AQI / 🌡️ heat / 🚫 curfew), payout amount, date, status
- Data source: `GET /payout/history/:worker_id` from Nevil's API
- If empty: show "No payouts yet. Your shield will protect you when disruptions happen."

### Help Screen

- 5 pre-recorded voice FAQ buttons (use expo-av for audio playback):
  - "What is Vritti?"
  - "How do I get paid?"
  - "Why was my payment held?"
  - "How do I renew?"
  - "What is a shield?"
- Record these in Hindi (even if just you reading them — it's a hackathon)
- WhatsApp support button at the bottom: opens `https://wa.me/91XXXXXXXXXX` (use any team member's number)

---

## API Endpoints You'll Call

| Endpoint | When | What you send | What you get back |
|---|---|---|---|
| `POST /worker/onboard` | Onboarding screen 2 | phone, name, platform, partner_id, zone_id, device_fingerprint, upi_id | worker_id, risk_score, premium_tier, coverage_cap |
| `POST /policy/activate` | Onboarding screen 7 (after UPI payment) | worker_id, payment_reference | policy_id, week_start, week_end, coverage_cap |
| `GET /policy/status/:worker_id` | Home screen mount | — | status (ACTIVE/RENEW_TODAY/EXPIRED), coverage_cap, renewal_date, last_payout |
| `GET /payout/history/:worker_id` | Payout History screen | — | Array of { amount, trigger_id, paid_at, status } |

**Base URL:** Nevil will share this on March 30. Until then, hardcode mock responses.

---

## UX Rules — Non-Negotiable

These are the design principles. Test every screen against them before submitting.

**3-Tap Rule:**
- Can Raju renew from Home in 3 taps? (Home → Renew → UPI button = 3 taps ✅)
- Can he see payout history in 3 taps? (Home → Payout History = 2 taps ✅)
- If any critical action takes more than 3 taps, redesign.

**No Jargon:**
- Search your entire codebase for these banned words: "premium", "claim", "parametric", "policy", "coverage"
- Replace with: "shield cost" (premium), "protection" (claim/coverage), "your payment" (payout), "weekly shield" (policy)
- If Raju doesn't understand a word, it shouldn't be on screen

**Offline Resilience:**
- Turn off WiFi/data on your test device. Open the app. The Home screen MUST still show the last known status from cache.
- Never show a blank screen or a crash. Show cached data + "Last updated X minutes ago"

**Language Consistency:**
- Change your test device language to Hindi. Open the app. Everything must be in Hindi.
- Change to Gujarati. Open the app. Everything must be in Gujarati.
- If any string appears in English while the device is set to Hindi, fix it.

**Low-End Device Performance:**
- Test on an Android emulator with 2GB RAM, Android 9. The app must not lag or crash.
- Keep Lottie animations under 100KB. Heavy animations crash budget phones.

---

## Timeline

| Date | Deliverable |
|---|---|
| **Mar 21** | Project setup, i18n configuration, Language Select screen |
| **Mar 25** | Full onboarding flow (7 screens) complete with mock data |
| **Mar 28** | All 5 core screens built with hardcoded mock data |
| **Mar 30** | Receive Nevil's API URL |
| **Apr 2** | 🚨 All screens wired to live API and tested |
| **Apr 3** | Integration test with full system |

## Definition of Done

- [ ] Expo project running on Android emulator
- [ ] All 5 languages loading correctly based on device locale
- [ ] Language override works from onboarding Screen 1
- [ ] Full onboarding flow completable end-to-end (with mock data)
- [ ] All 5 core screens functional
- [ ] Screens wired to Nevil's live API
- [ ] 3-tap rule verified for renew and payout history
- [ ] Offline test passed (cached data shows when no network)
- [ ] No English text visible when device is set to Hindi
- [ ] APK buildable with `eas build --platform android`

## Things That Will Bite You

- **Don't wait for the API.** Build EVERY screen with hardcoded mock data first. The API is just swapping a data source — it shouldn't require UI changes.
- **UPI deeplinks don't work on emulators.** You need a real Android phone to test the GPay/PhonePe handoff. On emulator, the button will fail silently.
- **Hindi font rendering.** Some emulators render Devanagari script (Hindi, Marathi) incorrectly. Test on a real device if fonts look wrong.
- **AsyncStorage is async.** When reading cached data on Home screen mount, the screen may flash empty before the cache loads. Show a loading indicator during the read.
- **Lottie file size.** A beautiful shield animation is great. A 2MB animation makes the app crawl on a ₹8,000 phone. Keep it under 100KB.
- **expo-av audio files.** Don't load all 5 FAQ audio files into memory at once. Load on demand when the user taps a FAQ button.
