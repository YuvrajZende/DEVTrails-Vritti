import warnings
warnings.filterwarnings("ignore", message="Core Pydantic V1")

import os
import asyncio
import threading
from datetime import datetime

from dotenv import load_dotenv
# CRITICAL: load_dotenv() MUST run before importing graph,
# because graph.py resolves env vars at module-level (import time).
load_dotenv()

import uvicorn
import requests
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from graph import (
    orchestrator_app,
    check_weather_sensor,
    check_aqi_sensor,
    check_news_sensor,
    check_platform_sensor,
    run_all_sensors,
    get_sensor_history,
    BHUNESH_BACKEND_URL,
    OWM_API_KEY,
    GNEWS_API_KEY,
    MONITOR_CITY,
)

app = FastAPI(title="Vritti LangGraph Orchestrator API")

# Allow browser clients (VrittiWeb on port 5173) to call this directly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Monitoring state ───
monitoring_active = False
monitoring_interval = int(os.environ.get("MONITOR_INTERVAL", 300))  # default 5 min
ZONE_ID = os.environ.get("MONITOR_ZONE", "VAD-04")

# ─── Auto-start config ───
# If any API key is configured, monitoring starts automatically on boot
AUTO_START = os.environ.get("AUTO_START_MONITOR", "").lower()


# ═══════════════════════════════════════════════
#  Background sensor monitoring loop
# ═══════════════════════════════════════════════

def run_sensor_check():
    """
    Full multi-sensor check cycle.
    Polls ALL sensors (weather, AQI, news, platform) and triggers
    the orchestrator if any disruption is detected.
    """
    triggered_sensors = run_all_sensors(zone_id=ZONE_ID)

    if triggered_sensors:
        # Use highest-severity trigger
        severity_rank = {"LOW": 0, "MEDIUM": 1, "HIGH": 2}
        triggered_sensors.sort(
            key=lambda s: severity_rank.get(s.get("severity", "LOW"), 0),
            reverse=True
        )
        primary = triggered_sensors[0]

        print(f"\n  🚨 DISRUPTION DETECTED: {primary['details'][:80]}")
        if len(triggered_sensors) > 1:
            print(f"     ({len(triggered_sensors)} sensors triggered — using highest severity)")
        print(f"  → Invoking orchestrator graph...")

        initial_state = {
            "zone_id": ZONE_ID,
            "trigger_id": primary["trigger_id"],
            "severity": primary["severity"],
            "disruption_start": datetime.utcnow().isoformat() + "Z",
            "sensor_readings": {
                "source": primary.get("source", "sensor"),
                "primary_trigger": primary,
                "all_triggers": triggered_sensors,
            },
            "claims_generated": [],
            "payouts_processed": False,
            "fraud_summary": {},
            "error": ""
        }

        try:
            orchestrator_app.invoke(initial_state)
        except Exception as e:
            print(f"  ❌ Orchestrator error: {e}")


def monitoring_loop():
    """Runs in a background thread. Polls all sensors at the configured interval."""
    global monitoring_active
    sensors_configured = []
    if OWM_API_KEY:
        sensors_configured.extend(["Weather (T1/T2)", "AQI (T3)"])
    if GNEWS_API_KEY:
        sensors_configured.append("News (T4)")
    sensors_configured.append("Platform (T5)")  # Always available (self-referencing)

    print(f"\n  🟢 AUTOMATED SENSOR MONITORING STARTED")
    print(f"     Interval:  Every {monitoring_interval}s")
    print(f"     Zone:      {ZONE_ID}")
    print(f"     Sensors:   {', '.join(sensors_configured)}")
    print(f"     City:      {MONITOR_CITY}")

    while monitoring_active:
        try:
            run_sensor_check()
        except Exception as e:
            print(f"  ❌ Sensor loop error: {e}")

        # Sleep in small increments so we can stop quickly
        for _ in range(monitoring_interval):
            if not monitoring_active:
                break
            import time
            time.sleep(1)

    print(f"  🔴 Sensor monitoring STOPPED")


# ═══════════════════════════════════════════════
#  API ENDPOINTS
# ═══════════════════════════════════════════════

class DisruptionEvent(BaseModel):
    zone_id: str
    trigger_id: str
    severity: str
    disruption_start: str


class DemoSimulateRequest(BaseModel):
    zone_id: str = "VAD-04"
    trigger_id: str = "T1_HEAVY_RAINFALL"
    severity: str = "HIGH"


