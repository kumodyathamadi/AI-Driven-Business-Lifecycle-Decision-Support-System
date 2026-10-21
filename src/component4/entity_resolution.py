"""
Component 4: Phase 3 & 4 — Business Entity Resolution and Relationship Retrieval Service.
Resolves uploaded business plans to verified business entities and retrieves verified relationship evidence.
Strictly adheres to:
1. Western Province Geographic Boundary (Colombo, Gampaha, Kalutara).
2. Zero Fabricated Edges: No artificial graph links between feasibility cases, real invoices, and simulated SMEs.
3. Provenance Tracking: Explicitly categorizes source data (OBSERVED_SOURCE, DOCUMENT_DERIVED, SIMULATED_SCENARIO, USER_UPLOAD).
4. Ambiguity Resolution: Presents multiple candidate matches requiring explicit user confirmation.
"""

import os
import sys
import re
import sqlite3
import pandas as pd
from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List, Optional, Tuple, Set

SRC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from component4.business_plan_ingestion import ExtractedBusinessPlan

DEFAULT_NEW_DATASET_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "Component4_Dataset", "Component4_Datasets")
)
DEFAULT_PROCESSED_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "processed", "component4")
)
DEFAULT_RAW_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw")
)
DEFAULT_DB_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "component_1.db")
)

WESTERN_PROVINCE_DISTRICTS = {"Colombo", "Gampaha", "Kalutara"}


@dataclass
class BusinessRelationshipEvidence:
    """Represents a relationship edge connecting a business to suppliers, customers, or lenders."""
    source_id: str
    target_id: str
    relationship_type: str  # BUYS_FROM, SELLS_TO, SUPPLIES_TO, CUSTOMER_OF, SHARED_LOGISTICS
    role: str               # SUPPLIER, CUSTOMER, LENDER, PARTNER
    partner_id: str
    transaction_count: Optional[int] = None
    transaction_value_lkr: Optional[float] = None
    dependency_percentage: Optional[float] = None
    relationship_duration_months: Optional[int] = None
    payment_delay_days: Optional[float] = None
    disruption_status: str = "BASELINE"
    is_verified: bool = False
    evidence_source: str = "SIMULATED_SCENARIO"  # OBSERVED_SOURCE, DOCUMENT_DERIVED, SIMULATED_SCENARIO, USER_DECLARED

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ResolvedBusinessEntity:
    """Complete entity resolution result including verified relationships and provenance."""
    entity_id: str = ""
    business_name: str = ""
    district: str = ""
    province: str = ""
    business_category: str = ""
    business_stage: str = ""
    is_within_geographic_scope: bool = True
    geographic_scope_status: str = "IN_SCOPE"  # IN_SCOPE, OUT_OF_SCOPE, UNKNOWN_LOCATION
    data_origin: str = "USER_UPLOAD"              # OBSERVED_SOURCE, DOCUMENT_DERIVED, SIMULATED_SCENARIO, USER_UPLOAD
    match_type: str = "EXACT_ID"               # EXACT_ID, FUZZY_ATTRIBUTES, USER_CONFIRMED, UNLINKED_NEW
    match_confidence: float = 1.0
    candidate_matches: List[Dict[str, Any]] = field(default_factory=list)
    requires_user_confirmation: bool = False
    
    # Financial & Operational Snapshot
    financial_snapshot: Dict[str, Any] = field(default_factory=dict)
    
    # Verified Relationships
    verified_relationships: List[BusinessRelationshipEvidence] = field(default_factory=list)
    unverified_relationships_count: int = 0
    supplier_count: int = 0
    customer_count: int = 0
    lender_count: int = 0
    has_relationship_network: bool = False
    
    # Tracking & Compatibility fields
    registration_number: Optional[str] = None
    matched_business_id: Optional[str] = None
    resolution_method: Optional[str] = None
    is_verified: bool = False
    provenance_notes: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["verified_relationships"] = [r.to_dict() for r in self.verified_relationships]
        return d


