# backend/routes/financial_monitoring.py
import sys
import os
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, status, UploadFile, File
from fastapi.responses import Response


# Ensure root path is accessible
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.schemas import (
    InvoiceData,
    Schedule7BatchRequest,
    BatchTaxProcessResponse,
    FraudCheckRequest,
    FraudRiskAssessment,
    ReviewActionRequest,
    ReviewActionResponse,
    OCRExtractionRequest,
    OCRExtractionResponse,
    IntegratedPipelineRequest,
    IntegratedPipelineResponse
)
from backend.services.tax_engine import (
    categorize_and_calculate_tax,
    process_batch_invoices,
    generate_schedule7_csv
)
from backend.services.anomaly_detector import (
    evaluate_transaction_risk,
    get_review_queue_items,
    handle_review_action
)
from backend.services.ocr_extractor import (
    extract_amounts_from_text,
    extract_amounts_from_pdf_bytes,
    run_integrated_pipeline
)


router = APIRouter(tags=["Component 3: Financial Monitoring & Tax Compliance"])


# -------------------------------------------------------------
# Single Invoice Processing & RAMIS Schedule 7 Cage Mapping
# -------------------------------------------------------------
@router.post("/api/financial/process-invoice", status_code=status.HTTP_200_OK)
@router.post("/api/financial/tax/process-invoice", status_code=status.HTTP_200_OK)
@router.post("/api/v1/process-invoice", status_code=status.HTTP_200_OK)
@router.post("/api/v1/tax/process-invoice", status_code=status.HTTP_200_OK)
def process_invoice(invoice: InvoiceData):
    """
    Component 3: Analyzes an invoice payload, converts foreign currency amounts to LKR,
    and maps transactions to Sri Lankan RAMIS VAT Schedule 7 Cages (Cage A, Cage D, Cage E).
    """
    try:
        tax_result = categorize_and_calculate_tax(invoice)
        return {
            "status": "success",
            "message": "Invoice processed and mapped to VAT Schedule 7",
            "tax_analysis": tax_result.model_dump(),
            "original_data": invoice.model_dump()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Error processing invoice tax calculation: {str(e)}"
        )


# -------------------------------------------------------------
# Batch Invoice Processing & Form 2540 Summary
# -------------------------------------------------------------
@router.post("/api/financial/tax/batch-process", response_model=BatchTaxProcessResponse, status_code=status.HTTP_200_OK)
@router.post("/api/v1/tax/batch-process", response_model=BatchTaxProcessResponse, status_code=status.HTTP_200_OK)
def batch_process_invoices(batch_request: Schedule7BatchRequest):
    """
    Component 3: Processes multiple invoices for a specified tax period,
    producing individual cage classifications and a Form 2540 (VAT Return) summary.
    """
    try:
        return process_batch_invoices(batch_request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to process invoice batch: {str(e)}"
        )


# -------------------------------------------------------------
# Sri Lankan IRD RAMIS Schedule 7 CSV Export
# -------------------------------------------------------------
@router.post("/api/financial/tax/export-schedule7-csv", status_code=status.HTTP_200_OK)
@router.post("/api/v1/tax/export-schedule7-csv", status_code=status.HTTP_200_OK)
def export_schedule7_csv(batch_request: Schedule7BatchRequest):
    """
    Component 3: Generates a CSV export matching the official Sri Lankan Inland Revenue
    Department (IRD) RAMIS VAT Schedule 7 upload specification.
    """
    try:
        csv_content, filename = generate_schedule7_csv(batch_request)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "X-RAMIS-Taxpayer-TIN": batch_request.taxpayer_tin,
                "X-RAMIS-Tax-Period": batch_request.tax_period
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to generate RAMIS Schedule 7 CSV: {str(e)}"
        )


# =============================================================
# Component 3: Unsupervised Fraud & Anomaly Detection Routes
# =============================================================