@app.post("/webhook/orchestrate")
async def handle_orchestration(event: DisruptionEvent):
    """
    Main entry point — receives disruption events from sensors or external systems.
    Runs the full LangGraph: receive → validate → claim → payout.
    """
    initial_state = {
        "zone_id": event.zone_id,
        "trigger_id": event.trigger_id,
        "severity": event.severity,
        "disruption_start": event.disruption_start,
        "sensor_readings": {"source": "webhook"},
        "claims_generated": [],
        "payouts_processed": False,
        "fraud_summary": {},
        "error": ""
    }

    try:
        final_state = orchestrator_app.invoke(initial_state)

        return {
            "status": "success",
            "message": "Orchestration complete.",
            "metrics": {
                "claims_created": len(final_state.get("claims_generated", [])),
                "payouts_processed": final_state.get("payouts_processed"),
                "fraud_summary": final_state.get("fraud_summary", {})
            }
        }
    except Exception as e:
        print(f" [Orchestrator] Failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/demo/simulate")
async def demo_simulate(req: DemoSimulateRequest):
    """
    Demo endpoint — simulates a disruption event as if a sensor detected it.
    Use this during presentations to show the full flow.
    """
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"\n{'='*60}")
    print(f"  ⚡ [{ts}] DEMO SIMULATION TRIGGERED")
    print(f"  📍 Zone: {req.zone_id} | Trigger: {req.trigger_id} | Severity: {req.severity}")
    print(f"{'='*60}")

    initial_state = {
        "zone_id": req.zone_id,
        "trigger_id": req.trigger_id,
        "severity": req.severity,
        "disruption_start": datetime.utcnow().isoformat() + "Z",
        "sensor_readings": {"source": "demo"},
        "claims_generated": [],
        "payouts_processed": False,
        "fraud_summary": {},
        "error": ""
    }

    try:
        final_state = orchestrator_app.invoke(initial_state)
        return {
            "status": "success",
            "message": "Demo simulation complete.",
            "claims_created": len(final_state.get("claims_generated", [])),
            "payouts_processed": final_state.get("payouts_processed"),
            "fraud_summary": final_state.get("fraud_summary", {})
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/webhook/news-alert")
async def receive_news_alert(alert: dict):
    """
    Receives external news alerts (future-proofing).
    Allows news services, admin dashboards, or manual triggers to push alerts.
    """
    ts = datetime.now().strftime("%H:%M:%S")
    zone_id = alert.get("zone_id", ZONE_ID)
    headline = alert.get("headline", "External news alert")
    severity = alert.get("severity", "MEDIUM")

    print(f"\n  📰 [{ts}] EXTERNAL NEWS ALERT: {headline[:80]}")

    initial_state = {
        "zone_id": zone_id,
        "trigger_id": "T4_CURFEW_BANDH",
        "severity": severity,
        "disruption_start": datetime.utcnow().isoformat() + "Z",
        "sensor_readings": {"source": "external_news", "headline": headline},
        "claims_generated": [],
        "payouts_processed": False,
        "fraud_summary": {},
        "error": ""
    }

    try:
        final_state = orchestrator_app.invoke(initial_state)
        return {"status": "success", "claims_created": len(final_state.get("claims_generated", []))}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Monitoring Control ───

@app.post("/monitor/start")
async def start_monitoring(interval: int = 300):
    """Start the background sensor monitoring loop."""
    global monitoring_active, monitoring_interval
    if monitoring_active:
        return {"status": "already_running", "interval": monitoring_interval}

    monitoring_interval = max(30, interval)  # minimum 30 seconds
    monitoring_active = True
    thread = threading.Thread(target=monitoring_loop, daemon=True)
    thread.start()
    return {"status": "started", "interval": monitoring_interval, "zone": ZONE_ID}


@app.post("/monitor/stop")
async def stop_monitoring():
    """Stop the background sensor monitoring loop."""
    global monitoring_active
    monitoring_active = False
    return {"status": "stopped"}


@app.get("/monitor/status")
async def monitor_status():
    """Check if the sensor monitoring is active."""
    return {
        "active": monitoring_active,
        "interval": monitoring_interval,
        "zone": ZONE_ID,
        "city": MONITOR_CITY,
        "sensors": {
            "weather": {"configured": bool(OWM_API_KEY), "triggers": ["T1_HEAVY_RAINFALL", "T2_EXTREME_HEAT"]},
            "aqi": {"configured": bool(OWM_API_KEY), "triggers": ["T3_SEVERE_AQI"]},
            "news": {"configured": bool(GNEWS_API_KEY), "triggers": ["T4_CURFEW_BANDH"]},
            "platform": {"configured": True, "triggers": ["T5_PLATFORM_OUTAGE"]},
        }
    }


# ─── Sensor Dashboard ───

@app.get("/sensors/status")
async def sensors_status():
    """
    Returns sensor history, last readings, and active trigger state.
    This is the audit trail that proves sensors are actually running.
    """
    history = get_sensor_history()

    status = {
        "monitoring_active": monitoring_active,
        "zone": ZONE_ID,
        "city": MONITOR_CITY,
        "sensors": {}
    }

    for sensor_name, readings in history.items():
        last_reading = readings[-1] if readings else None
        status["sensors"][sensor_name] = {
            "total_readings": len(readings),
            "last_reading": last_reading,
            "last_check": last_reading.get("timestamp") if last_reading else None,
            "currently_triggered": last_reading.get("triggered", False) if last_reading else False,
        }

    return status


@app.get("/sensors/history/{sensor_type}")
async def sensor_history(
    sensor_type: str,
    limit: int = Query(default=10, le=50)
):
    """Returns detailed history for a specific sensor type."""
    history = get_sensor_history()
    if sensor_type not in history:
        raise HTTPException(status_code=404, detail=f"Unknown sensor: {sensor_type}. Valid: {list(history.keys())}")

    readings = history[sensor_type]
    return {
        "sensor": sensor_type,
        "total_readings": len(readings),
        "readings": readings[-limit:]
    }


@app.post("/sensors/check-now")
async def check_sensors_now():
    """Trigger an immediate sensor check (outside the monitoring loop)."""
    triggered = run_all_sensors(zone_id=ZONE_ID)
    return {
        "status": "checked",
        "triggers_found": len(triggered),
        "triggers": triggered
    }


# ─── Health ───

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "vritti-orchestrator",
        "monitoring": monitoring_active,
        "sensors": {
            "weather_aqi": bool(OWM_API_KEY),
            "news": bool(GNEWS_API_KEY),
            "platform": True,
        },
        "zone": ZONE_ID,
    }


