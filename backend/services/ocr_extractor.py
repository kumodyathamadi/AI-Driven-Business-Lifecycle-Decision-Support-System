# component3_backend/ocr_extractor.py
import os
import io
import re
import tempfile
import subprocess
from datetime import datetime, date
from typing import Dict, Any, Optional
from pypdf import PdfReader

try:
    from backend.schemas import (
        OCRExtractionRequest,
        OCRExtractionResponse,
        ExtractedAmountDetails,
        StepLog,
        InvoiceData,
        IntegratedPipelineRequest,
        IntegratedPipelineResponse
    )
    from src.ocr.rule_extractor import ContextAwareAmountExtractor
    from backend.services.tax_engine import categorize_and_calculate_tax
    from backend.services.anomaly_detector import evaluate_transaction_risk, FraudCheckRequest
except ImportError:
    from schemas import (
        OCRExtractionRequest,
        OCRExtractionResponse,
        ExtractedAmountDetails,
        StepLog,
        InvoiceData,
        IntegratedPipelineRequest,
        IntegratedPipelineResponse
    )
    from rule_extractor import ContextAwareAmountExtractor
    from tax_engine import categorize_and_calculate_tax
    from anomaly_detector import evaluate_transaction_risk, FraudCheckRequest

_extractor_instance = ContextAwareAmountExtractor()

def parse_date_robust(date_str: Optional[str]) -> date:
    """Parses various date string formats to a standard date object."""
    if not date_str:
        return date.today()
    clean = re.sub(r'\s+', ' ', date_str.strip())
    clean_no_space = clean.replace(' /', '/').replace('/ ', '/')
    for fmt in ["%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%m/%d/%Y", "%Y/%m/%d", "%d %b %Y", "%d %B %Y"]:
        try:
            return datetime.strptime(clean_no_space, fmt).date()
        except ValueError:
            pass
    return date.today()

def perform_windows_ocr(pdf_reader: PdfReader) -> str:
    """
    Extracts high-resolution scanned page images from PDF and applies Windows Native OCR.
    """
    all_lines = []
    base_dir = os.path.dirname(os.path.abspath(__file__))
    ps1_path = os.path.join(base_dir, "run_ocr.ps1")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        for p_idx, page in enumerate(pdf_reader.pages):
            for i_idx, img in enumerate(page.images):
                img_path = os.path.join(tmpdir, f"page_{p_idx}_img_{i_idx}.png")
                with open(img_path, "wb") as f:
                    f.write(img.data)
                
                try:
                    res = subprocess.run(
                        ["powershell", "-ExecutionPolicy", "Bypass", "-File", ps1_path, "-ImagePath", img_path],
                        capture_output=True,
                        text=True,
                        encoding="utf-8",
                        errors="replace",
                        timeout=30
                    )
                    if res.returncode == 0 and res.stdout:
                        lines = [l.strip() for l in res.stdout.splitlines() if l.strip()]
                        all_lines.extend(lines)
                except Exception as e:
                    print(f"Error running Windows OCR on page {p_idx}: {e}")
                    
    return "\n".join(all_lines)

def extract_amounts_from_text(document_text: str) -> OCRExtractionResponse:
    raw_res = _extractor_instance.extract(document_text)
    amounts_data = raw_res["extracted_amounts"]
    amounts_obj = ExtractedAmountDetails(
        sub_total=amounts_data["sub_total"],
        tax_amount=amounts_data["tax_amount"],
        total_amount=amounts_data["total_amount"],
        currency=amounts_data["currency"],
        tax_category=amounts_data["tax_category"],
        invoice_number=amounts_data["invoice_number"],
        invoice_date=amounts_data["invoice_date"],
        is_math_valid=amounts_data["is_math_valid"],
        math_difference=amounts_data["math_difference"]
    )
    step_logs_objs = [
        StepLog(step=s["step"], details=s["details"]) for s in raw_res["step_logs"]
    ]
    return OCRExtractionResponse(
        status="success",
        confidence_score=raw_res["confidence_score"],
        decision=raw_res["decision"],
        routing=raw_res["routing"],
        extracted_amounts=amounts_obj,
        step_logs=step_logs_objs,
        rejected_decoys_count=raw_res["rejected_decoys_count"],
        sample_decoys=raw_res["sample_decoys"]
    )


def extract_amounts_from_pdf_bytes(pdf_bytes: bytes) -> OCRExtractionResponse:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    extracted_text_chunks = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            extracted_text_chunks.append(page_text)
    full_text = "\n".join(extracted_text_chunks).strip()
    
    # If the PDF is a scanned document with no programmatic text stream, fallback to Windows Native OCR
    if len(full_text) < 30:
        ocr_text = perform_windows_ocr(reader)
        if ocr_text:
            full_text = ocr_text

    return extract_amounts_from_text(full_text)


def run_integrated_pipeline(req: IntegratedPipelineRequest) -> IntegratedPipelineResponse:
    ocr_res = extract_amounts_from_text(req.document_text or "")
    amounts = ocr_res.extracted_amounts
    if ocr_res.decision != "AUTO_PASS":
        return IntegratedPipelineResponse(
            status="held",
            ocr_result=ocr_res,
            tax_result=None,
            fraud_assessment=None,
            final_pipeline_decision="HELD_FOR_REVIEW"
        )
    parsed_date = parse_date_robust(amounts.invoice_date)
    invoice_obj = InvoiceData(
        invoice_number=amounts.invoice_number,
        date_of_supply=parsed_date,
        sub_total=amounts.sub_total,
        tax_amount=amounts.tax_amount,
        total_amount=amounts.total_amount,
        currency=amounts.currency,
        tax_category=amounts.tax_category
    )
    tax_result = categorize_and_calculate_tax(invoice_obj)
    fraud_req = FraudCheckRequest(
        transaction_id=f"TXN-{amounts.invoice_number}",
        invoice_data=invoice_obj,
        item_id=req.item_id or "ITEM-GEN-01",
        quantity_invoiced=req.quantity_invoiced or 1.0,
        stock_depletion_log=req.stock_depletion_log,
        transaction_time=req.transaction_time or datetime.utcnow()
    )
    fraud_assessment = evaluate_transaction_risk(fraud_req)
    final_decision = "AUTO_APPROVED" if fraud_assessment.decision == "PASS" else "HELD_FOR_REVIEW"
    return IntegratedPipelineResponse(
        status="success",
        ocr_result=ocr_res,
        tax_result=tax_result,
        fraud_assessment=fraud_assessment,
        final_pipeline_decision=final_decision
    )
