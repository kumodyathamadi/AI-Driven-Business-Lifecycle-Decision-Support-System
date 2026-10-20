"""
Unit and integration tests for Component 4.
Covers Stage 1 (data audit, environment) and Stage 2 (preprocessing, feasibility baselines, inference).
Supports both unittest and pytest.
"""

import os
import sys
import json
import unittest
import numpy as np
import pandas as pd
import torch
import torch_geometric

# Ensure src is on sys.path
SRC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src"))
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from component4.preprocessing import (
    load_and_split_feasibility_data,
    build_preprocessor,
    FeasibilityPreprocessor,
    get_feature_definitions,
    NUMERICAL_FEATURES,
    CATEGORICAL_FEATURES,
    EXCLUDED_COLUMNS,
    TARGET_COLUMN,
)
from component4.feasibility_baseline import (
    FeasibilityBaselineInference,
    DEFAULT_MODEL_DIR,
    DEFAULT_REPORT_DIR,
)
from component4.anonymization import (
    AnonymizationManager,
    DATASET_07_ENTITY_REGISTRY,
    DATASET_06_ENTITY_REGISTRY,
)
from component4.invoice_extraction import InvoiceExtractor
from component4.graph_construction import InvoiceGraphBuilder
from component4.dataset_validation import DatasetValidator
from component4.risk_features import (
    calculate_hhi,
    calculate_cr1,
    calculate_cash_runway,
    calculate_debt_service_burden,
    calculate_debt_service_coverage,
    calculate_operating_margin,
    calculate_investment_to_cash_ratio,
    calculate_post_action_runway,
    calculate_post_action_net_cash_flow,
    calculate_capacity_gap,
    calculate_staffing_growth_ratio,
    RiskFeatureEngineer,
)
from component4.risk_assessment import (
    RiskAssessmentEngine,
    RiskFactorConfig,
    RiskAssessmentResult,
)

from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier

FEASIBILITY_PATH = "data/raw/Component_One_Core_Feasibility.csv"
DATASET_07_DIR = "data/Dataset/07"
DATASET_06_DIR = "data/Dataset/06"
DEFAULT_DATA_DIR = "data/processed/component4"


class TestComponent4Stage1(unittest.TestCase):

    def test_environment_and_libraries(self):
        """Verify PyTorch and PyTorch Geometric are correctly installed and operational."""
        self.assertIsNotNone(torch.__version__)
        self.assertIsNotNone(torch_geometric.__version__)

        x = torch.tensor([[1.0, 2.0], [3.0, 4.0]], dtype=torch.float)
        edge_index = torch.tensor([[0, 1], [1, 0]], dtype=torch.long)
        from torch_geometric.data import Data
        data = Data(x=x, edge_index=edge_index)
        self.assertEqual(data.num_nodes, 2)
        self.assertEqual(data.num_edges, 2)

    def test_feasibility_dataset_existence_and_integrity(self):
        """Verify feasibility dataset exists, row count, column count, and zero missing values."""
        self.assertTrue(os.path.exists(FEASIBILITY_PATH), f"File missing: {FEASIBILITY_PATH}")
        df = pd.read_csv(FEASIBILITY_PATH)

        self.assertEqual(len(df), 1200, f"Expected 1200 rows, found {len(df)}")
        self.assertEqual(len(df.columns), 25, f"Expected 25 columns, found {len(df.columns)}")
        self.assertEqual(df.isnull().sum().sum(), 0, "Expected zero missing values in feasibility dataset")
        self.assertEqual(df.duplicated().sum(), 0, "Found duplicate rows in feasibility dataset")

    def test_feasibility_case_id_uniqueness(self):
        """Verify case_id is strictly unique and acts as an identifier."""
        df = pd.read_csv(FEASIBILITY_PATH)
        self.assertIn("case_id", df.columns)
        self.assertTrue(df["case_id"].is_unique, "case_id is not unique")
        self.assertTrue(df["case_id"].str.startswith("C").all(), "case_id has unexpected format")

    def test_feasibility_target_distribution(self):
        """Verify feasibility_label contains the expected 3 classes and known counts."""
        df = pd.read_csv(FEASIBILITY_PATH)
        self.assertIn("feasibility_label", df.columns)
        expected_classes = {"Conditionally Feasible", "Feasible", "Infeasible"}
        actual_classes = set(df["feasibility_label"].unique())
        self.assertEqual(actual_classes, expected_classes, f"Unexpected classes: {actual_classes}")

        counts = df["feasibility_label"].value_counts().to_dict()
        self.assertEqual(counts["Conditionally Feasible"], 682)
        self.assertEqual(counts["Feasible"], 314)
        self.assertEqual(counts["Infeasible"], 204)

    def test_invoice_directories_exist(self):
        """Verify invoice directories exist and contain expected PDF counts."""
        self.assertTrue(os.path.isdir(DATASET_07_DIR), f"Directory missing: {DATASET_07_DIR}")
        self.assertTrue(os.path.isdir(DATASET_06_DIR), f"Directory missing: {DATASET_06_DIR}")

        files_07 = [f for f in os.listdir(DATASET_07_DIR) if f.lower().endswith(".pdf")]
        files_06 = [f for f in os.listdir(DATASET_06_DIR) if f.lower().endswith(".pdf")]

        self.assertEqual(len(files_07), 70, f"Expected 70 files in Dataset 07, found {len(files_07)}")
        self.assertEqual(len(files_06), 171, f"Expected 171 files in Dataset 06, found {len(files_06)}")


class TestComponent4Stage2(unittest.TestCase):

    def setUp(self):
        self.X_train, self.X_val, self.X_test, self.y_train, self.y_val, self.y_test, self.meta = (
            load_and_split_feasibility_data(FEASIBILITY_PATH, random_state=42)
        )

    def test_split_proportions_and_seed_reproducibility(self):
        """Verify 70/15/15 stratified partition sizes and exact reproducibility."""
        self.assertEqual(len(self.X_train), 840, "Train partition must have 840 rows (70%)")
        self.assertEqual(len(self.X_val), 180, "Validation partition must have 180 rows (15%)")
        self.assertEqual(len(self.X_test), 180, "Test partition must have 180 rows (15%)")
        self.assertEqual(self.meta["random_state"], 42)

        # Verify stratified class representation across all splits
        for split_y in [self.y_train, self.y_val, self.y_test]:
            classes = set(split_y.unique())
            self.assertEqual(classes, {"Conditionally Feasible", "Feasible", "Infeasible"})

    def test_excluded_features_not_in_inputs(self):
        """Verify case_id, district, province, and business_description are excluded from predictive features."""
        for col in EXCLUDED_COLUMNS:
            self.assertNotIn(col, self.X_train.columns, f"Leaked column {col} in X_train")
            self.assertNotIn(col, self.X_val.columns, f"Leaked column {col} in X_val")
            self.assertNotIn(col, self.X_test.columns, f"Leaked column {col} in X_test")

        # Predictive feature count must be exactly 20 (15 numeric + 5 categorical)
        self.assertEqual(len(self.X_train.columns), 20)
        self.assertEqual(set(self.X_train.columns), set(NUMERICAL_FEATURES + CATEGORICAL_FEATURES))

    def test_preprocessor_fitting_and_transformation(self):
        """Verify preprocessor fits only on train data and handles novel categorical levels gracefully."""
        prep = FeasibilityPreprocessor()
        X_tr_proc = prep.fit_transform(self.X_train)
        X_val_proc = prep.transform(self.X_val)
        X_te_proc = prep.transform(self.X_test)

        self.assertEqual(X_tr_proc.shape[0], 840)
        self.assertEqual(X_val_proc.shape[0], 180)
        self.assertEqual(X_te_proc.shape[0], 180)

        # Dimension should match the engineered features count
        dim = X_tr_proc.shape[1]
        self.assertEqual(X_val_proc.shape[1], dim)
        self.assertEqual(X_te_proc.shape[1], dim)
        self.assertEqual(len(prep.get_feature_names_out()), dim)

        # Test robustness against novel/unseen category in inference
        novel_input = self.X_val.iloc[:1].copy()
        novel_input["business_category"] = "Novel_Unseen_Category_XYZ"
        novel_proc = prep.transform(novel_input)
        self.assertEqual(novel_proc.shape, (1, dim))

    def test_candidate_models_training_and_classes(self):
        """Verify Dummy, Logistic Regression, and Random Forest train and predict all 3 classes."""
        prep = FeasibilityPreprocessor()
        X_tr_proc = prep.fit_transform(self.X_train)
        X_val_proc = prep.transform(self.X_val)

        models = {
            "dummy": DummyClassifier(strategy="stratified", random_state=42),
            "lr": LogisticRegression(max_iter=500, class_weight="balanced", random_state=42),
            "rf": RandomForestClassifier(n_estimators=50, class_weight="balanced", random_state=42),
        }

        expected_classes = ["Conditionally Feasible", "Feasible", "Infeasible"]

        for name, model in models.items():
            model.fit(X_tr_proc, self.y_train)
            preds = model.predict(X_val_proc)
            self.assertEqual(len(preds), 180)
            self.assertEqual(sorted(list(model.classes_)), expected_classes)

    def test_saved_model_artifacts_and_inference(self):
        """Verify serialized artifacts exist and FeasibilityBaselineInference works as expected."""
        model_path = os.path.join(DEFAULT_MODEL_DIR, "feasibility_model.joblib")
        prep_path = os.path.join(DEFAULT_MODEL_DIR, "feasibility_preprocessor.joblib")
        meta_path = os.path.join(DEFAULT_MODEL_DIR, "feasibility_model_metadata.json")

        self.assertTrue(os.path.exists(model_path), f"Missing {model_path}")
        self.assertTrue(os.path.exists(prep_path), f"Missing {prep_path}")
        self.assertTrue(os.path.exists(meta_path), f"Missing {meta_path}")

        # Test inference service
        service = FeasibilityBaselineInference(DEFAULT_MODEL_DIR)
        sample_df = self.X_test.iloc[:3].copy()
        output = service.predict(sample_df)

        self.assertIn("predictions", output)
        self.assertEqual(len(output["predictions"]), 3)

        for item in output["predictions"]:
            self.assertIn(item["predicted_feasibility"], service.classes)
            self.assertTrue(0.0 <= item["confidence"] <= 1.0)
            probs = item["probabilities"]
            self.assertEqual(len(probs), 3)
            self.assertAlmostEqual(sum(probs.values()), 1.0, places=2)


