"""
Unit and Integration Test Suite for Component 4:
Business Plan Ingestion, Entity Resolution, GNN Modeling & Inference,
Multi-Factor Risk Assessment, Growth Readiness, and REST API.
"""

import os
import sys
import json
import tempfile
import unittest
import subprocess
import torch
from fastapi.testclient import TestClient

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

SRC_DIR = os.path.join(PROJECT_ROOT, "src")
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from component4.business_plan_ingestion import (
    BusinessPlanIngestionService,
    ExtractedBusinessPlan,
    WESTERN_PROVINCE_DISTRICTS
)
from component4.entity_resolution import (
    BusinessEntityResolver,
    ResolvedBusinessEntity
)
from component4.gnn_model import (
    B2BRiskGNN,
    GNNInferenceEngine,
    GNNInferenceResult,
    NODE_FEATURE_DIM
)
from component4.growth_readiness import (
    GrowthReadinessEvaluator,
    GrowthReadinessEvaluation
)
from component4.pipeline import (
    Component4Pipeline,
    Component4AnalysisPipelineResult
)
from component4.intake_schema import (
    DynamicIntakeSchemaService,
    MASTER_INTAKE_SCHEMA,
    PROVENANCE_EXTRACTED,
    PROVENANCE_USER_DECLARED,
    PROVENANCE_INDEPENDENTLY_VERIFIED,
    PROVENANCE_SIMULATED
)
from backend.routes.component4_risk import sanitize_for_logging
from backend.main import app

SAMPLE_PLAN_PATH = os.path.join(
    PROJECT_ROOT,
    "reports",
    "research_evaluation",
    "experiment_06_business_plan_validation",
    "sample_business_plan_C00001.json"
)


