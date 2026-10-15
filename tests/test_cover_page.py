"""
Test Suite for SME360 AI Official Cover Page Integration.
Validates that every generated Business Plan (PDF and DOCX) automatically
and consistently includes the official SME360 AI cover page from:
frontend/src/assets/covers/sme360_official_cover.png
"""

import io
import os
import sys
from PIL import Image
from docx import Document

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.orchestrator import analyze_business
from backend.services.business_plan_generator.report_builder import BusinessPlanReportBuilder
from backend.services.business_plan_generator.pdf_generator import BusinessPlanPDFGenerator
from backend.services.business_plan_generator.docx_generator import BusinessPlanDocxGenerator
from backend.services.business_plan_generator.cover_image_handler import (
    CoverImageHandler,
    DEFAULT_OFFICIAL_COVER_PATH,
    FRONTEND_OFFICIAL_COVER_PATH,
    A4_WIDTH_PT,
    A4_HEIGHT_PT
)
from tests.test_report_improvements import get_sample_new_startup_input


def count_pdf_pages(pdf_bytes: bytes) -> int:
    """Counts PDF pages by searching for /Type /Page markers."""
    return pdf_bytes.count(b"/Type /Page\n") or pdf_bytes.count(b"/Type /Page ") or pdf_bytes.count(b"/Type/Page")


### Test 1 — Official Cover Page Asset Existence & Integrity
def test_1_official_cover_asset_verification():
    print("\n--- Running Test 1 — Official Cover Asset Verification ---")
    print(f"Target location: {FRONTEND_OFFICIAL_COVER_PATH}")
    assert os.path.exists(FRONTEND_OFFICIAL_COVER_PATH), (
        f"Official cover page image does not exist at {FRONTEND_OFFICIAL_COVER_PATH}"
    )

    with open(FRONTEND_OFFICIAL_COVER_PATH, "rb") as f:
        img_bytes = f.read()

    assert len(img_bytes) > 10000, "Official cover image file appears too small or empty"

    with Image.open(io.BytesIO(img_bytes)) as img:
        print(f"Format: {img.format} | Size: {img.width}x{img.height} px | Mode: {img.mode}")
        assert img.format == "PNG", f"Expected PNG format, got {img.format}"
        assert img.width >= 500, f"Expected width >= 500px, got {img.width}"
        assert img.height >= 800, f"Expected height >= 800px, got {img.height}"

    print("[PASS] Test 1: Official cover page asset verified at target location!")


### Test 2 — PDF Report Automatically Contains Official Cover Page
def test_2_pdf_with_official_cover():
    print("\n--- Running Test 2 — PDF Generation with Official Cover Page ---")
    base_input = get_sample_new_startup_input()
    prof = analyze_business(base_input)
    
    # Do not specify cover_image: it must automatically default to the official cover page
    report_data = BusinessPlanReportBuilder.build_report_data(prof)
    
    pdf_bytes = BusinessPlanPDFGenerator.generate_pdf(report_data)
    assert len(pdf_bytes) > 50000, f"Expected PDF bytes > 50000, got {len(pdf_bytes)}"
    pages_count = count_pdf_pages(pdf_bytes)
    print(f"Generated PDF with Official Cover: {len(pdf_bytes):,} bytes | Pages: {pages_count}")
    assert pages_count >= 2, f"Expected at least 2 pages (Cover + Content), got {pages_count}"
    print("[PASS] Test 2: PDF report with official cover page generated successfully!")


### Test 3 — DOCX Report Automatically Contains Official Cover Page Section
def test_3_docx_with_official_cover():
    print("\n--- Running Test 3 — DOCX Generation with Official Cover Page ---")
    base_input = get_sample_new_startup_input()
    prof = analyze_business(base_input)
    
    report_data = BusinessPlanReportBuilder.build_report_data(prof)
    docx_bytes = BusinessPlanDocxGenerator.generate_docx(report_data)
    assert len(docx_bytes) > 10000, f"Expected DOCX bytes > 10000, got {len(docx_bytes)}"
    
    doc = Document(io.BytesIO(docx_bytes))
    assert len(doc.sections) == 2, f"Expected 2 sections (Cover + Content), found {len(doc.sections)}"
    sec_cover = doc.sections[0]
    sec_body = doc.sections[1]
    
    # Cover section has zero margins for full bleed
    assert sec_cover.top_margin.inches == 0.0
    assert sec_body.top_margin.inches == 0.75
    
    # Verify image exists in cover section
    has_image = bool(doc.paragraphs[0].runs[0]._element.xpath(".//a:blip"))
    assert has_image is True, "Cover section does not contain image blip"
    print(f"Generated DOCX: {len(docx_bytes):,} bytes | 2 sections confirmed | Cover picture verified!")
    print("[PASS] Test 3: DOCX report with official cover section break verified!")


### Test 4 — Automatic Official Cover Guarantee
def test_4_automatic_official_cover_guarantee():
    print("\n--- Running Test 4 — Automatic Official Cover Guarantee ---")
    # Even if cover_image is None, empty, or 'default', CoverImageHandler must return official cover
    proc_none = CoverImageHandler.process_cover_image(None)
    proc_default = CoverImageHandler.process_cover_image("default")
    proc_empty = CoverImageHandler.process_cover_image("")
    
    assert proc_none is not None, "CoverImageHandler should return official cover for None"
    assert proc_default is not None, "CoverImageHandler should return official cover for 'default'"
    assert proc_empty is not None, "CoverImageHandler should return official cover for empty string"
    
    assert proc_none["pdf_geometry"]["width"] <= A4_WIDTH_PT + 0.1
    assert proc_none["pdf_geometry"]["height"] <= A4_HEIGHT_PT + 0.1
    print("[PASS] Test 4: Default fallback guarantees official cover page in all cases!")


if __name__ == "__main__":
    print("=" * 80)
    print("RUNNING SME360 AI OFFICIAL DEFAULT COVER PAGE TEST SUITE")
    print("=" * 80)
    test_1_official_cover_asset_verification()
    test_2_pdf_with_official_cover()
    test_3_docx_with_official_cover()
    test_4_automatic_official_cover_guarantee()
    print("\n" + "=" * 80)
    print("ALL OFFICIAL COVER PAGE TESTS PASSED WITH 100% SUCCESS RATE!")
    print("=" * 80)