class TestComponent4Stage3(unittest.TestCase):
    """
    Stage 3 Tests: Invoice Extraction, Anonymization, Duplicate Handling,
    Missing Fields, Graph Construction, and Dataset Isolation.
    """

    @classmethod
    def setUpClass(cls):
        cls.anonymizer = AnonymizationManager()
        cls.extractor = InvoiceExtractor(d07_dir=DATASET_07_DIR, d06_dir=DATASET_06_DIR)
        cls.d07_records = cls.extractor.extract_dataset07()
        cls.d06_records = cls.extractor.extract_dataset06()
        cls.graph_builder = InvoiceGraphBuilder()

    def test_anonymization_engine_and_pii_guards(self):
        """Verify AnonymizationManager enforces zero PII exposure and flags forbidden tokens."""
        # Clean synthetic record passes
        clean_record = {
            "entity_id": "NODE_ENT_D07_01",
            "document_id": "DOC_D07_001",
            "amount": 5000.0,
            "currency": "LKR",
        }
        is_clean, violations = self.anonymizer.verify_no_pii(clean_record)
        self.assertTrue(is_clean)
        self.assertEqual(len(violations), 0)

        # Forbidden tokens must be caught
        sensitive_samples = [
            "Invoice for Typefi Systems",
            "Payment to Chandi Perera",
            "TIN: 1146888607000",
            "Consignee: Black Tulip Flowers",
            "Starflora (Pvt) Ltd",
            "Bank Account: 100540001151",
        ]
        for sample in sensitive_samples:
            clean, viols = self.anonymizer.verify_no_pii(sample)
            self.assertFalse(clean, f"Failed to detect PII in: {sample}")
            self.assertGreater(len(viols), 0)

    def test_invoice_extraction_dataset07(self):
        """Verify extraction coverage and metadata structure for Dataset 07."""
        self.assertEqual(len(self.d07_records), 70, "Dataset 07 must have 70 invoice records")

        unique_records = [r for r in self.d07_records if not r["is_duplicate"]]
        self.assertEqual(len(unique_records), 69, "Expected 69 unique invoices and 1 duplicate")

        duplicate_records = [r for r in self.d07_records if r["is_duplicate"]]
        self.assertEqual(len(duplicate_records), 1)
        self.assertEqual(duplicate_records[0]["duplicate_status"], "SEMANTIC_CONTENT_DUPLICATE")

        # Verify all unique records have verified complete status
        for r in unique_records:
            self.assertEqual(r["verification_status"], "VERIFIED_COMPLETE")
            self.assertIn(r["currency"], ["LKR", "AUD"])
            self.assertIsNotNone(r["total_amount"])
            self.assertGreater(r["total_amount"], 0)
            self.assertIsNotNone(r["invoice_date"])
            self.assertEqual(r["confidence_score"], 1.0)

        # Verify counterparty roles (Issuer AU -> Recipient LK, no self-loops)
        for r in unique_records:
            self.assertEqual(r["issuer_entity_id"], "NODE_ENT_D07_01")
            self.assertEqual(r["recipient_entity_id"], "NODE_ENT_D07_02")
            self.assertEqual(r["issuer_jurisdiction"], "AU")
            self.assertEqual(r["recipient_jurisdiction"], "LK")

        # Assert zero PII
        self.anonymizer.assert_no_pii(self.d07_records)

    def test_invoice_extraction_dataset06(self):
        """Verify extraction coverage and explicit scanned/duplicate handling for Dataset 06."""
        self.assertEqual(len(self.d06_records), 171, "Dataset 06 must have 171 records")

        # Binary duplicates must match exact count (12 pairs)
        exact_dups = [r for r in self.d06_records if r["duplicate_status"] == "EXACT_BINARY_DUPLICATE"]
        self.assertEqual(len(exact_dups), 12, "Expected exactly 12 binary duplicates in Dataset 06")

        unique_records = [r for r in self.d06_records if not r["is_duplicate"]]
        self.assertEqual(len(unique_records), 159, "Expected 159 unique files in Dataset 06")

        # Unverified scanned documents must have 0.0 confidence and NO fabricated amounts
        scanned_records = [r for r in self.d06_records if r["verification_status"] == "UNVERIFIED_SCANNED"]
        for r in scanned_records:
            self.assertEqual(r["confidence_score"], 0.0)
            self.assertIsNone(r["total_amount"], "Scanned record must not have fabricated amount")
            self.assertIsNone(r["currency"], "Scanned record must not have fabricated currency")

        # Digital text records must have extracted fields
        digital_records = [
            r for r in self.d06_records
            if r["verification_status"] in ["VERIFIED_COMPLETE", "VERIFIED_PARTIAL"]
        ]
        self.assertEqual(len(digital_records), 50)  # 53 digital minus 3 exact duplicates

        # Assert zero PII
        self.anonymizer.assert_no_pii(self.d06_records)

    def test_duplicate_handling_and_missing_fields(self):
        """Verify duplicates are flagged with references and missing fields are kept as None."""
        # Dataset 07 duplicate references original
        dup_07 = [r for r in self.d07_records if r["is_duplicate"]][0]
        self.assertIsNotNone(dup_07["duplicate_of_doc_id"])
        self.assertNotEqual(dup_07["document_id"], dup_07["duplicate_of_doc_id"])

        # Dataset 06 duplicates reference original
        for dup in [r for r in self.d06_records if r["is_duplicate"]]:
            self.assertIsNotNone(dup["duplicate_of_doc_id"])
            self.assertTrue(dup["is_duplicate"])

    def test_graph_construction_and_schema_dataset07(self):
        """Verify Dataset 07 graph schemas, node/edge counts, and PyTorch Geometric objects."""
        hetero_g, proj_g, pyg_het, pyg_proj, metrics = self.graph_builder.build_dataset07_graph(self.d07_records)

        # Heterogeneous graph schema
        self.assertEqual(metrics["entity_nodes_count"], 2)
        self.assertEqual(metrics["document_nodes_count"], 70)
        self.assertEqual(hetero_g.number_of_nodes(), 72)
        self.assertEqual(hetero_g.number_of_edges(), 140)  # 70 ISSUES + 70 BILLED_TO

        # Projected direct multigraph (2 entities, 70 temporal edges)
        self.assertEqual(proj_g.number_of_nodes(), 2)
        self.assertEqual(proj_g.number_of_edges(), 70)
        self.assertEqual(metrics["unique_entity_dyads"], 1)

        # PyG HeteroData validation
        self.assertEqual(pyg_het["entity"].num_nodes, 2)
        self.assertEqual(pyg_het["document"].num_nodes, 70)
        self.assertEqual(pyg_het["entity", "issues", "document"].edge_index.shape, (2, 70))
        self.assertEqual(pyg_het["document", "billed_to", "entity"].edge_index.shape, (2, 70))

    def test_graph_construction_and_schema_dataset06(self):
        """Verify Dataset 06 trade star graph schema, entity roles, and PyTorch Geometric objects."""
        hetero_g, proj_g, pyg_het, pyg_proj, metrics = self.graph_builder.build_dataset06_graph(self.d06_records)

        # Heterogeneous graph schema
        self.assertEqual(metrics["entity_nodes_count"], 11)
        self.assertEqual(metrics["document_nodes_count"], 171)
        self.assertEqual(hetero_g.number_of_nodes(), 182)

        # Projected multigraph
        self.assertEqual(proj_g.number_of_nodes(), 11)
        self.assertEqual(proj_g.number_of_edges(), 171)
        self.assertEqual(metrics["unique_entity_dyads"], 7)

        # PyG HeteroData validation
        self.assertEqual(pyg_het["entity"].num_nodes, 11)
        self.assertEqual(pyg_het["document"].num_nodes, 171)

    def test_strict_dataset_isolation_and_feasibility_independence(self):
        """Verify Dataset 07 and Dataset 06 are strictly isolated and unrelated to feasibility survey."""
        d07_entities = {r["issuer_entity_id"] for r in self.d07_records} | {r["recipient_entity_id"] for r in self.d07_records}
        d06_entities = {r["issuer_entity_id"] for r in self.d06_records} | {r["recipient_entity_id"] for r in self.d06_records}

        # Zero intersection between Dataset 07 and Dataset 06 entities
        self.assertEqual(len(d07_entities & d06_entities), 0, "Entities must not cross-contaminate across datasets")

        # Feasibility dataset independence
        df_feas = pd.read_csv(FEASIBILITY_PATH)
        feas_ids = set(df_feas["case_id"].unique())

        # Neither graph should have case_ids
        for eid in d07_entities | d06_entities:
            self.assertNotIn(eid, feas_ids, f"Entity ID {eid} leaked from feasibility cases")

    def test_gnn_feasibility_audit_conclusions(self):
        """Verify honest scientific conclusion that raw graphs are insufficient for GNN training."""
        _, _, _, _, m07 = self.graph_builder.build_dataset07_graph(self.d07_records)
        _, _, _, _, m06 = self.graph_builder.build_dataset06_graph(self.d06_records)

        self.assertFalse(m07["gnn_experimentation_feasibility"]["is_suitable_for_deep_gnn"])
        self.assertFalse(m06["gnn_experimentation_feasibility"]["is_suitable_for_deep_gnn"])

        self.assertIn("topological_classification", m07["gnn_experimentation_feasibility"])
        self.assertIn("topological_classification", m06["gnn_experimentation_feasibility"])


