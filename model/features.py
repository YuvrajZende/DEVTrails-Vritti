"""
Vritti — Feature Engineering Module
Derives 5 predictive features from raw worker profile columns.

Used by: model/train.py (training) and api/main.py (inference)
"""

import pandas as pd


FEATURE_COLUMNS = [
    "zone_disruption_frequency",
    "claim_velocity",
    "income_stability_score",
    "behavioral_consistency_score",
    "part_time_index",
    "tenure_weeks",
    "zone_aqi_baseline",
    "is_monsoon_season",
    "is_flood_prone_zone",
    "is_part_time",
]


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Transform raw worker profile data into ML-ready features.

    Derived features:
      - zone_disruption_frequency: fraction of the year the zone is disrupted (0–1)
      - claim_velocity: claims per week of tenure — primary fraud signal
      - income_stability_score: 1.0 = perfectly stable, low = volatile earner
      - behavioral_consistency_score: 1.0 = works 6/6 days, low = irregular
      - part_time_index: normalized daily hours (1.0 = full-time, 0.3 = part-time)
    """
    df = df.copy()

    df["zone_disruption_frequency"] = df["zone_disruption_days"] / 365.0

    df["claim_velocity"] = df["claim_count_90d"] / df["tenure_weeks"].clip(lower=1)

    df["income_stability_score"] = 1.0 - (
        df["earnings_std_dev"] / df["avg_weekly_earnings"].clip(lower=1)
    )

    df["behavioral_consistency_score"] = df["weekly_delivery_days"] / 6.0

    df["part_time_index"] = df["daily_active_hours"] / 10.0

    return df
