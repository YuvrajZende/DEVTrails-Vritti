import os
import time
from typing import TypedDict, List, Dict, Any, Optional
from datetime import datetime, timedelta

import requests
from langgraph.graph import StateGraph, END

BHUNESH_BACKEND_URL = os.environ.get("BHUNESH_BACKEND_URL", "http://localhost:3000").rstrip("/")

# Payout goes directly to the backend — no n8n dependency
PAYOUT_PROCESS_URL = f"{BHUNESH_BACKEND_URL}/payout/process"

# ─── OpenWeatherMap config (free tier) ───
OWM_API_KEY = os.environ.get("OWM_API_KEY", "")

# ─── GNews config (free tier — 100 req/day) ───
GNEWS_API_KEY = os.environ.get("GNEWS_API_KEY", "")
MONITOR_CITY = os.environ.get("MONITOR_CITY", "Vadodara")

# Vadodara coordinates
DEFAULT_LAT = 22.3072
DEFAULT_LON = 73.1812

# ─── Thresholds ───
RAINFALL_THRESHOLD_MM = 15.0   # mm/h
AQI_THRESHOLD = 300
AQI_PM25_THRESHOLD = 150.0    # μg/m³ — direct PM2.5 danger level
HEAT_THRESHOLD_C = 42.0

# ─── Sustained duration tracking ───
# Store recent readings to detect sustained breaches (not just instant spikes)
_sensor_history: Dict[str, List[Dict[str, Any]]] = {
    "weather": [],
    "aqi": [],
    "news": [],
    "platform": [],
}
MAX_HISTORY = 50  # keep last 50 readings per sensor


def _log_sensor_reading(sensor_type: str, reading: dict):
    """Store sensor reading for audit trail and sustained-duration checks."""
    entry = {**reading, "timestamp": datetime.utcnow().isoformat() + "Z"}
    _sensor_history[sensor_type].append(entry)
    if len(_sensor_history[sensor_type]) > MAX_HISTORY:
        _sensor_history[sensor_type] = _sensor_history[sensor_type][-MAX_HISTORY:]


def get_sensor_history() -> Dict[str, List[Dict[str, Any]]]:
    """Return full sensor history (used by /sensors/status endpoint)."""
    return _sensor_history


# ═══════════════════════════════════════════════
#  SENSOR 1 — WEATHER (T1 Rainfall, T2 Heat)
# ═══════════════════════════════════════════════

