"""
Component 4: Preprocessing Pipeline for Feasibility Dataset
Strictly isolates training data, eliminates zero-variance columns,
and enforces reproducible stratified splits.
"""

import os
import joblib
import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple, List
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline


DEFAULT_DATA_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw", "Component_One_Core_Feasibility.csv")
)

# 15 numerical features with variance and domain relevance
NUMERICAL_FEATURES: List[str] = [
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

# 5 categorical features with meaningful variance across businesses
CATEGORICAL_FEATURES: List[str] = [
    "business_stage",
    "business_category",
    "location_type",
    "proposed_action",
    "competition_level",
]

# Explicitly excluded columns:
# - case_id: row key / identifier, not a predictive feature
# - district: 100% "Colombo" (zero-variance)
# - province: 100% "Western" (zero-variance)
# - business_description: unstructured text / redundant with business_category
# - feasibility_label: target column
EXCLUDED_COLUMNS: List[str] = [
    "case_id",
    "district",
    "province",
    "business_description",
    "feasibility_label",
]

TARGET_COLUMN: str = "feasibility_label"


def get_feature_definitions() -> Dict[str, List[str]]:
    """Returns explicit feature schemas used by Component 4."""
    return {
        "numerical_features": list(NUMERICAL_FEATURES),
        "categorical_features": list(CATEGORICAL_FEATURES),
        "excluded_columns": list(EXCLUDED_COLUMNS),
        "target_column": TARGET_COLUMN,
    }


def load_and_split_feasibility_data(
    data_path: str = DEFAULT_DATA_PATH,
    random_state: int = 42,
    train_size: float = 0.70,
    val_size: float = 0.15,
    test_size: float = 0.15,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.Series, pd.Series, pd.Series, Dict[str, Any]]:
    """
    Loads raw feasibility data and splits into train (70%), validation (15%), and held-out test (15%).
    Enforces stratified splitting on the target label and uses a fixed random seed.
    """
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Feasibility dataset file not found at: {data_path}")

    assert abs(train_size + val_size + test_size - 1.0) < 1e-6, "Splits must sum to 1.0"

    df = pd.read_csv(data_path)

    if TARGET_COLUMN not in df.columns:
        raise ValueError(f"Target column '{TARGET_COLUMN}' missing from dataset")

    y = df[TARGET_COLUMN].copy()
    
    # Drop target and excluded columns
    drop_cols = [c for c in EXCLUDED_COLUMNS if c in df.columns]
    X = df.drop(columns=drop_cols).copy()

    # Verify no excluded columns remain
    for col in ["case_id", "district", "province", "business_description", TARGET_COLUMN]:
        assert col not in X.columns, f"Leaked column {col} in predictive feature set"

    # Step 1: Split into Train (70%) and Temp (30%)
    temp_ratio = val_size + test_size
    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=temp_ratio, stratify=y, random_state=random_state
    )

    # Step 2: Split Temp into Validation (50% of 30% = 15%) and Test (50% of 30% = 15%)
    val_relative_ratio = val_size / temp_ratio
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, train_size=val_relative_ratio, stratify=y_temp, random_state=random_state
    )

    split_metadata = {
        "random_state": random_state,
        "total_samples": len(df),
        "train_samples": len(X_train),
        "val_samples": len(X_val),
        "test_samples": len(X_test),
        "num_features_input": len(X.columns),
        "feature_columns": list(X.columns),
        "classes": sorted(list(y.unique())),
        "train_class_counts": y_train.value_counts().to_dict(),
        "val_class_counts": y_val.value_counts().to_dict(),
        "test_class_counts": y_test.value_counts().to_dict(),
    }

    return X_train, X_val, X_test, y_train, y_val, y_test, split_metadata


def build_preprocessor() -> ColumnTransformer:
    """
    Constructs an sklearn ColumnTransformer:
    - Numerical: SimpleImputer(median) + StandardScaler()
    - Categorical: SimpleImputer(most_frequent) + OneHotEncoder(handle_unknown='ignore')
    """
    numeric_transformer = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])

    categorical_transformer = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, NUMERICAL_FEATURES),
            ("cat", categorical_transformer, CATEGORICAL_FEATURES),
        ],
        remainder="drop",
    )
    return preprocessor


class FeasibilityPreprocessor:
    """
    Encapsulated Preprocessing Service for Component 4.
    Fits exclusively on training data and serializes for baseline and inference workflows.
    """

    def __init__(self):
        self.preprocessor = build_preprocessor()
        self.is_fitted = False
        self.feature_names_out_: List[str] = []

    def fit(self, X_train: pd.DataFrame) -> "FeasibilityPreprocessor":
        """Fits preprocessing pipeline strictly on training data."""
        self.preprocessor.fit(X_train)
        self.is_fitted = True
        self.feature_names_out_ = self.preprocessor.get_feature_names_out().tolist()
        return self

    def transform(self, X: pd.DataFrame) -> np.ndarray:
        """Transforms data using the parameters learned during training."""
        if not self.is_fitted:
            raise RuntimeError("Preprocessor has not been fitted yet. Call fit() first.")
        return np.asarray(self.preprocessor.transform(X))

    def fit_transform(self, X_train: pd.DataFrame) -> np.ndarray:
        """Fits on training data and transforms it in one step."""
        return self.fit(X_train).transform(X_train)

    def get_feature_names_out(self) -> List[str]:
        """Returns the engineered feature names post one-hot encoding."""
        return list(self.feature_names_out_)

    def save(self, filepath: str) -> None:
        """Saves fitted preprocessor to disk."""
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        joblib.dump(self, filepath)

    @classmethod
    def load(cls, filepath: str) -> "FeasibilityPreprocessor":
        """Loads fitted preprocessor from disk."""
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Preprocessor file not found at: {filepath}")
        return joblib.load(filepath)
