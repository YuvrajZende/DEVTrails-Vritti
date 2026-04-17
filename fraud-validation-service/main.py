"""
Standalone fraud validation service for Vritti.

Endpoints:
  POST /fraud-validate
  GET  /health
"""

from __future__ import annotations

import math
import os
from datetime import datetime, timedelta, timezone
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:  # pragma: no cover
    psycopg2 = None
    RealDictCursor = None


DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
ZONE_CENTERS = {
    "VAD-04": (22.3072, 73.1812),
    "MUM-07": (19.1197, 72.8468),
    "DEL-12": (28.5921, 77.0460),
    "BLR-03": (12.9698, 77.7500),
    "CHN-06": (12.9249, 80.1000),
}

app = FastAPI(title="Vritti Fraud Validation API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class FraudValidateRequest(BaseModel):
    claim_id: str
    worker_id: str
    zone_id: str
    trigger_id: str
    disruption_start: datetime
    disruption_end: datetime | None = None
    worker_gps_lat: float | None = None
    worker_gps_lng: float | None = None
    gps_accuracy_meters: float | None = None
    accelerometer_stationary: bool = False
    cell_tower_zone_match: bool = True
    device_fingerprint: str | None = None
    wifi_bssid: str | None = None
    coverage_cap: float | None = Field(default=None, ge=0)
    avg_weekly_earnings: float | None = Field(default=None, ge=0)
    tenure_weeks: int | None = Field(default=None, ge=0)


class FraudValidateResponse(BaseModel):
    fraud_score: float
    recommendation: str
    payout_amount: float
    flags: list[str]
    layers_triggered: list[str]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    return radius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def get_db_connection():
    if not DATABASE_URL or psycopg2 is None:
        return None
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


def fetch_optional_context(payload: FraudValidateRequest) -> dict[str, Any]:
    context = {
        "coverage_cap": payload.coverage_cap,
        "avg_weekly_earnings": payload.avg_weekly_earnings,
        "tenure_weeks": payload.tenure_weeks,
    }

    conn = get_db_connection()
    if conn is None:
        return context

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    w.tenure_weeks,
                    w.avg_weekly_earnings,
                    w.device_fingerprint,
                    p.coverage_cap
                FROM workers w
                LEFT JOIN policies p
                  ON p.worker_id = w.id
                 AND p.status = 'ACTIVE'
                WHERE w.id = %s
                ORDER BY p.created_at DESC NULLS LAST
                LIMIT 1
                """,
                (payload.worker_id,),
            )
            row = cur.fetchone()
            if row:
                context["coverage_cap"] = context["coverage_cap"] or row.get("coverage_cap")
                context["avg_weekly_earnings"] = context["avg_weekly_earnings"] or row.get("avg_weekly_earnings")
                context["tenure_weeks"] = context["tenure_weeks"] if context["tenure_weeks"] is not None else row.get("tenure_weeks")
    finally:
        conn.close()

    return context


def fetch_cluster_metrics(payload: FraudValidateRequest) -> tuple[int, int]:
    conn = get_db_connection()
    if conn is None:
        return (0, 0)

    disruption_day = payload.disruption_start.date()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(DISTINCT w.id) AS total
                FROM workers w
                JOIN policies p ON p.worker_id = w.id
                WHERE w.zone_id = %s
                  AND w.is_active = true
                  AND p.status = 'ACTIVE'
                  AND p.week_start <= %s::date
                  AND p.week_end >= %s::date
                """,
                (payload.zone_id, disruption_day, disruption_day),
            )
            total = int((cur.fetchone() or {}).get("total") or 0)

            cur.execute(
                """
                SELECT COUNT(DISTINCT c.worker_id) AS inactive
                FROM claims c
                JOIN workers w ON w.id = c.worker_id
                WHERE w.zone_id = %s
                  AND c.initiated_at >= %s::timestamp - interval '15 minutes'
                  AND c.initiated_at <= %s::timestamp + interval '15 minutes'
                """,
                (payload.zone_id, payload.disruption_start, payload.disruption_start),
            )
            inactive = int((cur.fetchone() or {}).get("inactive") or 0)
            return (total, inactive + 1)
    finally:
        conn.close()


