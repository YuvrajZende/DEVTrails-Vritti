# 🚀 Task 1: ML Risk Scoring Engine — COMPLETED

This document summarizes the work completed for Yuvraj's task (ML Engineer — Risk Scoring) in the Vritti project.

## ✅ Accomplishments

We have successfully built, trained, and tested the **ML Risk Scoring Engine**, which is a critical part of the Vritti onboarding flow.

1.  **Shared Contracts Created** (`/contracts/`)
    *   `disruption_event.json`: Schema for disruption events detected by n8n.
    *   `risk_score_response.json`: Schema for the Risk API response.
    *   `fraud_validate_response.json`: Schema for the Fraud Detection API response.

2.  **Synthetic Data Pipeline** (`/data/`)
    *   Generated a dataset of **10,000 synthetic workers** with realistic correlations (e.g., monsoon impact in flood-prone zones, tenure-based risk).
    *   Dataset saved at `data/synthetic_workers.csv`.

3.  **ML Model Training** (`/model/`)
    *   Implemented feature engineering deriving 5 key metrics: `zone_disruption_frequency`, `claim_velocity`, `income_stability_score`, `behavioral_consistency_score`, and `part_time_index`.
    *   Trained an **XGBoost Classifier** with an **AUC-ROC of 0.9724** (far exceeding the 0.80 target).
    *   Implemented premium tier mapping with overrides for new workers and part-timers.
    *   Trained model saved at `model/risk_model.pkl`.

4.  **Production-Ready API** (`/api/`)
    *   Built a **FastAPI** service with `/risk-score` and `/health` endpoints.
    *   Integrated the trained model and feature engineering pipeline.
    *   Enabled CORS for cross-origin calls from the backend/mobile app.

5.  **Verified Performance**
    *   Passed **20/20 edge case tests**, including zero-value inputs, extreme boundaries, and specific worker personas (Raju, Mumbai monsoon worker, etc.).

---

## 🛠️ How to Run the Model & API

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Generate Data & Train Model (Optional - already done)
```bash
python data/generate_dataset.py
python model/train.py
```

### 3. Run the API locally
```bash
uvicorn api.main:app --port 8000
```

### 4. Test the API
You can test the API using `curl` or PowerShell:
```powershell
$body = '{"tenure_weeks":24,"daily_active_hours":9.5,"weekly_delivery_days":5,"avg_weekly_earnings":3800,"earnings_std_dev":420,"claim_count_90d":1,"zone_disruption_days":18,"zone_aqi_baseline":142,"is_monsoon_season":0,"is_flood_prone_zone":1,"is_part_time":0}'
Invoke-RestMethod -Uri "http://127.0.0.1:8000/risk-score" -Method Post -Body $body -ContentType "application/json" | ConvertTo-Json
```

---

## 📦 Deployment Info

The project is ready for **Railway** deployment.
*   **Dockerfile** is configured to run the FastAPI app on port 8000.
*   The API has been pushed to GitHub and is ready to be linked to a Railway project.
