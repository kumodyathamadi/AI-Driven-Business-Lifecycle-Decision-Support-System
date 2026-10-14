# src/fraud_detection/train_isolation_forest.py
import os
import json
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib

MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "models", "fraud_detection"))
os.makedirs(MODEL_DIR, exist_ok=True)

MODEL_FILE = os.path.join(MODEL_DIR, "isolation_forest.pkl")
METADATA_FILE = os.path.join(MODEL_DIR, "metadata.json")

FEATURE_NAMES = [
    "amount_discrepancy_pct",
    "quantity_ratio",
    "unit_price_variance",
    "time_delta_hours",
    "is_off_hours",
    "log_amount_lkr"
]

def generate_synthetic_data(n_samples: int = 2500, contamination: float = 0.04, random_seed: int = 42):
    """
    Generates realistic SME financial invoice and physical stock depletion logs.
    Includes 96% legitimate transactions and 4% fraudulent/anomalous operational logs.
    """
    np.random.seed(random_seed)
    n_anomalies = int(n_samples * contamination)
    n_normal = n_samples - n_anomalies

    # 1. Normal transactions (legitimate SME operations)
    # Expected markup between retail invoice amount and physical cost: 10% - 25%
    normal_discrepancy = np.random.normal(loc=0.18, scale=0.06, size=n_normal)
    normal_qty_ratio = np.random.normal(loc=1.0, scale=0.03, size=n_normal)
    normal_price_var = np.random.exponential(scale=0.04, size=n_normal)
    normal_time_delta = np.random.exponential(scale=0.75, size=n_normal) # Most within ~1 hour
    normal_off_hours = np.random.choice([0, 1], size=n_normal, p=[0.96, 0.04]) # Few off-hours
    normal_amount = np.random.lognormal(mean=9.5, sigma=0.8, size=n_normal) # ~Rs. 13,000 avg

    # 2. Anomalous transactions (phantom sales, stock theft, duplicate billing, extreme discrepancy)
    anomaly_types = np.random.choice(["phantom_sale", "stock_theft", "duplicate_rush", "extreme_markup"], size=n_anomalies)
    
    anom_discrepancy = []
    anom_qty_ratio = []
    anom_price_var = []
    anom_time_delta = []
    anom_off_hours = []
    anom_amount = []
    
    for a_type in anomaly_types:
        if a_type == "phantom_sale":
            # Invoiced revenue claim without corresponding physical stock depletion
            anom_discrepancy.append(np.random.uniform(0.40, 1.50)) # 40% to 150% excess
            anom_qty_ratio.append(np.random.uniform(1.4, 3.0))
            anom_price_var.append(np.random.uniform(0.20, 0.60))
            anom_time_delta.append(np.random.uniform(4.0, 24.0))
            anom_off_hours.append(np.random.choice([0, 1], p=[0.6, 0.4]))
            anom_amount.append(np.random.uniform(35000, 250000))
        elif a_type == "stock_theft":
            # Unrecorded stock drain or massive invoice shortfall
            anom_discrepancy.append(np.random.uniform(-0.80, -0.35))
            anom_qty_ratio.append(np.random.uniform(0.1, 0.6))
            anom_price_var.append(np.random.uniform(0.25, 0.70))
            anom_time_delta.append(np.random.uniform(5.0, 48.0))
            anom_off_hours.append(np.random.choice([0, 1], p=[0.5, 0.5]))
            anom_amount.append(np.random.uniform(20000, 180000))
        elif a_type == "duplicate_rush":
            # Duplicate transaction rushed at unusual hours
            anom_discrepancy.append(np.random.normal(0.18, 0.05))
            anom_qty_ratio.append(1.0)
            anom_price_var.append(0.02)
            anom_time_delta.append(np.random.uniform(0.01, 0.15)) # within 10-15 mins
            anom_off_hours.append(1) # late night
            anom_amount.append(np.random.uniform(40000, 120000))
        else: # extreme_markup
            anom_discrepancy.append(np.random.uniform(0.50, 2.0))
            anom_qty_ratio.append(np.random.uniform(1.1, 1.8))
            anom_price_var.append(np.random.uniform(0.40, 1.20))
            anom_time_delta.append(np.random.uniform(2.0, 12.0))
            anom_off_hours.append(np.random.choice([0, 1], p=[0.7, 0.3]))
            anom_amount.append(np.random.uniform(50000, 300000))

    # Combine features
    discrepancy = np.concatenate([normal_discrepancy, anom_discrepancy])
    qty_ratio = np.concatenate([normal_qty_ratio, anom_qty_ratio])
    price_var = np.concatenate([normal_price_var, anom_price_var])
    time_delta = np.concatenate([normal_time_delta, anom_time_delta])
    off_hours = np.concatenate([normal_off_hours, anom_off_hours])
    amount = np.concatenate([normal_amount, anom_amount])
    log_amount = np.log1p(amount)
    
    labels = np.array([1] * n_normal + [-1] * n_anomalies) # 1 = Normal, -1 = Anomaly

    df = pd.DataFrame({
        "amount_discrepancy_pct": discrepancy,
        "quantity_ratio": qty_ratio,
        "unit_price_variance": price_var,
        "time_delta_hours": time_delta,
        "is_off_hours": off_hours,
        "log_amount_lkr": log_amount,
        "ground_truth_label": labels
    })
    
    # Shuffle
    df = df.sample(frac=1.0, random_state=random_seed).reset_index(drop=True)
    return df


def train_and_export_model():
    print(f"Generating synthetic SME financial & physical stock logs...")
    df = generate_synthetic_data(n_samples=3000, contamination=0.04)
    
    X = df[FEATURE_NAMES]
    y_true = df["ground_truth_label"]
    
    print(f"Dataset shape: {X.shape}. Normal: {(y_true == 1).sum()}, Anomalies: {(y_true == -1).sum()} (4.0%)")
    
    # Train Isolation Forest with ~4% contamination matching research specification
    iso_forest = IsolationForest(
        n_estimators=100,
        contamination=0.04,
        max_samples="auto",
        random_state=42,
        n_jobs=1
    )
    
    print("Fitting Isolation Forest model...", flush=True)
    iso_forest.fit(X)
    
    preds = iso_forest.predict(X)
    scores = iso_forest.decision_function(X)
    
    detected_anomalies = int((preds == -1).sum())
    print(f"Model fitted successfully. Detected {detected_anomalies} anomalies ({detected_anomalies/len(X)*100:.2f}%).", flush=True)

    
    # Calibration thresholds
    min_score = float(np.min(scores))
    max_score = float(np.max(scores))
    threshold = float(iso_forest.offset_)
    
    metadata = {
        "model_type": "IsolationForest",
        "contamination": 0.04,
        "n_estimators": 150,
        "feature_names": FEATURE_NAMES,
        "score_min": min_score,
        "score_max": max_score,
        "threshold": threshold,
        "training_samples": len(df),
        "target_component": "Component 3: AI-Based Financial Monitoring & Anomaly Detection"
    }
    
    # Save model and metadata
    joblib.dump(iso_forest, MODEL_FILE)
    with open(METADATA_FILE, "w") as f:
        json.dump(metadata, f, indent=2)
        
    print(f"Model saved to: {MODEL_FILE}")
    print(f"Metadata saved to: {METADATA_FILE}")
    return iso_forest, metadata

if __name__ == "__main__":
    train_and_export_model()
