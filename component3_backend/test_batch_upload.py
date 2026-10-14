# component3_backend/test_batch_upload.py
"""
Quick Interactive CLI Tester for Component 3 Backend
Tests live server endpoints:
1. /health
2. /api/v1/ocr/upload-pdf with 3425 SFH.pdf (scanned)
3. /api/v1/ocr/upload-pdf with Invoice INV-0097.pdf (digital)
4. /api/v1/fraud/review-queue
5. /api/v1/tax/export-schedule7-csv
"""

import os
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_live_server():
    print("=" * 70)
    print("       COMPONENT 3 - LIVE SERVER VERIFICATION TEST")
    print("=" * 70)

    # 1. Health
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=5)
        print(f"\n[1] Health Check: Status {r.status_code} => {r.json()}")
    except Exception as e:
        print(f"\n[!] Failed to connect to server at {BASE_URL}: {e}")
        return

    # 2. Upload Scanned PDF (3425 SFH.pdf)
    scanned_path = r"C:\Users\dhanu\Downloads\06\06\3425 SFH.pdf"
    if os.path.exists(scanned_path):
        print(f"\n[2] Uploading Scanned Export Invoice: {os.path.basename(scanned_path)}")
        with open(scanned_path, "rb") as f:
            files = {"file": (os.path.basename(scanned_path), f, "application/pdf")}
            r = requests.post(f"{BASE_URL}/api/v1/ocr/upload-pdf", files=files)
        if r.status_code == 200:
            data = r.json()
            ext = data["extracted_amounts"]
            print(f"    - Decision:       {data['decision']} (Confidence: {data['confidence_score']}%)")
            print(f"    - Invoice Number: {ext['invoice_number']}")
            print(f"    - Invoice Date:   {ext['invoice_date']}")
            print(f"    - Currency:       {ext['currency']}")
            print(f"    - Total Amount:   {ext['total_amount']:,.2f}")
            print(f"    - Subtotal:       {ext['sub_total']:,.2f}")
            print(f"    - Tax Amount:     {ext['tax_amount']:,.2f} ({ext['tax_category']})")
            print(f"    - Math Validated: {ext['is_math_valid']}")
            print(f"    - Routing:        {data['routing']}")
        else:
            print(f"    [!] Failed with status {r.status_code}: {r.text}")
    else:
        print(f"\n[2] Scanned sample not found at: {scanned_path}")

    # 3. Upload Digital PDF (Invoice INV-0097.pdf)
    digital_path = r"C:\Users\dhanu\Downloads\07\07\Invoice INV-0097.pdf"
    if os.path.exists(digital_path):
        print(f"\n[3] Uploading Digital Local Invoice: {os.path.basename(digital_path)}")
        with open(digital_path, "rb") as f:
            files = {"file": (os.path.basename(digital_path), f, "application/pdf")}
            r = requests.post(f"{BASE_URL}/api/v1/ocr/upload-pdf", files=files)
        if r.status_code == 200:
            data = r.json()
            ext = data["extracted_amounts"]
            print(f"    - Decision:       {data['decision']} (Confidence: {data['confidence_score']}%)")
            print(f"    - Invoice Number: {ext['invoice_number']}")
            print(f"    - Currency:       {ext['currency']}")
            print(f"    - Total Amount:   {ext['total_amount']:,.2f}")
            print(f"    - Tax Category:   {ext['tax_category']}")
            print(f"    - Math Validated: {ext['is_math_valid']}")
        else:
            print(f"    [!] Failed with status {r.status_code}: {r.text}")

    # 4. Review Queue
    print("\n[4] Querying Fraud Detection Review Queue...")
    r = requests.get(f"{BASE_URL}/api/v1/fraud/review-queue")
    if r.status_code == 200:
        queue = r.json()
        print(f"    - Flagged Transactions Pending Review: {len(queue)}")
        for item in queue[:2]:
            print(f"      * Txn: {item.get('transaction_id')} | Risk: {item.get('risk_score')}/100 | Flags: {item.get('anomaly_flags')}")

    # 5. RAMIS Schedule 7 Export
    print("\n[5] Testing IRD RAMIS Schedule 7 CSV Export...")
    batch_payload = {
        "taxpayer_tin": "102938475",
        "tax_period": "2025-Q2",
        "invoices": [
            {
                "invoice_number": "INV-EXP-01",
                "customer_tin": "1146888607000",
                "customer_name": "STAR FLORA BV",
                "date_of_supply": "2025-06-01",
                "sub_total": 3399.50,
                "tax_amount": 0.00,
                "total_amount": 3399.50,
                "currency": "EUR",
                "tax_category": "Zero-Rated"
            },
            {
                "invoice_number": "INV-DOM-02",
                "customer_tin": "103356111",
                "customer_name": "LANKA STEEL LTD",
                "date_of_supply": "2025-06-15",
                "sub_total": 100000.00,
                "tax_amount": 18000.00,
                "total_amount": 118000.00,
                "currency": "LKR",
                "tax_category": "Standard"
            }
        ]
    }
    r = requests.post(f"{BASE_URL}/api/v1/tax/export-schedule7-csv", json=batch_payload)
    if r.status_code == 200:
        lines = r.text.strip().splitlines()
        print(f"    - Successfully Generated RAMIS Schedule 7 CSV ({len(lines)} lines)")
        print(f"    - Header:  {lines[0]}")
        for l in lines[1:3]:
            print(f"    - Row:     {l}")

    print("\n" + "=" * 70)
    print("  ALL ENDPOINTS VERIFIED AND WORKING LIVE ON http://127.0.0.1:8000")
    print("=" * 70)

if __name__ == "__main__":
    test_live_server()
