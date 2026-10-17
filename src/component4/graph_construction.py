"""
Component 4: Graph Construction and Topology Audit Service
Builds heterogeneous document-entity graphs and homogeneous projected B2B multi-graphs
for Dataset 07 and Dataset 06.
Maintains strict separation between the two collections (no false linkages)
and does NOT link invoice entities to the 1,200 micro-enterprise feasibility records.
Computes comprehensive graph topology metrics and audits GNN experimentation viability.
"""

import os
import sys
import json
from typing import Dict, Any, List, Optional, Tuple
import networkx as nx
import torch
from torch_geometric.data import Data, HeteroData

# Ensure src is on sys.path for direct module import
SRC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from component4.anonymization import (
    AnonymizationManager,
    DATASET_07_ENTITY_REGISTRY,
    DATASET_06_ENTITY_REGISTRY,
)
from component4.invoice_extraction import (
    InvoiceExtractor,
    DEFAULT_OUTPUT_DIR,
)


class InvoiceGraphBuilder:
    """
    Constructs documented graph datasets from extracted invoice/declaration records.
    Supports both NetworkX and PyTorch Geometric formats.
    """

    def __init__(self, processed_dir: str = DEFAULT_OUTPUT_DIR):
        self.processed_dir = processed_dir
        self.anonymizer = AnonymizationManager()

    def build_dataset07_graph(
        self, records: List[Dict[str, Any]]
    ) -> Tuple[nx.MultiDiGraph, nx.MultiDiGraph, HeteroData, Data, Dict[str, Any]]:
        """
        Builds heterogeneous bipartite and projected homogeneous graphs for Dataset 07.
        Topology: Corporate IT service billing between Australian parent and Sri Lankan subsidiary.
        """
        # 1. Heterogeneous Graph (Entities + Documents)
        hetero_g = nx.MultiDiGraph(name="Dataset_07_Heterogeneous_Transaction_Graph")
        
        # Add Entity Nodes
        for k, meta in DATASET_07_ENTITY_REGISTRY.items():
            hetero_g.add_node(
                meta["anonymized_id"],
                node_type="entity",
                role=meta["entity_type"],
                jurisdiction=meta["jurisdiction"],
                description=meta["description"],
            )

        # Add Document Nodes and Bipartite Edges
        projected_g = nx.MultiDiGraph(name="Dataset_07_Projected_B2B_Multigraph")
        for k, meta in DATASET_07_ENTITY_REGISTRY.items():
            projected_g.add_node(
                meta["anonymized_id"],
                node_type="entity",
                role=meta["entity_type"],
                jurisdiction=meta["jurisdiction"],
            )

        valid_dates = []
        valid_amounts = []

        for rec in records:
            doc_id = rec["document_id"]
            # Document Node
            hetero_g.add_node(
                doc_id,
                node_type="document",
                doc_type=rec["document_type"],
                invoice_date=rec["invoice_date"],
                due_date=rec["due_date"],
                currency=rec["currency"],
                total_amount=rec["total_amount"],
                verification_status=rec["verification_status"],
                is_duplicate=rec["is_duplicate"],
                provenance_file_hash=rec["provenance_file_hash"],
                confidence_score=rec["confidence_score"],
            )

            # Bipartite Edges: Issuer -> Document -> Recipient
            edge_weight = float(rec["total_amount"]) if rec["total_amount"] is not None else 1.0
            hetero_g.add_edge(
                rec["issuer_entity_id"],
                doc_id,
                relation="ISSUES",
                timestamp=rec["invoice_date"],
                amount=rec["total_amount"],
                currency=rec["currency"],
                confidence=rec["confidence_score"],
            )
            hetero_g.add_edge(
                doc_id,
                rec["recipient_entity_id"],
                relation="BILLED_TO",
                timestamp=rec["invoice_date"],
                amount=rec["total_amount"],
                currency=rec["currency"],
                confidence=rec["confidence_score"],
            )

            # Direct Projected Multi-Edge: Issuer -> Recipient
            projected_g.add_edge(
                rec["issuer_entity_id"],
                rec["recipient_entity_id"],
                relation="TRANSACTED_WITH",
                document_id=doc_id,
                timestamp=rec["invoice_date"],
                amount=rec["total_amount"],
                currency=rec["currency"],
                is_duplicate=rec["is_duplicate"],
                verification_status=rec["verification_status"],
            )

            if rec["invoice_date"]:
                valid_dates.append(rec["invoice_date"])
            if rec["total_amount"]:
                valid_amounts.append(rec["total_amount"])

        # PyG HeteroData Conversion
        pyg_hetero = HeteroData()
        entity_map = {meta["anonymized_id"]: i for i, meta in enumerate(DATASET_07_ENTITY_REGISTRY.values())}
        doc_map = {rec["document_id"]: i for i, rec in enumerate(records)}

        # Entity node features: [is_supplier, is_client, is_AU, is_LK]
        entity_x = torch.tensor([
            [1.0, 0.0, 1.0, 0.0],  # Parent (AU)
            [0.0, 1.0, 0.0, 1.0],  # Subsidiary (LK)
        ], dtype=torch.float)
        pyg_hetero["entity"].x = entity_x
        pyg_hetero["entity"].num_nodes = len(entity_map)

        # Document node features: [norm_amount, is_complete, confidence, is_LKR, is_AUD]
        doc_feats = []
        max_amt = max(valid_amounts) if valid_amounts else 1.0
        for rec in records:
            amt_norm = (rec["total_amount"] or 0.0) / max_amt
            is_comp = 1.0 if rec["verification_status"] == "VERIFIED_COMPLETE" else 0.0
            conf = float(rec["confidence_score"])
            is_lkr = 1.0 if rec["currency"] == "LKR" else 0.0
            is_aud = 1.0 if rec["currency"] == "AUD" else 0.0
            doc_feats.append([amt_norm, is_comp, conf, is_lkr, is_aud])

        pyg_hetero["document"].x = torch.tensor(doc_feats, dtype=torch.float)
        pyg_hetero["document"].num_nodes = len(records)

        # Edges
        issues_src = [entity_map[rec["issuer_entity_id"]] for rec in records]
        issues_dst = [doc_map[rec["document_id"]] for rec in records]
        pyg_hetero["entity", "issues", "document"].edge_index = torch.tensor(
            [issues_src, issues_dst], dtype=torch.long
        )

        billed_src = [doc_map[rec["document_id"]] for rec in records]
        billed_dst = [entity_map[rec["recipient_entity_id"]] for rec in records]
        pyg_hetero["document", "billed_to", "entity"].edge_index = torch.tensor(
            [billed_src, billed_dst], dtype=torch.long
        )

        # PyG Homogeneous Projected Data (2 nodes, 70 temporal edges)
        proj_edge_src = [entity_map[rec["issuer_entity_id"]] for rec in records]
        proj_edge_dst = [entity_map[rec["recipient_entity_id"]] for rec in records]
        pyg_proj = Data(
            x=entity_x,
            edge_index=torch.tensor([proj_edge_src, proj_edge_dst], dtype=torch.long),
            edge_attr=torch.tensor(doc_feats, dtype=torch.float),
        )

        # Graph Metrics
        metrics = {
            "dataset": "Dataset_07",
            "graph_type": "Heterogeneous Bipartite & Homogeneous Projected Multigraph",
            "entity_nodes_count": len(DATASET_07_ENTITY_REGISTRY),
            "document_nodes_count": len(records),
            "total_nodes_hetero": hetero_g.number_of_nodes(),
            "total_edges_hetero": hetero_g.number_of_edges(),
            "projected_nodes_count": projected_g.number_of_nodes(),
            "projected_edges_count": projected_g.number_of_edges(),
            "unique_entity_dyads": 1,
            "connected_components_hetero": nx.number_weakly_connected_components(hetero_g),
            "temporal_coverage": {
                "earliest_date": min(valid_dates) if valid_dates else None,
                "latest_date": max(valid_dates) if valid_dates else None,
                "total_valid_dates": len(valid_dates),
            },
            "financial_summary": {
                "currencies": sorted(list({r["currency"] for r in records if r["currency"]})),
                "total_volume_lkr": sum(r["total_amount"] for r in records if r["currency"] == "LKR" and r["total_amount"]),
                "total_volume_aud": sum(r["total_amount"] for r in records if r["currency"] == "AUD" and r["total_amount"]),
            },
            "gnn_experimentation_feasibility": {
                "is_suitable_for_deep_gnn": False,
                "topological_classification": "Dyadic Single-Pair Temporal Multigraph",
                "reasons": [
                    "Only 2 distinct business entities exist in the entire graph (AU parent and LK subsidiary).",
                    "No multi-hop structural paths (triangles, cycles, multi-tier supply chains) exist.",
                    "Message-passing over 2 nodes trivially degenerates into pairwise 1-step ping-pong.",
                    "All documents represent authorized normal corporate billing; zero financial distress or default labels exist.",
                ],
            },
        }

        return hetero_g, projected_g, pyg_hetero, pyg_proj, metrics

    def build_dataset06_graph(
        self, records: List[Dict[str, Any]]
    ) -> Tuple[nx.MultiDiGraph, nx.MultiDiGraph, HeteroData, Data, Dict[str, Any]]:
        """
        Builds heterogeneous bipartite and projected homogeneous graphs for Dataset 06.
        Topology: Horticultural export trade star graph (1 Sri Lankan exporter -> 7 international buyers + 2 declarants).
        """
        hetero_g = nx.MultiDiGraph(name="Dataset_06_Heterogeneous_Customs_Graph")
        projected_g = nx.MultiDiGraph(name="Dataset_06_Projected_Trade_Multigraph")

        # Add Entity Nodes
        for k, meta in DATASET_06_ENTITY_REGISTRY.items():
            hetero_g.add_node(
                meta["anonymized_id"],
                node_type="entity",
                role=meta["entity_type"],
                jurisdiction=meta["jurisdiction"],
                description=meta["description"],
            )
            projected_g.add_node(
                meta["anonymized_id"],
                node_type="entity",
                role=meta["entity_type"],
                jurisdiction=meta["jurisdiction"],
            )

        valid_dates = []
        valid_amounts = []

        for rec in records:
            doc_id = rec["document_id"]
            # Document Node
            hetero_g.add_node(
                doc_id,
                node_type="document",
                doc_type=rec["document_type"],
                invoice_date=rec["invoice_date"],
                due_date=rec["due_date"],
                currency=rec["currency"],
                total_amount=rec["total_amount"],
                verification_status=rec["verification_status"],
                is_duplicate=rec["is_duplicate"],
                provenance_file_hash=rec["provenance_file_hash"],
                confidence_score=rec["confidence_score"],
            )

            # Bipartite Edges: Exporter -> Document -> Consignee
            hetero_g.add_edge(
                rec["issuer_entity_id"],
                doc_id,
                relation="EXPORTS",
                timestamp=rec["invoice_date"],
                amount=rec["total_amount"],
                currency=rec["currency"],
                confidence=rec["confidence_score"],
            )
            hetero_g.add_edge(
                doc_id,
                rec["recipient_entity_id"],
                relation="CONSIGNED_TO",
                timestamp=rec["invoice_date"],
                amount=rec["total_amount"],
                currency=rec["currency"],
                confidence=rec["confidence_score"],
            )

            # Declarant edge if present
            if rec.get("declarant_entity_id"):
                hetero_g.add_edge(
                    rec["declarant_entity_id"],
                    doc_id,
                    relation="DECLARES",
                    timestamp=rec["invoice_date"],
                    confidence=rec["confidence_score"],
                )

            # Direct Projected Multi-Edge: Exporter -> Consignee
            projected_g.add_edge(
                rec["issuer_entity_id"],
                rec["recipient_entity_id"],
                relation="SHIPPED_TO",
                document_id=doc_id,
                timestamp=rec["invoice_date"],
                amount=rec["total_amount"],
                currency=rec["currency"],
                verification_status=rec["verification_status"],
                is_duplicate=rec["is_duplicate"],
            )

            if rec["invoice_date"]:
                valid_dates.append(rec["invoice_date"])
            if rec["total_amount"]:
                valid_amounts.append(rec["total_amount"])

        # PyG HeteroData Conversion
        pyg_hetero = HeteroData()
        entity_map = {meta["anonymized_id"]: i for i, meta in enumerate(DATASET_06_ENTITY_REGISTRY.values())}
        doc_map = {rec["document_id"]: i for i, rec in enumerate(records)}

        # Entity node features: One-hot encoded entity index
        num_entities = len(entity_map)
        pyg_hetero["entity"].x = torch.eye(num_entities, dtype=torch.float)
        pyg_hetero["entity"].num_nodes = num_entities

        # Document node features: [norm_amount, is_scanned, is_complete, confidence]
        doc_feats = []
        max_amt = max(valid_amounts) if valid_amounts else 1.0
        for rec in records:
            amt_norm = (rec["total_amount"] or 0.0) / max_amt
            is_scan = 1.0 if rec["verification_status"] == "UNVERIFIED_SCANNED" else 0.0
            is_comp = 1.0 if rec["verification_status"] == "VERIFIED_COMPLETE" else 0.0
            conf = float(rec["confidence_score"])
            doc_feats.append([amt_norm, is_scan, is_comp, conf])

        pyg_hetero["document"].x = torch.tensor(doc_feats, dtype=torch.float)
        pyg_hetero["document"].num_nodes = len(records)

        # Edges
        exp_src = [entity_map[rec["issuer_entity_id"]] for rec in records]
        exp_dst = [doc_map[rec["document_id"]] for rec in records]
        pyg_hetero["entity", "exports", "document"].edge_index = torch.tensor(
            [exp_src, exp_dst], dtype=torch.long
        )

        con_src = [doc_map[rec["document_id"]] for rec in records]
        con_dst = [entity_map[rec["recipient_entity_id"]] for rec in records]
        pyg_hetero["document", "consigned_to", "entity"].edge_index = torch.tensor(
            [con_src, con_dst], dtype=torch.long
        )

        # PyG Homogeneous Projected Data
        proj_src = [entity_map[rec["issuer_entity_id"]] for rec in records]
        proj_dst = [entity_map[rec["recipient_entity_id"]] for rec in records]
        pyg_proj = Data(
            x=torch.eye(num_entities, dtype=torch.float),
            edge_index=torch.tensor([proj_src, proj_dst], dtype=torch.long),
            edge_attr=torch.tensor(doc_feats, dtype=torch.float),
        )

        # Graph Metrics
        projected_pairs = set(zip(proj_src, proj_dst))
        metrics = {
            "dataset": "Dataset_06",
            "graph_type": "Heterogeneous Customs Graph & Homogeneous Projected Trade Star Graph",
            "entity_nodes_count": len(DATASET_06_ENTITY_REGISTRY),
            "document_nodes_count": len(records),
            "total_nodes_hetero": hetero_g.number_of_nodes(),
            "total_edges_hetero": hetero_g.number_of_edges(),
            "projected_nodes_count": projected_g.number_of_nodes(),
            "projected_edges_count": projected_g.number_of_edges(),
            "unique_entity_dyads": len(projected_pairs),
            "connected_components_hetero": nx.number_weakly_connected_components(hetero_g),
            "temporal_coverage": {
                "earliest_date": min(valid_dates) if valid_dates else None,
                "latest_date": max(valid_dates) if valid_dates else None,
                "total_valid_dates": len(valid_dates),
            },
            "document_status_breakdown": {
                "verified_complete": sum(1 for r in records if r["verification_status"] == "VERIFIED_COMPLETE"),
                "verified_partial": sum(1 for r in records if r["verification_status"] == "VERIFIED_PARTIAL"),
                "unverified_scanned": sum(1 for r in records if r["verification_status"] == "UNVERIFIED_SCANNED"),
                "duplicate_omitted": sum(1 for r in records if r["verification_status"] == "DUPLICATE_OMITTED"),
            },
            "gnn_experimentation_feasibility": {
                "is_suitable_for_deep_gnn": False,
                "topological_classification": "Radial Star Graph with Single Hub Exporter",
                "reasons": [
                    "A single central exporter connects radially to ~7 international buyers; no buyer-to-buyer edges exist.",
                    "No multi-tier supplier network (tier-2, tier-3 suppliers) is present.",
                    "118 of 171 PDFs are unindexed image scans with no verifiable transactional amounts.",
                    "All records represent legitimate customs declarations; no ground-truth business risk or default labels exist.",
                ],
            },
        }

        return hetero_g, projected_g, pyg_hetero, pyg_proj, metrics

    def save_graphs_and_metrics(
        self,
        d07_records: List[Dict[str, Any]],
        d06_records: List[Dict[str, Any]],
        output_dir: str = DEFAULT_OUTPUT_DIR,
    ) -> Dict[str, Any]:
        """
        Builds, validates, and serializes all graph artifacts and audit metrics.
        Guarantees strict separation between Dataset 07 and Dataset 06.
        """
        os.makedirs(output_dir, exist_ok=True)

        d07_het, d07_proj, d07_pyg_het, d07_pyg_proj, d07_metrics = self.build_dataset07_graph(d07_records)
        d06_het, d06_proj, d06_pyg_het, d06_pyg_proj, d06_metrics = self.build_dataset06_graph(d06_records)

        # Verify PII cleanliness on all graph metadata
        self.anonymizer.assert_no_pii(d07_metrics)
        self.anonymizer.assert_no_pii(d06_metrics)

        # 1. Save NetworkX Node-Link JSONs
        d07_het_json = os.path.join(output_dir, "dataset07_graph_hetero.json")
        with open(d07_het_json, "w", encoding="utf-8") as f:
            json.dump(nx.node_link_data(d07_het), f, indent=2)

        d07_proj_json = os.path.join(output_dir, "dataset07_graph_projected.json")
        with open(d07_proj_json, "w", encoding="utf-8") as f:
            json.dump(nx.node_link_data(d07_proj), f, indent=2)

        d06_het_json = os.path.join(output_dir, "dataset06_graph_hetero.json")
        with open(d06_het_json, "w", encoding="utf-8") as f:
            json.dump(nx.node_link_data(d06_het), f, indent=2)

        d06_proj_json = os.path.join(output_dir, "dataset06_graph_projected.json")
        with open(d06_proj_json, "w", encoding="utf-8") as f:
            json.dump(nx.node_link_data(d06_proj), f, indent=2)

        # 2. Save PyTorch Geometric Artifacts (.pt)
        torch.save(d07_pyg_het, os.path.join(output_dir, "dataset07_pyg_hetero.pt"))
        torch.save(d07_pyg_proj, os.path.join(output_dir, "dataset07_pyg_projected.pt"))
        torch.save(d06_pyg_het, os.path.join(output_dir, "dataset06_pyg_hetero.pt"))
        torch.save(d06_pyg_proj, os.path.join(output_dir, "dataset06_pyg_projected.pt"))

        # 3. Save Summary Graph Audit Metrics
        combined_metrics = {
            "dataset_07": d07_metrics,
            "dataset_06": d06_metrics,
            "comparative_analysis": {
                "datasets_are_independent": True,
                "dataset_linkage_established": False,
                "feasibility_records_linkage_established": False,
                "overall_gnn_readiness": "INSUFFICIENT_FOR_SUPERVISED_DEEP_GNN_TRAINING",
                "recommended_next_stage_experimental_design": (
                    "Stage 4 should deploy a controlled synthetic multi-tier supply chain scenario "
                    "(e.g., 50-200 nodes with cascading default propagation) for rigorous GNN benchmarking, "
                    "supplemented by a rule-based transaction anomaly detector on the real invoice graphs."
                ),
            },
        }

        metrics_path = os.path.join(output_dir, "stage3_graph_metrics.json")
        with open(metrics_path, "w", encoding="utf-8") as f:
            json.dump(combined_metrics, f, indent=2)

        # Also copy to reports/component4/stage3_graph_metrics.json
        report_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "reports", "component4"))
        os.makedirs(report_dir, exist_ok=True)
        report_metrics_path = os.path.join(report_dir, "stage3_graph_metrics.json")
        with open(report_metrics_path, "w", encoding="utf-8") as f:
            json.dump(combined_metrics, f, indent=2)

        return combined_metrics


if __name__ == "__main__":
    extractor = InvoiceExtractor()
    d07_recs = extractor.extract_dataset07()
    d06_recs = extractor.extract_dataset06()

    builder = InvoiceGraphBuilder()
    graph_metrics = builder.save_graphs_and_metrics(d07_recs, d06_recs)
    print("Graph construction and serialization completed successfully!")
    print(f"Dataset 07 Hetero Nodes: {graph_metrics['dataset_07']['total_nodes_hetero']}, Edges: {graph_metrics['dataset_07']['total_edges_hetero']}")
    print(f"Dataset 06 Hetero Nodes: {graph_metrics['dataset_06']['total_nodes_hetero']}, Edges: {graph_metrics['dataset_06']['total_edges_hetero']}")