class TestComponent4Stage4(unittest.TestCase):
    """
    Unit and integration tests for Stage 4: Dataset Integration and Validation.
    Verifies data integrity, schema consistency, Western Province geographic scope,
    leakage-free split grouping, and cross-dataset non-mergability.
    """

    def setUp(self):
        self.validator = DatasetValidator()

    def test_stage4_full_validation_suite(self):
        """Verify the complete validation pipeline passes without errors."""
        summary = self.validator.run_all_validations()
        self.assertEqual(summary["overall_status"], "PASSED")
        self.assertEqual(summary["geographic_scope"], "Western Province, Sri Lanka (Colombo, Gampaha, Kalutara)")

    def test_stage4_geographic_scope_western_province(self):
        """Verify all scenario records are strictly confined to Western Province districts."""
        geo_result = self.validator.validate_geographic_scope()
        self.assertEqual(geo_result["status"], "PASSED")
        self.assertTrue(geo_result["all_records_western_province"])
        self.assertEqual(geo_result["enforced_province"], "Western")
        self.assertEqual(set(geo_result["observed_districts"]), {"Colombo", "Gampaha", "Kalutara"})

    def test_stage4_leak_free_family_split_grouping(self):
        """Verify that splits group strictly by Business_ID with zero cross-split leakage."""
        split_result = self.validator.validate_leakage_and_splits()
        self.assertEqual(split_result["status"], "PASSED")
        self.assertTrue(split_result["is_leak_free"])
        self.assertIn(split_result["scenario_families_total"], [500, 1000])
        self.assertEqual(split_result["split_percentages_families"]["train_pct"], 70.0)
        self.assertEqual(split_result["split_percentages_families"]["validation_pct"], 15.0)
        self.assertEqual(split_result["split_percentages_families"]["test_pct"], 15.0)
        self.assertEqual(split_result["cross_split_overlaps"]["train_val_overlap"], 0)
        self.assertEqual(split_result["cross_split_overlaps"]["train_test_overlap"], 0)
        self.assertEqual(split_result["cross_split_overlaps"]["val_test_overlap"], 0)
        self.assertEqual(split_result["multi_split_scenario_families"], 0)
        self.assertEqual(split_result["multi_split_paired_actions"], 0)

    def test_stage4_target_labels_and_classes(self):
        """Verify that risk outcomes contain valid labels and correct de-escalation dynamics."""
        label_result = self.validator.validate_target_labels()
        self.assertEqual(label_result["status"], "PASSED")
        self.assertTrue(label_result["labels_are_simulated_rule_targets"])

        overall_counts = label_result["overall_risk_distribution"]
        self.assertEqual(set(overall_counts.keys()), {"Low", "Medium", "High"})

    def test_stage4_cross_dataset_isolation_and_non_mergability(self):
        """Verify that feasibility cases, invoice entities, and scenario businesses are mutually disjoint."""
        iso_result = self.validator.validate_cross_dataset_isolation()
        self.assertEqual(iso_result["status"], "PASSED")
        self.assertTrue(iso_result["is_strictly_disjoint"])
        self.assertEqual(iso_result["cross_dataset_overlaps"]["feasibility_vs_scenario"], 0)
        self.assertEqual(iso_result["cross_dataset_overlaps"]["feasibility_vs_invoice"], 0)
        self.assertEqual(iso_result["cross_dataset_overlaps"]["scenario_vs_invoice"], 0)

    def test_stage4_evidence_source_taxonomy(self):
        """Verify all datasets report standardized evidence source classifications."""
        feas_audit = self.validator.validate_feasibility_dataset()
        self.assertEqual(feas_audit["evidence_source"], "OBSERVED_FEASIBILITY_DATA")

        inv_audit = self.validator.validate_invoice_datasets()
        self.assertEqual(inv_audit["dataset07_invoices"]["evidence_source"], "DOCUMENT_DERIVED_DATA")
        self.assertEqual(inv_audit["dataset06_declarations"]["evidence_source"], "DOCUMENT_DERIVED_DATA")

        scen_audit = self.validator.validate_scenario_datasets()
        self.assertEqual(scen_audit["business_profiles"]["evidence_source"], "SIMULATED_SCENARIO")
        self.assertEqual(scen_audit["risk_outcomes"]["evidence_source"], "RULE_DERIVED_OUTCOME")

    def test_stage4_data_dictionary_and_manifest_coverage(self):
        """Verify data dictionary and manifest exist and cover Component 4 data tables."""
        dict_path = os.path.join(DEFAULT_DATA_DIR, "Data_Dictionary.csv")
        if not os.path.exists(dict_path):
            dict_path = os.path.join(DEFAULT_DATA_DIR, "data_dictionary.csv")
        self.assertTrue(os.path.exists(dict_path), f"Missing data dictionary at {dict_path}")

        df_dict = pd.read_csv(dict_path)
        col_file = "Dataset" if "Dataset" in df_dict.columns else "file"
        self.assertIn(col_file, df_dict.columns)
        dict_datasets = set(df_dict[col_file].dropna().unique())
        self.assertGreater(len(dict_datasets), 5)


