# component3_backend/test_api.py
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"
    print("PASS: /health")

def test_process_invoice_legacy():
    payload = {
        "invoice_number": "INV-2024-TEST",
        "date_of_supply": "2024-03-25",
        "sub_total": 50000.0,
        "tax_amount": 9000.0,
        "total_amount": 59000.0,
        "currency": "LKR",
        "tax_category": "Standard"
    }
    res = client.post("/api/v1/process-invoice", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["tax_analysis"]["schedule_7_cage"] == "Cage A"
    assert data["tax_analysis"]["base_value_lkr"] == 50000.0
    print("PASS: /api/v1/process-invoice")

def test_export_csv():
    payload = {
        "taxpayer_tin": "102938475",
        "taxpayer_name": "Lanka SME Holdings Ltd",
        "tax_period": "2024-Q1",
        "invoices": [
            {
                "invoice_number": "INV-101",
                "date_of_supply": "2024-01-10",
                "sub_total": 200000.0,
                "tax_amount": 36000.0,
                "total_amount": 236000.0,
                "currency": "LKR",
                "tax_category": "18%"
            },
            {
                "invoice_number": "EXP-102",
                "date_of_supply": "2024-01-15",
                "sub_total": 1200.0,
                "tax_amount": 0.0,
                "total_amount": 1200.0,
                "currency": "USD",
                "exchange_rate": 300.0,
                "tax_category": "Zero-Rated"
            }
        ]
    }
    res = client.post("/api/v1/tax/export-schedule7-csv", json=payload)
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    assert "102938475_VAT_SCHEDULE07_2024Q1.csv" in res.headers["content-disposition"]
    csv_text = res.text
    assert "Serial No,Tax Period" in csv_text
    assert "INV-101" in csv_text
    assert "EXP-102" in csv_text
    print("PASS: /api/v1/tax/export-schedule7-csv")

def test_fraud_check_api():
    payload = {
        "transaction_id": "TXN-API-999",
        "invoice_data": {
            "invoice_number": "INV-API-999",
            "date_of_supply": "2025-06-26",
            "sub_total": 42600.0,
            "tax_amount": 7668.0,
            "total_amount": 50268.0,
            "currency": "LKR"
        },
        "item_id": "LOGISTICS-TRIP-KANDY",
        "quantity_invoiced": 1.0,
        "stock_depletion_log": {
            "item_id": "LOGISTICS-TRIP-KANDY",
            "quantity_depleted": 1.0,
            "unit_cost": 30870.0,
            "depletion_timestamp": "2025-06-26T21:00:00"
        },
        "transaction_time": "2025-06-26T22:47:00",
        "is_duplicate_candidate": True,
        "time_since_prior_transaction_mins": 14.0
    }
    res = client.post("/api/v1/fraud/check-transaction", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["decision"] == "FAIL"
    assert data["risk_score"] >= 80
    assert data["risk_level"] == "HIGH"
    print("PASS: /api/v1/fraud/check-transaction")

    # Review queue test
    q_res = client.get("/api/v1/fraud/review-queue")
    assert q_res.status_code == 200
    assert len(q_res.json()) >= 1
    print("PASS: /api/v1/fraud/review-queue")

    # Review action test
    act_payload = {
        "transaction_id": "TXN-API-999",
        "action": "reject",
        "reviewer_notes": "Unauthorized freight surcharge."
    }
    act_res = client.post("/api/v1/fraud/review-action", json=act_payload)
    assert act_res.status_code == 200
    assert act_res.json()["action_taken"] == "reject"
    print("PASS: /api/v1/fraud/review-action")

def test_ocr_api():
    sample_ocr = """
    COLOMBO HARDWARE & BUILDING SUPPLIES
    TIN: 102938475 | Phone: +94 11 2345678
    Invoice: INV-2025-001
    Date: 2025-06-25

    Subtotal: 80,000.00
    VAT (18%): 14,400.00
    Total Amount: 94,400.00
    """
    res = client.post("/api/v1/ocr/extract-amounts", json={"document_text": sample_ocr})
    assert res.status_code == 200
    data = res.json()
    assert data["decision"] == "AUTO_PASS"
    assert data["extracted_amounts"]["total_amount"] == 94400.0
    assert data["extracted_amounts"]["is_math_valid"] == True
    print("PASS: /api/v1/ocr/extract-amounts")

def test_pipeline_api():
    sample_ocr = """
    LANKA STEEL DISTRIBUTORS
    Invoice: INV-PIPE-01
    Date: 2025-06-25
    Subtotal: 100,000.00
    VAT: 18,000.00
    Total Payable: 118,000.00
    """
    payload = {
        "document_text": sample_ocr,
        "item_id": "STEEL-BAR-12MM",
        "quantity_invoiced": 10.0,
        "stock_depletion_log": {
            "item_id": "STEEL-BAR-12MM",
            "quantity_depleted": 10.0,
            "unit_cost": 9500.0,
            "depletion_timestamp": "2025-06-25T10:00:00"
        },
        "transaction_time": "2025-06-25T10:30:00"
    }
    res = client.post("/api/v1/pipeline/process-transaction", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["final_pipeline_decision"] == "AUTO_APPROVED"
    assert data["tax_result"]["schedule_7_cage"] == "Cage A"
    assert data["fraud_assessment"]["decision"] == "PASS"
    print("PASS: /api/v1/pipeline/process-transaction")

def test_upload_pdf_scanned():
    import os
    pdf_path = r"C:\Users\dhanu\Downloads\06\06\3425 SFH.pdf"
    if os.path.exists(pdf_path):
        with open(pdf_path, "rb") as f:
            files = {"file": ("3425 SFH.pdf", f, "application/pdf")}
            res = client.post("/api/v1/ocr/upload-pdf", files=files)
        assert res.status_code == 200
        data = res.json()
        assert data["decision"] == "AUTO_PASS"
        assert data["extracted_amounts"]["invoice_number"] == "3425"
        assert data["extracted_amounts"]["total_amount"] == 3399.5
        assert data["extracted_amounts"]["currency"] == "EUR"
        assert data["extracted_amounts"]["tax_category"] == "Zero-Rated"
        assert data["extracted_amounts"]["is_math_valid"] == True
        print("PASS: /api/v1/ocr/upload-pdf (Scanned PDF 3425 SFH.pdf)")

if __name__ == "__main__":
    test_health()
    test_process_invoice_legacy()
    test_export_csv()
    test_fraud_check_api()
    test_ocr_api()
    test_pipeline_api()
    test_upload_pdf_scanned()
    print("\nALL FASTAPI INTEGRATION TESTS PASSED SUCCESSFULLY!")