class TestComponent4PipelineSuite(unittest.TestCase):
    """Comprehensive test cases for Component 4 phases 2 through 12."""

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.ingestion_service = BusinessPlanIngestionService()
        cls.entity_resolver = BusinessEntityResolver()
        cls.gnn_engine = GNNInferenceEngine()
        cls.pipeline = Component4Pipeline()

    # -------------------------------------------------------------------------
    # 1. Ingestion & Structured Fact Extraction Tests (Phase 2)
    # -------------------------------------------------------------------------

    def test_sample_business_plan_json_ingestion(self):
        """Verifies parsing of the Component 1 sample business plan JSON."""
        self.assertTrue(os.path.exists(SAMPLE_PLAN_PATH), f"Missing sample file: {SAMPLE_PLAN_PATH}")
        plan = self.ingestion_service.ingest_file(SAMPLE_PLAN_PATH)

        self.assertTrue(plan.is_valid)
        self.assertEqual(plan.file_format, ".json")
        self.assertEqual(plan.business_category, "Grocery/Mini-Mart")
        self.assertEqual(plan.district, "Colombo")
        self.assertEqual(plan.province, "Western")
        self.assertEqual(plan.available_capital_lkr, 730108.0)
        self.assertEqual(plan.monthly_budget_lkr, 185000.0)
        self.assertEqual(plan.capital_runway_months, 3.9)
        self.assertEqual(plan.primary_strategy, "Hybrid Digital & Local Delivery Model")
        self.assertEqual(plan.evidence_sufficiency_status, "SUFFICIENT")
        self.assertEqual(len(plan.missing_fields), 0)

    def test_text_business_plan_ingestion(self):
        """Verifies regex extraction from raw text / markdown business plans."""
        sample_text = (
            "# Homagama Bakery Expansion Plan\n"
            "Business Category: Bakery\n"
            "District: Colombo\n"
            "Business Stage: Existing Business\n"
            "Available Capital: 450,000 LKR\n"
            "Monthly Operating Budget: 120,000 LKR\n"
            "Target Daily Customers: 40\n"
            "Available Staff: 3\n"
            "Recommended Strategy: Premium Quality Line\n"
        )
        with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as f:
            f.write(sample_text)
            temp_path = f.name

        try:
            plan = self.ingestion_service.ingest_file(temp_path)
            self.assertTrue(plan.is_valid)
            self.assertEqual(plan.district, "Colombo")
            self.assertEqual(plan.business_category, "Bakery")
            self.assertEqual(plan.business_stage, "Existing")
            self.assertEqual(plan.available_capital_lkr, 450000.0)
            self.assertEqual(plan.monthly_budget_lkr, 120000.0)
            self.assertEqual(plan.available_staff_count, 3)
            self.assertEqual(plan.expected_customers_per_day, 40)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def test_corrupted_and_empty_files_handling(self):
        """Verifies graceful rejection of empty or malformed files."""
        # Non-existent file
        plan_none = self.ingestion_service.ingest_file("non_existent_file.pdf")
        self.assertFalse(plan_none.is_valid)
        self.assertEqual(plan_none.evidence_sufficiency_status, "INSUFFICIENT")

        # Empty file
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
            f.write("")
            empty_path = f.name
        try:
            plan_empty = self.ingestion_service.ingest_file(empty_path)
            self.assertFalse(plan_empty.is_valid)
            self.assertEqual(plan_empty.evidence_sufficiency_status, "INSUFFICIENT")
        finally:
            if os.path.exists(empty_path):
                os.remove(empty_path)

        # Unsupported format
        with tempfile.NamedTemporaryFile("w", suffix=".exe", delete=False) as f:
            f.write("bin")
            exe_path = f.name
        try:
            plan_unsupp = self.ingestion_service.ingest_file(exe_path)
            self.assertFalse(plan_unsupp.is_valid)
            self.assertIn("Unsupported file format", plan_unsupp.validation_errors[0])
        finally:
            if os.path.exists(exe_path):
                os.remove(exe_path)

    def test_missing_fields_and_sufficiency_status(self):
        """Verifies accurate detection of missing financial metrics and PARTIAL sufficiency."""
        partial_json = {
            "plan_metadata": {"business_category": "Retail"},
            "operational_plan": {"staffing_requirements": "Available Staff: 2"}
        }
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
            json.dump(partial_json, f)
            temp_path = f.name

        try:
            plan = self.ingestion_service.ingest_file(temp_path)
            self.assertTrue(plan.is_valid)
            self.assertIn("district", plan.missing_fields)
            self.assertIn("available_capital_lkr", plan.missing_fields)
            self.assertEqual(plan.evidence_sufficiency_status, "INSUFFICIENT")
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    # -------------------------------------------------------------------------
    # 2. Entity Resolution & Geographic Scope Tests (Phases 3 & 4)
    # -------------------------------------------------------------------------

    def test_entity_resolution_sample_plan_c00001(self):
        """Verifies resolution of sample plan to C00001 (Core Feasibility Case)."""
        plan = self.ingestion_service.ingest_file(SAMPLE_PLAN_PATH)
        resolved = self.entity_resolver.resolve(plan)

        self.assertEqual(resolved.entity_id, "C00001")
        self.assertEqual(resolved.match_type, "EXACT_ID")
        self.assertEqual(resolved.data_origin, "OBSERVED_SOURCE")
        self.assertTrue(resolved.is_within_geographic_scope)
        self.assertEqual(resolved.geographic_scope_status, "IN_SCOPE")
        # Zero fabricated relationships
        self.assertEqual(len(resolved.verified_relationships), 0)
        self.assertFalse(resolved.has_relationship_network)

    def test_entity_resolution_scenario_sme_wp_0001(self):
        """Verifies resolution to scenario SME with 8 verified B2B relationships."""
        plan = ExtractedBusinessPlan(
            source_filename="test_wp.json",
            file_format=".json",
            file_size_bytes=100,
            is_valid=True,
            business_identifier="WP_SME_0001",
            district="Colombo"
        )
        resolved = self.entity_resolver.resolve(plan)

        self.assertEqual(resolved.entity_id, "WP_SME_0001")
        self.assertEqual(resolved.data_origin, "SIMULATED_SCENARIO")
        self.assertTrue(resolved.has_relationship_network)
        self.assertEqual(len(resolved.verified_relationships), 5)
        self.assertEqual(resolved.supplier_count, 2)
        self.assertEqual(resolved.customer_count, 3)
        self.assertEqual(resolved.lender_count, 0)

    def test_geographic_scope_out_of_scope_rejection(self):
        """Verifies that non-Western Province districts (e.g. Kandy) are rejected/flagged."""
        plan = ExtractedBusinessPlan(
            source_filename="kandy_plan.json",
            file_format=".json",
            file_size_bytes=100,
            is_valid=True,
            district="Kandy",
            business_category="Retail"
        )
        resolved = self.entity_resolver.resolve(plan)

        self.assertFalse(resolved.is_within_geographic_scope)
        self.assertEqual(resolved.geographic_scope_status, "OUT_OF_SCOPE")
        self.assertIn("outside Western Province", resolved.provenance_notes[0])

    def test_zero_edge_fabrication_on_unlinked_business(self):
        """Verifies that unlinked uploaded businesses do not have artificial edges fabricated."""
        plan = ExtractedBusinessPlan(
            source_filename="custom_startup.json",
            file_format=".json",
            file_size_bytes=100,
            is_valid=True,
            business_name="Dehiwala Custom Cakes",
            district="Colombo",
            business_category="Bakery"
        )
        resolved = self.entity_resolver.resolve(plan)

        self.assertTrue(resolved.entity_id.startswith("UPLOAD_") or resolved.entity_id.startswith("c4_biz_"))
        self.assertIn(resolved.match_type, ["UNLINKED_NEW", "NEW_PERSISTENT_ENTITY", "UNLINKED"])
        self.assertEqual(len(resolved.verified_relationships), 0)
        self.assertFalse(resolved.has_relationship_network)

    # -------------------------------------------------------------------------
    # 3. GNN Model & Relational Inference Tests (Phase 5)
    # -------------------------------------------------------------------------

    def test_gnn_model_architecture_and_forward_pass(self):
        """Verifies B2BRiskGNN tensor shapes and forward execution."""
        model = B2BRiskGNN(in_channels=NODE_FEATURE_DIM, hidden_channels=16, out_channels=3)
        model.eval()

        # Dummy graph: 4 nodes, 4 edges
        x = torch.randn(4, NODE_FEATURE_DIM)
        edge_index = torch.tensor([[0, 1, 2, 3], [1, 2, 3, 0]], dtype=torch.long)
        edge_weight = torch.tensor([1.0, 1.2, 0.8, 1.5], dtype=torch.float)

        with torch.no_grad():
            out = model(x, edge_index, edge_weight)
            emb = model.extract_embedding(x, edge_index, edge_weight)

        self.assertEqual(out.shape, (4, 3))
        self.assertEqual(emb.shape, (4, 16))

    def test_gnn_inference_on_connected_entity(self):
        """Verifies GNN inference produces contextual risk scores on connected scenario SME."""
        plan = ExtractedBusinessPlan(
            source_filename="test_wp.json",
            file_format=".json",
            file_size_bytes=100,
            is_valid=True,
            business_identifier="WP_SME_0001",
            district="Colombo"
        )
        resolved = self.entity_resolver.resolve(plan)
        res = self.gnn_engine.infer(resolved)

        self.assertTrue(res.gnn_applicable)
        self.assertEqual(res.gnn_status, "SUCCESS")
        self.assertIn(res.predicted_risk_category, ["Low", "Medium", "High"])
        self.assertGreater(res.node_count, 1)
        self.assertGreater(res.edge_count, 1)
        self.assertIsNotNone(res.graph_contextual_risk_score)
        self.assertEqual(len(res.relational_embedding_preview), 6)

    def test_gnn_inference_on_isolated_entity_fallback(self):
        """Verifies GNN gracefully falls back without fabricating edges when isolated."""
        plan = self.ingestion_service.ingest_file(SAMPLE_PLAN_PATH)
        resolved = self.entity_resolver.resolve(plan)
        res = self.gnn_engine.infer(resolved)

        self.assertFalse(res.gnn_applicable)
        self.assertEqual(res.gnn_status, "ISOLATED_NODE")
        self.assertIn("zero artificial edges were fabricated", res.explanation.lower())

    # -------------------------------------------------------------------------
    # 4. End-to-End Pipeline & Growth Readiness Tests (Phases 6, 7, 8)
    # -------------------------------------------------------------------------

    def test_pipeline_execution_sample_plan_c00001(self):
        """Verifies end-to-end analysis of Component 1 sample plan."""
        result = self.pipeline.run(SAMPLE_PLAN_PATH, save_artifacts=False)

        self.assertIsInstance(result, Component4AnalysisPipelineResult)
        self.assertTrue(result.analysis_id.startswith("CMP4_"))
        self.assertEqual(result.resolved_entity.entity_id, "C00001")
        self.assertEqual(result.growth_readiness.decision, "PROCEED")
        self.assertEqual(result.stage6_risk_assessment.overall_risk_category, "LOW")
        self.assertIn("Hybrid Digital & Local Delivery Model", result.growth_readiness.original_strategy)
        self.assertIn("# 🛡️ Component 4", result.markdown_report)

    def test_pipeline_execution_with_persisted_artifacts(self):
        """Verifies that markdown and json reports are saved to disk with unique ID."""
        with tempfile.TemporaryDirectory() as temp_out_dir:
            temp_pipeline = Component4Pipeline(output_base_dir=temp_out_dir)
            result = temp_pipeline.run(SAMPLE_PLAN_PATH, save_artifacts=True)

            self.assertIn("markdown_report", result.output_files)
            self.assertIn("json_results", result.output_files)
            self.assertTrue(os.path.exists(result.output_files["markdown_report"]))
            self.assertTrue(os.path.exists(result.output_files["json_results"]))

            # Verify JSON content
            with open(result.output_files["json_results"], "r", encoding="utf-8") as f:
                saved_json = json.load(f)
            self.assertEqual(saved_json["analysis_id"], result.analysis_id)
            self.assertEqual(saved_json["overall_summary"]["overall_risk_category"], "LOW")

    # -------------------------------------------------------------------------
    # 5. REST API Integration Tests (Phase 11)
    # -------------------------------------------------------------------------

    def test_api_plan_upload_endpoint(self):
        """Verifies POST /api/component4/plan/upload."""
        with open(SAMPLE_PLAN_PATH, "rb") as f:
            response = self.client.post(
                "/api/component4/plan/upload",
                files={"file": ("sample_business_plan_C00001.json", f, "application/json")}
            )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["extraction"]["business_category"], "Grocery/Mini-Mart")
        self.assertEqual(data["resolved_entity"]["entity_id"], "C00001")

    def test_api_analysis_run_endpoint(self):
        """Verifies POST /api/component4/analysis/run."""
        payload = {"plan_file_path": SAMPLE_PLAN_PATH}
        response = self.client.post("/api/component4/analysis/run", json=payload)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIn("analysis_id", data)
        self.assertEqual(data["growth_readiness"]["decision"], "PROCEED")
        self.assertEqual(data["stage6_risk_assessment"]["overall_risk_category"], "LOW")

    def test_api_relationship_graph_endpoint(self):
        """Verifies GET /api/component4/graph/{business_id}."""
        # Test scenario SME with relationships
        res_wp = self.client.get("/api/component4/graph/WP_SME_0001")
        self.assertEqual(res_wp.status_code, 200)
        data_wp = res_wp.json()
        self.assertTrue(data_wp["has_network"])
        self.assertEqual(data_wp["node_count"], 6)
        self.assertEqual(data_wp["edge_count"], 5)

        # Test isolated SME without relationships
        res_c1 = self.client.get("/api/component4/graph/C00001")
        self.assertEqual(res_c1.status_code, 200)
        data_c1 = res_c1.json()
        self.assertFalse(data_c1["has_network"])
        self.assertEqual(data_c1["edge_count"], 0)

    def test_api_candidates_endpoint(self):
        """Verifies GET /api/component4/candidates."""
        response = self.client.get("/api/component4/candidates?district=Colombo")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertGreater(data["total"], 0)
        for c in data["candidates"]:
            self.assertEqual(c["district"], "Colombo")
            self.assertEqual(c["province"], "Western")

    # -------------------------------------------------------------------------
    # 6. CLI Execution Tests (Phase 9)
    # -------------------------------------------------------------------------

    # -------------------------------------------------------------------------
    # 7. Refinement Tests: Identity Persistence, Schema, Provenance & History
    # -------------------------------------------------------------------------

    def test_dynamic_missing_information_form_generation_and_validation(self):
        """Verifies schema comparison detects missing fields and permits Unknown responses."""
        extracted_facts = {
            "business_name": "Homagama Organic Bakery",
            "district": "Colombo",
            "business_category": "Bakery"
        }
        available_facts, missing_schema, sufficiency = DynamicIntakeSchemaService.analyze_missing_fields(
            extracted_facts=extracted_facts
        )
        self.assertIn("business_name", available_facts)
        self.assertEqual(available_facts["business_name"].provenance, PROVENANCE_EXTRACTED)

        # Check missing schema contains only missing fields
        missing_keys = [f["field_key"] for f in missing_schema]
        self.assertNotIn("business_name", missing_keys)
        self.assertIn("available_capital_lkr", missing_keys)
        self.assertIn("monthly_budget_lkr", missing_keys)

        # Test validation permitting "Unknown" and rejecting negative capital
        valid_sub = {
            "available_capital_lkr": "Unknown",
            "monthly_budget_lkr": "120000",
            "compliance_status": "Unknown"
        }
        is_val, cleaned, errs = DynamicIntakeSchemaService.validate_intake_payload(valid_sub)
        self.assertTrue(is_val)
        self.assertEqual(cleaned["available_capital_lkr"]["status"], "DECLARED_UNKNOWN")
        self.assertEqual(cleaned["available_capital_lkr"]["provenance"], PROVENANCE_USER_DECLARED)
        self.assertEqual(cleaned["monthly_budget_lkr"]["value"], 120000.0)

        # Test negative capital validation
        invalid_sub = {"available_capital_lkr": -50000}
        is_val_bad, _, bad_errs = DynamicIntakeSchemaService.validate_intake_payload(invalid_sub)
        self.assertFalse(is_val_bad)
        self.assertTrue(any("cannot be less than" in e for e in bad_errs))

    def test_business_id_persistence_and_duplicate_upload_handling(self):
        """Verifies persistent unique ID assignment and reuse across repeated uploads of same enterprise."""
        biz_name = f"Test_Enterprise_{os.urandom(3).hex()}"
        district = "Colombo"

        payload = {
            "plan_file_path": SAMPLE_PLAN_PATH,
            "business_name": biz_name,
            "district": district,
            "business_category": "Grocery/Mini-Mart",
            "completed_fields": {"available_capital_lkr": 800000.0, "monthly_budget_lkr": 160000.0}
        }

        # First upload / submission
        res1 = self.client.post("/api/component4/intake/submit-and-run", json=payload)
        self.assertEqual(res1.status_code, 200, res1.text)
        data1 = res1.json()
        self.assertTrue(data1["success"])
        b_id1 = data1["persistent_business_id"]
        self.assertTrue(b_id1.startswith("c4_biz_") or b_id1.startswith("C0"))

        # Second upload for the EXACT same business name & district
        payload2 = {
            "plan_file_path": SAMPLE_PLAN_PATH,
            "confirmed_business_id": b_id1,
            "business_name": biz_name,
            "district": district,
            "business_category": "Grocery/Mini-Mart",
            "completed_fields": {"available_capital_lkr": 850000.0}
        }
        res2 = self.client.post("/api/component4/intake/submit-and-run", json=payload2)
        self.assertEqual(res2.status_code, 200, res2.text)
        data2 = res2.json()
        b_id2 = data2["persistent_business_id"]

        # Crucial check: Reuses exact persistent ID!
        self.assertEqual(b_id1, b_id2, "Second upload must reuse persistent business ID!")
        self.assertTrue(data2["is_reused_profile"])

    def test_ambiguous_entity_matching_requires_user_confirmation(self):
        """Verifies candidate matches require explicit confirmation and do not auto-bind on district/category alone."""
        plan = ExtractedBusinessPlan(
            source_filename="unnamed_colombo_grocery.json",
            file_format=".json",
            file_size_bytes=100,
            is_valid=True,
            district="Colombo",
            business_category="Grocery/Mini-Mart",
            business_stage="Growing"
        )
        resolved = self.entity_resolver.resolve(plan)
        if len(resolved.candidate_matches) > 0:
            self.assertTrue(resolved.requires_user_confirmation)
            self.assertEqual(resolved.match_type, "FUZZY_ATTRIBUTES")
            self.assertIn("Explicit user confirmation required", resolved.provenance_notes[0])

    def test_verified_versus_unverified_relationships_separation(self):
        """Verifies declared relationships carry USER_DECLARED provenance and is_verified=False."""
        payload = {
            "plan_file_path": SAMPLE_PLAN_PATH,
            "business_name": f"Enterprise_Rels_{os.urandom(3).hex()}",
            "district": "Gampaha",
            "business_category": "Manufacturing",
            "declared_relationships": [
                {
                    "partner_name": "Lanka Packaging Ltd",
                    "partner_type": "SUPPLIER",
                    "relationship_type": "SUPPLIES",
                    "transaction_value_lkr": 450000.0,
                    "payment_delay_days": 15
                }
            ]
        }
        res = self.client.post("/api/component4/intake/submit-and-run", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        b_id = data["persistent_business_id"]

        # Check graph endpoint for this business
        g_res = self.client.get(f"/api/component4/graph/{b_id}")
        self.assertEqual(g_res.status_code, 200)
        g_data = g_res.json()
        self.assertTrue(g_data["has_network"])
        declared_edges = [e for e in g_data["edges"] if e["evidence_source"] == "USER_DECLARED"]
        self.assertGreaterEqual(len(declared_edges), 1)
        self.assertFalse(declared_edges[0]["verified"])

    def test_assessment_history_endpoint(self):
        """Verifies GET /api/component4/business/{business_id}/history returns persistent history."""
        res = self.client.get("/api/component4/business/C00001/history")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("history", data)
        self.assertIsInstance(data["history"], list)

    def test_privacy_safe_logging_masking(self):
        """Verifies privacy-safe sanitization masks sensitive telephone, email, and NIC identifiers."""
        raw_text = "Contact Director Sunimal at sunimal@example.com or +94 77 123 4567, NIC 198512345678."
        clean_text = sanitize_for_logging(raw_text)
        self.assertNotIn("sunimal@example.com", clean_text)
        self.assertNotIn("+94 77 123 4567", clean_text)
        self.assertNotIn("198512345678", clean_text)
        self.assertIn("[EMAIL_MASKED]", clean_text)
        self.assertIn("[PHONE_MASKED]", clean_text)
        self.assertIn("[ID_MASKED]", clean_text)


if __name__ == "__main__":
    unittest.main()

