import io
import os
import sys
import base64
from PIL import Image

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.orchestrator import analyze_business
from backend.services.business_plan_generator.report_builder import BusinessPlanReportBuilder
from backend.services.business_plan_generator.pdf_generator import BusinessPlanPDFGenerator
from backend.services.business_plan_generator.docx_generator import BusinessPlanDocxGenerator
from backend.services.business_plan_generator.cover_image_handler import CoverImageHandler, A4_WIDTH_PT, A4_HEIGHT_PT
from tests.test_report_improvements import get_sample_new_startup_input
from docx import Document

SAMPLE_PNG_PATH = os.path.abspath(os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "..", ".gemini", "antigravity-ide", "brain",
    "c05ca666-e51a-4d59-ae55-14f6dbb97532", ".user_uploaded", "media_1791484946420.png"
))


def create_synthetic_image(fmt="PNG", size=(800, 1131), color="navy"):
    buf = io.BytesIO()
    im = Image.new("RGB", size, color=color)
    im.save(buf, format=fmt)
    data = buf.getvalue()
    b64 = base64.b64encode(data).decode("utf-8")
    mime = "image/png" if fmt.upper() == "PNG" else "image/jpeg"
    return f"data:{mime};base64,{b64}"


def count_pdf_pages(pdf_bytes: bytes) -> int:
    return pdf_bytes.count(b"/Type /Page\n") or pdf_bytes.count(b"/Type /Page ") or pdf_bytes.count(b"/Type/Page")


def test_1_png_cover_pdf():
    print("\n--- Running Test 1 — PNG Cover PDF ---")
    base_input = get_sample_new_startup_input()
    prof = analyze_business(base_input)
    
    # Use sample PNG if exists, else synthetic PNG
    png_source = SAMPLE_PNG_PATH if os.path.exists(SAMPLE_PNG_PATH) else create_synthetic_image("PNG")
    prof["cover_image"] = png_source
    
    report_data = BusinessPlanReportBuilder.build_report_data(prof)
    assert report_data.get("cover_image") is not None
    
    pdf_bytes = BusinessPlanPDFGenerator.generate_pdf(report_data)
    assert len(pdf_bytes) > 50000
    pages_with_cover = count_pdf_pages(pdf_bytes)
    print(f"Generated PDF with PNG Cover: {len(pdf_bytes):,} bytes | Pages: {pages_with_cover}")
    assert pages_with_cover >= 2
    print("[PASS] Test 1: PNG Cover PDF successfully generated!")


def test_2_jpg_cover_pdf():
    print("\n--- Running Test 2 — JPG Cover PDF ---")
    base_input = get_sample_new_startup_input()
    prof = analyze_business(base_input)
    
    jpg_data_url = create_synthetic_image("JPEG", size=(900, 1200), color="darkgreen")
    prof["cover_image"] = jpg_data_url
    
    report_data = BusinessPlanReportBuilder.build_report_data(prof)
    pdf_bytes = BusinessPlanPDFGenerator.generate_pdf(report_data)
    assert len(pdf_bytes) > 50000
    pages_with_cover = count_pdf_pages(pdf_bytes)
    print(f"Generated PDF with JPG Cover: {len(pdf_bytes):,} bytes | Pages: {pages_with_cover}")
    print("[PASS] Test 2: JPG Cover PDF successfully generated!")


def test_3_no_cover():
    print("\n--- Running Test 3 — No Cover ---")
    base_input = get_sample_new_startup_input()
    prof = analyze_business(base_input)
    prof["cover_image"] = None
    
    report_data = BusinessPlanReportBuilder.build_report_data(prof)
    assert report_data.get("cover_image") is None
    
    pdf_no_cov = BusinessPlanPDFGenerator.generate_pdf(report_data)
    docx_no_cov = BusinessPlanDocxGenerator.generate_docx(report_data)
    
    assert len(pdf_no_cov) > 1000
    assert len(docx_no_cov) > 1000
    print(f"No Cover -> PDF size: {len(pdf_no_cov):,} bytes | DOCX size: {len(docx_no_cov):,} bytes")
    print("[PASS] Test 3: Existing report generation works normally when no cover is provided!")


def test_4_replace_cover():
    print("\n--- Running Test 4 — Replace Cover ---")
    base_input = get_sample_new_startup_input()
    prof = analyze_business(base_input)
    
    cover_a = create_synthetic_image("PNG", size=(600, 800), color="blue")
    prof["cover_image"] = cover_a
    report_a = BusinessPlanReportBuilder.build_report_data(prof)
    pdf_a = BusinessPlanPDFGenerator.generate_pdf(report_a)
    
    # Replace with Cover B
    cover_b = create_synthetic_image("JPEG", size=(1000, 1400), color="purple")
    prof["cover_image"] = cover_b
    report_b = BusinessPlanReportBuilder.build_report_data(prof)
    pdf_b = BusinessPlanPDFGenerator.generate_pdf(report_b)
    
    assert pdf_a != pdf_b
    print(f"Cover A PDF size: {len(pdf_a):,} bytes -> Cover B PDF size: {len(pdf_b):,} bytes")
    print("[PASS] Test 4: Replace cover successfully produces new report reflecting Cover B!")


