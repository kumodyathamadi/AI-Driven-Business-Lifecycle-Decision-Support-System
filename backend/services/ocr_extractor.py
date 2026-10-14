# backend/services/ocr_extractor.py
import io
import re
from datetime import datetime, date
from typing import Dict, Any, Optional
from pypdf import PdfReader

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

_extractor_instance = ContextAwareAmountExtractor()

def extract_amounts_from_text(document_text: str) -> OCRExtractionResponse:
    """
    Executes the 6-step context-aware document amount extraction pipeline on raw text.
    """
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
    """
    Extracts text from an uploaded invoice PDF file and executes the 6-step rule engine.
    """
    reader = PdfReader(io.BytesIO(pdf_bytes))
    extracted_text_chunks = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            extracted_text_chunks.append(page_text)
            
    full_text = "\n".join(extracted_text_chunks)
    return extract_amounts_from_text(full_text)


def run_integrated_pipeline(req: IntegratedPipelineRequest) -> IntegratedPipelineResponse:
    """
    Full Component 3 Unified Pipeline:
    Step 1: Context-aware OCR amount extraction
    Step 2: If passed -> Sri Lankan RAMIS tax classification (Cage A, D, E)
    Step 3: If passed -> Cross-referencing against physical stock logs via Isolation Forest
    Step 4: Final routing decision (AUTO_APPROVED or HELD_FOR_REVIEW)
    """
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
        
    # Construct normalized InvoiceData from OCR extraction
    # Parse date if possible
    try:
        parsed_date = datetime.strptime(amounts.invoice_date, "%Y-%m-%d").date()
    except Exception:
        parsed_date = date.today()
        
    invoice_obj = InvoiceData(
        invoice_number=amounts.invoice_number,
        date_of_supply=parsed_date,
        sub_total=amounts.sub_total,
        tax_amount=amounts.tax_amount,
        total_amount=amounts.total_amount,
        currency=amounts.currency,
        tax_category=amounts.tax_category
    )
    
    # 2. Tax Classification
    tax_result = categorize_and_calculate_tax(invoice_obj)
    
    # 3. Fraud & Anomaly Risk Assessment
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
