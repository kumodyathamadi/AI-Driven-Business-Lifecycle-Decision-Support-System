"""
Component 4: Data Inspection and Inventory Module
Reproducible inspection script for Feasibility and Invoice Datasets.
"""

import os
import re
import json
import sqlite3
import pandas as pd
import numpy as np
from pypdf import PdfReader


def inspect_environment():
    """Returns active runtime environment and core ML/GNN library versions."""
    import sys
    import torch
    import torch_geometric
    import sklearn
    import pypdf

    return {
        "python_version": sys.version.split()[0],
        "torch_version": torch.__version__,
        "torch_geometric_version": torch_geometric.__version__,
        "sklearn_version": sklearn.__version__,
        "pandas_version": pd.__version__,
        "numpy_version": np.__version__,
        "pypdf_version": pypdf.__version__,
        "cuda_available": torch.cuda.is_available(),
    }


def inspect_feasibility_dataset(file_path: str = "data/raw/Component_One_Core_Feasibility.csv"):
    """Audits the SME business feasibility dataset."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Feasibility dataset not found at {file_path}")

    df = pd.read_csv(file_path)

    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = [c for c in df.columns if c not in numeric_cols]

    num_summary = {}
    for col in numeric_cols:
        num_summary[col] = {
            "min": float(df[col].min()),
            "max": float(df[col].max()),
            "mean": round(float(df[col].mean()), 2),
            "std": round(float(df[col].std()), 2),
            "median": float(df[col].median()),
            "zero_count": (df[col] == 0).sum(),
        }

    cat_summary = {}
    for col in cat_cols:
        cat_summary[col] = {
            "n_unique": df[col].nunique(),
            "top_values": df[col].value_counts().head(5).to_dict(),
        }

    target_dist = df["feasibility_label"].value_counts().to_dict() if "feasibility_label" in df.columns else {}
    target_pct = (df["feasibility_label"].value_counts(normalize=True) * 100).round(2).to_dict() if "feasibility_label" in df.columns else {}

    return {
        "file_path": file_path,
        "total_rows": len(df),
        "total_columns": len(df.columns),
        "columns": df.columns.tolist(),
        "missing_values_count": df.isnull().sum().sum().item(),
        "duplicate_rows": df.duplicated().sum().item(),
        "case_id_unique": df["case_id"].is_unique if "case_id" in df.columns else False,
        "target_distribution": target_dist,
        "target_percentages": target_pct,
        "numeric_features": numeric_cols,
        "categorical_features": cat_cols,
        "numerical_summary": num_summary,
        "categorical_summary": cat_summary,
    }


def inspect_invoice_dataset(dataset_dir: str):
    """
    Inspects invoice PDF directory.
    Extracts high-level document metadata without exposing PII.
    """
    if not os.path.exists(dataset_dir):
        raise FileNotFoundError(f"Directory not found: {dataset_dir}")

    files = [f for f in sorted(os.listdir(dataset_dir)) if f.lower().endswith(".pdf")]
    total_files = len(files)

    with_text = 0
    scanned_image_only = 0
    doc_types = set()
    sample_metadata = []

    for f in files:
        fpath = os.path.join(dataset_dir, f)
        reader = PdfReader(fpath)
        text = "".join([p.extract_text() or "" for p in reader.pages]).strip()

        if len(text) > 0:
            with_text += 1
            if "GOODS DECLARATION" in text or "CUSDEC" in text:
                doc_types.add("CUSDEC (Sri Lanka Customs Goods Declaration)")
            elif "INVOICE" in text.upper():
                doc_types.add("Commercial / Service Invoice")
            else:
                doc_types.add("Unclassified Business Document")
        else:
            scanned_image_only += 1

        if len(sample_metadata) < 3:
            sample_metadata.append({
                "file": f,
                "pages": len(reader.pages),
                "has_extractable_text": len(text) > 0,
                "text_char_count": len(text),
            })

    return {
        "dataset_directory": dataset_dir,
        "total_pdf_files": total_files,
        "text_extractable_files": with_text,
        "scanned_image_only_files": scanned_image_only,
        "identified_document_types": list(doc_types) if doc_types else ["Scanned / Image PDFs"],
        "sample_files": sample_metadata,
    }


def run_full_inspection(output_path: str = "reports/component4/data_inventory.json"):
    """Runs complete Stage 1 data inspection and serializes the report."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    report = {
        "environment": inspect_environment(),
        "feasibility_dataset": inspect_feasibility_dataset(),
        "invoice_dataset_07": inspect_invoice_dataset("data/Dataset/07"),
        "invoice_dataset_06": inspect_invoice_dataset("data/Dataset/06"),
    }
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"Stage 1 Data Inspection report successfully saved to {output_path}")
    return report


if __name__ == "__main__":
    run_full_inspection()