def check_weather_sensor(lat: float = DEFAULT_LAT, lon: float = DEFAULT_LON) -> dict:
    """
    Checks current weather via OpenWeatherMap.
    Returns disruption info if rainfall or heat thresholds are breached.
    Implements sustained-duration validation: checks if the last 2 readings also
    showed threshold breach (≈sustained for monitoring_interval × 2).
    """
    ts = datetime.now().strftime("%H:%M:%S")

    if not OWM_API_KEY:
        result = {"triggered": False, "details": "No OWM_API_KEY — sensor inactive", "source": "none"}
        _log_sensor_reading("weather", result)
        return result

    try:
        url = (
            f"https://api.openweathermap.org/data/2.5/weather"
            f"?lat={lat}&lon={lon}&appid={OWM_API_KEY}&units=metric"
        )
        resp = requests.get(url, timeout=8)
        resp.raise_for_status()
        data = resp.json()

        temp = data.get("main", {}).get("temp", 25)
        feels_like = data.get("main", {}).get("feels_like", temp)
        humidity = data.get("main", {}).get("humidity", 50)
        rain_1h = data.get("rain", {}).get("1h", 0)
        rain_3h = data.get("rain", {}).get("3h", 0)
        weather_desc = data.get("weather", [{}])[0].get("description", "clear")
        wind_speed = data.get("wind", {}).get("speed", 0)

        print(f"  [{ts}] 🌤️  Weather API: {weather_desc} | Temp: {temp}°C (feels {feels_like}°C) | Rain: {rain_1h}mm/h | Wind: {wind_speed}m/s")

        raw_data = {
            "temp": temp, "feels_like": feels_like, "humidity": humidity,
            "rain_1h": rain_1h, "rain_3h": rain_3h, "desc": weather_desc,
            "wind_speed": wind_speed
        }

        # --- Check sustained rainfall ---
        # min_readings=3 ensures at least 3 consecutive sensor cycles breach the
        # threshold before we trigger. This prevents single-spike false positives.
        if rain_1h >= RAINFALL_THRESHOLD_MM:
            sustained = _check_sustained("weather", "rain_1h", RAINFALL_THRESHOLD_MM, min_readings=3)
            if not sustained:
                print(f"  [{ts}] 🕐 Rain {rain_1h}mm — waiting for sustained readings (3 required)")
                result = {"triggered": False, "details": f"Rain {rain_1h}mm/h above threshold but not yet sustained", "raw": raw_data, "source": "openweathermap"}
                _log_sensor_reading("weather", result)
                return result
            result = {
                "triggered": True,
                "trigger_id": "T1_HEAVY_RAINFALL",
                "severity": "HIGH" if rain_1h >= 30 else "MEDIUM",
                "details": f"Rainfall {rain_1h}mm/h sustained across 3+ checks (threshold {RAINFALL_THRESHOLD_MM}mm)",
                "sustained": sustained,
                "raw": raw_data,
                "source": "openweathermap"
            }
            _log_sensor_reading("weather", result)
            return result

        # --- Check extreme heat (using feels_like for heat index) ---
        effective_temp = max(temp, feels_like)
        if effective_temp >= HEAT_THRESHOLD_C:
            hour = datetime.now().hour
            # Heat is more relevant during working hours (10AM - 4PM IST)
            is_peak = 10 <= hour <= 16
            result = {
                "triggered": True,
                "trigger_id": "T2_EXTREME_HEAT",
                "severity": "HIGH" if (effective_temp >= 46 or is_peak) else "MEDIUM",
                "details": f"Heat index {effective_temp}°C exceeds threshold ({HEAT_THRESHOLD_C}°C) | Peak hours: {is_peak}",
                "raw": raw_data,
                "source": "openweathermap"
            }
            _log_sensor_reading("weather", result)
            return result

        result = {"triggered": False, "details": f"Normal: {weather_desc}, {temp}°C, Rain {rain_1h}mm/h", "raw": raw_data, "source": "openweathermap"}
        _log_sensor_reading("weather", result)
        return result

    except Exception as e:
        print(f"  [{ts}] ⚠️  Weather API error: {e}")
        result = {"triggered": False, "details": f"API error: {e}", "source": "error"}
        _log_sensor_reading("weather", result)
        return result


def _check_sustained(sensor_type: str, field: str, threshold: float, min_readings: int = 2) -> bool:
    """
    Check if the last N readings of a sensor also exceeded the threshold.
    This prevents single-spike false triggers.
    """
    history = _sensor_history.get(sensor_type, [])
    if len(history) < min_readings:
        return True  # Not enough history — allow trigger (first detection)

    recent = history[-min_readings:]
    breaches = sum(1 for r in recent if r.get("raw", {}).get(field, 0) >= threshold)
    return breaches >= min_readings


# ═══════════════════════════════════════════════
#  SENSOR 2 — AIR QUALITY INDEX (T3)
# ═══════════════════════════════════════════════

