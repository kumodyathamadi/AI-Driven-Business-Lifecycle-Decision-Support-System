"""
=============================================================================
MODEL TRAINING PIPELINE (ADVANCED PREPROCESSING WITH SCALING)
Component 1: Feasibility Classification Engine
Project: AI-Driven Business Lifecycle Decision Support System (SME360 AI)
=============================================================================
Usage:
    python scripts/train_model.py
    python scripts/train_model.py --scaler standard --n-estimators 200
    python scripts/train_model.py --scaler robust --model-dir models/feasibility_model
=============================================================================
"""

import os
import sys
import json
import shutil
import pathlib
import argparse
from datetime import datetime
from typing import Tuple, Dict, Any

# Ensure UTF-8 output encoding on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, RobustScaler, MinMaxScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
    roc_auc_score,
)

# Project paths
BASE_DIR = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

DEFAULT_DATA_PATH = BASE_DIR / "data" / "raw" / "Component_One_Core_Feasibility.csv"
DEFAULT_MODEL_DIR = BASE_DIR / "models" / "feasibility_model"

# Feature definitions matching the production schema (src/preprocessing/preprocessor.py)
CATEGORICAL_FEATURES = [
    "business_stage",
    "business_category",
    "district",
    "province",
    "location_type",
    "proposed_action",
    "competition_level",
]

NUMERICAL_FEATURES = [
    "available_capital_lkr",
    "loan_amount_lkr",
    "monthly_budget_lkr",
    "initial_inventory_cost_lkr",
    "expected_price_lkr",
    "expected_customers_per_day",
    "customer_demand_score",
    "expected_operating_days_per_month",
    "entrepreneur_experience_years",
    "location_suitability_score",
    "available_staff_count",
    "required_staff_count",
    "available_equipment_score",
    "required_equipment_score",
    "supplier_availability_score",
]

DROP_COLUMNS = ["case_id", "business_description", "feasibility_label"]


def build_preprocessor(scaler_type: str = "standard") -> ColumnTransformer:
    """
    Builds an advanced ColumnTransformer preprocessing pipeline.
    
    Numeric Pipeline:
      1. SimpleImputer(strategy='median')
      2. Feature Scaling:
         - 'standard': StandardScaler (z-score scaling: mean=0, std=1)
         - 'robust':   RobustScaler (median/IQR scaling, robust to extreme outliers)
         - 'minmax':   MinMaxScaler (range-bounded scaling: [0, 1])
    
    Categorical Pipeline:
      1. SimpleImputer(strategy='most_frequent')
      2. OneHotEncoder(handle_unknown='ignore', sparse_output=False)
    """
    if scaler_type.lower() == "robust":
        scaler = RobustScaler()
    elif scaler_type.lower() == "minmax":
        scaler = MinMaxScaler()
    else:
        scaler = StandardScaler()

    numeric_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", scaler),
        ]
    )

    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, NUMERICAL_FEATURES),
            ("cat", categorical_transformer, CATEGORICAL_FEATURES),
        ],
        remainder="drop",
    )

    return preprocessor


def load_dataset(csv_path: pathlib.Path) -> Tuple[pd.DataFrame, pd.Series]:
    """Loads and validates the SME feasibility dataset."""
    if not csv_path.exists():
        raise FileNotFoundError(f"Dataset not found at: {csv_path}")

    df = pd.read_csv(csv_path)
    if "feasibility_label" not in df.columns:
        raise ValueError("Missing required target column: 'feasibility_label'")

    y = df["feasibility_label"].astype(str)
    X = df.drop(columns=[col for col in DROP_COLUMNS if col in df.columns])

    # Validate feature presence
    missing_cat = [c for c in CATEGORICAL_FEATURES if c not in X.columns]
    missing_num = [c for c in NUMERICAL_FEATURES if c not in X.columns]
    if missing_cat or missing_num:
        raise ValueError(f"Missing columns in dataset: cat={missing_cat}, num={missing_num}")

    return X, y


def backup_existing_artifacts(model_dir: pathlib.Path):
    """Backs up existing model artifacts before overwriting."""
    files_to_backup = [
        "random_forest.joblib",
        "preprocessor.joblib",
        "model_metadata.json",
        "feature_names.json",
        "class_labels.json",
    ]
    existing = [f for f in files_to_backup if (model_dir / f).exists()]
    if not existing:
        return

    backup_dir = model_dir / "backups" / datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir.mkdir(parents=True, exist_ok=True)
    for fname in existing:
        src = model_dir / fname
        shutil.copy2(src, backup_dir / fname)
    print(f"[BACKUP] Backed up {len(existing)} existing artifact(s) to: {backup_dir.relative_to(BASE_DIR)}")


