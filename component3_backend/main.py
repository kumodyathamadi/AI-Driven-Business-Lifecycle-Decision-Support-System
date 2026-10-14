# component3_backend/main.py
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import Response
from schemas import (
    InvoiceData,
    Schedule7BatchRequest,
    BatchTaxProcessResponse,
    FraudCheckRequest,
    FraudRiskAssessment,
    ReviewActionRequest,
    ReviewActionResponse
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

app = FastAPI(
    title="AI-Based Financial Monitoring & Tax Compliance API",
    description="Undergraduate Research Project J26-IT-362 - Component 3: Tax Engine, RAMIS Schedule 7, and Operational Fraud Anomaly Detection",
    version="1.1.0"
)

@app.get("/health")
async def health_check():
    """Service liveness and health status check."""
    return {"status": "ok", "service": "Component 3 Financial Monitoring API"}


# -------------------------------------------------------------
# Single Invoice Processing (Backward compatible + New Tax Route)
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


# -------------------------------------------------------------
# Batch Processing & Form 2540 Summary
# -------------------------------------------------------------
@app.post("/api/v1/tax/batch-process", response_model=BatchTaxProcessResponse, status_code=status.HTTP_200_OK)
async def batch_process_endpoint(batch_request: Schedule7BatchRequest):
    try:
        return process_batch_invoices(batch_request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to process invoice batch: {str(e)}"
        )


# -------------------------------------------------------------
# IRD RAMIS VAT Schedule 7 CSV Export
# -------------------------------------------------------------
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