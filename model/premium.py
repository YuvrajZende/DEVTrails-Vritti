"""
Vritti — Premium Tier Mapping
Converts a risk score (0.0–1.0) into a weekly premium (₹) and coverage cap (₹).

Business rules:
  - Part-time workers get a fixed mid-range premium with lower coverage
  - New workers (<4 weeks) get max premium with restricted coverage (unknown risk)
  - Everyone else maps linearly: low risk = cheap + full coverage, high risk = expensive + reduced coverage
"""


def get_premium_tier(risk_score: float, is_part_time: bool, tenure_weeks: int) -> dict:
    """
    Map a risk score to a weekly premium and coverage cap.

    Args:
        risk_score: float 0.0–1.0 from the XGBoost model
        is_part_time: True if worker averages < 4 hrs/day
        tenure_weeks: how long the worker has been on the platform

    Returns:
        dict with "premium" (₹/week) and "coverage_cap" (₹ max payout)
    """
    # Part-time override — lower exposure, consistent pricing
    if is_part_time:
        return {"premium": 55, "coverage_cap": 500}

    # New worker override — unknown risk, restricted coverage
    if tenure_weeks < 4:
        return {"premium": 79, "coverage_cap": 400}

    # Risk-score tiers for established full-time workers
    if risk_score < 0.3:
        return {"premium": 35, "coverage_cap": 800}
    elif risk_score < 0.5:
        return {"premium": 49, "coverage_cap": 800}
    elif risk_score < 0.7:
        return {"premium": 69, "coverage_cap": 900}
    else:
        return {"premium": 79, "coverage_cap": 400}
