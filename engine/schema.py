"""
Component 2 — Rule Engine Schema Definitions
Defines Pydantic models for obligations, leaf conditions, and nested rules.
"""

from __future__ import annotations

from typing import Any, List, Literal, Optional, Set
from pydantic import BaseModel, Field, field_validator, model_validator

VALID_OPS: Set[str] = {"==", "!=", "in", ">=", "<"}
VALID_LAYERS: Set[str] = {"common", "food", "clothing", "salon", "vehicle_parts"}


class LeafCondition(BaseModel):
    """
    Atomic condition evaluated against a profile fact.
    Example: {"fact": "province", "op": "==", "value": "Western Province"}
    """
    fact: str = Field(..., description="Fact / attribute name in the business profile.")
    op: Literal["==", "!=", "in", ">=", "<"] = Field(..., description="Comparison operator.")
    value: Any = Field(..., description="Target value for comparison.")

    @field_validator("op")
    @classmethod
    def validate_operator(cls, v: str) -> str:
        if v not in VALID_OPS:
            raise ValueError(f"Operator '{v}' is invalid. Allowed operators: {sorted(list(VALID_OPS))}")
        return v


class RuleNode(BaseModel):
    """
    Recursive rule node supporting nested all_of / any_of combinations
    and leaf conditions {fact, op, value}.
    """
    all_of: Optional[List[RuleNode]] = Field(None, description="Conjunction of child rules (AND).")
    any_of: Optional[List[RuleNode]] = Field(None, description="Disjunction of child rules (OR).")
    fact: Optional[str] = Field(None, description="Fact attribute name for leaf condition.")
    op: Optional[Literal["==", "!=", "in", ">=", "<"]] = Field(None, description="Comparison operator for leaf condition.")
    value: Optional[Any] = Field(None, description="Target value for leaf condition.")

    @model_validator(mode="after")
    def validate_node(self) -> RuleNode:
        has_all = self.all_of is not None
        has_any = self.any_of is not None
        has_fact = self.fact is not None

        # At least one must be defined
        if not (has_all or has_any or has_fact):
            raise ValueError("Rule node must have at least one of: 'all_of', 'any_of', or 'fact'")

        # If leaf condition
        if has_fact:
            if self.op is None:
                raise ValueError(f"Leaf condition for fact '{self.fact}' must specify an 'op'")
            if self.op not in VALID_OPS:
                raise ValueError(f"Invalid op '{self.op}'. Allowed operators: {sorted(list(VALID_OPS))}")

        # If all_of / any_of present, verify they are lists
        if has_all and not isinstance(self.all_of, list):
            raise ValueError("'all_of' must be a list of rule nodes")
        if has_any and not isinstance(self.any_of, list):
            raise ValueError("'any_of' must be a list of rule nodes")

        return self

    def is_leaf(self) -> bool:
        """Check if this node is an atomic leaf condition."""
        return self.fact is not None and self.op is not None


class ObligationSchema(BaseModel):
    """
    Schema for a single compliance obligation in the rulebook.
    """
    obligation_id: str = Field(..., description="Unique obligation identifier (e.g. OBL-COMMON-001)")
    title: str = Field(..., description="Human-readable title of the obligation")
    actor: str = Field(..., description="Role responsible for compliance (e.g. business_owner)")
    action: str = Field(..., description="Required compliance action")
    authority: str = Field(..., description="Enforcing authority (e.g. Colombo Municipal Council)")
    source_id: str = Field(..., description="ID of legal reference in source register")
    source_paragraph: str = Field(..., description="Citation paragraph / section in source statute")
    source_text: str = Field(..., description="Exact or cited statutory excerpt")
    documents_needed: List[str] = Field(default_factory=list, description="List of required application documents")
    layer: Literal["common", "food", "clothing", "salon", "vehicle_parts"] = Field(
        ...,
        description="Obligation layer categorization"
    )
    rule: RuleNode = Field(..., description="Nested boolean rule structure")

    @field_validator("layer")
    @classmethod
    def validate_layer(cls, v: str) -> str:
        if v not in VALID_LAYERS:
            raise ValueError(f"Layer '{v}' is invalid. Allowed layers: {sorted(list(VALID_LAYERS))}")
        return v


class RulebookSchema(BaseModel):
    """Root container for list of obligations."""
    obligations: List[ObligationSchema]