@router.post("/api/financial/fraud/check-transaction", response_model=FraudRiskAssessment, status_code=status.HTTP_200_OK)
@router.post("/api/v1/fraud/check-transaction", response_model=FraudRiskAssessment, status_code=status.HTTP_200_OK)
def check_transaction_fraud(request: FraudCheckRequest):
    """
    Component 3: Evaluates operational fraud and anomaly risk by cross-referencing
    invoiced financial revenue directly with physical inventory stock depletion.
    
    Returns:
      - Risk Score (0-100)
      - Decision (PASS -> Secure Storage, FAIL -> Review Queue)
      - Contextual Reason Flags (e.g. stock shortfall, unusual hours, duplicate rush)
    """
    try:
        return evaluate_transaction_risk(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Fraud evaluation failed: {str(e)}"
        )


@router.get("/api/financial/fraud/review-queue", response_model=List[Dict[str, Any]], status_code=status.HTTP_200_OK)
@router.get("/api/v1/fraud/review-queue", response_model=List[Dict[str, Any]], status_code=status.HTTP_200_OK)
def get_fraud_review_queue():
    """
    Component 3: Retrieves all flagged high-risk transactions awaiting human-in-the-loop audit.
    Matches the ClearLedger Fraud Review Queue.
    """
    return get_review_queue_items()


@router.post("/api/financial/fraud/review-action", response_model=ReviewActionResponse, status_code=status.HTTP_200_OK)
@router.post("/api/v1/fraud/review-action", response_model=ReviewActionResponse, status_code=status.HTTP_200_OK)
def submit_review_decision(action_req: ReviewActionRequest):
    """
    Component 3: Submits an auditor's decision (Approve as valid, Reject transaction, Correct & resubmit)
    with audit justification notes for human-in-the-loop resolution.
    """
    try:
        return handle_review_action(action_req)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to submit review action: {str(e)}"
        )


# =============================================================
# Component 3: 6-Step Context-Aware OCR Amount Extraction Routes
# =============================================================

@router.post("/api/financial/ocr/extract-amounts", response_model=OCRExtractionResponse, status_code=status.HTTP_200_OK)
@router.post("/api/v1/ocr/extract-amounts", response_model=OCRExtractionResponse, status_code=status.HTTP_200_OK)
def extract_invoice_amounts_text(req: OCRExtractionRequest):
    """
    Component 3: Executes the 6-Step Context-Aware Amount Extraction Engine on OCR raw text.
    Rejects decoys (TINs, dates, phone numbers) and validates Subtotal + Tax = Total.
    """
    try:
        return extract_amounts_from_text(req.document_text)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"OCR extraction failed: {str(e)}"
        )


@router.post("/api/financial/ocr/upload-pdf", response_model=OCRExtractionResponse, status_code=status.HTTP_200_OK)
@router.post("/api/v1/ocr/upload-pdf", response_model=OCRExtractionResponse, status_code=status.HTTP_200_OK)
async def upload_invoice_pdf(file: UploadFile = File(...)):
    """
    Component 3: Accepts a scanned or digital PDF tax invoice/receipt, extracts layout text,
    and runs the 6-Step Context-Aware Amount Extraction Engine.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a PDF document."
        )
    try:
        pdf_bytes = await file.read()
        return extract_amounts_from_pdf_bytes(pdf_bytes)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to process PDF invoice: {str(e)}"
        )


@router.post("/api/financial/pipeline/process-transaction", response_model=IntegratedPipelineResponse, status_code=status.HTTP_200_OK)
@router.post("/api/v1/pipeline/process-transaction", response_model=IntegratedPipelineResponse, status_code=status.HTTP_200_OK)
def run_end_to_end_pipeline(req: IntegratedPipelineRequest):
    """
    Component 3: Unified End-to-End Execution Pipeline:
      1. Context-aware OCR amount extraction with decoy rejection & math check.
      2. If passed -> Sri Lankan RAMIS tax classification (Cage A, D, E) & LKR conversion.
      3. If passed -> Cross-referencing against physical stock depletion via Isolation Forest.
      4. Auto-approval vs. routing to Human Review Queue.
    """
    try:
        return run_integrated_pipeline(req)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"End-to-End Pipeline failed: {str(e)}"
        )