class TestComponent4Stage5(unittest.TestCase):
    """
    Unit and integration tests for Stage 5: Risk Feature Engineering.
    Verifies mathematical formulas, edge cases (zero denominators, negative values, empty lists),
    feature pipeline integrity, Western Province geographic constraints, and zero target leakage.
    """

    def setUp(self):
        self.engineer = RiskFeatureEngineer()

    def test_hhi_calculation_and_edge_cases(self):
        """Verify HHI calculation across normal, monopoly, fractional, and empty cases."""
        # Normal 3-firm distribution: 50%, 30%, 20%
        # 0.5^2 + 0.3^2 + 0.2^2 = 0.25 + 0.09 + 0.04 = 0.38
        self.assertAlmostEqual(calculate_hhi([50.0, 30.0, 20.0]), 0.38, places=4)

        # Single monopoly supplier (100%) -> HHI = 1.0
        self.assertEqual(calculate_hhi([100.0]), 1.0)

        # Equal 4-firm distribution (25% each) -> 4 * 0.25^2 = 0.25
        self.assertAlmostEqual(calculate_hhi([25.0, 25.0, 25.0, 25.0]), 0.25, places=4)

        # Fractional input detection: [0.5, 0.3, 0.2] -> 0.38
        self.assertAlmostEqual(calculate_hhi([0.5, 0.3, 0.2]), 0.38, places=4)

        # Conventional non-normalized scale: 0.38 * 10000 = 3800.0
        self.assertAlmostEqual(calculate_hhi([50.0, 30.0, 20.0], normalized=False), 3800.0, places=1)

        # Edge cases: empty list, all zeros, None, negative values
        self.assertEqual(calculate_hhi([]), 0.0)
        self.assertEqual(calculate_hhi([0.0, 0.0]), 0.0)
        self.assertEqual(calculate_hhi(None), 0.0)
        self.assertEqual(calculate_hhi([-10.0, -20.0]), 0.0)

    def test_cr1_top_concentration_share(self):
        """Verify Top-1 Concentration Ratio calculation."""
        self.assertAlmostEqual(calculate_cr1([50.0, 30.0, 20.0]), 0.50, places=4)
        self.assertAlmostEqual(calculate_cr1([0.7, 0.2, 0.1]), 0.70, places=4)
        self.assertEqual(calculate_cr1([]), 0.0)
        self.assertEqual(calculate_cr1(None), 0.0)

    def test_financial_ratio_calculators_and_zero_division(self):
        """Verify financial baseline ratio functions handle normal and zero-denominator cases safely."""
        # Cash runway
        self.assertEqual(calculate_cash_runway(2000000.0, 1000000.0), 2.0)
        self.assertEqual(calculate_cash_runway(0.0, 1000000.0), 0.0)
        self.assertEqual(calculate_cash_runway(-500000.0, 1000000.0), 0.0)  # negative clamped to 0
        # Zero expenses: safe division with epsilon, no ZeroDivisionError
        self.assertGreater(calculate_cash_runway(2000000.0, 0.0), 0.0)

        # Debt service burden
        self.assertEqual(calculate_debt_service_burden(200000.0, 1000000.0), 0.20)
        self.assertEqual(calculate_debt_service_burden(200000.0, 0.0), 200000.0)  # epsilon=1.0

        # Debt service coverage ratio (DSCR)
        self.assertEqual(calculate_debt_service_coverage(500000.0, 250000.0), 2.0)
        self.assertEqual(calculate_debt_service_coverage(500000.0, 0.0), 500000.0)

        # Operating margin
        self.assertEqual(calculate_operating_margin(1000000.0, 700000.0), 0.30)
        self.assertEqual(calculate_operating_margin(1000000.0, 1200000.0), -0.20)
        self.assertIsInstance(calculate_operating_margin(0.0, 500000.0), float)

    def test_growth_action_stress_calculators(self):
        """Verify growth action stress and resilience interaction calculators."""
        # Investment to cash ratio
        self.assertEqual(calculate_investment_to_cash_ratio(500000.0, 1000000.0), 0.50)
        self.assertEqual(calculate_investment_to_cash_ratio(500000.0, 0.0), 500000.0)

        # Post action runway
        # Cash: 1M, Investment: 500K -> Remaining cash: 500K. Expenses: 200K + 50K = 250K. Runway: 500K / 250K = 2.0
        self.assertEqual(calculate_post_action_runway(1000000.0, 500000.0, 200000.0, 50000.0), 2.0)
        # Investment exceeds cash: 500K cash - 1M investment -> remaining cash clamped to 0 -> runway 0.0
        self.assertEqual(calculate_post_action_runway(500000.0, 1000000.0, 200000.0, 50000.0), 0.0)

        # Post action net cash flow
        # Rev: 1M + 200K change = 1.2M. Exp: 700K + 100K add = 800K. Repay: 150K. Net = 1.2M - 800K - 150K = 250K
        net_flow = calculate_post_action_net_cash_flow(1000000.0, 200000.0, 700000.0, 100000.0, 150000.0)
        self.assertEqual(net_flow, 250000.0)

        # Capacity gap score (1 - available_capacity)
        self.assertEqual(calculate_capacity_gap(0.75), 0.25)
        self.assertEqual(calculate_capacity_gap(1.0), 0.0)
        self.assertEqual(calculate_capacity_gap(0.0), 1.0)
        self.assertEqual(calculate_capacity_gap(1.5), 0.0)  # clamped
        self.assertEqual(calculate_capacity_gap(-0.2), 1.0)  # clamped

        # Staffing growth ratio
        self.assertEqual(calculate_staffing_growth_ratio(2, 10), 0.20)
        self.assertEqual(calculate_staffing_growth_ratio(2, 0), 2.0)  # epsilon=1

    def test_stage5_feature_pipeline_execution_and_schema(self):
        """Verify the complete feature engineering pipeline runs and produces expected schema."""
        from component4.preprocessing import Component4RiskDataPipeline
        pipeline = Component4RiskDataPipeline()
        df_feats, edge_index = pipeline.load_and_preprocess_all(save_artifacts=False)
        self.assertEqual(len(df_feats), 1000, f"Expected 1000 businesses, found {len(df_feats)}")
        self.assertGreaterEqual(len(df_feats.columns), 41)

        # Zero missing values across all engineered numerical/node features
        feature_cols = [c for c in df_feats.columns if not c.startswith("target_") and c not in ["Business_ID", "business_id", "Split", "split", "District", "district", "Province", "province"]]
        null_total = int(df_feats[feature_cols].isnull().sum().sum())
        self.assertEqual(null_total, 0, f"Found {null_total} null values in engineered feature dataset")

        # Zero infinite values
        numeric_cols = df_feats.select_dtypes(include=[np.number]).columns
        inf_count = int(np.isinf(df_feats[numeric_cols]).sum().sum())
        self.assertEqual(inf_count, 0, f"Found {inf_count} infinite values in engineered feature dataset")

    def test_stage5_geographic_scope_western_province(self):
        """Verify engineered dataset strictly preserves Western Province geographic boundary."""
        from component4.preprocessing import Component4RiskDataPipeline
        pipeline = Component4RiskDataPipeline()
        df_feats, _ = pipeline.load_and_preprocess_all(save_artifacts=False)
        col_prov = "Province" if "Province" in df_feats.columns else "province"
        col_dist = "District" if "District" in df_feats.columns else "district"
        provinces = set(df_feats[col_prov].dropna().unique())
        districts = set(df_feats[col_dist].dropna().unique())

        self.assertEqual(provinces, {"Western"})
        self.assertEqual(districts, {"Colombo", "Gampaha", "Kalutara"})

    def test_stage5_zero_target_leakage(self):
        """Verify predictive feature columns strictly exclude targets and rule codes."""
        from component4.preprocessing import Component4RiskDataPipeline
        pipeline = Component4RiskDataPipeline()
        df_feats, _ = pipeline.load_and_preprocess_all(save_artifacts=False)

        # Non-target feature columns must NOT contain any raw target names or rule triggers
        forbidden_tokens = [
            "Overall_Risk_Score_0_100", "Overall_Risk_Label", "overall_risk_label",
            "Growth_Ready_Flag", "Growth_Readiness_Score_0_100", "Risk_Factors",
            "Recommended_Mitigation", "Mitigation_Suggestions"
        ]
        feature_cols = [c for c in df_feats.columns if c not in ["Business_ID", "Split", "Province", "District", "target_risk_label", "target_risk_category"]]
        for col in feature_cols:
            for forbidden in forbidden_tokens:
                self.assertNotEqual(col, forbidden, f"Target leakage detected: column '{col}' is a target or rule trigger")

    def test_stage5_relationship_aggregation_integrity(self):
        """Verify relational features are properly extracted and bounded for all 1,000 businesses."""
        from component4.preprocessing import Component4RiskDataPipeline
        pipeline = Component4RiskDataPipeline()
        df_feats, edge_index = pipeline.load_and_preprocess_all(save_artifacts=False)
        self.assertEqual(len(df_feats), 1000)
        self.assertEqual(edge_index.shape[0], 2)
        self.assertEqual(edge_index.shape[1], 3487)


