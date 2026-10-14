# tests/test_fraud_detection.py
import sys
import os
from datetime import datetime, date

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.schemas import (
    InvoiceData,
    StockDepletionLog,
    FraudCheckRequest,
    ReviewActionRequest
)
from backend.services.anomaly_detector import (
    evaluate_transaction_risk,
    get_review_queue_items,
    handle_review_action
)

def test_normal_transaction_pass():
    """Test standard normal transaction: matching stock depletion, daytime, valid markup."""
    inv = InvoiceData(
        invoice_number="INV-2025-0101",
        date_of_supply=date(2025, 6, 26),
        sub_total=15000.0,
        tax_amount=2700.0,
        total_amount=17700.0,
        currency="LKR",
        tax_category="18%",
        supplier_name="SME Hardware Stores",
        customer_name="Local Builder"
    )
    stock = StockDepletionLog(
        item_id="CEMENT-50KG",
        quantity_depleted=10.0,
        unit_cost=1450.0, # Total cost = 14,500 LKR (Invoice subtotal = 15,000 LKR -> normal ~3% markup)
        depletion_timestamp=datetime(2025, 6, 26, 10, 15, 0),
        warehouse_location="Depot A"
    )
    req = FraudCheckRequest(
        transaction_id="TXN-NORMAL-001",
        invoice_data=inv,
        item_id="CEMENT-50KG",
        quantity_invoiced=10.0,
        stock_depletion_log=stock,
        transaction_time=datetime(2025, 6, 26, 10, 25, 0)
    )
    
    assessment = evaluate_transaction_risk(req)
    assert assessment.decision == "PASS"
    assert assessment.is_anomaly == False
    assert assessment.risk_score < 60
    assert assessment.suggested_action == "Direct to Secure Storage"
    print(f"PASS: test_normal_transaction_pass (Risk score: {assessment.risk_score}/100, Decision: {assessment.decision})")


def test_fraud_scenario_lanka_logistics_fail():
    """
    Test High-Risk Fraud Scenario matching ClearLedger UI:
    - Amount exceeds stock depletion by 38%
    - Duplicate transaction detected within 14 minutes
    - Unusual transaction time (22:47)
    """
    inv = InvoiceData(
        invoice_number="INV-LANKA-184",
        date_of_supply=date(2025, 6, 26),
        sub_total=42600.0,
        tax_amount=7668.0,
        total_amount=50268.0,
        currency="LKR",
        tax_category="18%",
        supplier_name="Lanka Logistics Express",
        customer_name="Commercial Client"
    )
    # Stock depletion value = 30,870 LKR -> (42600 - 30870) / 30870 = +37.99% (~38% excess)
    stock = StockDepletionLog(
        item_id="LOGISTICS-TRIP-KANDY",
        quantity_depleted=1.0,
        unit_cost=30870.0,
        depletion_timestamp=datetime(2025, 6, 26, 21, 0, 0),
        warehouse_location="Kandy Hub"
    )
    req = FraudCheckRequest(
        transaction_id="TXN-2025-0626-184",
        invoice_data=inv,
        item_id="LOGISTICS-TRIP-KANDY",
        quantity_invoiced=1.0,
        stock_depletion_log=stock,
        transaction_time=datetime(2025, 6, 26, 22, 47, 0), # 22:47 night
        is_duplicate_candidate=True,
        time_since_prior_transaction_mins=14.0 # 14 mins
    )
    
    assessment = evaluate_transaction_risk(req)
    assert assessment.decision == "FAIL"
    assert assessment.is_anomaly == True
    assert assessment.risk_score >= 80
    assert assessment.risk_level == "HIGH"
    assert assessment.suggested_action == "Route to Human Review Queue"
    
    reason_codes = [r.code for r in assessment.flagged_reasons]
    assert "STOCK_VALUE_MISMATCH" in reason_codes
    assert "UNUSUAL_TIME" in reason_codes
    assert "DUPLICATE_VELOCITY" in reason_codes
    print(f"PASS: test_fraud_scenario_lanka_logistics_fail (Risk score: {assessment.risk_score}/100, Decision: {assessment.decision}, Flags: {len(assessment.flagged_reasons)})")


def test_phantom_sale_fail():
    """Test phantom sale: Invoiced revenue claim with no physical stock record."""
    inv = InvoiceData(
        invoice_number="INV-PHANTOM-99",
        date_of_supply=date(2025, 6, 27),
        sub_total=85000.0,
        tax_amount=15300.0,
        total_amount=100300.0,
        currency="LKR",
        tax_category="18%"
    )
    req = FraudCheckRequest(
        transaction_id="TXN-PHANTOM-002",
        invoice_data=inv,
        item_id="GHOST-ITEM",
        quantity_invoiced=50.0,
        stock_depletion_log=None, # Missing physical depletion!
        transaction_time=datetime(2025, 6, 27, 14, 0, 0)
    )
    assessment = evaluate_transaction_risk(req)
    assert assessment.decision == "FAIL"
    assert "PHANTOM_SALE_NO_STOCK" in [r.code for r in assessment.flagged_reasons]
    print(f"PASS: test_phantom_sale_fail (Risk score: {assessment.risk_score}/100, Decision: {assessment.decision})")


def test_human_in_the_loop_review_queue():
    """Test review queue retrieval and reviewer decision resolution."""
    queue = get_review_queue_items()
    assert len(queue) >= 1
    
    # Resolve the Lanka Logistics transaction
    action = ReviewActionRequest(
        transaction_id="TXN-2025-0626-184",
        action="reject",
        reviewer_notes="Confirmed unauthorized freight charge not backed by dispatch manifest.",
        reviewer_id="lead_auditor_dhanushka"
    )
    resp = handle_review_action(action)
    assert resp.status == "success"
    assert resp.action_taken == "reject"
    print("PASS: test_human_in_the_loop_review_queue")

if __name__ == "__main__":
    test_normal_transaction_pass()
    test_fraud_scenario_lanka_logistics_fail()
    test_phantom_sale_fail()
    test_human_in_the_loop_review_queue()
    print("\nALL FRAUD DETECTION & HUMAN-IN-THE-LOOP TESTS PASSED!")