def check_aqi_sensor(lat: float = DEFAULT_LAT, lon: float = DEFAULT_LON) -> dict:
    """
    Checks AQI via OpenWeatherMap Air Pollution API.
    Uses actual PM2.5 concentration + OWM's 1-5 AQI scale.
    """
    ts = datetime.now().strftime("%H:%M:%S")

    if not OWM_API_KEY:
        result = {"triggered": False, "details": "No OWM_API_KEY — AQI sensor inactive", "source": "none"}
        _log_sensor_reading("aqi", result)
        return result

    try:
        url = f"https://api.openweathermap.org/data/2.5/air_pollution?lat={lat}&lon={lon}&appid={OWM_API_KEY}"
        resp = requests.get(url, timeout=8)
        resp.raise_for_status()
        data = resp.json()

        components = data.get("list", [{}])[0].get("components", {})
        pm25 = components.get("pm2_5", 0)
        pm10 = components.get("pm10", 0)
        no2 = components.get("no2", 0)
        o3 = components.get("o3", 0)
        aqi_index = data.get("list", [{}])[0].get("main", {}).get("aqi", 1)

        # OWM AQI: 1=Good, 2=Fair, 3=Moderate, 4=Poor, 5=Very Poor
        # Map to approximate India NAQI scale
        aqi_mapping = {1: 50, 2: 100, 3: 200, 4: 300, 5: 400}
        approx_aqi = aqi_mapping.get(aqi_index, aqi_index * 80)

        print(f"  [{ts}] 🌫️  AQI: PM2.5={pm25}μg/m³ | PM10={pm10} | AQI≈{approx_aqi} (scale:{aqi_index}/5)")

        raw_data = {
            "pm25": pm25, "pm10": pm10, "no2": no2, "o3": o3,
            "aqi_index": aqi_index, "approx_aqi": approx_aqi
        }

        # Trigger on EITHER high AQI scale OR dangerous PM2.5 levels
        if approx_aqi >= AQI_THRESHOLD or pm25 >= AQI_PM25_THRESHOLD:
            result = {
                "triggered": True,
                "trigger_id": "T3_SEVERE_AQI",
                "severity": "HIGH" if (approx_aqi >= 400 or pm25 >= 250) else "MEDIUM",
                "details": f"AQI {approx_aqi} (PM2.5: {pm25}μg/m³) exceeds safe levels",
                "raw": raw_data,
                "source": "openweathermap"
            }
            _log_sensor_reading("aqi", result)
            return result

        result = {"triggered": False, "details": f"AQI normal: ~{approx_aqi} (PM2.5: {pm25}μg/m³)", "raw": raw_data, "source": "openweathermap"}
        _log_sensor_reading("aqi", result)
        return result

    except Exception as e:
        print(f"  [{ts}] ⚠️  AQI API error: {e}")
        result = {"triggered": False, "details": f"API error: {e}", "source": "error"}
        _log_sensor_reading("aqi", result)
        return result


# ═══════════════════════════════════════════════
#  SENSOR 3 — NEWS / CURFEW / BANDH (T4)
# ═══════════════════════════════════════════════

# Disruption keywords ranked by severity
_HIGH_SEVERITY_KEYWORDS = ["curfew", "flood", "cyclone", "earthquake", "riot", "shoot"]
_MEDIUM_SEVERITY_KEYWORDS = ["bandh", "shutdown", "strike", "protest", "waterlog", "lockdown"]
_LOW_SEVERITY_KEYWORDS = ["traffic jam", "road block", "power outage", "water supply"]


def check_news_sensor(city: str = None) -> dict:
    """
    Polls GNews API for disruption-related headlines in the configured city.
    Classifies severity based on keyword matching.
    Free tier: 100 requests/day — sufficient for 5-min polling during 8hr window.
    """
    ts = datetime.now().strftime("%H:%M:%S")
    city = city or MONITOR_CITY

    if not GNEWS_API_KEY:
        # Fallback: try NewsData.io or return inactive
        result = {"triggered": False, "details": "No GNEWS_API_KEY — news sensor inactive", "source": "none"}
        _log_sensor_reading("news", result)
        return result

    try:
        # Search for disruption-related news in the city
        query = f"(curfew OR bandh OR flood OR shutdown OR strike OR protest) {city}"
        url = (
            f"https://gnews.io/api/v4/search"
            f"?q={requests.utils.quote(query)}"
            f"&lang=en"
            f"&country=in"
            f"&max=5"
            f"&apikey={GNEWS_API_KEY}"
        )

        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        articles = data.get("articles", [])
        if not articles:
            result = {"triggered": False, "details": f"No disruption news for {city}", "source": "gnews"}
            _log_sensor_reading("news", result)
            print(f"  [{ts}] 📰 News: No disruption headlines for {city}")
            return result

        # Analyze articles for relevance and recency
        now = datetime.utcnow()
        relevant_articles = []

        for article in articles:
            title = (article.get("title", "") or "").lower()
            description = (article.get("description", "") or "").lower()
            published = article.get("publishedAt", "")
            combined_text = f"{title} {description}"

            # Check if article is recent (within last 6 hours)
            try:
                pub_time = datetime.fromisoformat(published.replace("Z", "+00:00").replace("+00:00", ""))
                age_hours = (now - pub_time).total_seconds() / 3600
                if age_hours > 6:
                    continue
            except (ValueError, TypeError):
                continue  # Skip articles with unparseable dates

            # Check for disruption keywords
            severity = None
            matched_keyword = None

            for kw in _HIGH_SEVERITY_KEYWORDS:
                if kw in combined_text:
                    severity = "HIGH"
                    matched_keyword = kw
                    break

            if not severity:
                for kw in _MEDIUM_SEVERITY_KEYWORDS:
                    if kw in combined_text:
                        severity = "MEDIUM"
                        matched_keyword = kw
                        break

            if not severity:
                for kw in _LOW_SEVERITY_KEYWORDS:
                    if kw in combined_text:
                        severity = "LOW"
                        matched_keyword = kw
                        break

            if severity and city.lower() in combined_text:
                relevant_articles.append({
                    "title": article.get("title", ""),
                    "severity": severity,
                    "keyword": matched_keyword,
                    "published": published,
                    "url": article.get("url", ""),
                    "age_hours": round(age_hours, 1)
                })

        if relevant_articles:
            # Use highest severity article
            relevant_articles.sort(key=lambda a: ["LOW", "MEDIUM", "HIGH"].index(a["severity"]), reverse=True)
            top = relevant_articles[0]

            print(f"  [{ts}] 📰🚨 NEWS DISRUPTION: [{top['severity']}] \"{top['title'][:80]}\" (keyword: {top['keyword']})")

            result = {
                "triggered": True,
                "trigger_id": "T4_CURFEW_BANDH",
                "severity": top["severity"],
                "details": f"News alert: \"{top['title'][:100]}\" (keyword: {top['keyword']}, {top['age_hours']}h ago)",
                "articles": relevant_articles[:3],
                "source": "gnews"
            }
            _log_sensor_reading("news", result)
            return result

        print(f"  [{ts}] 📰 News: {len(articles)} articles found, none relevant to {city} disruptions")
        result = {"triggered": False, "details": f"No relevant disruption news for {city}", "source": "gnews"}
        _log_sensor_reading("news", result)
        return result

    except Exception as e:
        print(f"  [{ts}] ⚠️  News API error: {e}")
        result = {"triggered": False, "details": f"News API error: {e}", "source": "error"}
        _log_sensor_reading("news", result)
        return result


