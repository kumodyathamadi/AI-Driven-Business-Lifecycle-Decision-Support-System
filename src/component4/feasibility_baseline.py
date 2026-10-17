"""
Component 4: Feasibility Baseline Training and Evaluation
Trains Dummy, Logistic Regression, and Random Forest baselines.
Selects the best model on validation data, evaluates once on held-out test data,
and serializes artifacts under models/component4/ and reports/component4/.
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple

# Ensure src is on sys.path for direct module import
SRC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from component4.preprocessing import (
    load_and_split_feasibility_data,
    FeasibilityPreprocessor,
    DEFAULT_DATA_PATH,
    TARGET_COLUMN,
    NUMERICAL_FEATURES,
    CATEGORICAL_FEATURES,
    EXCLUDED_COLUMNS,
)

from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
)

DEFAULT_MODEL_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "models", "component4")
)
DEFAULT_REPORT_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "reports", "component4")
)


def evaluate_predictions(
    y_true: pd.Series, y_pred: Any, classes: List[str]
) -> Dict[str, Any]:
    """Computes comprehensive multi-class classification metrics."""
    acc = accuracy_score(y_true, y_pred)
    macro_prec = precision_score(y_true, y_pred, average="macro", zero_division=0)
    macro_rec = recall_score(y_true, y_pred, average="macro", zero_division=0)
    macro_f1 = f1_score(y_true, y_pred, average="macro", zero_division=0)
    weighted_f1 = f1_score(y_true, y_pred, average="weighted", zero_division=0)

    # Per-class breakdown
    prec_per_class: Any = precision_score(
        y_true, y_pred, average=None, labels=classes, zero_division=0
    )
    rec_per_class: Any = recall_score(
        y_true, y_pred, average=None, labels=classes, zero_division=0
    )
    f1_per_class: Any = f1_score(
        y_true, y_pred, average=None, labels=classes, zero_division=0
    )
    support_per_class = [int((y_true == cls_name).sum()) for cls_name in classes]

    per_class_metrics = {}
    for i, cls_name in enumerate(classes):
        per_class_metrics[cls_name] = {
            "precision": round(float(prec_per_class[i]), 4),
            "recall": round(float(rec_per_class[i]), 4),
            "f1_score": round(float(f1_per_class[i]), 4),
            "support": support_per_class[i],
        }

    cm = confusion_matrix(y_true, y_pred, labels=classes).tolist()

    return {
        "accuracy": round(float(acc), 4),
        "macro_precision": round(float(macro_prec), 4),
        "macro_recall": round(float(macro_rec), 4),
        "macro_f1": round(float(macro_f1), 4),
        "weighted_f1": round(float(weighted_f1), 4),
        "per_class": per_class_metrics,
        "confusion_matrix": cm,
        "classes": classes,
    }


def train_and_evaluate_baselines(
    data_path: str = DEFAULT_DATA_PATH,
    model_dir: str = DEFAULT_MODEL_DIR,
    report_dir: str = DEFAULT_REPORT_DIR,
    random_state: int = 42,
) -> Dict[str, Any]:
    """
    Executes the Stage 2 training pipeline:
    1. Splits data (70/15/15) stratified on feasibility_label.
    2. Fits FeasibilityPreprocessor strictly on X_train.
    3. Trains Dummy, Logistic Regression, and Random Forest models.
    4. Evaluates all models on the validation set.
    5. Selects the best model using validation Macro F1.
    6. Evaluates the selected model ONCE on the held-out test set.
    7. Serializes artifacts, configurations, and evaluation reports.
    """
    os.makedirs(model_dir, exist_ok=True)
    os.makedirs(report_dir, exist_ok=True)

    print(f"Loading and splitting data from {data_path}...")
    X_train, X_val, X_test, y_train, y_val, y_test, split_metadata = load_and_split_feasibility_data(
        data_path=data_path, random_state=random_state
    )

    classes = split_metadata["classes"]

    # Fit preprocessor exclusively on training data
    print("Fitting preprocessor exclusively on training data...")
    preprocessor = FeasibilityPreprocessor()
    X_train_proc: Any = preprocessor.fit_transform(X_train)
    X_val_proc: Any = preprocessor.transform(X_val)
    X_test_proc: Any = preprocessor.transform(X_test)

    feature_names = preprocessor.get_feature_names_out()
    print(f"Transformed features dimension: {X_train_proc.shape[1]}")

    # Baseline Candidate Models
    candidate_models: Dict[str, Any] = {
        "Dummy (most_frequent)": DummyClassifier(strategy="most_frequent"),
        "Dummy (stratified)": DummyClassifier(strategy="stratified", random_state=random_state),
        "Logistic Regression (balanced)": LogisticRegression(
            max_iter=1000, class_weight="balanced", random_state=random_state
        ),
        "Logistic Regression (unweighted)": LogisticRegression(
            max_iter=1000, random_state=random_state
        ),
        "Random Forest (balanced)": RandomForestClassifier(
            n_estimators=200, class_weight="balanced", random_state=random_state
        ),
        "Random Forest (unweighted)": RandomForestClassifier(
            n_estimators=200, random_state=random_state
        ),
    }

    validation_results: Dict[str, Any] = {}
    fitted_models: Dict[str, Any] = {}

    print("\n--- Training Candidates & Evaluating on Validation Set ---")
    for name, model in candidate_models.items():
        model.fit(X_train_proc, y_train)
        fitted_models[name] = model

        val_pred = model.predict(X_val_proc)
        val_metrics = evaluate_predictions(y_val, val_pred, classes)
        validation_results[name] = val_metrics

        print(
            f"  {name:32s} | Acc: {val_metrics['accuracy']:.4f} | "
            f"Macro F1: {val_metrics['macro_f1']:.4f} | Weighted F1: {val_metrics['weighted_f1']:.4f}"
        )

    # Select best model based on validation Macro F1 score
    best_model_name = max(
        validation_results, key=lambda k: validation_results[k]["macro_f1"]
    )
    best_model = fitted_models[best_model_name]
    best_val_metrics = validation_results[best_model_name]

    print(f"\nSelected Best Model on Validation Macro F1: {best_model_name}")

    # Evaluate selected best model on held-out test set
    print("Evaluating selected best model on held-out test set...")
    test_pred = best_model.predict(X_test_proc)
    test_metrics = evaluate_predictions(y_test, test_pred, classes)

    print(
        f"  Held-out Test Performance: Acc: {test_metrics['accuracy']:.4f} | "
        f"Macro F1: {test_metrics['macro_f1']:.4f} | Weighted F1: {test_metrics['weighted_f1']:.4f}"
    )

    # Serialize Preprocessor
    preprocessor_path = os.path.join(model_dir, "feasibility_preprocessor.joblib")
    preprocessor.save(preprocessor_path)
    print(f"Saved preprocessor to: {preprocessor_path}")

    # Serialize Model
    model_path = os.path.join(model_dir, "feasibility_model.joblib")
    joblib.dump(best_model, model_path)
    print(f"Saved best model to: {model_path}")

    # Metadata & Training Configuration
    import sklearn
    metadata = {
        "model_name": best_model_name,
        "model_class": best_model.__class__.__name__,
        "model_parameters": best_model.get_params(),
        "random_state": random_state,
        "package_versions": {
            "python": sys.version.split()[0],
            "sklearn": sklearn.__version__,
            "pandas": pd.__version__,
            "numpy": np.__version__,
        },
        "dataset": {
            "path": data_path,
            "total_samples": split_metadata["total_samples"],
            "train_samples": split_metadata["train_samples"],
            "val_samples": split_metadata["val_samples"],
            "test_samples": split_metadata["test_samples"],
            "classes": classes,
            "train_class_counts": split_metadata["train_class_counts"],
            "val_class_counts": split_metadata["val_class_counts"],
            "test_class_counts": split_metadata["test_class_counts"],
        },
        "features": {
            "numerical_features": NUMERICAL_FEATURES,
            "categorical_features": CATEGORICAL_FEATURES,
            "excluded_columns": EXCLUDED_COLUMNS,
            "processed_feature_count": len(feature_names),
            "processed_feature_names": feature_names,
        },
        "validation_selection_metrics": best_val_metrics,
        "held_out_test_metrics": test_metrics,
    }

    metadata_path = os.path.join(model_dir, "feasibility_model_metadata.json")
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata to: {metadata_path}")

    # Save complete evaluation metrics JSON
    all_metrics = {
        "validation_comparison": validation_results,
        "selected_model": best_model_name,
        "held_out_test_metrics": test_metrics,
        "metadata": metadata,
    }
    metrics_path = os.path.join(report_dir, "stage2_feasibility_metrics.json")
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(all_metrics, f, indent=2)
    print(f"Saved metrics report to: {metrics_path}")

    return all_metrics


class FeasibilityBaselineInference:
    """
    Inference Service for Component 4 Feasibility Baseline.
    Loads serialized preprocessor and model to score new SME inputs.
    """

    def __init__(self, model_dir: str = DEFAULT_MODEL_DIR):
        self.model_dir = model_dir
        self.preprocessor_path = os.path.join(model_dir, "feasibility_preprocessor.joblib")
        self.model_path = os.path.join(model_dir, "feasibility_model.joblib")
        self.metadata_path = os.path.join(model_dir, "feasibility_model_metadata.json")

        if not os.path.exists(self.model_path) or not os.path.exists(self.preprocessor_path):
            raise FileNotFoundError(
                f"Model artifacts not found in {model_dir}. Please run baseline training first."
            )

        self.preprocessor = FeasibilityPreprocessor.load(self.preprocessor_path)
        self.model = joblib.load(self.model_path)

        with open(self.metadata_path, "r", encoding="utf-8") as f:
            self.metadata = json.load(f)

        self.classes = list(self.model.classes_)

    def predict(self, input_df: pd.DataFrame) -> Dict[str, Any]:
        """Generates predictions and class probabilities for input records."""
        # Ensure excluded columns don't interfere
        clean_df = input_df.copy()
        for col in EXCLUDED_COLUMNS:
            if col in clean_df.columns:
                clean_df = clean_df.drop(columns=[col])

        transformed_x = self.preprocessor.transform(clean_df)
        preds = self.model.predict(transformed_x)
        probs = self.model.predict_proba(transformed_x)

        results = []
        for i in range(len(input_df)):
            pred_label = str(preds[i])
            prob_dict = {
                cls_name: round(float(probs[i][j]), 4)
                for j, cls_name in enumerate(self.classes)
            }
            results.append({
                "predicted_feasibility": pred_label,
                "confidence": round(float(np.max(probs[i])), 4),
                "probabilities": prob_dict,
            })

        return {
            "model_name": self.metadata["model_name"],
            "classes": self.classes,
            "predictions": results,
        }


if __name__ == "__main__":
    train_and_evaluate_baselines()