def fetch_temporal_metrics(payload: FraudValidateRequest) -> tuple[int, int, int]:
    conn = get_db_connection()
    if conn is None:
        return (0, 0, 0)

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*) AS claims_count
                FROM claims
                WHERE worker_id = %s
                  AND initiated_at >= NOW() - interval '14 days'
                """,
                (payload.worker_id,),
            )
            recent_claims = int((cur.fetchone() or {}).get("claims_count") or 0)

            cur.execute(
                """
                SELECT COUNT(*) AS events_count
                FROM disruption_events
                WHERE zone_id = %s
                  AND created_at >= NOW() - interval '14 days'
                """,
                (payload.zone_id,),
            )
            recent_events = int((cur.fetchone() or {}).get("events_count") or 0)

            cur.execute(
                """
                SELECT COUNT(*) AS burst_count
                FROM claims c
                JOIN workers w ON w.id = c.worker_id
                WHERE w.zone_id = %s
                  AND c.initiated_at >= %s::timestamp - interval '5 minutes'
                  AND c.initiated_at <= %s::timestamp + interval '5 minutes'
                """,
                (payload.zone_id, payload.disruption_start, payload.disruption_start),
            )
            burst_count = int((cur.fetchone() or {}).get("burst_count") or 0)
            return (recent_claims, recent_events, burst_count)
    finally:
        conn.close()


def fetch_anti_spoof_metrics(payload: FraudValidateRequest) -> tuple[int, int]:
    conn = get_db_connection()
    if conn is None:
        return (0, 0)

    try:
        with conn.cursor() as cur:
            wifi_count = 0
            if payload.wifi_bssid:
                cur.execute(
                    """
                    SELECT COUNT(*) AS wifi_count
                    FROM claims
                    WHERE breakdown ->> 'wifi_bssid' = %s
                      AND initiated_at >= NOW() - interval '4 hours'
                    """,
                    (payload.wifi_bssid,),
                )
                wifi_count = int((cur.fetchone() or {}).get("wifi_count") or 0)

            fingerprint_count = 0
            if payload.device_fingerprint:
                cur.execute(
                    """
                    SELECT COUNT(*) AS fingerprint_count
                    FROM workers
                    WHERE device_fingerprint = %s
                    """,
                    (payload.device_fingerprint,),
                )
                fingerprint_count = int((cur.fetchone() or {}).get("fingerprint_count") or 0)

            return (wifi_count, fingerprint_count)
    finally:
        conn.close()


def zone_match_layer(payload: FraudValidateRequest, flags: list[str], layers: list[str]) -> float:
    score = 0.0

    center = ZONE_CENTERS.get(payload.zone_id)
    if center and payload.worker_gps_lat is not None and payload.worker_gps_lng is not None:
        distance = haversine_km(payload.worker_gps_lat, payload.worker_gps_lng, center[0], center[1])
        if distance > 11:
            score += 0.40
            flags.append("GPS_OUTSIDE_ZONE")
            layers.append("LAYER_1_ZONE_MATCH:GPS_OUTSIDE_ZONE")
        else:
            layers.append("LAYER_1_ZONE_MATCH:GPS_IN_ZONE")
    else:
        layers.append("LAYER_1_ZONE_MATCH:SKIP_GPS")

    if not payload.cell_tower_zone_match:
        score += 0.35
        flags.append("CELL_TOWER_MISMATCH")
        layers.append("LAYER_1_ZONE_MATCH:CELL_TOWER_MISMATCH")

    if payload.gps_accuracy_meters is not None and payload.trigger_id.startswith(("T1", "T2", "T3")) and payload.gps_accuracy_meters < 10:
        score += 0.25
        flags.append("GPS_SUSPICIOUS_PRECISION")
        layers.append("LAYER_1_ZONE_MATCH:SUSPICIOUS_PRECISION")

    return score


def behavioral_layer(payload: FraudValidateRequest, coverage_cap: float | None, flags: list[str], layers: list[str]) -> tuple[float, float]:
    if not coverage_cap:
        layers.append("LAYER_2_BEHAVIORAL:SKIP_NO_POLICY")
        return (0.0, 0.0)

    disruption_end = payload.disruption_end or (payload.disruption_start + timedelta(hours=4))
    duration_hours = max((disruption_end - payload.disruption_start).total_seconds() / 3600, 1)
    expected_payout = min((duration_hours / 10.0) * coverage_cap, coverage_cap)
    score = 0.0

    if coverage_cap > expected_payout * 1.5:
        score += 0.20
        flags.append("OVERCLAIM_DETECTED")
        layers.append("LAYER_2_BEHAVIORAL:OVERCLAIM_DETECTED")
    else:
        layers.append("LAYER_2_BEHAVIORAL:PASS")

    return (score, round(expected_payout, 2))


def cluster_layer(payload: FraudValidateRequest, flags: list[str], layers: list[str]) -> float:
    total_workers, inactive_workers = fetch_cluster_metrics(payload)
    if total_workers < 3:
        layers.append("LAYER_3_CLUSTER:SKIP_INSUFFICIENT_DATA")
        return 0.0

    ratio = inactive_workers / max(total_workers, 1)
    if ratio < 0.30:
        flags.append("CLUSTER_CONSENSUS_LOW")
        layers.append("LAYER_3_CLUSTER:LOW_CONSENSUS")
        return 0.45
    if ratio < 0.60:
        flags.append("CLUSTER_CONSENSUS_WEAK")
        layers.append("LAYER_3_CLUSTER:WEAK_CONSENSUS")
        return 0.20

    layers.append("LAYER_3_CLUSTER:PASS")
    return 0.0


def temporal_layer(payload: FraudValidateRequest, tenure_weeks: int | None, flags: list[str], layers: list[str]) -> float:
    recent_claims, recent_events, burst_count = fetch_temporal_metrics(payload)
    score = 0.0
    tenure_value = tenure_weeks or 0

    if tenure_value < 2:
        score += 0.50
        flags.append("NEW_ACCOUNT_EARLY_CLAIM")
        layers.append("LAYER_4_TEMPORAL:NEW_ACCOUNT_EARLY_CLAIM")

    if recent_claims >= 2 and recent_events < 2:
        score += 0.35
        flags.append("CONSECUTIVE_CLAIMS_WITHOUT_EVENTS")
        layers.append("LAYER_4_TEMPORAL:CLAIMS_WITHOUT_EVENTS")

    if burst_count > 10:
        score += 0.40
        flags.append("CLAIM_BURST")
        layers.append("LAYER_4_TEMPORAL:CLAIM_BURST")

    if score == 0:
        layers.append("LAYER_4_TEMPORAL:PASS")

    return score


def anti_spoof_layer(payload: FraudValidateRequest, flags: list[str], layers: list[str]) -> float:
    score = 0.0
    wifi_count, fingerprint_count = fetch_anti_spoof_metrics(payload)

    if payload.accelerometer_stationary:
        score += 0.40
        flags.append("ACCELEROMETER_STATIONARY")
        layers.append("LAYER_5_ANTI_SPOOF:ACCELEROMETER_STATIONARY")

    if wifi_count > 3:
        score += 0.50
        flags.append("WIFI_BSSID_CLUSTER")
        layers.append("LAYER_5_ANTI_SPOOF:WIFI_BSSID_CLUSTER")

    if fingerprint_count > 1:
        score += 0.45
        flags.append("DEVICE_FINGERPRINT_DUPLICATE")
        layers.append("LAYER_5_ANTI_SPOOF:DEVICE_FINGERPRINT_DUPLICATE")

    if score == 0:
        layers.append("LAYER_5_ANTI_SPOOF:PASS")

    return score


@app.post("/fraud-validate", response_model=FraudValidateResponse)
def fraud_validate(payload: FraudValidateRequest) -> FraudValidateResponse:
    flags: list[str] = []
    layers: list[str] = []

    context = fetch_optional_context(payload)
    coverage_cap = float(context.get("coverage_cap") or 0)
    tenure_weeks = context.get("tenure_weeks")

    total_score = 0.0
    total_score += zone_match_layer(payload, flags, layers)
    behavior_score, expected_payout = behavioral_layer(payload, coverage_cap, flags, layers)
    total_score += behavior_score
    total_score += cluster_layer(payload, flags, layers)
    total_score += temporal_layer(payload, tenure_weeks, flags, layers)
    total_score += anti_spoof_layer(payload, flags, layers)
    total_score = round(min(total_score, 1.0), 4)

    base_payout = round(expected_payout or coverage_cap or 0, 2)
    if total_score < 0.3:
        recommendation = "AUTO_APPROVE"
        payout_amount = base_payout
    elif total_score <= 0.6:
        recommendation = "PARTIAL_PAYOUT"
        payout_amount = round(base_payout * 0.8, 2)
    else:
        recommendation = "HOLD"
        payout_amount = 0.0

    return FraudValidateResponse(
        fraud_score=total_score,
        recommendation=recommendation,
        payout_amount=payout_amount,
        flags=list(dict.fromkeys(flags)),
        layers_triggered=layers,
    )


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "vritti-fraud-validation",
        "database_configured": bool(DATABASE_URL),
        "timestamp": utc_now().isoformat(),
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8003))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
