"""
Vritti — XGBoost Risk Score Model Training
Trains a binary classifier to predict claim probability from worker profiles.

Usage: python model/train.py
Output: model/risk_model.pkl

Target: AUC-ROC > 0.80
"""

import os
import pickle
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, classification_report

from features import engineer_features, FEATURE_COLUMNS

# ── Load data ───────────────────────────────────────────────────────────
data_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "synthetic_workers.csv")
print(f"Loading data from {data_path}...")
df = pd.read_csv(data_path)
print(f"Loaded {len(df)} rows")

# ── Feature engineering ─────────────────────────────────────────────────
df = engineer_features(df)

X = df[FEATURE_COLUMNS]
# Binary target: risk_label > 0 means "will file a claim" (legit or fraud)
# We predict claim probability, not fraud vs legit (that's Sairaj's job)
y = (df["risk_label"] > 0).astype(int)

print(f"\nTarget distribution:")
print(f"  No claim (0): {(y == 0).sum()} ({(y == 0).mean():.1%})")
print(f"  Will claim (1): {(y == 1).sum()} ({(y == 1).mean():.1%})")

# ── Train/test split ────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"\nTrain: {len(X_train)} | Test: {len(X_test)}")

# ── Train XGBoost ───────────────────────────────────────────────────────
print("\nTraining XGBoost classifier...")
model = xgb.XGBClassifier(
    n_estimators=100,
    max_depth=4,
    learning_rate=0.1,
    random_state=42,
    eval_metric="auc",
    use_label_encoder=False,
)
model.fit(X_train, y_train)

# ── Evaluate ────────────────────────────────────────────────────────────
y_pred_proba = model.predict_proba(X_test)[:, 1]
y_pred = model.predict(X_test)

auc = roc_auc_score(y_test, y_pred_proba)
print(f"\n{'='*50}")
print(f"  AUC-ROC: {auc:.4f}  {'✅ PASS' if auc > 0.80 else '❌ FAIL (need > 0.80)'}")
print(f"{'='*50}")

print(f"\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=["No Claim", "Will Claim"]))

# ── Feature importance ──────────────────────────────────────────────────
print("Feature Importance (top to bottom):")
importance = sorted(
    zip(FEATURE_COLUMNS, model.feature_importances_),
    key=lambda x: x[1],
    reverse=True,
)
for name, score in importance:
    bar = "█" * int(score * 50)
    print(f"  {name:35s} {score:.4f} {bar}")

# ── Save model ──────────────────────────────────────────────────────────
model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "risk_model.pkl")
with open(model_path, "wb") as f:
    pickle.dump(model, f)
print(f"\n✅ Model saved to {model_path}")
