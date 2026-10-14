"""
Component 2 — Deterministic Three-Valued Kleene Logic Rule Engine
Evaluates compliance obligations against a business profile.

Logic Rules:
- Three-valued Kleene logic: True, False, None (Unknown).
- Kleene AND (all_of):
    - Any False  -> False
    - Else Any None (Unknown) -> None
    - Else (All True) -> True
- Kleene OR (any_of):
    - Any True   -> True
    - Else Any None (Unknown) -> None
    - Else (All False) -> False

Determinism:
Same profile input will ALWAYS produce the exact same output.
Zero external calls, zero non-deterministic random state.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

# Ensure repository root is on sys.path
_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from engine.schema import ObligationSchema, RuleNode
from engine.loader import load_rulebook

TriVal = Optional[bool]  # True | False | None (Unknown)


def compare_leaf(fact_val: Any, op: str, target_val: Any) -> bool:
    """
    Deterministically evaluates a leaf condition operator against a fact value.
    Supports ==, !=, in, >=, <.
    """
    if op == "==":
        if isinstance(fact_val, str) and isinstance(target_val, str):
            return fact_val.strip().lower() == target_val.strip().lower()
        return fact_val == target_val

    elif op == "!=":
        if isinstance(fact_val, str) and isinstance(target_val, str):
            return fact_val.strip().lower() != target_val.strip().lower()
        return fact_val != target_val

    elif op == "in":
        if isinstance(target_val, (list, tuple, set)):
            if isinstance(fact_val, str):
                target_lower = {str(item).strip().lower() for item in target_val}
                return fact_val.strip().lower() in target_lower
            return fact_val in target_val
        elif isinstance(fact_val, (list, tuple, set)):
            if isinstance(target_val, str):
                fact_lower = {str(item).strip().lower() for item in fact_val}
                return target_val.strip().lower() in fact_lower
            return target_val in fact_val
        elif isinstance(target_val, str) and isinstance(fact_val, str):
            return fact_val.lower() in target_val.lower()
        return False

    elif op == ">=":
        try:
            return float(fact_val) >= float(target_val)
        except (ValueError, TypeError):
            return False

    elif op == "<":
        try:
            return float(fact_val) < float(target_val)
        except (ValueError, TypeError):
            return False

    else:
        raise ValueError(f"Unsupported comparison operator '{op}'")


def eval_rule_node(
    node: RuleNode,
    profile: Dict[str, Any]
) -> Tuple[TriVal, Dict[str, Any], List[str]]:
    """
    Recursively evaluate a RuleNode using three-valued Kleene logic.

    Returns:
        Tuple of (TriVal verdict, triggering_facts dict, missing_facts list)
    """
    # 1. Atomic Leaf Condition
    if node.is_leaf():
        fact_name = node.fact  # type: ignore[assignment]
        op = node.op           # type: ignore[assignment]
        target_val = node.value

        fact_val = profile.get(fact_name)

        # In three-valued logic, null/None or absence of fact is UNKNOWN (None)
        if fact_val is None:
            return None, {}, [fact_name]

        is_met = compare_leaf(fact_val, op, target_val)
        if is_met:
            return True, {fact_name: fact_val}, []
        else:
            return False, {fact_name: fact_val}, []

    # 2. Conjunction (all_of / Kleene AND)
    if node.all_of is not None:
        child_verdicts: List[TriVal] = []
        all_triggering: Dict[str, Any] = {}
        all_missing: Set[str] = set()
        false_triggering: Dict[str, Any] = {}

        for child in node.all_of:
            v, trigs, miss = eval_rule_node(child, profile)
            child_verdicts.append(v)
            all_missing.update(miss)
            if v is True:
                all_triggering.update(trigs)
            elif v is False:
                false_triggering.update(trigs)

        # Kleene AND rules:
        # If any False -> False
        # Else if any None -> None
        # Else -> True
        if False in child_verdicts:
            return False, false_triggering, []
        elif None in child_verdicts:
            return None, {}, sorted(list(all_missing))
        else:
            return True, all_triggering, []

    # 3. Disjunction (any_of / Kleene OR)
    if node.any_of is not None:
        child_verdicts = []
        true_triggering: Dict[str, Any] = {}
        all_missing = set()
        all_false_trigs: Dict[str, Any] = {}

        for child in node.any_of:
            v, trigs, miss = eval_rule_node(child, profile)
            child_verdicts.append(v)
            all_missing.update(miss)
            if v is True:
                true_triggering.update(trigs)
            elif v is False:
                all_false_trigs.update(trigs)

        # Kleene OR rules:
        # If any True -> True
        # Else if any None -> None
        # Else -> False
        if True in child_verdicts:
            return True, true_triggering, []
        elif None in child_verdicts:
            return None, {}, sorted(list(all_missing))
        else:
            return False, all_false_trigs, []

    raise ValueError("Invalid RuleNode: neither leaf condition nor all_of/any_of defined.")


def evaluate_obligation(
    obligation: ObligationSchema,
    profile: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Evaluates a single ObligationSchema against a business profile.
    Produces deterministic output with status APPLICABLE, NOT_APPLICABLE, or UNKNOWN.
    """
    verdict, triggering_facts, missing_facts = eval_rule_node(obligation.rule, profile)

    if verdict is True:
        status = "APPLICABLE"
    elif verdict is False:
        status = "NOT_APPLICABLE"
    else:
        status = "UNKNOWN"

    return {
        "obligation_id": obligation.obligation_id,
        "title": obligation.title,
        "status": status,
        "triggering_facts": triggering_facts,
        "missing_facts": missing_facts,
        "authority": obligation.authority,
        "source_id": obligation.source_id,
        "source_paragraph": obligation.source_paragraph,
        "source_text": obligation.source_text,
        "documents_needed": obligation.documents_needed,
    }


def evaluate_all(
    profile: Dict[str, Any],
    obligations: Optional[List[ObligationSchema]] = None
) -> List[Dict[str, Any]]:
    """
    Evaluates all obligations in the rulebook against the given profile.
    Deterministic: identical profile always returns identical results.
    """
    if obligations is None:
        obligations = load_rulebook()

    results: List[Dict[str, Any]] = []
    for obl in obligations:
        res = evaluate_obligation(obl, profile)
        results.append(res)

    return results


if __name__ == "__main__":
    test_profile = {
        "province": "Western Province",
        "business_type": "food",
        "handles_food": True,
        "has_physical_premises": True,
        "legal_form": "sole_proprietorship",
        "number_of_employees": 2,
    }
    evaluated = evaluate_all(test_profile)
    print(f"Evaluated {len(evaluated)} obligations for test profile:")
    for item in evaluated:
        print(f"  {item['obligation_id']} [{item['status']}]: Triggers={item['triggering_facts']} Missing={item['missing_facts']}")