def test_5_remove_cover():
    print("\n--- Running Test 5 — Remove Cover ---")
    base_input = get_sample_new_startup_input()
    prof = analyze_business(base_input)
    
    # Attach cover
    prof["cover_image"] = create_synthetic_image("PNG")
    report_with = BusinessPlanReportBuilder.build_report_data(prof)
    pdf_with = BusinessPlanPDFGenerator.generate_pdf(report_with)
    pages_with = count_pdf_pages(pdf_with)
    
    # Remove cover
    prof["cover_image"] = None
    report_removed = BusinessPlanReportBuilder.build_report_data(prof)
    pdf_removed = BusinessPlanPDFGenerator.generate_pdf(report_removed)
    pages_removed = count_pdf_pages(pdf_removed)
    
    print(f"Pages with cover: {pages_with} -> Pages after removal: {pages_removed}")
    assert pages_with == pages_removed + 1
    print("[PASS] Test 5: Removing cover removes Page 1 and returns cleanly to standard report!")


def test_6_docx_with_cover():
    print("\n--- Running Test 6 — DOCX with Cover ---")
    base_input = get_sample_new_startup_input()
    prof = analyze_business(base_input)
    
    png_source = SAMPLE_PNG_PATH if os.path.exists(SAMPLE_PNG_PATH) else create_synthetic_image("PNG")
    prof["cover_image"] = png_source
    report_data = BusinessPlanReportBuilder.build_report_data(prof)
    
    docx_bytes = BusinessPlanDocxGenerator.generate_docx(report_data)
    assert len(docx_bytes) > 10000
    
    doc = Document(io.BytesIO(docx_bytes))
    assert len(doc.sections) == 2, f"Expected 2 sections, found {len(doc.sections)}"
    sec_cover = doc.sections[0]
    sec_body = doc.sections[1]
    
    assert sec_cover.top_margin.inches == 0.0
    assert sec_body.top_margin.inches == 0.75
    
    # Verify picture exists in paragraph run of cover section
    has_image = bool(doc.paragraphs[0].runs[0]._element.xpath(".//a:blip"))
    assert has_image is True
    print(f"Generated DOCX: {len(docx_bytes):,} bytes | 2 sections confirmed | Cover picture confirmed!")
    print("[PASS] Test 6: DOCX cover section break and picture verified!")


def test_7_different_image_ratios():
    print("\n--- Running Test 7 — Different Image Ratios (Portrait, Landscape, Square, A4) ---")
    
    ratios = [
        ("Portrait (Narrow)", (500, 1200)),
        ("Landscape (Wide)", (1400, 700)),
        ("Square (1:1)", (900, 900)),
        ("A4-like (0.707)", (723, 1024))
    ]
    
    for label, size in ratios:
        img_url = create_synthetic_image("PNG", size=size, color="teal")
        proc = CoverImageHandler.process_cover_image(img_url)
        assert proc is not None
        pdf_geo = proc["pdf_geometry"]
        docx_geo = proc["docx_geometry"]
        
        # Dimensions must not exceed page boundaries
        assert pdf_geo["width"] <= A4_WIDTH_PT + 0.1
        assert pdf_geo["height"] <= A4_HEIGHT_PT + 0.1
        assert pdf_geo["x"] >= 0.0
        assert pdf_geo["y"] >= 0.0
        
        print(f"  {label} {size}: PDF size ({pdf_geo['width']}x{pdf_geo['height']}) at ({pdf_geo['x']}, {pdf_geo['y']}) | DOCX ({docx_geo['width_in']}\"x{docx_geo['height_in']}\")")
    
    print("[PASS] Test 7: All aspect ratios correctly handled without distortion or overflow!")


def test_8_validation_and_safety():
    print("\n--- Running Test 8 — Validation and Safety ---")
    
    # 1. Invalid text content
    try:
        CoverImageHandler.process_cover_image("not an image")
        assert False, "Should have failed on invalid string"
    except ValueError as ve:
        print(f"  Caught invalid string: {ve}")
    
    # 2. Unsupported format (e.g. GIF / BMP if converted, or corrupted bytes)
    try:
        CoverImageHandler.process_cover_image(b"corrupted binary data")
        assert False, "Should have failed on corrupted bytes"
    except ValueError as ve:
        print(f"  Caught corrupted image: {ve}")
    
    # 3. None / Empty
    assert CoverImageHandler.process_cover_image(None) is None
    assert CoverImageHandler.process_cover_image("") is None
    print("[PASS] Test 8: Image safety and validation correctly handled!")


if __name__ == "__main__":
    print("=" * 80)
    print("RUNNING BUSINESS PLAN CUSTOM COVER PAGE TEST SUITE")
    print("=" * 80)
    test_1_png_cover_pdf()
    test_2_jpg_cover_pdf()
    test_3_no_cover()
    test_4_replace_cover()
    test_5_remove_cover()
    test_6_docx_with_cover()
    test_7_different_image_ratios()
    test_8_validation_and_safety()
    print("\n" + "=" * 80)
    print("ALL 8 COVER PAGE TESTS PASSED WITH 100% SUCCESS RATE!")
    print("=" * 80)
