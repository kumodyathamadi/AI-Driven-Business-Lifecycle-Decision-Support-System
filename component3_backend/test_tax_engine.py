# component3_backend/test_tax_engine.py
from datetime import date
from schemas import InvoiceData, Schedule7BatchRequest
from tax_engine import categorize_and_calculate_tax, process_batch_invoices, generate_schedule7_csv

def test_cage_a_standard_vat():
    # 1. Standard 18% VAT invoice in LKR
    inv = InvoiceData(
        invoice_number="INV-2024-001",
        date_of_supply=date(2024, 3, 15),
        sub_total=100000.0,
        tax_amount=18000.0,
        total_amount=118000.0,
        currency="LKR",
        tax_category="18%",
        supplier_name="ABC Manufacturing Pvt Ltd",
        supplier_tin="102938475",
        customer_name="Colombo Retailers",
        customer_tin="987654321",
        exchange_rate=1.0,
        description_of_supply="Textile and garments delivery"
    )
    result = categorize_and_calculate_tax(inv)
    assert result.schedule_7_cage == "Cage A"
    assert result.applied_tax_rate == 18.0
    assert result.base_value_lkr == 100000.0
    assert result.tax_amount_lkr == 18000.0
    assert result.total_value_lkr == 118000.0
    print("PASS: test_cage_a_standard_vat")

def test_cage_d_zero_rated_export():
    # 2. Foreign currency export invoice (Zero-Rated Cage D)
    inv = InvoiceData(
        invoice_number="EXP-2024-889",
        date_of_supply=date(2024, 3, 18),
        sub_total=1000.0, # 1,000 USD
        tax_amount=0.0,
        total_amount=1000.0,
        currency="USD",
        tax_category="Zero-Rated",
        supplier_name="ABC Manufacturing Pvt Ltd",
        supplier_tin="102938475",
        customer_name="Global Apparel UK Ltd",
        customer_tin=None, # Foreign client
        exchange_rate=305.50, # 1 USD = 305.50 LKR
        description_of_supply="Software export services"
    )
    result = categorize_and_calculate_tax(inv)
    assert result.schedule_7_cage == "Cage D"
    assert result.applied_tax_rate == 0.0
    assert result.base_value_lkr == 305500.0
    assert result.tax_amount_lkr == 0.0
    assert result.total_value_lkr == 305500.0
    print("PASS: test_cage_d_zero_rated_export")

def test_cage_e_exempt_supply():
    # 3. Exempt supply (Cage E)
    inv = InvoiceData(
        invoice_number="EXM-2024-002",
        date_of_supply=date(2024, 3, 20),
        sub_total=50000.0,
        tax_amount=0.0,
        total_amount=50000.0,
        currency="LKR",
        tax_category="Exempt",
        supplier_name="ABC Manufacturing Pvt Ltd",
        supplier_tin="102938475",
        customer_name="National Education Academy",
        customer_tin="554433221",
        exchange_rate=1.0,
        description_of_supply="Educational publication supplies"
    )
    result = categorize_and_calculate_tax(inv)
    assert result.schedule_7_cage == "Cage E"
    assert result.applied_tax_rate == 0.0
    assert result.base_value_lkr == 50000.0
    assert result.tax_amount_lkr == 0.0
    assert result.total_value_lkr == 50000.0
    print("PASS: test_cage_e_exempt_supply")

def test_batch_and_csv_generation():
    # 4. Batch Processing and RAMIS CSV Export
    inv1 = InvoiceData(
        invoice_number="INV-001",
        date_of_supply=date(2024, 3, 10),
        sub_total=100000.0,
        tax_amount=18000.0,
        total_amount=118000.0,
        currency="LKR",
        tax_category="Standard",
        supplier_tin="102938475",
        customer_tin="987654321"
    )
    inv2 = InvoiceData(
        invoice_number="INV-002",
        date_of_supply=date(2024, 3, 11),
        sub_total=500.0,
        tax_amount=0.0,
        total_amount=500.0,
        currency="USD",
        tax_category="Zero-Rated",
        exchange_rate=300.0
    )
    inv3 = InvoiceData(
        invoice_number="INV-003",
        date_of_supply=date(2024, 3, 12),
        sub_total=25000.0,
        tax_amount=0.0,
        total_amount=25000.0,
        currency="LKR",
        tax_category="Exempt"
    )
    
    batch = Schedule7BatchRequest(
        taxpayer_tin="102938475",
        taxpayer_name="ABC Manufacturing Pvt Ltd",
        tax_period="2024-Q1",
        invoices=[inv1, inv2, inv3]
    )
    
    batch_resp = process_batch_invoices(batch)
    summary = batch_resp.summary
    assert summary.total_invoices_count == 3
    assert summary.cage_a_standard.total_base_value_lkr == 100000.0
    assert summary.cage_a_standard.total_tax_amount_lkr == 18000.0
    assert summary.cage_d_zero_rated.total_base_value_lkr == 150000.0
    assert summary.cage_e_exempt.total_base_value_lkr == 25000.0
    assert summary.grand_total_turnover_lkr == 275000.0
    assert summary.grand_total_output_tax_lkr == 18000.0
    print("PASS: test_batch_processing_and_form2540_summary")
    
    # Check CSV Generation
    csv_content, filename = generate_schedule7_csv(batch)
    assert filename == "102938475_VAT_SCHEDULE07_2024Q1.csv"
    assert "Serial No,Tax Period,Taxpayer TIN,Taxpayer Name" in csv_content
    assert "INV-001" in csv_content
    assert "INV-002" in csv_content
    assert "Cage A" in csv_content
    assert "Cage D" in csv_content
    assert "Cage E" in csv_content
    print("PASS: test_csv_generation")

if __name__ == "__main__":
    test_cage_a_standard_vat()
    test_cage_d_zero_rated_export()
    test_cage_e_exempt_supply()
    test_batch_and_csv_generation()
    print("\nALL TAX ENGINE & RAMIS SCHEDULE 7 TESTS PASSED SUCCESSFULLY!")
