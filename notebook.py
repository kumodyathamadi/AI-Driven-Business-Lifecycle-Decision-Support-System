#!/usr/bin/env python3
"""
Component 4: AI-Driven Business Lifecycle Decision Support System
Root execution script: notebook.py

Usage:
    python notebook.py --business-plan "path/to/business_plan.json"
    python notebook.py --business-plan "reports/research_evaluation/experiment_06_business_plan_validation/sample_business_plan_C00001.json"
    python notebook.py --business-plan "sample.pdf" --confirm-business-id "WP_SME_0001" --output-dir "reports/custom_runs"

Coordinates:
1. Business plan ingestion (PDF, DOCX, TXT, JSON)
2. Business entity resolution & verified relationship retrieval
3. Geographic boundary audit (Western Province: Colombo, Gampaha, Kalutara)
4. Stage 6 multi-factor solvency, debt, and concentration risk assessment
5. Stage 7 PyG B2BRiskGNN graph-relational contextual inference
6. Growth readiness decision (PROCEED, MODIFY, DELAY, INSUFFICIENT_EVIDENCE)
7. Evidence-grounded mitigation recommendation mapping
8. Artifact generation (structured JSON + auditable Markdown report)
"""

import os
import sys
import argparse
import logging
from typing import Optional, Dict, Any

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

SRC_DIR = os.path.join(PROJECT_ROOT, "src")
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from component4.pipeline import Component4Pipeline, Component4AnalysisPipelineResult

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("Component4.Notebook")


def run_pipeline(
    business_plan_path: str,
    output_dir: Optional[str] = None,
    confirm_business_id: Optional[str] = None,
    save_artifacts: bool = True,
    device: Optional[str] = None,
    verbose: bool = False
) -> Component4AnalysisPipelineResult:
    """
    Importable functional interface for running the Component 4 analysis pipeline.
    
    Args:
        business_plan_path: Path to the business plan file (JSON, PDF, DOCX, TXT).
        output_dir: Optional custom destination directory for generated artifacts.
        confirm_business_id: Optional explicit business entity ID (e.g., C00001, WP_SME_0001).
        save_artifacts: Whether to write markdown report and JSON results to disk.
        device: Computation device ('cpu', 'cuda', or None for auto-detection).
        verbose: Enable verbose logging output.
        
    Returns:
        Component4AnalysisPipelineResult containing complete analysis outputs.
    """
    if verbose:
        logger.setLevel(logging.DEBUG)

    if not os.path.exists(business_plan_path):
        raise FileNotFoundError(f"Business plan file not found at path: {business_plan_path}")

    logger.info("Initializing Component 4 Decision Support Pipeline...")
    pipeline = Component4Pipeline(
        output_base_dir=output_dir or os.path.join(PROJECT_ROOT, "reports", "component4", "analysis_runs"),
        device=device
    )

    logger.info(f"Ingesting and evaluating business plan: {business_plan_path}")
    result = pipeline.run(
        business_plan_path=business_plan_path,
        confirmed_business_id=confirm_business_id,
        save_artifacts=save_artifacts
    )

    logger.info(f"Analysis completed successfully! ID: {result.analysis_id}")
    return result


def main():
    """Command-line interface entry point."""
    parser = argparse.ArgumentParser(
        description="Component 4: GNN-Based Business Risk Prediction & Scalable Growth Recommendation Pipeline",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument(
        "--business-plan", "-b",
        type=str,
        required=True,
        help="Path to the uploaded business plan file (.json, .pdf, .docx, .txt, .md)"
    )
    parser.add_argument(
        "--output-dir", "-o",
        type=str,
        default=None,
        help="Directory to persist analysis report and structured JSON results"
    )
    parser.add_argument(
        "--confirm-business-id", "-c",
        type=str,
        default=None,
        help="Explicitly confirm target business entity ID (e.g. C00001, WP_SME_0001)"
    )
    parser.add_argument(
        "--device",
        type=str,
        default=None,
        help="PyTorch device ('cpu', 'cuda')"
    )
    parser.add_argument(
        "--no-save",
        action="store_true",
        help="Execute pipeline in memory without saving report artifacts to disk"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable detailed debug logs during execution"
    )

    args = parser.parse_args()

    try:
        result = run_pipeline(
            business_plan_path=args.business_plan,
            output_dir=args.output_dir,
            confirm_business_id=args.confirm_business_id,
            save_artifacts=not args.no_save,
            device=args.device,
            verbose=args.verbose
        )

        # Print Executive Terminal Summary
        summary = result.overall_summary
        readiness = result.growth_readiness
        risk = result.stage6_risk_assessment
        gnn = result.stage7_gnn_inference
        resolved = result.resolved_entity

        print("\n" + "=" * 76)
        print("   SME360 AI / COMPONENT 4 — RISK & GROWTH READINESS EVALUATION")
        print("=" * 76)
        print(f" Analysis ID         : {result.analysis_id}")
        print(f" Target Business     : {resolved.business_name} [{resolved.entity_id}]")
        print(f" District / Scope    : {resolved.district} ({resolved.geographic_scope_status})")
        print(f" Data Origin         : {resolved.data_origin} (Match: {resolved.match_type})")
        print(f" Verified Network    : {len(resolved.verified_relationships)} relationships ({resolved.supplier_count} Sup, {resolved.customer_count} Cus)")
        print("-" * 76)
        print(f" Composite Risk      : {risk.composite_risk_score:.2f} / 1.00  --> [{risk.overall_risk_category}]")
        print(f" GNN Relational Risk : {gnn.predicted_risk_category or 'N/A'} (Status: {gnn.gnn_status})")
        print(f" Growth Readiness    : >>> {readiness.decision} <<<")
        print(f" Immediate Proceed   : {'YES' if risk.can_proceed_immediately else 'NO (Requires Prudent Mitigations)'}")
        print(f" Critical Red Flag   : {'YES' if risk.has_critical_red_flag else 'NO'}")
        print(f" Evidence Sufficiency: {summary['evidence_sufficiency']}")
        print("-" * 76)
        print(f" Primary Strategy    : {readiness.original_strategy}")
        print(f" Risk-Adjusted Rec   : {readiness.risk_adjusted_recommendation}")
        print("-" * 76)
        print(" Key Suggested Modifications:")
        for mod in readiness.suggested_modifications[:3]:
            print(f"  * {mod}")
        print("-" * 76)
        print(" Generated Artifacts:")
        for name, path in result.output_files.items():
            print(f"  [{name}]: {path}")
        print("=" * 76 + "\n")

    except Exception as e:
        logger.error(f"Pipeline execution failed: {str(e)}", exc_info=args.verbose)
        sys.exit(1)


if __name__ == "__main__":
    main()