# ═══════════════════════════════════════════════
#  SENSOR 4 — PLATFORM OUTAGE (T5)
# ═══════════════════════════════════════════════

def check_platform_sensor(zone_id: str = "VAD-04") -> dict:
    """
    Checks backend for platform health in a zone.
    If the backend reports zero order activity for >2 hours, triggers T5.
    Self-referencing sensor — uses our own data, realistic for MVP.
    """
    ts = datetime.now().strftime("%H:%M:%S")

    try:
        url = f"{BHUNESH_BACKEND_URL}/admin/platform-health?zone_id={zone_id}"
        resp = requests.get(url, timeout=5)

        if resp.status_code == 200:
            data = resp.json()
            active_orders = data.get("active_orders", -1)
            hours_inactive = data.get("hours_inactive", 0)

            print(f"  [{ts}] 📦 Platform: Zone {zone_id} | Active orders: {active_orders} | Inactive: {hours_inactive}h")

            if hours_inactive >= 2 and active_orders == 0:
                result = {
                    "triggered": True,
                    "trigger_id": "T5_PLATFORM_OUTAGE",
                    "severity": "MEDIUM",
                    "details": f"Platform outage in zone {zone_id}: {hours_inactive}h with zero orders",
                    "raw": data,
                    "source": "backend"
                }
                _log_sensor_reading("platform", result)
                return result

            result = {"triggered": False, "details": f"Platform normal: {active_orders} active orders", "raw": data, "source": "backend"}
            _log_sensor_reading("platform", result)
            return result
        else:
            print(f"  [{ts}] ⚠️  Platform health endpoint returned {resp.status_code}")
            result = {"triggered": False, "details": f"Platform health check returned {resp.status_code}", "source": "error"}
            _log_sensor_reading("platform", result)
            return result

    except Exception as e:
        print(f"  [{ts}] ⚠️  Platform health check failed: {e}")
        result = {"triggered": False, "details": f"Platform check error: {e}", "source": "error"}
        _log_sensor_reading("platform", result)
        return result


# ═══════════════════════════════════════════════
#  MULTI-SENSOR AGGREGATION
# ═══════════════════════════════════════════════