def train_and_evaluate(
    data_path: pathlib.Path,
    model_dir: pathlib.Path,
    scaler_type: str = "standard",
    n_estimators: int = 200,
    random_state: int = 42,
    create_backup: bool = True,
) -> Dict[str, Any]:
    """Executes the full preprocessing, training, evaluation, and serialization workflow."""
    print("=" * 78)
    print(" SME360 AI -- ADVANCED MODEL TRAINING PIPELINE")
    print("=" * 78)
    print(f" Dataset Path:      {data_path}")
    print(f" Target Model Dir:  {model_dir}")
    print(f" Scaler Type:       {scaler_type.upper()} SCALING")
    print(f" Estimators:        {n_estimators} trees (balanced class weight)")
    print(f" Random State:      {random_state}")
    print("-" * 78)

    # 1. Load data
    print("\n[Step 1/5] Loading and validating dataset...")
    X, y = load_dataset(data_path)
    total_samples = len(X)
    print(f"  * Total Samples:    {total_samples:,} rows")
    print(f"  * Total Features:   {X.shape[1]} (15 numerical, 7 categorical)")
    class_counts = {k: int(v) for k, v in y.value_counts().items()}
    print(f"  * Class Breakdown:  {class_counts}")

    # 2. Stratified 70/15/15 Split
    print("\n[Step 2/5] Creating stratified train/validation/test splits (70% / 15% / 15%)...")
    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=0.30, stratify=y, random_state=random_state
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, stratify=y_temp, random_state=random_state
    )
    print(f"  * Train Set:        {X_train.shape[0]} samples")
    print(f"  * Validation Set:   {X_val.shape[0]} samples")
    print(f"  * Held-Out Test:    {X_test.shape[0]} samples")

    # 3. Fit Advanced Preprocessor
    print(f"\n[Step 3/5] Fitting advanced preprocessor with {scaler_type.upper()} scaling...")
    preprocessor = build_preprocessor(scaler_type=scaler_type)
    X_train_proc = preprocessor.fit_transform(X_train)
    X_val_proc = preprocessor.transform(X_val)
    X_test_proc = preprocessor.transform(X_test)

    feature_names = preprocessor.get_feature_names_out().tolist()
    print(f"  * Preprocessor fitted successfully.")
    print(f"  * Processed Feature Dimensionality: {len(feature_names)} features")
    print(f"    - Scaled Numeric:   15 features (e.g., {feature_names[0]}, {feature_names[1]})")
    print(f"    - One-Hot Encoded:  {len(feature_names) - 15} binary columns")

    # 4. Train Random Forest Classifier
    print(f"\n[Step 4/5] Training RandomForestClassifier ({n_estimators} estimators, balanced weights)...")
    clf = RandomForestClassifier(
        n_estimators=n_estimators,
        class_weight="balanced",
        random_state=random_state,
        n_jobs=-1,
    )
    clf.fit(X_train_proc, y_train)
    classes = list(clf.classes_)
    print(f"  * Model trained successfully on {X_train_proc.shape[0]} samples.")
    print(f"  * Model Classes: {classes}")

    # 5. Evaluate on Held-Out Test Set
    print("\n[Step 5/5] Evaluating on held-out test set (N = 180)...")
    y_pred = clf.predict(X_test_proc)
    y_prob = clf.predict_proba(X_test_proc)

    acc = float(accuracy_score(y_test, y_pred))
    macro_f1 = float(f1_score(y_test, y_pred, average="macro"))
    weighted_f1 = float(f1_score(y_test, y_pred, average="weighted"))
    macro_prec = float(precision_score(y_test, y_pred, average="macro"))
    macro_rec = float(recall_score(y_test, y_pred, average="macro"))

    # Multiclass ROC-AUC (One-vs-Rest)
    y_test_oh = pd.get_dummies(y_test)[classes].values
    try:
        roc_auc_ovr = float(roc_auc_score(y_test_oh, y_prob, multi_class="ovr", average="macro"))
    except Exception:
        roc_auc_ovr = 0.0

    print("-" * 78)
    print(f"  * Held-Out Test Accuracy:  {acc * 100:.2f}% ({int(np.sum(y_test == y_pred))}/{len(y_test)})")
    print(f"  * Macro F1-Score:          {macro_f1:.4f}")
    print(f"  * Weighted F1-Score:       {weighted_f1:.4f}")
    print(f"  * Macro Precision:         {macro_prec:.4f}")
    print(f"  * Macro Recall:            {macro_rec:.4f}")
    print(f"  * ROC-AUC (OvR Macro):     {roc_auc_ovr:.4f}")
    print("-" * 78)

    print("\n  Class-Level Breakdown:")
    print(f"  {'Class Label':<26} {'Precision':<12} {'Recall':<12} {'F1-Score':<12} {'Support':<8}")
    print("  " + "-" * 72)
    for cls in classes:
        p = precision_score(y_test, y_pred, labels=[cls], average="macro", zero_division=0)
        r = recall_score(y_test, y_pred, labels=[cls], average="macro", zero_division=0)
        f = f1_score(y_test, y_pred, labels=[cls], average="macro", zero_division=0)
        supp = int(np.sum(y_test == cls))
        print(f"  {cls:<26} {p:<12.4f} {r:<12.4f} {f:<12.4f} {supp:<8}")

    cm = confusion_matrix(y_test, y_pred, labels=classes)
    print("\n  Confusion Matrix:")
    header = f"  {'Actual \\ Predicted':<26} " + " ".join([f"{c[:12]:>14}" for c in classes])
    print(header)
    print("  " + "-" * 72)
    for i, actual_cls in enumerate(classes):
        row_str = f"  {actual_cls:<26} " + " ".join([f"{cm[i, j]:>14}" for j in range(len(classes))])
        print(row_str)

    # 6. Serialization
    model_dir.mkdir(parents=True, exist_ok=True)
    if create_backup:
        backup_existing_artifacts(model_dir)

    rf_path = model_dir / "random_forest.joblib"
    prep_path = model_dir / "preprocessor.joblib"
    meta_path = model_dir / "model_metadata.json"
    feat_path = model_dir / "feature_names.json"
    class_path = model_dir / "class_labels.json"

    print(f"\n[SAVING] Serializing model artifacts to {model_dir.relative_to(BASE_DIR)}...")
    joblib.dump(clf, rf_path)
    joblib.dump(preprocessor, prep_path)

    metadata = {
        "model_name": "RandomForestClassifier",
        "n_estimators": n_estimators,
        "random_state": random_state,
        "class_weight": "balanced",
        "scaler_type": scaler_type,
        "test_metrics": {
            "accuracy": acc,
            "weighted_f1": weighted_f1,
            "macro_f1": macro_f1,
            "roc_auc_ovr": roc_auc_ovr,
        },
        "categorical_features": CATEGORICAL_FEATURES,
        "numerical_features": NUMERICAL_FEATURES,
        "classes": classes,
        "num_processed_features": len(feature_names),
        "dataset_version": "1.0.0",
        "training_sample_count": X_train.shape[0],
        "validation_sample_count": X_val.shape[0],
        "test_sample_count": X_test.shape[0],
        "trained_at": datetime.now().isoformat(),
    }

    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    with open(feat_path, "w", encoding="utf-8") as f:
        json.dump(feature_names, f, indent=2)

    with open(class_path, "w", encoding="utf-8") as f:
        json.dump(classes, f, indent=2)

    print("  * random_forest.joblib:  Saved")
    print("  * preprocessor.joblib:   Saved (with numerical feature scaling)")
    print("  * model_metadata.json:   Saved")
    print("  * feature_names.json:    Saved")
    print("  * class_labels.json:     Saved")

    # 7. Self-Verification via FeasibilityPredictor
    print("\n[VERIFICATION] Running verification check with production FeasibilityPredictor...")
    from src.prediction.predictor import FeasibilityPredictor
    predictor = FeasibilityPredictor(model_dir=str(model_dir))
    sample_row = X_test.iloc[0:1]
    res = predictor.predict_feasibility(sample_row)
    print(f"  * Verification Inference: {res['prediction']} (Confidence: {res['confidence_score']:.2%})")
    print(f"  * Class Probabilities:   {res['probabilities']}")
    print("  * Prediction Engine Integration: 100% HEALTHY & COMPATIBLE!")

    print("\n" + "=" * 78)
    print("[SUCCESS] TRAINING AND PREPROCESSING COMPLETED SUCCESSFULLY!")
    print("=" * 78)

    return metadata


