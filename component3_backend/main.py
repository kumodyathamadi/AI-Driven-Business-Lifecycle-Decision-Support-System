# component3_backend/main.py
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import Response
from schemas import (
    InvoiceData,
    Schedule7BatchRequest,
    BatchTaxProcessResponse
)
from tax_engine import (
    categorize_and_calculate_tax,
    process_batch_invoices,
    generate_schedule7_csv
)

app = FastAPI(
    title="AI-Based Financial Monitoring & Tax Compliance API",
    description="Undergraduate Research Project J26-IT-362 - Component 3: Tax Engine, RAMIS Schedule 7, and Anomaly Detection",
    version="1.0.0"
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
    """
    Processes a single invoice payload from Node.js, computes LKR currency conversion,
    and maps it to RAMIS VAT Schedule 7 (Cage A, D, or E).
    """
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
    """
    Processes a batch of invoices for a taxable period, returning individual
    cage classifications and an aggregated Form 2540 (VAT Return) summary.
    """
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
    """
    Generates and returns an official Sri Lankan Inland Revenue Department (IRD)
    RAMIS VAT Schedule 7 compliant CSV file for bulk upload.
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