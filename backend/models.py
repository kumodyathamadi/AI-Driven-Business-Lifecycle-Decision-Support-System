import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, JSON, ForeignKey, Text, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from backend.database import Base


def generate_uuid():
    return str(uuid.uuid4())


# Portable JSON column type (uses PostgreSQL JSONB on Postgres, standard JSON elsewhere)
PortableJSON = JSON().with_variant(JSONB, 'postgresql')


class User(Base):
    """
    User Entity for authentication and SME profile ownership.
    """
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    business_profiles = relationship("BusinessProfile", back_populates="owner")


class BusinessProfile(Base):
    """
    SME Business Profile Entity representing registered enterprise parameters.
    """
    __tablename__ = "business_profiles"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    business_name = Column(String, nullable=False)
    business_stage = Column(String, nullable=False, index=True)
    business_category = Column(String, nullable=False, index=True)
    district = Column(String, nullable=False, index=True)
    location_type = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="business_profiles")
    analysis_records = relationship("AnalysisRecord", back_populates="business_profile")


class AnalysisRecord(Base):
    """
    Database Entity storing historical SME feasibility analysis runs and structured profile outputs.
    Leverages PostgreSQL JSONB columns for structured ML, SHAP, TOPSIS, and Plan outputs.
    Stores original natural language description & extraction metadata for research traceability.
    """
    __tablename__ = "analysis_records"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_profile_id = Column(String, ForeignKey("business_profiles.id"), nullable=True, index=True)
    
    business_stage = Column(String, nullable=False, index=True)
    business_category = Column(String, nullable=False, index=True)
    district = Column(String, nullable=False, index=True)
    feasibility_label = Column(String, nullable=False, index=True)
    confidence_score = Column(Float, nullable=False)
    
    # Traceability attributes
    original_business_description = Column(Text, nullable=True)
    extraction_metadata = Column(PortableJSON, nullable=True)

    # Structured JSON / JSONB columns for research pipeline artifacts
    input_profile = Column(PortableJSON, nullable=False)
    structured_profile = Column(PortableJSON, nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    business_profile = relationship("BusinessProfile", back_populates="analysis_records")


# ===========================================================================
# COMPONENT 4 PERSISTENT RISK & RELATIONSHIP MODELS
# ===========================================================================

class Component4BusinessProfile(Base):
    """
    Persistent enterprise record for Component 4 risk assessment and lifecycle tracking.
    Maintains a stable unique business_id across re-uploads and dynamic intake updates.
    """
    __tablename__ = "component4_businesses"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_name = Column(String, nullable=False, index=True)
    registration_number = Column(String, nullable=True, index=True)
    district = Column(String, nullable=False, index=True)
    province = Column(String, nullable=False, default="Western", index=True)
    business_category = Column(String, nullable=False, index=True)
    business_stage = Column(String, nullable=False, index=True)
    operating_model = Column(String, nullable=True)
    
    # Provenance and linkage
    source_origin = Column(String, nullable=False, default="USER_UPLOAD")  # USER_UPLOAD, OBSERVED_SOURCE, SIMULATED_SCENARIO
    linked_scenario_id = Column(String, nullable=True, index=True)          # e.g. WP_SME_0001, C00001
    is_verified = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Comprehensive snapshot of latest financial, operational, and counterparty data with per-field provenance
    latest_intake_data = Column(PortableJSON, nullable=True)

    relationships = relationship("Component4BusinessRelationship", back_populates="business", cascade="all, delete-orphan")
    assessment_runs = relationship("Component4AssessmentRun", back_populates="business", cascade="all, delete-orphan")


class Component4BusinessRelationship(Base):
    """
    Persistent relationship edge connecting a business to suppliers, customers, and lenders.
    Explicitly tracks provenance: VERIFIED_OBSERVED, USER_DECLARED, or SIMULATED_SCENARIO.
    """
    __tablename__ = "component4_relationships"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("component4_businesses.id"), nullable=False, index=True)
    partner_name = Column(String, nullable=False)
    partner_type = Column(String, nullable=False)        # SUPPLIER, CUSTOMER, LENDER, PARTNER
    relationship_type = Column(String, nullable=False)    # SUPPLIES, SELLS_TO, BORROWS_FROM
    provenance_category = Column(String, nullable=False)  # VERIFIED_OBSERVED, USER_DECLARED, SIMULATED_SCENARIO
    
    transaction_value_lkr = Column(Float, nullable=True)
    dependency_percentage = Column(Float, nullable=True)
    payment_delay_days = Column(Float, nullable=True)
    relationship_duration_months = Column(Float, nullable=True)
    is_verified = Column(Boolean, default=False)
    verification_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    business = relationship("Component4BusinessProfile", back_populates="relationships")


class Component4AssessmentRun(Base):
    """
    Historical log of Component 4 risk assessment runs, GNN inference results, and growth recommendations.
    """
    __tablename__ = "component4_assessment_runs"

    id = Column(String, primary_key=True)  # CMP4_<timestamp>_<uuid>
    business_id = Column(String, ForeignKey("component4_businesses.id"), nullable=False, index=True)
    plan_filename = Column(String, nullable=False)
    evidence_sufficiency = Column(String, nullable=False)
    overall_risk_category = Column(String, nullable=False)
    composite_risk_score = Column(Float, nullable=False)
    
    gnn_status = Column(String, nullable=False)
    gnn_predicted_risk = Column(String, nullable=True)
    gnn_score = Column(Float, nullable=True)
    
    growth_readiness = Column(String, nullable=False)
    risk_adjusted_recommendation = Column(Text, nullable=True)
    
    full_results_json = Column(PortableJSON, nullable=False)
    markdown_report = Column(Text, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    business = relationship("Component4BusinessProfile", back_populates="assessment_runs")