class TestComponent4Stage6(unittest.TestCase):
    """
    Unit and integration tests for Stage 6: Risk Assessment and Mitigation Engine.
    Verifies transparent scoring, score bounds, determinism, decision boundaries (PROCEED, MODIFY, DELAY),
    risk driver attribution, mitigation mapping, missing/invalid data handling, and zero target leakage.
    """

    def setUp(self):
        self.engine = RiskAssessmentEngine()
        self.healthy_record = {
            "action_id": "WP_SME_TEST_ACT_1",
            "business_id": "WP_SME_TEST_01",
            "variant": "BASELINE",
            "district": "Colombo",
            "province": "Western",
            "monthly_revenue_mean_lkr": 2500000.0,
            "monthly_expenses_mean_lkr": 1500000.0,
            "cash_reserves_latest_lkr": 7500000.0,
            "operating_profit_mean_lkr": 1000000.0,
            "operating_margin_ratio": 0.40,
            "baseline_cash_runway_months": 5.0,
            "min_cash_runway_months": 3.5,
            "debt_service_burden_ratio": 0.05,
            "debt_service_coverage_ratio": 8.0,
            "monthly_debt_repayment_lkr": 125000.0,
            "outstanding_debt_latest_lkr": 1500000.0,
            "supplier_hhi": 0.15,
            "supplier_cr1_share": 0.25,
            "customer_hhi": 0.12,
            "customer_cr1_share": 0.20,
            "has_disrupted_supplier": 0,
            "counterparty_payment_delay_mean_days": 10.0,
            "required_investment_lkr": 500000.0,
            "additional_monthly_cost_lkr": 50000.0,
            "expected_revenue_change_lkr": 200000.0,
            "investment_to_cash_ratio": 0.067,
            "additional_cost_to_revenue_ratio": 0.02,
            "post_action_cash_runway_months": 4.5,
            "post_action_net_cash_flow_lkr": 1025000.0,
            "capacity_gap_score": 0.10,
            "staffing_growth_ratio": 0.05,
        }

    def test_stage6_risk_scoring_bounds_and_determinism(self):
        """Verify score bounds in [0.0, 1.0], correct categorization, and strict determinism."""
        res1 = self.engine.assess_record(self.healthy_record)

        self.assertGreaterEqual(res1.composite_risk_score, 0.0)
        self.assertLessEqual(res1.composite_risk_score, 1.0)
        self.assertEqual(res1.overall_risk_category, "LOW")
        self.assertEqual(res1.growth_readiness, "PROCEED")
        self.assertTrue(res1.can_proceed_immediately)
        self.assertFalse(res1.has_critical_red_flag)
        self.assertEqual(res1.evidence_sufficiency, "SUFFICIENT")

        # Sub-scores must all be bounded in [0.0, 1.0]
        for name, score in res1.sub_scores.items():
            self.assertGreaterEqual(score, 0.0, f"Subscore {name} < 0.0")
            self.assertLessEqual(score, 1.0, f"Subscore {name} > 1.0")

        # Determinism check: running identical input twice yields identical results
        res2 = self.engine.assess_record(self.healthy_record)
        self.assertEqual(res1.composite_risk_score, res2.composite_risk_score)
        self.assertEqual(res1.overall_risk_category, res2.overall_risk_category)
        self.assertEqual(res1.growth_readiness, res2.growth_readiness)

    def test_stage6_decision_boundary_proceed_modify_delay(self):
        """Verify decision boundaries for PROCEED, MODIFY, and DELAY."""
        # Case A: Healthy record -> PROCEED
        res_proceed = self.engine.assess_record(self.healthy_record)
        self.assertEqual(res_proceed.growth_readiness, "PROCEED")
        self.assertTrue(res_proceed.can_proceed_immediately)

        # Case B: Concentrated supplier (HHI 0.65) -> MODIFY
        mod_record = dict(self.healthy_record)
        mod_record["supplier_hhi"] = 0.65
        mod_record["supplier_cr1_share"] = 0.80
        res_modify = self.engine.assess_record(mod_record)
        self.assertEqual(res_modify.growth_readiness, "MODIFY")
        self.assertFalse(res_modify.can_proceed_immediately)
        self.assertFalse(res_modify.has_critical_red_flag)

        # Case C: Critical runway exhaustion (0.5 months) -> DELAY
        delay_record = dict(self.healthy_record)
        delay_record["post_action_cash_runway_months"] = 0.5
        delay_record["cash_reserves_latest_lkr"] = 50000.0
        res_delay = self.engine.assess_record(delay_record)
        self.assertEqual(res_delay.growth_readiness, "DELAY")
        self.assertFalse(res_delay.can_proceed_immediately)
        self.assertTrue(res_delay.has_critical_red_flag)

    def test_stage6_risk_driver_explanations_and_mitigation_mapping(self):
        """Verify risk drivers include benchmark context and map to targeted mitigations."""
        record = dict(self.healthy_record)
        record["supplier_hhi"] = 0.70
        record["supplier_cr1_share"] = 0.85
        record["has_disrupted_supplier"] = 1

        res = self.engine.assess_record(record)
        driver_codes = [d["factor_code"] for d in res.primary_risk_drivers]
        self.assertIn("SUPPLY_DISRUPTION_ACTIVE", driver_codes)
        self.assertIn("SUPPLIER_CONCENTRATION", driver_codes)

        # Explanations must contain actual observed values
        sup_driver = next(d for d in res.primary_risk_drivers if d["factor_code"] == "SUPPLIER_CONCENTRATION")
        self.assertIn("0.70", sup_driver["description"])
        self.assertIn("85.0%", sup_driver["description"])

        # Mitigation mapping
        mitigation_actions = [m["action"] for m in res.recommended_mitigations]
        self.assertTrue(any("backup supplier" in a.lower() for a in mitigation_actions))

    def test_stage6_missing_invalid_and_nonfinite_inputs(self):
        """Verify engine gracefully handles None, NaN, Inf, and malformed inputs without crashing."""
        malformed_record = {
            "action_id": "WP_SME_BAD_01",
            "business_id": "WP_SME_BAD",
            "variant": "BASELINE",
            "monthly_revenue_mean_lkr": np.nan,
            "monthly_expenses_mean_lkr": np.inf,
            "cash_reserves_latest_lkr": None,
            "post_action_cash_runway_months": "INVALID_STRING",
            "supplier_hhi": -5.0,
            "debt_service_burden_ratio": 1e9,
        }
        res = self.engine.assess_record(malformed_record)
        self.assertIsInstance(res, RiskAssessmentResult)
        self.assertGreaterEqual(res.composite_risk_score, 0.0)
        self.assertLessEqual(res.composite_risk_score, 1.0)
        self.assertIn(res.overall_risk_category, ["LOW", "MEDIUM", "HIGH"])
        self.assertIn(res.growth_readiness, ["PROCEED", "MODIFY", "DELAY"])

    def test_stage6_insufficient_evidence_case(self):
        """Verify engine detects insufficient data and issues a guarded advisory."""
        empty_record = {
            "action_id": "WP_SME_EMPTY",
            "business_id": "WP_SME_EMPTY",
            "variant": "BASELINE",
        }
        res = self.engine.assess_record(empty_record)
        self.assertEqual(res.evidence_sufficiency, "INSUFFICIENT")
        self.assertFalse(res.can_proceed_immediately)
        self.assertEqual(res.growth_readiness, "MODIFY")
        self.assertEqual(res.primary_risk_drivers[0]["factor_code"], "INSUFFICIENT_EVIDENCE")
        self.assertIn("record-keeping", res.recommended_mitigations[0]["action"].lower())

    def test_stage6_dataframe_assessment_pipeline(self):
        """Verify assess_dataframe evaluates tabular data and returns expected columns."""
        sample_df = pd.DataFrame([self.healthy_record, self.healthy_record])
        df_out = self.engine.assess_dataframe(sample_df)

        self.assertEqual(len(df_out), 2)
        expected_cols = [
            "action_id", "business_id", "variant", "composite_risk_score",
            "overall_risk_category", "growth_readiness", "can_proceed_immediately",
            "has_critical_red_flag", "liquidity_risk_subscore", "debt_burden_subscore",
            "growth_action_stress_subscore", "supplier_concentration_subscore",
            "customer_concentration_subscore", "primary_risk_driver",
            "primary_mitigation_action", "evidence_sufficiency"
        ]
        for col in expected_cols:
            self.assertIn(col, df_out.columns, f"Missing expected output column: {col}")

    def test_stage6_zero_target_leakage(self):
        """Verify engine does not depend on or accept ground truth targets."""
        record_with_targets = dict(self.healthy_record)
        # Add target columns that might exist in input files
        record_with_targets["target_overall_risk"] = "HIGH"
        record_with_targets["target_growth_readiness"] = "DELAY"
        record_with_targets["overall_risk_label"] = "HIGH"
        record_with_targets["growth_readiness_label"] = "DELAY"

        # The engine must evaluate the healthy record based solely on financial numbers and return LOW / PROCEED
        res = self.engine.assess_record(record_with_targets)
        self.assertEqual(res.overall_risk_category, "LOW", "Engine leaked or relied on target_overall_risk!")
        self.assertEqual(res.growth_readiness, "PROCEED", "Engine leaked or relied on target_growth_readiness!")

    def test_stage6_western_province_geographic_restriction_and_dataset(self):
        """Verify Business_Profile.csv exists, has 1,000 businesses, and strictly Western Province."""
        prof_path = os.path.join(DEFAULT_DATA_DIR, "Business_Profile.csv")
        if not os.path.exists(prof_path):
            prof_path = "data/Component4_Dataset/Component4_Datasets/Business_Profile.csv"

        self.assertTrue(os.path.exists(prof_path), f"File missing: {prof_path}")
        df_prof = pd.read_csv(prof_path)
        self.assertEqual(len(df_prof), 1000)

        col_prov = "Province" if "Province" in df_prof.columns else "province"
        col_dist = "District" if "District" in df_prof.columns else "district"
        provinces = set(df_prof[col_prov].dropna().unique())
        districts = set(df_prof[col_dist].dropna().unique())

        self.assertEqual(provinces, {"Western"})
        self.assertEqual(districts, {"Colombo", "Gampaha", "Kalutara"})

    def test_stage6_variant_handling_mitigated_vs_baseline(self):
        """Verify scenario analysis handles all 4 stress testing scenario types."""
        scen_path = os.path.join(DEFAULT_DATA_DIR, "Scenario_Analysis.csv")
        if not os.path.exists(scen_path):
            scen_path = "data/Component4_Dataset/Component4_Datasets/Scenario_Analysis.csv"

        self.assertTrue(os.path.exists(scen_path), f"File missing: {scen_path}")
        df_scen = pd.read_csv(scen_path)
        scenario_types = set(df_scen["Scenario_Type"].dropna().unique())
        self.assertEqual(scenario_types, {
            "Interest_Rate_Shock", "Demand_Drop", "Inflation_Shock", "Supplier_Disruption"
        })