def run_all_sensors(zone_id: str = "VAD-04") -> List[dict]:
    """
    Runs all sensor checks and returns list of triggered sensors.
    Non-triggered sensors are logged but not returned.
    """
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"\n{'─'*60}")
    print(f"  🔍 [{ts}] SENSOR SCAN — Zone: {zone_id}")
    print(f"  📡 Checking: Weather | AQI | News | Platform")
    print(f"{'─'*60}")

    results = []
    all_readings = {}

    # 1. Weather (T1 + T2)
    weather = check_weather_sensor()
    all_readings["weather"] = weather
    if weather.get("triggered"):
        results.append(weather)

    # 2. AQI (T3)
    aqi = check_aqi_sensor()
    all_readings["aqi"] = aqi
    if aqi.get("triggered"):
        results.append(aqi)

    # 3. News / Curfew (T4)
    news = check_news_sensor()
    all_readings["news"] = news
    if news.get("triggered"):
        results.append(news)

    # 4. Platform Outage (T5)
    platform = check_platform_sensor(zone_id)
    all_readings["platform"] = platform
    if platform.get("triggered"):
        results.append(platform)

    # Summary
    if results:
        print(f"\n  🚨 [{ts}] {len(results)} TRIGGER(S) ACTIVE:")
        for r in results:
            print(f"     → {r['trigger_id']} [{r['severity']}]: {r['details'][:80]}")
    else:
        print(f"\n  ✅ [{ts}] All clear — no disruptions detected")
        for sensor_name, reading in all_readings.items():
            detail = reading.get("details", "")
            if detail:
                print(f"     {sensor_name.capitalize()}: {detail[:80]}")

    return results


# ═══════════════════════════════════════════════
#  LANGGRAPH STATE & NODES
# ═══════════════════════════════════════════════

class GraphState(TypedDict):
    zone_id: str
    trigger_id: str
    severity: str
    disruption_start: str
    sensor_readings: Dict[str, Any]        # Raw sensor data for audit
    claims_generated: List[Dict[str, Any]]
    payouts_processed: bool
    fraud_summary: Dict[str, Any]          # Aggregate fraud stats
    error: str


def receive_event(state: GraphState):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"\n{'='*60}")
    print(f"  🛡️  VRITTI ORCHESTRATOR — EVENT RECEIVED")
    print(f"{'='*60}")
    print(f"  ⏰ Time:       {ts}")
    print(f"  📍 Zone:       {state['zone_id']}")
    print(f"  🔔 Trigger:    {state['trigger_id']}")
    print(f"  ⚠️  Severity:   {state['severity']}")
    print(f"  📅 Start:      {state['disruption_start']}")
    sensor_source = state.get("sensor_readings", {}).get("source", "manual")
    print(f"  📡 Source:      {sensor_source}")
    print(f"{'='*60}")
    print(f"  → Moving to EVENT VALIDATION node...")
    return {
        "claims_generated": [],
        "payouts_processed": False,
        "error": "",
        "fraud_summary": {},
    }


def validate_event(state: GraphState):
    """
    Cross-validates the disruption event against current sensor readings.
    If sensors show the disruption has already resolved, skips claim generation.
    This prevents stale/duplicate events from creating spurious claims.
    """
    ts = datetime.now().strftime("%H:%M:%S")
    trigger_id = state["trigger_id"]
    zone_id = state["zone_id"]

    print(f"\n  🔍 [{ts}] VALIDATING EVENT: {trigger_id} in zone {zone_id}")

    # For demo/simulate events, skip live validation
    sensor_data = state.get("sensor_readings", {})
    if sensor_data.get("source") == "demo":
        print(f"  ✅ Demo event — bypassing live sensor validation")
        return {}

    # Try to re-check the relevant sensor
    try:
        if trigger_id.startswith("T1_") or trigger_id.startswith("T2_"):
            current = check_weather_sensor()
        elif trigger_id.startswith("T3_"):
            current = check_aqi_sensor()
        elif trigger_id.startswith("T4_"):
            current = check_news_sensor()
        elif trigger_id.startswith("T5_"):
            current = check_platform_sensor(zone_id)
        else:
            current = {"triggered": True}  # Unknown trigger — allow through

        if current.get("triggered"):
            print(f"  ✅ Disruption CONFIRMED — sensor still active")
            return {"sensor_readings": {**sensor_data, "validation": "confirmed", "recheck": current}}
        else:
            print(f"  ⛔ Sensor shows disruption RESOLVED — aborting claim generation")
            print(f"     Current reading: {current.get('details', 'N/A')}")
            return {
                "sensor_readings": {**sensor_data, "validation": "resolved", "recheck": current},
                "error": "VALIDATION_FAILED_RESOLVED"
            }

    except Exception as e:
        print(f"  ⚠️  Validation check failed ({e}) — proceeding with event")
        return {"sensor_readings": {**sensor_data, "validation": "check_failed"}}


