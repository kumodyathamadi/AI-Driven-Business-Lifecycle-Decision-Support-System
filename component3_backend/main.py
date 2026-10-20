# component3_backend/main.py
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException, status, UploadFile, File
from fastapi.responses import Response
from schemas import (
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
from tax_engine import (
    categorize_and_calculate_tax,
    process_batch_invoices,
    generate_schedule7_csv
)
from anomaly_detector import (
    evaluate_transaction_risk,
    get_review_queue_items,
    handle_review_action
)
from ocr_extractor import (
    extract_amounts_from_text,
    extract_amounts_from_pdf_bytes,
    run_integrated_pipeline
)

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="AI-Based Financial Monitoring & Tax Compliance API",
    description="Undergraduate Research Project J26-IT-362 - Component 3: Tax Engine, RAMIS Schedule 7, Anomaly Detection, and 6-Step OCR Amount Extraction",
    version="1.2.0"
)

# Enable CORS for React Frontend (Vite runs on port 5173 / localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
@app.get("/api/health")
@app.get("/api/v1/health")
async def health_check():
    """Service liveness and health status check."""
    return {"status": "ok", "service": "Component 3 Financial Monitoring API", "model_loaded": True}


# -------------------------------------------------------------
# Single & Batch Invoice Tax Processing
# -------------------------------------------------------------
@app.post("/api/v1/process-invoice", status_code=status.HTTP_200_OK)
@app.post("/api/v1/tax/process-invoice", status_code=status.HTTP_200_OK)
async def process_invoice_endpoint(invoice: InvoiceData):
    try:
        tax_result = categorize_and_calculate_tax(invoice)
        return {
            "status": "success",
            "message": "Invoice processed and mapped to VAT Schedule 7",
            "tax_analysis": tax_result.dict(),
            "original_data": invoice.dict()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Error processing invoice tax calculation: {str(e)}"
        )


@app.post("/api/v1/tax/batch-process", response_model=BatchTaxProcessResponse, status_code=status.HTTP_200_OK)
async def batch_process_endpoint(batch_request: Schedule7BatchRequest):
    try:
        return process_batch_invoices(batch_request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to process invoice batch: {str(e)}"
        )


@app.post("/api/v1/tax/export-schedule7-csv", status_code=status.HTTP_200_OK)
async def export_schedule7_csv_endpoint(batch_request: Schedule7BatchRequest):
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
# Component 3: Fraud & Anomaly Detection Routes
# =============================================================
@app.post("/api/v1/fraud/check-transaction", response_model=FraudRiskAssessment, status_code=status.HTTP_200_OK)
async def check_transaction_fraud_endpoint(request: FraudCheckRequest):
    try:
        return evaluate_transaction_risk(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Fraud evaluation failed: {str(e)}"
        )


@app.get("/api/v1/fraud/review-queue", response_model=List[Dict[str, Any]], status_code=status.HTTP_200_OK)
async def get_review_queue_endpoint():
    return get_review_queue_items()


@app.post("/api/v1/fraud/review-action", response_model=ReviewActionResponse, status_code=status.HTTP_200_OK)
async def submit_review_action_endpoint(action_req: ReviewActionRequest):
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
@app.post("/api/v1/ocr/extract-amounts", response_model=OCRExtractionResponse, status_code=status.HTTP_200_OK)
async def extract_amounts_text_endpoint(req: OCRExtractionRequest):
    try:
        return extract_amounts_from_text(req.document_text)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"OCR extraction failed: {str(e)}"
        )


@app.post("/api/v1/ocr/upload-pdf", response_model=OCRExtractionResponse, status_code=status.HTTP_200_OK)
async def upload_invoice_pdf_endpoint(file: UploadFile = File(...)):
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


@app.post("/api/v1/pipeline/process-transaction", response_model=IntegratedPipelineResponse, status_code=status.HTTP_200_OK)
async def pipeline_process_transaction_endpoint(req: IntegratedPipelineRequest):
    try:
        return run_integrated_pipeline(req)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Integrated pipeline execution failed: {str(e)}"
        )