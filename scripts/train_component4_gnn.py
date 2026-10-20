#!/usr/bin/env python3
"""
Component 4: Standalone GNN Training & Baseline Evaluation Script.

Usage:
    python scripts/train_component4_gnn.py --epochs 60 --lr 0.008 --seed 42

Performs:
1. Feature engineering and data split across the 1,000 businesses (70% train, 15% val, 15% test).
2. Fits preprocessor on training data only and saves artifacts.
3. Builds graph using Business_Relationships.csv (3,487 simulated edges).
4. Trains Non-Graph Baseline (Random Forest) and evaluates macro-F1 and per-class metrics.
5. Trains B2BRiskGNN with balanced cross-entropy loss, evaluate test metrics.
6. Serializes model checkpoints and evaluation report.
"""

import os
import sys
import argparse
import json

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

SRC_DIR = os.path.join(PROJECT_ROOT, "src")
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from component4.gnn_model import GNNInferenceEngine


def main():
    parser = argparse.ArgumentParser(description="Train Component 4 B2BRiskGNN & Non-Graph Baseline")
    parser.add_argument("--epochs", type=int, default=60, help="Number of training epochs")
    parser.add_argument("--lr", type=float, default=0.008, help="Learning rate")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for splits and training")
    parser.add_argument("--data-dir", type=str, default=None, help="Custom dataset directory path")
    parser.add_argument("--model-dir", type=str, default=None, help="Custom output directory for checkpoints")

    args = parser.parse_args()

    print("=" * 72)
    print("   COMPONENT 4: GNN TRAINING & SCIENTIFIC EVALUATION PIPELINE")
    print("=" * 72)
    print(f" Epochs      : {args.epochs}")
    print(f" Learning Rate: {args.lr}")
    print(f" Random Seed : {args.seed}")
    print("-" * 72)

    engine = GNNInferenceEngine(data_dir=args.data_dir)
    print("Starting training pipeline...")
    metrics = engine.train_and_save_gnn(
        epochs=args.epochs,
        lr=args.lr,
        random_seed=args.seed
    )

    print("\n" + "=" * 72)
    print("   TRAINING & EVALUATION RESULTS")
    print("=" * 72)
    print(f" Total Nodes (Businesses) : {metrics['node_count']}")
    print(f" Simulated Edges          : {metrics['simulated_edge_count']}")
    print(f" Split Strategy           : {metrics['split_strategy']}")
    print(f" Train Samples            : {metrics['split_counts']['train']}")
    print(f" Validation Samples       : {metrics['split_counts']['validation']}")
    print(f" Test Samples             : {metrics['split_counts']['test']}")
    print("-" * 72)
    print(f" GNN Test Accuracy        : {metrics['test_accuracy'] * 100:.2f}%")
    print(f" GNN Test Macro-F1        : {metrics['test_macro_f1']:.4f}")
    print(f" Baseline Test Accuracy   : {metrics['baseline_comparison']['test_accuracy'] * 100:.2f}%")
    print(f" Baseline Test Macro-F1   : {metrics['baseline_comparison']['test_macro_f1']:.4f}")
    print("-" * 72)
    print(" GNN Test Confusion Matrix ([Low, Medium, High]):")
    for row in metrics['test_confusion_matrix']:
        print(f"   {row}")
    print("-" * 72)
    print(" Artifacts Saved:")
    print(f"   Model Checkpoint: models/component4/gnn_risk_model.pt")
    print(f"   Model Metadata  : models/component4/gnn_model_metadata.json")
    print(f"   Preprocessor    : models/component4/gnn_preprocessor.joblib")
    print(f"   Evaluation Rep  : reports/component4/gnn_evaluation_report.json")
    print("=" * 72 + "\n")


if __name__ == "__main__":
    main()