# ─── Startup ───

@app.on_event("startup")
async def on_startup():
    global monitoring_active, monitoring_interval

    print(f"\n{'='*60}")
    print(f"  🛡️  VRITTI LANGGRAPH ORCHESTRATOR")
    print(f"{'='*60}")
    print(f"  Backend URL:  {BHUNESH_BACKEND_URL}")
    print(f"  Zone:         {ZONE_ID}")
    print(f"  City:         {MONITOR_CITY}")
    print(f"  Monitor Int:  {monitoring_interval}s")
    print(f"{'='*60}")
    print(f"  Sensors:")
    print(f"    T1 Heavy Rainfall:  {'✅ OWM configured' if OWM_API_KEY else '⬚ No OWM_API_KEY'}")
    print(f"    T2 Extreme Heat:    {'✅ OWM configured' if OWM_API_KEY else '⬚ No OWM_API_KEY'}")
    print(f"    T3 Severe AQI:      {'✅ OWM configured' if OWM_API_KEY else '⬚ No OWM_API_KEY'}")
    print(f"    T4 Curfew/Bandh:    {'✅ GNews configured' if GNEWS_API_KEY else '⬚ No GNEWS_API_KEY'}")
    print(f"    T5 Platform Outage: ✅ Always active (self-check)")
    print(f"{'='*60}")
    print(f"  Endpoints:")
    print(f"    POST /webhook/orchestrate   — receive disruption events")
    print(f"    POST /webhook/news-alert    — receive external news alerts")
    print(f"    POST /demo/simulate         — simulate a disruption (demo)")
    print(f"    POST /monitor/start         — start background sensors")
    print(f"    POST /monitor/stop          — stop background sensors")
    print(f"    GET  /monitor/status        — monitoring config")
    print(f"    GET  /sensors/status        — sensor dashboard + audit trail")
    print(f"    GET  /sensors/history/{{type}} — per-sensor history")
    print(f"    POST /sensors/check-now     — trigger immediate check")
    print(f"    GET  /health                — health check")
    print(f"{'='*60}")

    # ─── AUTO-START MONITORING ───
    # Automatically start if any external API key is configured
    # This is the key change that eliminates "manual admin intervention"
    should_auto_start = (
        AUTO_START == "true"
        or AUTO_START == "1"
        or (OWM_API_KEY and AUTO_START != "false")
    )

    if should_auto_start:
        monitoring_active = True
        thread = threading.Thread(target=monitoring_loop, daemon=True)
        thread.start()
        print(f"\n  🟢 AUTO-START: Sensor monitoring is LIVE")
        print(f"     → No manual intervention needed. Sensors polling automatically.")
    else:
        print(f"\n  ⚠️  Monitoring NOT auto-started (no API keys or AUTO_START=false)")
        print(f"     → Use POST /monitor/start to begin, or set OWM_API_KEY")

    print()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8002))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