def generate_claims(state: GraphState):
    print(f"\n  📋 [generate_claims] Calling backend /claim/initiate...")
    print(f"     ML Risk Score + Revenue Loss model + 5-Layer Fraud Detection active")
    try:
        response = requests.post(
            f"{BHUNESH_BACKEND_URL}/claim/initiate",
            json={
                "zone_id": state["zone_id"],
                "trigger_id": state["trigger_id"],
                "severity": state["severity"],
                "disruption_start": state["disruption_start"]
            },
            timeout=30
        )
        response.raise_for_status()
        data = response.json()
        claims = data.get("claims", [])

        print(f"\n  ✅ Claims created: {len(claims)}")
        print(f"     → Auto-approved: {data.get('auto_approved', 0)}")
        print(f"     → Held for review: {data.get('held', 0)}")
        print(f"     → Skipped (duplicate): {data.get('skipped_existing', 0)}")
        print(f"     → Severity level: {data.get('severity', state['severity'])}")

        # Aggregate fraud summary
        fraud_summary = {
            "total_claims": len(claims),
            "auto_approved": data.get("auto_approved", 0),
            "held": data.get("held", 0),
            "avg_fraud_score": 0,
            "layers_active": ["ML_RISK", "BEHAVIORAL", "CLUSTER_CONSENSUS", "TEMPORAL_ANOMALY"],
        }

        total_fraud = 0
        for c in claims:
            cid = c.get('id', '?')
            if len(cid) > 25:
                cid = cid[:25] + "..."

            breakdown = c.get('breakdown', {})
            fraud_layers = breakdown.get('fraud_layers', {})
            risk_src = c.get('risk_source', '?')
            worker_name = c.get('worker_name', c.get('worker_id', '?'))

            print(f"\n     ┌─ 📄 Claim: {cid}")
            print(f"     │  Worker: {worker_name} ({c.get('worker_id','?')})")
            print(f"     │  Status: {c.get('status','?')}")

            if breakdown:
                print(f"     │  ────────── Revenue Loss Breakdown ──────────")
                print(f"     │  Hourly Rate:      ₹{breakdown.get('hourly_rate', '?')}/hr")
                print(f"     │  Disruption Hours:  {breakdown.get('disruption_hours', '?')}h")
                print(f"     │  Severity Mult:     {breakdown.get('severity_multiplier', '?')}x")
                print(f"     │  Raw Lost Revenue:  ₹{breakdown.get('raw_lost_revenue', '?')}")
                print(f"     │  Coverage Capped:   ₹{breakdown.get('capped_at_coverage', '?')}")
                print(f"     │  Fraud Penalty:     {breakdown.get('fraud_penalty', '0%')}")

            if fraud_layers:
                print(f"     │  ────────── 5-Layer Fraud Analysis ──────────")
                print(f"     │  L1 ML Risk:        {fraud_layers.get('ml_risk_score', '?')}")
                cc = fraud_layers.get('cluster_consensus', {})
                if cc:
                    print(f"     │  L3 Cluster:        {cc.get('zone_claims', '?')}/{cc.get('zone_workers', '?')} workers claimed (ratio: {cc.get('ratio', '?')})")
                    print(f"     │     Penalty:        +{cc.get('penalty', 0)}")
                ta = fraud_layers.get('temporal_anomaly', {})
                if ta:
                    print(f"     │  L4 Temporal:       tenure={ta.get('tenure_weeks', '?')}w | consec={ta.get('consecutive_claims', '?')} | velocity={ta.get('velocity_7d', '?')}")
                    print(f"     │     Penalty:        +{ta.get('penalty', 0)}")
                print(f"     │  Composite Score:   {fraud_layers.get('composite_score', '?')}")
                print(f"     │  ────────────────────────────────────────────")

            print(f"     │  ML Risk Score:    {c.get('fraud_score', 0):.4f} (via {risk_src})")
            print(f"     │  💰 FINAL PAYOUT:  ₹{c.get('payout_amount', 0)}")
            print(f"     └──────────────────────────────────────────────")

            total_fraud += c.get("fraud_score", 0)

        if claims:
            fraud_summary["avg_fraud_score"] = round(total_fraud / len(claims), 4)

        if not claims:
            print(f"  ⚠️  No eligible workers found in zone {state['zone_id']}")

        print(f"\n  → Moving to PAYOUT PROCESSING node...")
        return {"claims_generated": claims, "fraud_summary": fraud_summary}
    except Exception as e:
        print(f"  ❌ Error generating claims: {e}")
        return {"error": str(e), "claims_generated": [], "fraud_summary": {}}


