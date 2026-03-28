"""
Vritti — Risk Score API
FastAPI service exposing the XGBoost risk scoring model.

Endpoints:
  POST /risk-score  — accepts worker profile, returns risk_score + premium + coverage
  GET  /health      — health check
"""

import os
import sys
import pickle
import warnings

warnings.filterwarnings("ignore", message="Core Pydantic V1")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import uvicorn

# Add model directory to path
model_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model")
sys.path.insert(0, model_dir)

from features import engineer_features, FEATURE_COLUMNS
from premium import get_premium_tier

# ── Load model at startup ───────────────────────────────────────────────
model_path = os.path.join(model_dir, "risk_model.pkl")
with open(model_path, "rb") as f:
    model = pickle.load(f)
print(f"✅ Model loaded from {model_path}")

# ── FastAPI app ─────────────────────────────────────────────────────────
app = FastAPI(
    title="Vritti Risk Score API",
    description="AI-powered risk scoring for gig worker income insurance",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request/Response models ─────────────────────────────────────────────
class WorkerProfile(BaseModel):
    tenure_weeks: int = 0
    daily_active_hours: float = 8.0
    weekly_delivery_days: int = 6
    avg_weekly_earnings: float = 3000.0
    earnings_std_dev: float = 500.0
    claim_count_90d: int = 0
    zone_disruption_days: int = 15
    zone_aqi_baseline: int = 100
    is_monsoon_season: int = 0
    is_flood_prone_zone: int = 0
    is_part_time: int = 0


class RiskScoreResponse(BaseModel):
    risk_score: float
    premium_tier: int
    coverage_cap: int


# ── Endpoints ───────────────────────────────────────────────────────────
@app.post("/risk-score", response_model=RiskScoreResponse)
def get_risk_score(worker: WorkerProfile):
    """Calculate risk score for a worker profile."""
    df = pd.DataFrame([worker.model_dump()])
    df = engineer_features(df)

    risk_score = float(model.predict_proba(df[FEATURE_COLUMNS])[0][1])

    premium = get_premium_tier(
        risk_score=risk_score,
        is_part_time=bool(worker.is_part_time),
        tenure_weeks=worker.tenure_weeks,
    )

    return RiskScoreResponse(
        risk_score=round(risk_score, 4),
        premium_tier=premium["premium"],
        coverage_cap=premium["coverage_cap"],
    )


@app.get("/health")
def health():
    return {"status": "ok", "service": "vritti-risk-score", "version": "1.0.0"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001)