def parse_args():
    parser = argparse.ArgumentParser(
        description="Train the SME360 AI Feasibility Classification Model with Advanced Preprocessing & Feature Scaling."
    )
    parser.add_argument(
        "--data-path",
        type=pathlib.Path,
        default=DEFAULT_DATA_PATH,
        help="Path to the raw CSV dataset (Component_One_Core_Feasibility.csv).",
    )
    parser.add_argument(
        "--model-dir",
        type=pathlib.Path,
        default=DEFAULT_MODEL_DIR,
        help="Directory where model artifacts will be saved.",
    )
    parser.add_argument(
        "--scaler",
        type=str,
        default="standard",
        choices=["standard", "robust", "minmax"],
        help="Advanced numerical scaling method: standard (default), robust, or minmax.",
    )
    parser.add_argument(
        "--n-estimators",
        type=int,
        default=200,
        help="Number of decision trees for the Random Forest Classifier (default: 200).",
    )
    parser.add_argument(
        "--random-state",
        type=int,
        default=42,
        help="Random seed for reproducibility (default: 42).",
    )
    parser.add_argument(
        "--no-backup",
        action="store_true",
        help="Disable automatic backup of existing model artifacts.",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    train_and_evaluate(
        data_path=args.data_path,
        model_dir=args.model_dir,
        scaler_type=args.scaler,
        n_estimators=args.n_estimators,
        random_state=args.random_state,
        create_backup=not args.no_backup,
    )


if __name__ == "__main__":
    main()
