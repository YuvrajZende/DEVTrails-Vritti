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

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd

# Add model directory to path so we can import features and premium modules
model_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "model")
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

# Enable CORS — Nevil's backend calls from a different domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request/Response models ─────────────────────────────────────────────
class WorkerProfile(BaseModel):
    tenure_weeks: int
    daily_active_hours: float
    weekly_delivery_days: int
    avg_weekly_earnings: float
    earnings_std_dev: float
    claim_count_90d: int
    zone_disruption_days: int
    zone_aqi_baseline: int
    is_monsoon_season: int
    is_flood_prone_zone: int
    is_part_time: int


class RiskScoreResponse(BaseModel):
    risk_score: float
    premium_tier: int
    coverage_cap: int


# ── Endpoints ───────────────────────────────────────────────────────────
@app.post("/risk-score", response_model=RiskScoreResponse)
def get_risk_score(worker: WorkerProfile):
    """
    Calculate risk score for a worker profile.

    Returns the predicted claim probability (risk_score),
    the corresponding weekly premium tier (₹), and coverage cap (₹).
    """
    # Convert input to DataFrame for feature engineering
    df = pd.DataFrame([worker.model_dump()])
    df = engineer_features(df)

    # Get model prediction (probability of claim)
    risk_score = float(model.predict_proba(df[FEATURE_COLUMNS])[0][1])

    # Map to premium tier
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
    """Health check endpoint for Railway and team to verify service is alive."""
    return {"status": "ok", "service": "vritti-risk-score", "version": "1.0.0"}
