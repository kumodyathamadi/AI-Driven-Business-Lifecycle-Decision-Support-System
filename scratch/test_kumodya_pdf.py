import sqlite3
import json
import os
import sys

sys.path.insert(0, os.path.abspath("."))

from backend.services.business_plan_generator.report_builder import BusinessPlanReportBuilder
from backend.services.business_plan_generator.pdf_generator import BusinessPlanPDFGenerator
from backend.services.business_plan_generator.docx_generator import BusinessPlanDocxGenerator

def test_kumodya():
    conn = sqlite3.connect("data/component_1.db")
    cur = conn.cursor()
    cur.execute("SELECT structured_profile FROM analysis_records WHERE id = ?", ("5e8c7346-f61a-49e1-909e-d155404b95c9",))
    row = cur.fetchone()
    prof = json.loads(row[0])
    prof["cover_image"] = "default"
    
    report_data = BusinessPlanReportBuilder.build_report_data(prof)
    pdf_bytes = BusinessPlanPDFGenerator.generate_pdf(report_data)
    docx_bytes = BusinessPlanDocxGenerator.generate_docx(report_data)
    
    print(f"Kumodya Foods PDF with default cover: {len(pdf_bytes):,} bytes")
    print(f"Kumodya Foods DOCX with default cover: {len(docx_bytes):,} bytes")
    
    with open("scratch/kumodya_foods_with_cover.pdf", "wb") as f:
        f.write(pdf_bytes)
    with open("scratch/kumodya_foods_with_cover.docx", "wb") as f:
        f.write(docx_bytes)
    print("Saved successfully to scratch/kumodya_foods_with_cover.pdf and .docx!")

if __name__ == "__main__":
    test_kumodya()
