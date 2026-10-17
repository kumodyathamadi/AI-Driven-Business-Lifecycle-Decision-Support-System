"""
Unit and integration tests for Component 4.
Covers Stage 1 (data audit, environment) and Stage 2 (preprocessing, feasibility baselines, inference).
Supports both unittest and pytest.
"""

import os
import sys
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

from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier

FEASIBILITY_PATH = "data/raw/Component_One_Core_Feasibility.csv"
DATASET_07_DIR = "data/Dataset/07"
DATASET_06_DIR = "data/Dataset/06"


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
        """Verify that splits group strictly by scenario_family_id with zero cross-split leakage."""
        split_result = self.validator.validate_leakage_and_splits()
        self.assertEqual(split_result["status"], "PASSED")
        self.assertTrue(split_result["is_leak_free"])
        self.assertEqual(split_result["scenario_families_total"], 500)
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

        readiness_counts = label_result["growth_readiness_distribution"]
        self.assertEqual(set(readiness_counts.keys()), {"Proceed", "Modify", "Delay"})

        # In mitigated variants, Delay count must be 0
        readiness_by_variant = label_result["readiness_by_variant"]
        self.assertEqual(readiness_by_variant["Delay"]["MITIGATED"], 0)
        self.assertGreater(readiness_by_variant["Proceed"]["MITIGATED"], readiness_by_variant["Proceed"]["BASELINE"])

    def test_stage4_cross_dataset_isolation_and_non_mergability(self):
        """Verify that feasibility cases, invoice entities, and scenario businesses are mutually disjoint."""
        iso_result = self.validator.validate_cross_dataset_isolation()
        self.assertEqual(iso_result["status"], "PASSED")
        self.assertTrue(iso_result["is_strictly_disjoint"])
        self.assertEqual(iso_result["cross_dataset_overlaps"]["feasibility_vs_scenario"], 0)
        self.assertEqual(iso_result["cross_dataset_overlaps"]["feasibility_vs_invoice"], 0)
        self.assertEqual(iso_result["cross_dataset_overlaps"]["scenario_vs_invoice"], 0)


if __name__ == "__main__":
    unittest.main()