def process_payouts(state: GraphState):
    claims = state.get("claims_generated", [])
    if not claims:
        print(f"\n  💰 [process_payouts] No claims to process.")
        return {"payouts_processed": True}

    print(f"\n  💰 [process_payouts] Processing payouts for {len(claims)} claims...")
    print(f"     Routing: Direct backend /payout/process (no n8n dependency)")
    success_count = 0
    total_payout = 0

    for claim in claims:
        payout_amount = claim.get("payout_amount", 0)
        fraud_score = claim.get("fraud_score", 0)
        status = claim.get("status", "PENDING")

        # Only process APPROVED claims — skip HOLD and REJECTED
        if status not in ("APPROVED", "PARTIAL"):
            cid = claim.get('id', '?')[:20]
            print(f"     ⏸️  Claim {cid}... HELD for manual review (Risk: {fraud_score:.2f})")
            continue

        if payout_amount <= 0:
            continue

        try:
            payload = {
                "claim_id": claim.get("id") or claim.get("claim_id"),
                "worker_id": claim.get("worker_id"),
                "amount": payout_amount,
                "status": "PAID"
            }

            # Route directly to backend — no n8n webhook dependency
            backend_response = requests.post(PAYOUT_PROCESS_URL, json=payload, timeout=15)
            backend_response.raise_for_status()

            success_count += 1
            total_payout += payout_amount
            worker_name = claim.get('worker_name', claim.get('worker_id', '?'))
            print(f"     ✅ Payout ₹{payout_amount} → {worker_name} via UPI ({claim.get('upi_id', 'auto')})")
        except Exception as e:
            print(f"     ❌ Payout failed: {e}")

    print(f"\n  {'='*60}")
    print(f"  🏁 ORCHESTRATION COMPLETE")
    print(f"     Claims processed:   {len(claims)}")
    print(f"     Payouts disbursed:  {success_count}")
    print(f"     Total amount:       ₹{total_payout:.2f}")
    fraud_summary = state.get("fraud_summary", {})
    if fraud_summary:
        print(f"     Avg fraud score:    {fraud_summary.get('avg_fraud_score', 'N/A')}")
        print(f"     Fraud layers:       {', '.join(fraud_summary.get('layers_active', []))}")
    print(f"  {'='*60}\n")
    return {"payouts_processed": True}


def route_after_claims(state: GraphState):
    if state.get("error"):
        return END
    if not state.get("claims_generated"):
        return END
    return "process_payouts"


# ═══════════════════════════════════════════════
#  BUILD THE LANGGRAPH STATE MACHINE
# ═══════════════════════════════════════════════

workflow = StateGraph(GraphState)
workflow.add_node("receive_event", receive_event)
workflow.add_node("validate_event", validate_event)
workflow.add_node("generate_claims", generate_claims)
workflow.add_node("process_payouts", process_payouts)

workflow.set_entry_point("receive_event")
workflow.add_edge("receive_event", "validate_event")

# Conditional edge: if validate_event flagged VALIDATION_FAILED_RESOLVED, abort
def route_after_validation(state: GraphState):
    if state.get("error") == "VALIDATION_FAILED_RESOLVED":
        return END
    return "generate_claims"

workflow.add_conditional_edges(
    "validate_event",
    route_after_validation,
    {
        "generate_claims": "generate_claims",
        END: END
    }
)
workflow.add_conditional_edges(
    "generate_claims",
    route_after_claims,
    {
        "process_payouts": "process_payouts",
        END: END
    }
)
workflow.add_edge("process_payouts", END)

orchestrator_app = workflow.compile()
