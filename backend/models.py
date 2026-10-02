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
    password_hash = Column(String, nullable=True)
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
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    business_profile_id = Column(String, ForeignKey("business_profiles.id"), nullable=True, index=True)
    business_name = Column(String, nullable=True, index=True)
    
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
    is_deleted = Column(Boolean, default=False, nullable=True, index=True)

    business_profile = relationship("BusinessProfile", back_populates="analysis_records")


class AnalysisAuditLog(Base):
    """
    Audit log tracking analysis lifecycle events: created, edited, rerun, deleted, restored.
    Stores timestamp, actor, inputs snapshot, and outcome for regulatory & research traceability.
    """
    __tablename__ = "analysis_audit_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, nullable=True, index=True)
    user_email = Column(String, nullable=True)
    record_id = Column(String, nullable=True, index=True)
    action = Column(String, nullable=False, index=True)  # 'created', 'rerun', 'edited', 'deleted', 'restored'
    business_name = Column(String, nullable=True)
    business_category = Column(String, nullable=True)
    district = Column(String, nullable=True)
    result_label = Column(String, nullable=True)
    result_score = Column(Float, nullable=True)
    inputs_snapshot = Column(PortableJSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

