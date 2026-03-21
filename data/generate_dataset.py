"""
Vritti — Synthetic Worker Dataset Generator
Generates 10,000 realistic gig worker profiles with correlated risk labels.

Usage: python data/generate_dataset.py
Output: data/synthetic_workers.csv
"""

import numpy as np
import pandas as pd
import os

np.random.seed(42)
N = 10_000

# ── Zone definitions (realistic Indian cities) ─────────────────────────
ZONES = {
    "VAD-04": {"city": "Vadodara",  "state": "Gujarat",     "aqi_base": 142, "disruption_days": 18, "flood_prone": True,  "high_risk": False},
    "MUM-07": {"city": "Mumbai",    "state": "Maharashtra",  "aqi_base": 165, "disruption_days": 32, "flood_prone": True,  "high_risk": True},
    "DEL-12": {"city": "Delhi",     "state": "Delhi",        "aqi_base": 245, "disruption_days": 22, "flood_prone": False, "high_risk": True},
    "BLR-03": {"city": "Bangalore", "state": "Karnataka",    "aqi_base": 98,  "disruption_days": 8,  "flood_prone": False, "high_risk": False},
    "CHN-06": {"city": "Chennai",   "state": "Tamil Nadu",   "aqi_base": 118, "disruption_days": 12, "flood_prone": False, "high_risk": False},
}

zone_ids = list(ZONES.keys())
platforms = ["Amazon", "Flipkart", "Meesho"]

# ── Step 1: Generate base worker profiles ───────────────────────────────
print("Generating base worker profiles...")

# Assign zones (slight bias toward high-risk zones for realism)
zone_weights = [0.20, 0.25, 0.25, 0.15, 0.15]  # MUM and DEL slightly overrepresented
assigned_zones = np.random.choice(zone_ids, size=N, p=zone_weights)

# Build zone-derived columns
cities = [ZONES[z]["city"] for z in assigned_zones]
zone_disruption_days = np.array([ZONES[z]["disruption_days"] for z in assigned_zones])
zone_aqi_baseline = np.array([ZONES[z]["aqi_base"] for z in assigned_zones])
is_flood_prone_zone = np.array([int(ZONES[z]["flood_prone"]) for z in assigned_zones])
is_high_risk = np.array([ZONES[z]["high_risk"] for z in assigned_zones])

# Add zone-level noise (each worker's zone stats vary slightly)
zone_disruption_days = zone_disruption_days + np.random.randint(-3, 4, size=N)
zone_disruption_days = np.clip(zone_disruption_days, 3, 40)
zone_aqi_baseline = zone_aqi_baseline + np.random.randint(-20, 21, size=N)
zone_aqi_baseline = np.clip(zone_aqi_baseline, 40, 350)

# Worker-level features
tenure_weeks = np.random.exponential(scale=30, size=N).astype(int)
tenure_weeks = np.clip(tenure_weeks, 1, 104)

daily_active_hours = np.random.normal(loc=8.0, scale=2.0, size=N)
daily_active_hours = np.clip(np.round(daily_active_hours, 1), 2.0, 12.0)

weekly_delivery_days = np.random.choice([3, 4, 5, 5, 5, 6, 6], size=N)

avg_weekly_earnings = np.random.normal(loc=3500, scale=800, size=N)
avg_weekly_earnings = np.clip(np.round(avg_weekly_earnings, 0), 1500, 5500)

# Earnings volatility: 5-30% of average
earnings_pct = np.random.uniform(0.05, 0.30, size=N)
earnings_std_dev = np.round(avg_weekly_earnings * earnings_pct, 0)

# Seasonal and platform flags
is_monsoon_season = np.random.choice([0, 1], size=N, p=[0.6, 0.4])
platform = np.random.choice(platforms, size=N, p=[0.45, 0.35, 0.20])
is_part_time = (daily_active_hours < 4.0).astype(int)

# ── Step 2: Generate risk labels WITH correlations ──────────────────────
print("Generating correlated risk labels...")

claim_count_90d = np.zeros(N, dtype=int)
risk_label = np.zeros(N, dtype=int)

for i in range(N):
    # Base probability of each label
    p_no_claim = 0.60
    p_legit = 0.30
    p_fraud = 0.10

    # ── Correlation: high-risk zones → more legit claims ──
    if is_high_risk[i]:
        p_legit += 0.12
        p_no_claim -= 0.12

    if is_flood_prone_zone[i] and is_monsoon_season[i]:
        p_legit += 0.10
        p_no_claim -= 0.10

    # ── Correlation: high AQI zones → more legit claims ──
    if zone_aqi_baseline[i] > 200:
        p_legit += 0.05
        p_no_claim -= 0.05

    # ── Correlation: high disruption days → more legit claims ──
    if zone_disruption_days[i] > 25:
        p_legit += 0.08
        p_no_claim -= 0.08

    # ── Correlation: new accounts → more fraud ──
    if tenure_weeks[i] < 4:
        p_fraud += 0.15
        p_no_claim -= 0.10
        p_legit -= 0.05

    # ── Correlation: very high earnings volatility → slightly more claims ──
    if earnings_pct[i] > 0.22:
        p_legit += 0.04
        p_no_claim -= 0.04

    # ── Correlation: part-timers → slightly less claims ──
    if is_part_time[i]:
        p_legit -= 0.05
        p_no_claim += 0.05

    # Normalize probabilities
    total = p_no_claim + p_legit + p_fraud
    p_no_claim /= total
    p_legit /= total
    p_fraud /= total

    # Assign label
    risk_label[i] = np.random.choice([0, 1, 2], p=[p_no_claim, p_legit, p_fraud])

    # Generate claim_count_90d correlated with risk label
    if risk_label[i] == 0:
        claim_count_90d[i] = np.random.choice([0, 0, 0, 0, 1], p=[0.5, 0.2, 0.15, 0.1, 0.05])
    elif risk_label[i] == 1:
        claim_count_90d[i] = np.random.choice([0, 1, 1, 2, 3], p=[0.1, 0.3, 0.3, 0.2, 0.1])
    else:  # fraud
        claim_count_90d[i] = np.random.choice([1, 2, 3, 4, 5], p=[0.1, 0.2, 0.3, 0.25, 0.15])

# ── Step 3: Assemble DataFrame ──────────────────────────────────────────
print("Assembling DataFrame...")

df = pd.DataFrame({
    "worker_id": [f"w_{i+1:04d}" for i in range(N)],
    "zone_id": assigned_zones,
    "city": cities,
    "tenure_weeks": tenure_weeks,
    "daily_active_hours": daily_active_hours,
    "weekly_delivery_days": weekly_delivery_days,
    "avg_weekly_earnings": avg_weekly_earnings,
    "earnings_std_dev": earnings_std_dev,
    "claim_count_90d": claim_count_90d,
    "zone_disruption_days": zone_disruption_days,
    "zone_aqi_baseline": zone_aqi_baseline,
    "is_monsoon_season": is_monsoon_season,
    "is_flood_prone_zone": is_flood_prone_zone,
    "platform": platform,
    "is_part_time": is_part_time,
    "risk_label": risk_label,
})

# ── Step 4: Save and validate ───────────────────────────────────────────
output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)))
output_path = os.path.join(output_dir, "synthetic_workers.csv")
df.to_csv(output_path, index=False)

print(f"\n✅ Saved {len(df)} rows to {output_path}")