class BusinessEntityResolver:
    """Resolves extracted business plans to verified datasets and retrieves relationships."""

    def __init__(
        self,
        processed_dir: str = DEFAULT_PROCESSED_DIR,
        raw_dir: str = DEFAULT_RAW_DIR,
        dataset_dir: str = DEFAULT_NEW_DATASET_DIR,
        db_path: str = DEFAULT_DB_PATH
    ):
        self.processed_dir = processed_dir
        self.raw_dir = raw_dir
        self.dataset_dir = dataset_dir
        self.db_path = db_path
        self._load_datasets()

    def _resolve_file(self, filename: str) -> Optional[str]:
        for d in [self.dataset_dir, self.processed_dir]:
            p = os.path.join(d, filename)
            if os.path.exists(p):
                return p
        return None

    def _load_datasets(self):
        """Loads reference datasets for resolution."""
        # 1. Component 4 SME Profiles (Business_Profile.csv)
        self.profiles_df = None
        prof_path = self._resolve_file("Business_Profile.csv") or self._resolve_file("business_profiles.csv")
        if prof_path and os.path.exists(prof_path):
            try:
                self.profiles_df = pd.read_csv(prof_path)
            except Exception:
                pass

        # 2. Component 4 B2B Relationships (Business_Relationships.csv)
        self.relationships_df = None
        rel_path = self._resolve_file("Business_Relationships.csv") or self._resolve_file("business_relationships.csv")
        if rel_path and os.path.exists(rel_path):
            try:
                self.relationships_df = pd.read_csv(rel_path)
            except Exception:
                pass

        # 3. Component 1 Core Feasibility Cases
        self.feasibility_df = None
        feas_path = os.path.join(self.raw_dir, "Component_One_Core_Feasibility.csv")
        if os.path.exists(feas_path):
            try:
                self.feasibility_df = pd.read_csv(feas_path)
            except Exception:
                pass

    def resolve(
        self,
        plan: ExtractedBusinessPlan,
        confirmed_business_id: Optional[str] = None
    ) -> ResolvedBusinessEntity:
        """Resolves business identity, validates Western Province scope, and retrieves relationships."""
        notes = []

        # 1. Geographic scope check
        district = plan.district
        is_in_scope = bool(district and district in WESTERN_PROVINCE_DISTRICTS)
        if not district:
            scope_status = "UNKNOWN_LOCATION"
            notes.append("Business location/district is missing. Marked as UNKNOWN_LOCATION.")
        elif district not in WESTERN_PROVINCE_DISTRICTS:
            scope_status = "OUT_OF_SCOPE"
            notes.append(f"District '{district}' is outside Western Province research scope.")
        else:
            scope_status = "IN_SCOPE"

        # 2. Determine target business ID
        target_id = confirmed_business_id or plan.business_identifier

        # If user explicitly confirmed an ID:
        if target_id:
            resolved = self._resolve_by_explicit_id(target_id, plan, is_in_scope, scope_status, notes)
            if resolved:
                return resolved

        # Try to infer ID from plan metadata/filename (e.g. C00001, SLWP00001, WP_SME_0001)
        inferred_id = self._infer_id_from_metadata(plan)
        if inferred_id:
            resolved = self._resolve_by_explicit_id(inferred_id, plan, is_in_scope, scope_status, notes)
            if resolved:
                return resolved

        # 3. Candidate Matching & Persistent Entity ID Generation
        clean_name = plan.business_name or f"{plan.district or 'Western'} {plan.business_category or 'SME'}"
        synthetic_id = f"c4_biz_{abs(hash(clean_name)) % 1000000:06d}"

        candidates = self._find_candidate_matches(plan)
        if len(candidates) > 0:
            notes.append(
                f"Identified {len(candidates)} potential entity candidate(s) by district/category. "
                "Explicit user confirmation required (district, sector, or approximate names alone are never used for automatic binding)."
            )
            match_type = "AMBIGUOUS_CANDIDATES"
            confidence = candidates[0]["match_score"]
            requires_conf = True
        else:
            notes.append("No matching existing entity found. Created isolated business entity without fabricated edges.")
            match_type = "UNLINKED_NEW"
            confidence = 1.0 if is_in_scope else 0.5
            requires_conf = False

        return self._build_resolved_entity(
            entity_id=synthetic_id,
            business_name=clean_name,
            district=plan.district or "Unknown",
            province=plan.province or ("Western" if is_in_scope else "Unknown"),
            category=plan.business_category or "Unspecified",
            stage=plan.business_stage or "New",
            is_in_scope=is_in_scope,
            scope_status=scope_status,
            data_origin="USER_UPLOAD",
            match_type=match_type,
            confidence=confidence,
            plan=plan,
            candidates=candidates,
            requires_confirmation=requires_conf,
            notes=notes,
            resolution_method="NEW_PERSISTENT_ENTITY"
        )

    def _infer_id_from_metadata(self, plan: ExtractedBusinessPlan) -> Optional[str]:
        """Infers known case_id from filename or sections (e.g. C00001, SLWP00001, WP_SME_0001)."""
        fn = plan.source_filename
        m_slwp = re.search(r"(?:^|[^a-zA-Z0-9])(SLWP\d{5})(?:$|[^a-zA-Z0-9])", fn, re.IGNORECASE)
        if m_slwp:
            return m_slwp.group(1).upper()

        m_case = re.search(r"(?:^|[^a-zA-Z0-9])(C\d{5})(?:$|[^a-zA-Z0-9])", fn, re.IGNORECASE)
        if m_case:
            return m_case.group(1).upper()

        m_wp = re.search(r"(?:^|[^a-zA-Z0-9])(WP_SME_\d{4})(?:$|[^a-zA-Z0-9])", fn, re.IGNORECASE)
        if m_wp:
            return m_wp.group(1).upper()

        # Check in source sections
        for sec_name, content in plan.source_sections.items():
            m = re.search(r"(?:^|[^a-zA-Z0-9])(SLWP\d{5})(?:$|[^a-zA-Z0-9])", content, re.IGNORECASE)
            if m:
                return m.group(1).upper()
            m2 = re.search(r"(?:^|[^a-zA-Z0-9])(C\d{5})(?:$|[^a-zA-Z0-9])", content, re.IGNORECASE)
            if m2:
                return m2.group(1).upper()
            m3 = re.search(r"(?:^|[^a-zA-Z0-9])(WP_SME_\d{4})(?:$|[^a-zA-Z0-9])", content, re.IGNORECASE)
            if m3:
                return m3.group(1).upper()

        return None

    def _resolve_by_explicit_id(
        self,
        entity_id: str,
        plan: ExtractedBusinessPlan,
        is_in_scope: bool,
        scope_status: str,
        notes: List[str]
    ) -> Optional[ResolvedBusinessEntity]:
        """Checks reference datasets for exact match on entity_id."""
        clean_id = entity_id.strip()

        # Backward compatibility mapping: WP_SME_0001 -> SLWP00001
        target_lookup = clean_id
        if clean_id.upper().startswith("WP_SME_"):
            try:
                num = int(clean_id.split("_")[-1])
                target_lookup = f"SLWP{num:05d}"
            except Exception:
                pass

        # 1. Check Component 4 scenario profiles (SLWP00001 - SLWP01000)
        if self.profiles_df is not None and not self.profiles_df.empty:
            id_col = "Business_ID" if "Business_ID" in self.profiles_df.columns else "business_id"
            match = self.profiles_df[
                (self.profiles_df[id_col].astype(str).str.upper() == clean_id.upper()) |
                (self.profiles_df[id_col].astype(str).str.upper() == target_lookup.upper())
            ]
            if not match.empty:
                row = match.iloc[0]
                matched_id = str(row[id_col])
                district = str(row.get("District", row.get("district", "Colombo")))
                province = str(row.get("Province", row.get("province", "Western")))
                cat = str(row.get("Business_Sector", row.get("business_category", "SME")))
                stage = str(row.get("Business_Stage", row.get("business_stage", "Established")))
                notes.append(f"Resolved via exact match to Scenario SME Profile '{matched_id}'.")
                return self._build_resolved_entity(
                    entity_id=clean_id,  # Preserve requested ID
                    business_name=plan.business_name or f"{district} {cat} ({matched_id})",
                    district=district,
                    province=province,
                    category=cat,
                    stage=stage,
                    is_in_scope=is_in_scope,
                    scope_status=scope_status,
                    data_origin="SIMULATED_SCENARIO",
                    match_type="EXACT_ID",
                    confidence=1.0,
                    plan=plan,
                    candidates=[],
                    requires_confirmation=False,
                    notes=notes
                )

        # 2. Check Feasibility cases (C00001 ... C01200)
        if self.feasibility_df is not None and not self.feasibility_df.empty:
            match_f = self.feasibility_df[self.feasibility_df["case_id"].astype(str).str.upper() == clean_id.upper()]
            if not match_f.empty:
                row = match_f.iloc[0]
                notes.append(f"Resolved via exact match to Component 1 Core Feasibility Case '{clean_id}'.")
                return self._build_resolved_entity(
                    entity_id=str(row["case_id"]),
                    business_name=plan.business_name or f"{row['district']} {row['business_category']} ({row['case_id']})",
                    district=str(row["district"]),
                    province=str(row["province"]),
                    category=str(row["business_category"]),
                    stage=str(row["business_stage"]),
                    is_in_scope=is_in_scope,
                    scope_status=scope_status,
                    data_origin="OBSERVED_SOURCE",
                    match_type="EXACT_ID",
                    confidence=1.0,
                    plan=plan,
                    candidates=[],
                    requires_confirmation=False,
                    notes=notes,
                    is_verified=True
                )

        # 3. Check persistent SQLite database
        if os.path.exists(self.db_path):
            try:
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, business_name, district, province, business_category, business_stage, is_verified, source_origin
                    FROM component4_businesses
                    WHERE id = ? OR UPPER(id) = UPPER(?)
                """, (clean_id, clean_id))
                row = cursor.fetchone()
                conn.close()
                if row:
                    notes.append(f"Resolved via exact match to persistent database profile '{row[0]}'.")
                    return self._build_resolved_entity(
                        entity_id=str(row[0]),
                        business_name=plan.business_name or str(row[1]),
                        district=str(row[2] or "Colombo"),
                        province=str(row[3] or "Western"),
                        category=str(row[4] or "SME"),
                        stage=str(row[5] or "Operating"),
                        is_in_scope=is_in_scope,
                        scope_status=scope_status,
                        data_origin=str(row[7] or "REGISTERED"),
                        match_type="EXACT_ID",
                        confidence=1.0,
                        plan=plan,
                        candidates=[],
                        requires_confirmation=False,
                        notes=notes,
                        is_verified=bool(row[6])
                    )
            except Exception:
                pass

        return None

    def _find_candidate_matches(self, plan: ExtractedBusinessPlan) -> List[Dict[str, Any]]:
        """Finds potential matching entities in scenario profiles based on categorical/geographic overlap."""
        candidates = []
        if self.profiles_df is None or self.profiles_df.empty:
            return candidates

        p_dist = (plan.district or "").lower()
        p_cat = (plan.business_category or "").lower()
        p_stage = (plan.business_stage or "").lower()

        id_col = "Business_ID" if "Business_ID" in self.profiles_df.columns else "business_id"
        dist_col = "District" if "District" in self.profiles_df.columns else "district"
        cat_col = "Business_Sector" if "Business_Sector" in self.profiles_df.columns else "business_category"
        stage_col = "Business_Stage" if "Business_Stage" in self.profiles_df.columns else "business_stage"
        emp_col = "Employee_Count" if "Employee_Count" in self.profiles_df.columns else "employee_count"

        for _, row in self.profiles_df.iterrows():
            score = 0.0
            r_dist = str(row[dist_col]).lower()
            r_cat = str(row[cat_col]).lower()
            r_stage = str(row[stage_col]).lower()

            if p_dist and p_dist == r_dist:
                score += 0.40
            if p_cat and (p_cat in r_cat or r_cat in p_cat):
                score += 0.40
            if p_stage and p_stage == r_stage:
                score += 0.20

            if score >= 0.60:
                candidates.append({
                    "entity_id": str(row[id_col]),
                    "district": str(row[dist_col]),
                    "business_category": str(row[cat_col]),
                    "business_stage": str(row[stage_col]),
                    "employee_count": int(row[emp_col]) if pd.notna(row.get(emp_col)) else 1,
                    "match_score": round(score, 2),
                    "data_origin": "SIMULATED_SCENARIO"
                })

        candidates.sort(key=lambda x: x["match_score"], reverse=True)
        return candidates[:5]

    def _build_resolved_entity(
        self,
        entity_id: str,
        business_name: str,
        district: str,
        province: str,
        category: str,
        stage: str,
        is_in_scope: bool,
        scope_status: str,
        data_origin: str,
        match_type: str,
        confidence: float,
        plan: ExtractedBusinessPlan,
        candidates: List[Dict[str, Any]],
        requires_confirmation: bool,
        notes: List[str],
        resolution_method: Optional[str] = None,
        is_verified: bool = False
    ) -> ResolvedBusinessEntity:
        verified_rels = self._retrieve_relationships(entity_id, data_origin)
        
        suppliers = [r for r in verified_rels if r.role == "SUPPLIER"]
        customers = [r for r in verified_rels if r.role == "CUSTOMER"]
        lenders = [r for r in verified_rels if r.role == "LENDER"]

        fin_snapshot = {
            "available_capital_lkr": plan.available_capital_lkr,
            "monthly_budget_lkr": plan.monthly_budget_lkr,
            "requested_loan_lkr": plan.requested_loan_lkr,
            "initial_inventory_cost_lkr": plan.initial_inventory_cost_lkr,
            "expected_price_lkr": plan.expected_price_lkr,
            "expected_customers_per_day": plan.expected_customers_per_day,
            "capital_runway_months": plan.capital_runway_months,
            "available_staff_count": plan.available_staff_count,
            "required_staff_count": plan.required_staff_count,
            "supplier_availability_score": plan.supplier_availability_score,
            "customer_demand_score": plan.customer_demand_score,
            "proposed_growth_action": plan.proposed_growth_action,
            "primary_strategy": plan.primary_strategy
        }

        is_entity_verified = is_verified or (match_type == "EXACT_ID" and data_origin in ("OBSERVED_SOURCE", "REGISTERED"))

        return ResolvedBusinessEntity(
            entity_id=entity_id,
            business_name=business_name,
            district=district,
            province=province,
            business_category=category,
            business_stage=stage,
            is_within_geographic_scope=is_in_scope,
            geographic_scope_status=scope_status,
            data_origin=data_origin,
            match_type=match_type,
            match_confidence=confidence,
            candidate_matches=candidates,
            requires_user_confirmation=requires_confirmation,
            financial_snapshot=fin_snapshot,
            verified_relationships=verified_rels,
            unverified_relationships_count=len([r for r in verified_rels if not r.is_verified]),
            supplier_count=len(suppliers),
            customer_count=len(customers),
            lender_count=len(lenders),
            has_relationship_network=len(verified_rels) > 0,
            resolution_method=resolution_method or match_type,
            is_verified=is_entity_verified,
            provenance_notes=notes
        )

    def _retrieve_relationships(
        self,
        entity_id: str,
        data_origin: str
    ) -> List[BusinessRelationshipEvidence]:
        """
        Retrieves relationship evidence strictly for known scenario or registered persistent entities.
        Zero artificial edges are fabricated.
        """
        relationships = []

        # 1. Query persistent SQLite component4_relationships table if present
        if os.path.exists(self.db_path):
            try:
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='component4_relationships'")
                if cursor.fetchone():
                    cursor.execute("""
                        SELECT partner_name, partner_type, relationship_type, provenance_category,
                               transaction_value_lkr, dependency_percentage, payment_delay_days,
                               relationship_duration_months, is_verified, verification_notes
                        FROM component4_relationships
                        WHERE business_id = ?
                    """, (entity_id,))
                    for row in cursor.fetchall():
                        p_name = str(row[0])
                        p_type = str(row[1]).upper()
                        r_type = str(row[2]).upper()
                        prov_cat = str(row[3]) if row[3] else "USER_DECLARED"
                        tx_val = float(row[4]) if row[4] is not None else None
                        dep_pct = float(row[5]) if row[5] is not None else None
                        delay = float(row[6]) if row[6] is not None else None
                        dur = int(row[7]) if row[7] is not None else None
                        verified = bool(row[8])

                        role = "SUPPLIER" if "SUPPLI" in r_type or p_type == "SUPPLIER" else (
                            "CUSTOMER" if "SELL" in r_type or p_type == "CUSTOMER" else (
                                "LENDER" if "BORROW" in r_type or p_type == "LENDER" else "PARTNER"
                            )
                        )
                        src_id = p_name if role == "SUPPLIER" else entity_id
                        tgt_id = entity_id if role == "SUPPLIER" else p_name

                        relationships.append(
                            BusinessRelationshipEvidence(
                                source_id=src_id,
                                target_id=tgt_id,
                                relationship_type=r_type,
                                role=role,
                                partner_id=p_name,
                                transaction_value_lkr=tx_val,
                                dependency_percentage=dep_pct,
                                relationship_duration_months=dur,
                                payment_delay_days=delay,
                                is_verified=verified,
                                evidence_source=prov_cat
                            )
                        )
                conn.close()
            except Exception:
                pass

        # 2. Query scenario relationships from Business_Relationships.csv
        if data_origin == "SIMULATED_SCENARIO" and self.relationships_df is not None:
            # Map WP_SME_0001 -> SLWP00001 if needed
            target_lookup = entity_id
            if entity_id.upper().startswith("WP_SME_"):
                try:
                    num = int(entity_id.split("_")[-1])
                    target_lookup = f"SLWP{num:05d}"
                except Exception:
                    pass

            src_col = "Source_Business_ID" if "Source_Business_ID" in self.relationships_df.columns else "source_id"
            tgt_col = "Target_Business_ID" if "Target_Business_ID" in self.relationships_df.columns else "target_id"
            type_col = "Relationship_Type" if "Relationship_Type" in self.relationships_df.columns else "relationship_type"
            val_col = "Monthly_Transaction_Value_LKR" if "Monthly_Transaction_Value_LKR" in self.relationships_df.columns else "transaction_value_lkr"

            out_rels = self.relationships_df[self.relationships_df[src_col].astype(str).str.upper() == target_lookup.upper()]
            in_rels = self.relationships_df[self.relationships_df[tgt_col].astype(str).str.upper() == target_lookup.upper()]

            for _, row in in_rels.iterrows():
                rel_type = str(row[type_col]).upper()
                if "SUPPLIES" in rel_type or "SELLS" in rel_type:
                    role = "SUPPLIER"
                elif "BUYS" in rel_type:
                    role = "CUSTOMER"
                elif "LEND" in rel_type or "BANK" in rel_type:
                    role = "LENDER"
                else:
                    role = "PARTNER"
                relationships.append(
                    BusinessRelationshipEvidence(
                        source_id=str(row[src_col]),
                        target_id=str(row[tgt_col]),
                        relationship_type=rel_type,
                        role=role,
                        partner_id=str(row[src_col]),
                        transaction_value_lkr=float(row[val_col]) if pd.notna(row.get(val_col)) else None,
                        dependency_percentage=None,
                        payment_delay_days=None,
                        disruption_status="BASELINE",
                        is_verified=False,
                        evidence_source="SIMULATED_SCENARIO"
                    )
                )

            for _, row in out_rels.iterrows():
                rel_type = str(row[type_col]).upper()
                if "BUYS" in rel_type:
                    role = "SUPPLIER"
                elif "SUPPLIES" in rel_type or "SELLS" in rel_type:
                    role = "CUSTOMER"
                elif "BORROW" in rel_type or "LOAN" in rel_type:
                    role = "LENDER"
                else:
                    role = "PARTNER"
                relationships.append(
                    BusinessRelationshipEvidence(
                        source_id=str(row[src_col]),
                        target_id=str(row[tgt_col]),
                        relationship_type=rel_type,
                        role=role,
                        partner_id=str(row[tgt_col]),
                        transaction_value_lkr=float(row[val_col]) if pd.notna(row.get(val_col)) else None,
                        dependency_percentage=None,
                        payment_delay_days=None,
                        disruption_status="BASELINE",
                        is_verified=False,
                        evidence_source="SIMULATED_SCENARIO"
                    )
                )

        return relationships