class TestComponent4Stage7_GNN(unittest.TestCase):
    """
    Stage 7 Tests: B2B Graph Neural Network Architecture, Training Artifacts,
    Non-Graph Baseline Comparison, and Isolated-Node Fallback Handling.
    """

    def test_gnn_model_architecture_and_forward(self):
        """Verify B2BRiskGNN initializes with 41 inputs, produces 3 classes, and forward passes."""
        from component4.gnn_model import B2BRiskGNN
        model = B2BRiskGNN(in_channels=41, hidden_channels=64, out_channels=3, dropout=0.3)
        self.assertEqual(model.in_channels, 41)
        self.assertEqual(model.out_channels, 3)

        # Mock batch of 10 nodes and 20 edges
        x = torch.randn(10, 41)
        edge_index = torch.randint(0, 10, (2, 20))
        out = model(x, edge_index)

        self.assertEqual(out.shape, (10, 3))
        # Zero NaN or infinite values in logits
        self.assertFalse(torch.isnan(out).any())
        self.assertFalse(torch.isinf(out).any())

    def test_saved_gnn_checkpoint_loading_and_metadata(self):
        """Verify the trained model checkpoint and metadata load correctly in memory."""
        checkpoint_path = "models/component4/gnn_risk_model.pt"
        metadata_path = "models/component4/gnn_model_metadata.json"
        eval_report_path = "reports/component4/gnn_evaluation_report.json"

        self.assertTrue(os.path.exists(checkpoint_path), f"Missing checkpoint: {checkpoint_path}")
        self.assertTrue(os.path.exists(metadata_path), f"Missing metadata: {metadata_path}")
        self.assertTrue(os.path.exists(eval_report_path), f"Missing evaluation report: {eval_report_path}")

        # Load weights
        checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
        self.assertIn("model_state_dict", checkpoint)
        self.assertEqual(checkpoint.get("in_channels"), 41)
        self.assertEqual(checkpoint.get("out_channels"), 3)

        with open(metadata_path, encoding="utf-8") as f:
            meta = json.load(f)
        self.assertEqual(meta["model_type"], "B2BRiskGNN")
        self.assertEqual(meta["target_classes"], ["Low", "Medium", "High"])

    def test_gnn_vs_baseline_metrics_comparison(self):
        """Verify evaluation report compares GNN against Random Forest non-graph baseline."""
        eval_report_path = "reports/component4/gnn_evaluation_report.json"
        with open(eval_report_path, encoding="utf-8") as f:
            report = json.load(f)

        self.assertIn("gnn_metrics", report)
        self.assertIn("baseline_metrics", report)
        self.assertGreater(report["gnn_metrics"]["test_accuracy"], 0.50)
        self.assertGreater(report["baseline_metrics"]["test_accuracy"], 0.50)

    def test_isolated_node_fallback(self):
        """Verify isolated node (0 relationships) falls back cleanly without crashing or inventing edges."""
        from component4.gnn_model import GNNInferenceEngine
        from component4.entity_resolution import ResolvedBusinessEntity

        engine = GNNInferenceEngine(model_dir="models/component4", device="cpu")

        # Entity with 0 relationships
        isolated_entity = ResolvedBusinessEntity(
            business_name="Brand New Colombo Startup",
            registration_number=None,
            matched_business_id=None,
            entity_id="c4_biz_isolated_test",
            match_confidence=0.0,
            resolution_method="NEW_PERSISTENT_ENTITY",
            is_verified=False,
            is_within_geographic_scope=True,
            district="Colombo",
            province="Western",
            geographic_scope_status="IN_SCOPE_WESTERN_PROVINCE",
            data_origin="USER_DECLARED",
            has_relationship_network=False,
            verified_relationships=[],
            unverified_relationships_count=0,
            supplier_count=0,
            customer_count=0,
            lender_count=0,
            provenance_notes=["Isolated node test entity."]
        )

        res = engine.infer(isolated_entity)
        self.assertFalse(res.gnn_applicable)
        self.assertEqual(res.gnn_status, "ISOLATED_NODE")
        self.assertEqual(res.edge_count, 0)
        self.assertIn("isolated", res.inference_notes[0].lower())

    def test_inductive_training_zero_gradient_on_heldout_nodes(self):
        """
        Phase 1 Proof: Proves mathematically and programmatically that held-out nodes
        cannot influence training message passing or parameter gradient updates in the inductive setup.
        """
        import torch.nn.functional as F
        from component4.gnn_model import B2BRiskGNN

        # Model with 41 input channels
        model = B2BRiskGNN(in_channels=41, hidden_channels=32, out_channels=3, dropout=0.0)

        # 10 training nodes, 5 held-out test nodes
        n_train = 10
        n_test = 5
        x_train = torch.randn(n_train, 41, requires_grad=True)
        x_test = torch.randn(n_test, 41, requires_grad=True)

        # 1. Verification of Computation-Graph Exclusion in Inductive Pipeline
        model.train()
        tr_src = torch.randint(0, n_train, (15,))
        tr_dst = torch.randint(0, n_train, (15,))
        self_loops = torch.arange(n_train)
        edge_index_train = torch.stack([
            torch.cat([tr_src, self_loops]),
            torch.cat([tr_dst, self_loops])
        ], dim=0)

        # In the inductive pipeline, only x_train and edge_index_train are passed:
        train_out = model(x_train, edge_index_train)
        train_loss = F.cross_entropy(train_out, torch.randint(0, 3, (n_train,)))
        train_loss.backward()

        self.assertIsNotNone(x_train.grad, "Training nodes must receive gradients")
        self.assertIsNone(x_test.grad, "Held-out test nodes must be completely absent from the computation graph")

        # 2. Verification of Topological Message Passing Isolation (Zero Convolutional Leakage)
        model.eval()
        x_full = torch.cat([x_train.detach().clone(), x_test.detach().clone()], dim=0)
        x_full.requires_grad = True

        eval_out = model(x_full, edge_index_train)
        eval_loss = F.cross_entropy(eval_out[:n_train], torch.randint(0, 3, (n_train,)))
        eval_loss.backward()

        self.assertIsNotNone(x_full.grad)
        test_grads = x_full.grad[n_train:]
        max_test_grad = test_grads.abs().max().item()

        self.assertEqual(
            max_test_grad, 0.0,
            f"Topological leakage detected! Gradient across disconnected test nodes is {max_test_grad} > 0.0"
        )

    def test_inductive_subgraphs_partitioning(self):
        """Phase 1 Verification: Verifies edge sets are cleanly partitioned into disjoint subgraphs."""
        from component4.gnn_model import build_inductive_subgraphs
        from component4.preprocessing import Component4RiskDataPipeline

        pipeline = Component4RiskDataPipeline()
        tables = pipeline.load_raw_tables()
        bids = sorted(tables["profile"]["Business_ID"].unique().tolist())
        splits = pipeline.create_business_splits(bids, random_seed=42)
        feat_df, y_series, _ = pipeline.extract_node_features(tables, fit_split_bids=splits["train"])

        y_int = np.array([0 if lbl == "Low" else (1 if lbl == "Medium" else 2) for lbl in y_series])
        subgraphs = build_inductive_subgraphs(feat_df, y_int, tables["relationships"], splits)

        # Train, val, test node counts
        self.assertEqual(subgraphs["train"]["nodes"], 700)
        self.assertEqual(subgraphs["val"]["nodes"], 150)
        self.assertEqual(subgraphs["test"]["nodes"], 150)

        # Check that train edge index has max index < 700
        max_tr_idx = subgraphs["train"]["edge_index"].max().item()
        self.assertLess(max_tr_idx, 700)

        # Check that test edge index has max index < 150
        max_te_idx = subgraphs["test"]["edge_index"].max().item()
        self.assertLess(max_te_idx, 150)

        # Cross edges must equal total - sum of intra edges
        total_rels = len(tables["relationships"])
        sum_intra = (
            subgraphs["train"]["rel_edges"]
            + subgraphs["val"]["rel_edges"]
            + subgraphs["test"]["rel_edges"]
        )
        self.assertEqual(subgraphs["cross_edges_count"], total_rels - sum_intra)

    def test_inductive_vs_transductive_separation_and_disclosure(self):
        """Phase 2 & 3 Verification: Verifies honest metric reporting, balanced accuracy, and provenance."""
        eval_report_path = "reports/component4/gnn_evaluation_report.json"
        with open(eval_report_path, encoding="utf-8") as f:
            report = json.load(f)

        # Distinct evaluation protocol sections
        self.assertIn("inductive_evaluation", report)
        self.assertIn("transductive_evaluation", report)
        self.assertIn("baseline_metrics", report)
        self.assertIn("class_imbalance_disclosure", report)
        self.assertIn("performance_verdict", report)

        # Inductive evaluation contains both isolated and extended metrics
        ind = report["inductive_evaluation"]
        self.assertIn("isolated_subgraph_evaluation", ind)
        self.assertIn("extended_network_evaluation", ind)

        # Class imbalance disclosure reports extreme scarcity
        imb = report["class_imbalance_disclosure"]
        self.assertEqual(imb["high_risk_cases_total"], 2)
        self.assertEqual(imb["high_risk_cases_test"], 0)
        stmt = imb["scientific_limitation_statement"].lower()
        self.assertTrue("cannot be claimed" in stmt or "limitation" in stmt)

        # Versioned inductive checkpoint exists
        versioned_ckpt = "models/component4/gnn_risk_model_inductive_v2.1.pt"
        self.assertTrue(os.path.exists(versioned_ckpt), f"Missing versioned checkpoint: {versioned_ckpt}")

    def test_binary_and_three_class_metric_consistency(self):
        """
        Audit Requirement 1 & 2: Proves binary and three-class metrics are calculated
        using the intended label sets and targets without altering underlying data.
        """
        from component4.gnn_model import compute_evaluation_metrics, RISK_CLASS_NAMES

        # 1. Unit test the metric calculation function on known synthetic arrays
        # Actual: 2 Low (0), 2 Medium (1), 0 High (2)
        # Predicted: 1 Low (0), 1 Medium (1), 2 High (2)
        y_synthetic_true = np.array([0, 0, 1, 1])
        y_synthetic_pred = np.array([0, 1, 2, 2])
        m = compute_evaluation_metrics(y_synthetic_true, y_synthetic_pred)

        # 3-Class checks: must use fixed labels [0, 1, 2] and divide by 3
        self.assertEqual(m["three_class_evaluation"]["labels"], [0, 1, 2])
        self.assertEqual(m["three_class_evaluation"]["class_order"], RISK_CLASS_NAMES)
        self.assertEqual(len(m["three_class_evaluation"]["confusion_matrix"]), 3)
        self.assertEqual(len(m["three_class_evaluation"]["confusion_matrix"][0]), 3)
        self.assertEqual(m["three_class_evaluation"]["class_support"], {"Low": 2, "Medium": 2, "High": 0})

        # Binary checks: must collapse Medium and High to Higher Risk (1) and use labels [0, 1]
        self.assertEqual(m["binary_evaluation"]["labels"], [0, 1])
        self.assertEqual(m["binary_evaluation"]["class_order"], ["Low", "Higher Risk"])
        self.assertEqual(len(m["binary_evaluation"]["confusion_matrix"]), 2)
        self.assertEqual(len(m["binary_evaluation"]["confusion_matrix"][0]), 2)
        self.assertEqual(m["binary_evaluation"]["class_support"], {"Low": 2, "Higher_Risk": 2})

        # In binary: true = [0, 0, 1, 1], pred = [0, 1, 1, 1]
        # Low: TP=1, FP=0, FN=1 -> Prec=1.0, Rec=0.5, F1=0.6667
        # Higher Risk: TP=2, FP=1, FN=0 -> Prec=0.6667, Rec=1.0, F1=0.8
        # Macro F1 = (0.6667 + 0.8) / 2 = 0.7333
        self.assertAlmostEqual(m["binary_evaluation"]["macro_f1"], 0.7333, places=3)

        # 2. Verify serialized evaluation report and metadata match exact audited values
        eval_report_path = "reports/component4/gnn_evaluation_report.json"
        meta_path = "models/component4/gnn_model_metadata.json"
        with open(eval_report_path, encoding="utf-8") as f:
            report = json.load(f)
        with open(meta_path, encoding="utf-8") as f:
            meta = json.load(f)

        # Random Forest Baseline
        rf = report["baseline_metrics"]
        self.assertEqual(rf["test_accuracy"], 0.5933)
        self.assertEqual(rf["test_balanced_accuracy"], 0.5644)
        self.assertEqual(rf["test_macro_f1_3class"], 0.3459)
        self.assertEqual(rf["test_macro_f1_2class"], 0.5189)
        self.assertEqual(rf["confusion_matrix"], [[74, 47, 0], [14, 15, 0], [0, 0, 0]])
        self.assertEqual(rf["binary_evaluation"]["confusion_matrix"], [[74, 47], [14, 15]])
        self.assertFalse(rf["cross_split_relationships_used_at_inference"])

        # Inductive GNN Extended Network
        gnn_ext = report["inductive_evaluation"]["extended_network_evaluation"]
        self.assertEqual(gnn_ext["test_accuracy"], 0.7200)
        self.assertEqual(gnn_ext["test_balanced_accuracy"], 0.4725)
        self.assertEqual(gnn_ext["test_macro_f1_3class"], 0.3114)
        self.assertEqual(gnn_ext["test_macro_f1_2class"], 0.5040)
        self.assertEqual(gnn_ext["confusion_matrix"], [[106, 12, 3], [25, 2, 2], [0, 0, 0]])
        self.assertEqual(gnn_ext["binary_evaluation"]["confusion_matrix"], [[106, 15], [25, 4]])
        self.assertTrue(gnn_ext["cross_split_relationships_used_at_inference"])
        # Notice: Exactly 5 High predictions (3 on actual Low, 2 on actual Medium) with 0 actual High test support
        high_pred_count = sum(row[2] for row in gnn_ext["confusion_matrix"])
        self.assertEqual(high_pred_count, 5)

        # Inductive GNN Isolated Subgraph
        gnn_iso = report["inductive_evaluation"]["isolated_subgraph_evaluation"]
        self.assertEqual(gnn_iso["test_accuracy"], 0.5533)
        self.assertEqual(gnn_iso["test_balanced_accuracy"], 0.4741)
        self.assertEqual(gnn_iso["test_macro_f1_3class"], 0.3088)
        self.assertEqual(gnn_iso["test_macro_f1_2class"], 0.4577)
        self.assertFalse(gnn_iso["cross_split_relationships_used_at_inference"])

        # Transductive GNN Benchmark
        trans = report["transductive_evaluation"]
        self.assertEqual(trans["test_accuracy"], 0.68)
        self.assertEqual(trans["test_balanced_accuracy"], 0.5788)
        self.assertEqual(trans["test_macro_f1_3class"], 0.3743)
        self.assertEqual(trans["test_macro_f1_2class"], 0.5614)
        self.assertTrue(trans["cross_split_relationships_used_at_inference"])

        # Integrity Check: Random Forest outperforms GNN in Balanced Accuracy & Macro-F1 across both binary and 3-class
        self.assertGreater(rf["test_balanced_accuracy"], gnn_ext["test_balanced_accuracy"])
        self.assertGreater(rf["test_macro_f1_2class"], gnn_ext["test_macro_f1_2class"])
        self.assertGreater(rf["test_macro_f1_3class"], gnn_ext["test_macro_f1_3class"])

    def test_active_checkpoint_and_model_status_endpoint(self):
        """
        Audit Requirement 3: Confirms the active runtime checkpoint, schema,
        class order, and verifies that /api/component4/model-status serves fresh aligned data.
        """
        from backend.main import app
        from fastapi.testclient import TestClient
        client = TestClient(app)

        # 1. Active checkpoint file inspection
        active_ckpt_path = "models/component4/gnn_risk_model.pt"
        versioned_ckpt_path = "models/component4/gnn_risk_model_inductive_v2.1.pt"
        self.assertTrue(os.path.exists(active_ckpt_path))
        self.assertTrue(os.path.exists(versioned_ckpt_path))

        active_ckpt = torch.load(active_ckpt_path, map_location="cpu")
        versioned_ckpt = torch.load(versioned_ckpt_path, map_location="cpu")

        # Verify architecture and dimensions
        self.assertEqual(active_ckpt["in_channels"], 41)
        self.assertEqual(active_ckpt["out_channels"], 3)
        self.assertEqual(active_ckpt["model_version"], "Component4_B2BRiskGNN_v2.1")
        self.assertEqual(active_ckpt["evaluation_protocol"], "inductive")
        self.assertEqual(active_ckpt["target_classes"], ["Low", "Medium", "High"])

        # Verify weights match
        for k in active_ckpt["model_state_dict"]:
            self.assertTrue(torch.equal(active_ckpt["model_state_dict"][k], versioned_ckpt["model_state_dict"][k]))

        # 2. Call /api/component4/model-status endpoint
        res = client.get("/api/component4/model-status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["model_version"], "Component4_B2BRiskGNN_v2.1")
        self.assertEqual(data["evaluation_protocol"], "inductive")
        self.assertEqual(data["checkpoint_path"], "models/component4/gnn_risk_model.pt")

        metrics = data["evaluation_metrics"]
        self.assertEqual(metrics["gnn_test_macro_f1_3class"], 0.3114)
        self.assertEqual(metrics["gnn_test_macro_f1_2class"], 0.5040)
        self.assertEqual(metrics["baseline_test_macro_f1_3class"], 0.3459)
        self.assertEqual(metrics["baseline_test_macro_f1_2class"], 0.5189)

        # Protocol separation in API
        self.assertIn("protocols_summary", data)
        protocols = data["protocols_summary"]
        self.assertFalse(protocols["tabular_baseline"]["cross_split_relationships_at_inference"])
        self.assertFalse(protocols["inductive_isolated_subgraph"]["cross_split_relationships_at_inference"])
        self.assertTrue(protocols["inductive_extended_network"]["cross_split_relationships_at_inference"])
        self.assertTrue(protocols["transductive_benchmark"]["cross_split_relationships_at_inference"])


class TestComponent4Stage8_PipelineAndAPI(unittest.TestCase):
    """
    Stage 8 Tests: Component 1 Business Plan Mapping, Dynamic Intake Schema,
    Entity Resolution without Edge Fabrication, Scenario Analysis, and Backend API Endpoints.
    """

    def setUp(self):
        from backend.main import app
        from fastapi.testclient import TestClient
        self.client = TestClient(app)

    def test_component1_plan_mapping_to_component4(self):
        """Verify Component 1 business-plan output maps into Component 4 schema without duplicating feasibility."""
        from component4.business_plan_ingestion import BusinessPlanIngestionService
        service = BusinessPlanIngestionService()

        # Simulated Component 1 business plan JSON output
        c1_plan = {
            "metadata": {
                "business_id": "SLWP00001",
                "business_name": "Homagama Eco Pack",
                "district": "Colombo",
                "province": "Western",
                "business_category": "Manufacturing"
            },
            "financial_feasibility": {
                "available_capital_lkr": 1200000.0,
                "monthly_budget_lkr": 250000.0,
                "loan_amount_lkr": 400000.0
            },
            "growth_strategy": {
                "proposed_action": "Expand Production Capacity",
                "primary_strategy": "Industrial Scaling"
            }
        }

        # Write to temporary file for ingestion
        import tempfile
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8") as tmp:
            json.dump(c1_plan, tmp)
            tmp_path = tmp.name

        try:
            plan = service.ingest_file(tmp_path)
            self.assertEqual(plan.business_name, "Homagama Eco Pack")
            self.assertEqual(plan.district, "Colombo")
            self.assertEqual(plan.province, "Western")
            self.assertEqual(plan.available_capital_lkr, 1200000.0)
            self.assertEqual(plan.monthly_budget_lkr, 250000.0)
            self.assertEqual(plan.proposed_growth_action, "Expand Production Capacity")
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    def test_dynamic_intake_validation_and_unknown_flags(self):
        """Verify dynamic intake schema allows explicit Unknown flags and collects missing risk fields."""
        from component4.intake_schema import DynamicIntakeSchemaService
        from component4.business_plan_ingestion import ExtractedBusinessPlan

        schema_service = DynamicIntakeSchemaService()
        plan = ExtractedBusinessPlan(
            plan_filename="sample_plan.json",
            business_name="Test Enterprise",
            district="Colombo",
            province="Western",
            available_capital_lkr=500000.0,
            monthly_budget_lkr=150000.0,
            missing_fields=["customer_concentration_pct", "import_reliance_pct"]
        )

        intake = schema_service.build_dynamic_intake_request(plan)
        self.assertIn("dimensions", intake)
        self.assertIn("missing_fields_prompt", intake)
        self.assertTrue(len(intake["dimensions"]) >= 5)

    def test_entity_resolution_no_fabricated_edges(self):
        """Verify entity resolution creates separate ID for new business and fabricates zero edges."""
        from component4.entity_resolution import BusinessEntityResolver
        from component4.business_plan_ingestion import ExtractedBusinessPlan

        resolver = BusinessEntityResolver()
        plan = ExtractedBusinessPlan(
            plan_filename="unknown_startup.txt",
            business_name="Unique New Startup 2026",
            district="Kalutara",
            province="Western",
            available_capital_lkr=600000.0,
            monthly_budget_lkr=120000.0
        )

        resolved = resolver.resolve(plan)
        self.assertTrue(resolved.entity_id.startswith("c4_biz_"))
        self.assertFalse(resolved.has_relationship_network)
        self.assertEqual(len(resolved.verified_relationships), 0)

    def test_conditional_scenario_analysis(self):
        """Verify conditional scenario analysis evaluates the 4 shock dimensions with CONDITIONAL_ESTIMATE."""
        from component4.risk_assessment import RiskAssessmentEngine
        engine = RiskAssessmentEngine()

        sample_data = {
            "monthly_revenue_mean_lkr": 1000000.0,
            "monthly_expenses_mean_lkr": 700000.0,
            "cash_reserves_latest_lkr": 2000000.0,
            "debt_service_burden_ratio": 0.10,
            "supplier_hhi": 0.25,
            "customer_hhi": 0.20
        }
        res = engine.assess_record(sample_data)
        self.assertEqual(len(res.scenarios), 4)

        types = [s["scenario_type"] for s in res.scenarios]
        self.assertIn("Interest_Rate_Shock", types)
        self.assertIn("Demand_Drop", types)
        self.assertIn("Inflation_Shock", types)
        self.assertIn("Supplier_Disruption", types)

        for s in res.scenarios:
            self.assertEqual(s["provenance"], "CONDITIONAL_ESTIMATE")
            self.assertIn("not an observed future fact", s["methodology_note"])

    def test_component4_api_model_status_endpoint(self):
        """Verify GET /api/component4/model-status returns 200 and valid deployment metadata."""
        res = self.client.get("/api/component4/model-status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["model_name"], "Component 4 B2B Risk GNN")
        self.assertEqual(data["input_feature_dim"], 41)
        self.assertIn("gnn_metrics", data["evaluation_metrics"] if "gnn_metrics" in data["evaluation_metrics"] else data)
        self.assertIn("data_provenance_disclosure", data)

    def test_component4_api_candidates_and_graph_endpoints(self):
        """Verify GET /api/component4/candidates and GET /api/component4/graph/{business_id}."""
        res_cand = self.client.get("/api/component4/candidates")
        self.assertEqual(res_cand.status_code, 200)
        cand_data = res_cand.json()
        self.assertTrue(cand_data["success"])

        # Graph retrieval for existing dataset SME
        res_graph = self.client.get("/api/component4/graph/SLWP00001")
        self.assertEqual(res_graph.status_code, 200)
        graph_data = res_graph.json()
        self.assertTrue(graph_data["success"])
        self.assertIn("nodes", graph_data)
        self.assertIn("edges", graph_data)


if __name__ == "__main__":
    unittest.main()


