import os
import sys
from PIL import Image

sys.path.insert(0, os.path.abspath("."))

from tests.test_report_improvements import get_sample_new_startup_input, get_sample_existing_business_input
from src.orchestrator import analyze_business
from backend.services.business_plan_generator.report_builder import BusinessPlanReportBuilder
from backend.services.business_plan_generator.pdf_generator import BusinessPlanPDFGenerator
from backend.services.business_plan_generator.docx_generator import BusinessPlanDocxGenerator
from backend.services.business_plan_generator.cover_image_handler import CoverImageHandler

SAMPLE_IMG_PATH = r"C:\Users\DELL\.gemini\antigravity-ide\brain\c05ca666-e51a-4d59-ae55-14f6dbb97532\.user_uploaded\media_1791484946420.png"

def run_tests():
    print("Testing Cover Page E2E...")
    
    # 1. Base input
    input_data = get_sample_new_startup_input()
    prof = analyze_business(input_data)
    
    # 2. Test without cover image
    report_no_cover = BusinessPlanReportBuilder.build_report_data(prof)
    pdf_no_cov = BusinessPlanPDFGenerator.generate_pdf(report_no_cover)
    docx_no_cov = BusinessPlanDocxGenerator.generate_docx(report_no_cover)
    print(f"No Cover -> PDF size: {len(pdf_no_cov):,} bytes | DOCX size: {len(docx_no_cov):,} bytes")
    assert len(pdf_no_cov) > 1000
    assert len(docx_no_cov) > 1000
    
    # 3. Test with PNG cover image
    prof["cover_image"] = SAMPLE_IMG_PATH
    report_with_cover = BusinessPlanReportBuilder.build_report_data(prof)
    pdf_with_cov = BusinessPlanPDFGenerator.generate_pdf(report_with_cover)
    docx_with_cov = BusinessPlanDocxGenerator.generate_docx(report_with_cover)
    print(f"PNG Cover -> PDF size: {len(pdf_with_cov):,} bytes | DOCX size: {len(docx_with_cov):,} bytes")
    assert len(pdf_with_cov) > len(pdf_no_cov)
    assert len(docx_with_cov) > len(docx_no_cov)
    
    with open("scratch/generated_with_cover.pdf", "wb") as f:
        f.write(pdf_with_cov)
    with open("scratch/generated_with_cover.docx", "wb") as f:
        f.write(docx_with_cov)
    print("Saved scratch/generated_with_cover.pdf and scratch/generated_with_cover.docx!")

if __name__ == "__main__":
    run_tests()
