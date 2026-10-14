# backend/routes/financial_monitoring.py
import sys
import os
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import Response

# Ensure root path is accessible
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.schemas import (
    InvoiceData,
    Schedule7BatchRequest,
    BatchTaxProcessResponse
)
from backend.services.tax_engine import (
    categorize_and_calculate_tax,
    process_batch_invoices,
    generate_schedule7_csv
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
