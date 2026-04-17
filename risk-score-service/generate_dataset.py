"""
Generate the synthetic worker dataset used by the Vritti risk-score model.

Usage:
  python generate_dataset.py
"""

from pathlib import Path
import random

import numpy as np
import pandas as pd


RANDOM_SEED = 42
ROW_COUNT = 10_000

ZONE_CONFIG = {
    "VAD-04": {"city": "Vadodara", "flood_prone": 1, "aqi": 120, "disruption_days": 18},
    "MUM-07": {"city": "Mumbai", "flood_prone": 1, "aqi": 155, "disruption_days": 25},
    "DEL-12": {"city": "Delhi", "flood_prone": 0, "aqi": 280, "disruption_days": 12},
    "BLR-03": {"city": "Bangalore", "flood_prone": 0, "aqi": 85, "disruption_days": 8},
    "CHN-06": {"city": "Chennai", "flood_prone": 1, "aqi": 105, "disruption_days": 22},
}

PLATFORMS = ["Amazon", "Flipkart", "Meesho"]
TARGET_LABELS = [0] * 6000 + [1] * 3000 + [2] * 1000


def clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def build_row(index: int, risk_label: int) -> dict:
    zone_id = random.choice(list(ZONE_CONFIG.keys()))
    zone = ZONE_CONFIG[zone_id]
    is_monsoon = int(random.random() < 0.35)

    if risk_label == 1:
        tenure_weeks = random.randint(4, 104)
        daily_active_hours = round(random.uniform(5.0, 11.5), 1)
        weekly_delivery_days = random.randint(4, 6)
        avg_weekly_earnings = random.randint(2400, 5500)
        earnings_ratio = random.uniform(0.12, 0.30)
        claim_count_90d = random.randint(0, 3)
        disruption_boost = random.randint(4, 10)
        if zone["flood_prone"]:
            disruption_boost += random.randint(3, 7)
        if is_monsoon and zone["flood_prone"]:
            disruption_boost += random.randint(4, 8)
    elif risk_label == 2:
        tenure_weeks = random.randint(1, 20)
        daily_active_hours = round(random.uniform(2.0, 8.0), 1)
        weekly_delivery_days = random.randint(1, 5)
        avg_weekly_earnings = random.randint(1500, 4200)
        earnings_ratio = random.uniform(0.10, 0.28)
        claim_count_90d = random.randint(2, 5)
        disruption_boost = random.randint(-2, 4)
    else:
        tenure_weeks = random.randint(8, 104)
        daily_active_hours = round(random.uniform(4.0, 10.5), 1)
        weekly_delivery_days = random.randint(3, 6)
        avg_weekly_earnings = random.randint(1800, 5200)
        earnings_ratio = random.uniform(0.05, 0.20)
        claim_count_90d = random.randint(0, 1)
        disruption_boost = random.randint(-3, 2)

    zone_disruption_days = int(clamp(zone["disruption_days"] + disruption_boost, 5, 35))
    zone_aqi_baseline = int(clamp(zone["aqi"] + random.randint(-25, 25), 50, 300))
    earnings_std_dev = round(avg_weekly_earnings * earnings_ratio, 2)
    is_part_time = int(daily_active_hours < 4)

    return {
        "worker_id": f"w_{index:04d}",
        "zone_id": zone_id,
        "city": zone["city"],
        "tenure_weeks": tenure_weeks,
        "daily_active_hours": daily_active_hours,
        "weekly_delivery_days": weekly_delivery_days,
        "avg_weekly_earnings": avg_weekly_earnings,
        "earnings_std_dev": earnings_std_dev,
        "claim_count_90d": claim_count_90d,
        "zone_disruption_days": zone_disruption_days,
        "zone_aqi_baseline": zone_aqi_baseline,
        "is_monsoon_season": is_monsoon,
        "is_flood_prone_zone": zone["flood_prone"],
        "platform": random.choice(PLATFORMS),
        "is_part_time": is_part_time,
        "risk_label": risk_label,
    }


def main() -> None:
    random.seed(RANDOM_SEED)
    np.random.seed(RANDOM_SEED)

    labels = TARGET_LABELS[:]
    random.shuffle(labels)

    rows = [build_row(index + 1, label) for index, label in enumerate(labels)]
    df = pd.DataFrame(rows)

    output_path = Path(__file__).resolve().parent / "data" / "synthetic_workers.csv"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)

    print(f"Saved {len(df)} rows to {output_path}")
    print(df.groupby("risk_label")[["tenure_weeks", "claim_count_90d", "zone_disruption_days", "is_flood_prone_zone"]].mean())


if __name__ == "__main__":
    main()
