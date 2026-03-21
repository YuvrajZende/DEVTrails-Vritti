# 🧠 Project Memory: Vritti — Phase 1 (ML Risk Scoring)

## 📌 Context
This session focused on the initial setup and implementation of the **Risk Scoring Model** for the Vritti hackathon project (Guidewire DEVTrails 2026).

## 🛡️ The Product: Vritti
Vritti provides **parametric income insurance** for gig delivery workers (Amazon, Flipkart, etc.) in India. When a disruption (flood, AQI spike) hits a zone, the system automatically pays out the worker without a claim process.

## 👥 The Team
*   **Yuvraj:** ML Engineer (Risk Scoring) & Contracts Owner.
*   **Sairaj:** ML Engineer (Fraud Detection).
*   **Nevil:** Backend & Database.
*   **Shivam:** n8n Automations.
*   **Bhunesh:** Mobile App.

## ✅ Key Decisions & Progress (Mar 21, 2026)
1.  **Contract-First Design:** Established shared JSON schemas in `/contracts/` so all team members can build independently.
2.  **ML Strategy:** Chose **XGBoost** for binary classification (Will Claim vs. No Claim).
3.  **Data Strategy:** Generated 10,000 synthetic rows encoding domain knowledge (Monsoon + Flood factors) to ensure the model learns realistic patterns.
4.  **Premium Logic:** Implemented specific business rules:
    *   **New Workers (<4 weeks):** ₹79 premium, ₹400 coverage (high risk).
    *   **Part-time workers:** Fixed ₹55 premium, ₹500 coverage.
    *   **Regular workers:** Risk-based pricing (₹35–₹79).
5.  **Robustness:** Implemented clipping in feature engineering to prevent division-by-zero crashes on edge cases (e.g., zero earnings or zero tenure).
6.  **Git/GitHub:** Resolved an issue where local commits weren't visible on GitHub by pushing from `main` to `origin main`.

## 📜 Repository State
*   **Contracts:** Finalized and committed.
*   **ML Model:** Trained with **0.9724 AUC**, saved as `model/risk_model.pkl`.
*   **API:** Fully functional FastAPI service in `api/main.py`.
*   **Deployment:** Dockerfile and requirements ready for Railway.

## 💡 Notes for Next Session
*   Nevil needs Yuvraj's Railway URL to integrate with the onboarding endpoint.
*   Sairaj can use the `contracts/fraud_validate_response.json` schema to build his engine.
*   Future work should involve extending the city/zone list beyond the initial 5 (Vadodara, Mumbai, Delhi, Bangalore, Chennai).
