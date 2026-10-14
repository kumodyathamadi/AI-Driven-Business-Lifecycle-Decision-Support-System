# tests/test_ocr_rule_engine.py
import sys
import os
import io

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.ocr.rule_extractor import ContextAwareAmountExtractor
from backend.services.ocr_extractor import (
    extract_amounts_from_text,
    extract_amounts_from_pdf_bytes,
    run_integrated_pipeline
)
from backend.schemas import IntegratedPipelineRequest, StockDepletionLog
from datetime import datetime

SAMPLE_PDF_1 = r"C:\Users\dhanu\Downloads\07\07\Invoice INV-0097.pdf"
SAMPLE_PDF_2 = r"C:\Users\dhanu\Downloads\07\07\Invoice INV-0168.pdf"

def test_real_pdf_inv_0097():
    if not os.path.exists(SAMPLE_PDF_1):
        print(f"Skipping {SAMPLE_PDF_1} (file not found)")
        return
    with open(SAMPLE_PDF_1, "rb") as f:
        pdf_bytes = f.read()
    res = extract_amounts_from_pdf_bytes(pdf_bytes)
    assert res.decision == "AUTO_PASS"
    assert res.confidence_score >= 85.0
    amounts = res.extracted_amounts
    assert amounts.sub_total == 7025000.0
    assert amounts.total_amount == 7025000.0
    assert amounts.tax_amount == 0.0
    assert amounts.tax_category == "Exempt"
    assert amounts.is_math_valid == True
    print("PASS: test_real_pdf_inv_0097 (7,025,000 LKR Exempt Auto-Passed)")


def test_real_pdf_inv_0168():
    if not os.path.exists(SAMPLE_PDF_2):
        print(f"Skipping {SAMPLE_PDF_2} (file not found)")
        return
    with open(SAMPLE_PDF_2, "rb") as f:
        pdf_bytes = f.read()
    res = extract_amounts_from_pdf_bytes(pdf_bytes)
    assert res.decision == "AUTO_PASS"
    amounts = res.extracted_amounts
    assert amounts.sub_total == 40000.0
    assert amounts.total_amount == 40000.0
    assert amounts.tax_amount == 0.0
    assert amounts.currency == "AUD"
    assert amounts.is_math_valid == True
    print("PASS: test_real_pdf_inv_0168 (40,000 AUD Exempt Auto-Passed)")


def test_standard_18_vat_with_heavy_decoys():
    sample_text = """
    CEYLON TRADING HARDWARE (PVT) LTD
    #456, Baseline Road, Colombo 09
    Tel: +94 11 2687123 | Fax: 011 2687124
    TIN: 102938475 | VAT No: 102938475-7000
    Bank A/C: 100540001151 (Commercial Bank)
    Invoice No: INV-2025-502
    Date: 2025-06-15

    Description                  Qty     Rate         Amount (LKR)
    Industrial Steel Beams      10.0   10,000.00      100,000.00
    Reinforced Iron Rods        20.0    2,500.00       50,000.00

    ----------------------------------------------------------------
    Sub Total:                                        150,000.00
    VAT (18%):                                         27,000.00
    Total Payable Amount:                             177,000.00
    ----------------------------------------------------------------
    Thank you for your business!
    """
    res = extract_amounts_from_text(sample_text)
    assert res.decision == "AUTO_PASS"
    assert res.confidence_score == 100.0
    amounts = res.extracted_amounts
    assert amounts.sub_total == 150000.0
    assert amounts.tax_amount == 27000.0
    assert amounts.total_amount == 177000.0
    assert amounts.tax_category == "Standard 18%"
    assert amounts.is_math_valid == True
    assert res.rejected_decoys_count >= 4
    print("PASS: test_standard_18_vat_with_heavy_decoys (Decoys ignored, 18% VAT validated)")


def test_math_mismatch_routes_to_review():
    tampered_text = """
    SAMPLE SME RETAIL
    Invoice: INV-BAD-01
    Date: 2025-06-16

    Subtotal: 100,000.00
    VAT (18%): 18,000.00
    Total Payable: 150,000.00
    """
    res = extract_amounts_from_text(tampered_text)
    assert res.decision == "REVIEW_REQUIRED"
    assert res.extracted_amounts.is_math_valid == False
    assert res.extracted_amounts.math_difference == 32000.0
    print("PASS: test_math_mismatch_routes_to_review (Arithmetic mismatch caught)")


def test_end_to_end_integrated_pipeline():
    sample_invoice = """
    LANKA ELECTRICAL DISTRIBUTORS
    TIN: 103356111 | VAT: 103356111-7000
    Invoice No: INV-E2E-77
    Date: 2025-06-20

    Subtotal: 50,000.00
    VAT: 9,000.00
    Total Payable: 59,000.00
    """
    stock_log = StockDepletionLog(
        item_id="COPPER-CABLE-100M",
        quantity_depleted=1.0,
        unit_cost=48000.0,
        depletion_timestamp=datetime(2025, 6, 20, 11, 0, 0)
    )
    req = IntegratedPipelineRequest(
        document_text=sample_invoice,
        item_id="COPPER-CABLE-100M",
        quantity_invoiced=1.0,
        stock_depletion_log=stock_log,
        transaction_time=datetime(2025, 6, 20, 11, 30, 0)
    )
    pipeline_res = run_integrated_pipeline(req)
    assert pipeline_res.status == "success"
    assert pipeline_res.ocr_result.decision == "AUTO_PASS"
    assert pipeline_res.tax_result is not None
    assert pipeline_res.tax_result.schedule_7_cage == "Cage A"
    assert pipeline_res.fraud_assessment is not None
    assert pipeline_res.fraud_assessment.decision == "PASS"
    assert pipeline_res.final_pipeline_decision == "AUTO_APPROVED"
    print("PASS: test_end_to_end_integrated_pipeline (OCR -> Tax Cage A -> Fraud PASS -> AUTO_APPROVED)")


def test_real_scanned_pdf_3425():
    sample_scanned = r"C:\Users\dhanu\Downloads\06\06\3425 SFH.pdf"
    if not os.path.exists(sample_scanned):
        print(f"Skipping {sample_scanned} (file not found)")
        return
    with open(sample_scanned, "rb") as f:
        pdf_bytes = f.read()
    res = extract_amounts_from_pdf_bytes(pdf_bytes)
    assert res.decision == "AUTO_PASS"
    assert res.confidence_score >= 85.0
    amounts = res.extracted_amounts
    assert amounts.invoice_number == "3425"
    assert amounts.total_amount == 3399.5
    assert amounts.sub_total == 3399.5
    assert amounts.currency == "EUR"
    assert amounts.tax_category == "Zero-Rated"
    assert amounts.is_math_valid == True
    print("PASS: test_real_scanned_pdf_3425 (3,399.50 EUR Export Zero-Rated Scanned PDF Auto-Passed)")


if __name__ == "__main__":
    test_real_pdf_inv_0097()
    test_real_pdf_inv_0168()
    test_real_scanned_pdf_3425()
    test_standard_18_vat_with_heavy_decoys()
    test_math_mismatch_routes_to_review()
    test_end_to_end_integrated_pipeline()
    print("\nALL 6-STEP OCR RULE ENGINE & PIPELINE TESTS PASSED!")
