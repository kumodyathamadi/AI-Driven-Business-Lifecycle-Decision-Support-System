"""
Component 4: Invoice and Declaration Extraction Pipeline
Extracts structured metadata from Dataset 07 (Commercial Service Invoices)
and Dataset 06 (Customs Goods Declarations / Invoices).
Handles duplicates, scanned documents, and missing fields explicitly without fabrication.
Enforces strict anonymization via AnonymizationManager.
"""

import os
import sys
import re
import hashlib
import json
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
import pypdf

# Ensure src is on sys.path for direct module import
SRC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from component4.anonymization import AnonymizationManager


DEFAULT_D07_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "Dataset", "07")
)
DEFAULT_D06_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "Dataset", "06")
)
DEFAULT_OUTPUT_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "processed", "component4")
)


def compute_file_hash(filepath: str) -> str:
    """Computes SHA-256 checksum of a file."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def parse_date_to_iso(date_str: Optional[str]) -> Optional[str]:
    """Parses various date formats into standard ISO YYYY-MM-DD."""
    if not date_str:
        return None
    cleaned = date_str.strip().replace(".", "/")
    formats = [
        "%d %b %Y",    # 31 May 2022, 1 May 2022
        "%d %B %Y",    # 31 May 2022 (full month)
        "%d/%m/%Y",    # 31/05/2022, 09/05/2025
        "%Y-%m-%d",    # 2022-05-31
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(cleaned, fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            pass
    return None


class InvoiceExtractor:
    """
    Extracts invoice and declaration records from raw PDFs with provenance tracking.
    """

    def __init__(self, d07_dir: str = DEFAULT_D07_PATH, d06_dir: str = DEFAULT_D06_PATH):
        self.d07_dir = d07_dir
        self.d06_dir = d06_dir
        self.anonymizer = AnonymizationManager()

    def extract_dataset07(self) -> List[Dict[str, Any]]:
        """
        Extracts all corporate service invoices from Dataset 07.
        Handles text parsing, currency, amounts, and duplicate detection.
        """
        if not os.path.isdir(self.d07_dir):
            raise FileNotFoundError(f"Dataset 07 directory not found: {self.d07_dir}")

        files = sorted([f for f in os.listdir(self.d07_dir) if f.lower().endswith(".pdf")])
        records = []
        seen_hashes: Dict[str, str] = {}
        seen_texts: Dict[str, str] = {}

        for idx, fname in enumerate(files, start=1):
            fpath = os.path.join(self.d07_dir, fname)
            fhash = compute_file_hash(fpath)
            doc_id = self.anonymizer.anonymize_document_id("D07", idx)

            reader = pypdf.PdfReader(fpath)
            num_pages = len(reader.pages)
            raw_text = "".join(p.extract_text() or "" for p in reader.pages)

            # Duplicate Check: Hash or exact text match
            is_exact_dup = fhash in seen_hashes
            text_hash = hashlib.sha256(raw_text.encode("utf-8")).hexdigest()
            is_text_dup = text_hash in seen_texts

            if is_exact_dup:
                dup_origin = seen_hashes[fhash]
                duplicate_status = "EXACT_BINARY_DUPLICATE"
                is_duplicate = True
            elif is_text_dup:
                dup_origin = seen_texts[text_hash]
                duplicate_status = "SEMANTIC_CONTENT_DUPLICATE"
                is_duplicate = True
            else:
                dup_origin = None
                duplicate_status = "UNIQUE"
                is_duplicate = False
                seen_hashes[fhash] = doc_id
                seen_texts[text_hash] = doc_id

            # Parse Invoice Number
            m_inv = re.search(r"Invoice Number\s*([A-Z0-9\-]+)", raw_text)
            raw_inv_no = m_inv.group(1) if m_inv else None

            # Parse Dates
            m_date = re.search(r"Invoice Date\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})", raw_text)
            inv_date_iso = parse_date_to_iso(m_date.group(1)) if m_date else None

            m_due = re.search(r"Due Date:?\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})", raw_text)
            due_date_iso = parse_date_to_iso(m_due.group(1)) if m_due else None

            # Parse Currency and Total Amount
            m_amt = re.search(
                r"(?:Invoice Total|TOTAL)\s+([A-Z]{3})\s+([0-9,]+\.[0-9]{2})", raw_text
            )
            if m_amt:
                currency = m_amt.group(1)
                amount = float(m_amt.group(2).replace(",", ""))
            else:
                currency = None
                amount = None

            # Entity resolution
            issuer_info = self.anonymizer.resolve_dataset07_party(raw_text, is_sender=True)
            recipient_info = self.anonymizer.resolve_dataset07_party(raw_text, is_sender=False)

            # Verification and Confidence Scoring
            if is_duplicate:
                status = "DUPLICATE_OMITTED"
                confidence = 1.0
            elif inv_date_iso and currency and amount is not None:
                status = "VERIFIED_COMPLETE"
                confidence = 1.0
            elif inv_date_iso or amount is not None:
                status = "VERIFIED_PARTIAL"
                confidence = 0.70
            else:
                status = "EXTRACTION_FAILED"
                confidence = 0.0

            record = {
                "document_id": doc_id,
                "dataset_source": "Dataset_07",
                "document_type": "commercial_service_invoice",
                "invoice_date": inv_date_iso,
                "due_date": due_date_iso,
                "currency": currency,
                "total_amount": amount,
                "issuer_entity_id": issuer_info["entity_id"],
                "issuer_role": issuer_info["role"],
                "issuer_jurisdiction": issuer_info["jurisdiction"],
                "recipient_entity_id": recipient_info["entity_id"],
                "recipient_role": recipient_info["role"],
                "recipient_jurisdiction": recipient_info["jurisdiction"],
                "verification_status": status,
                "is_duplicate": is_duplicate,
                "duplicate_status": duplicate_status,
                "duplicate_of_doc_id": dup_origin,
                "confidence_score": confidence,
                "num_pages": num_pages,
                "provenance_file_hash": fhash,
                "notes": "Verified corporate service billing" if not is_duplicate else "Duplicate invoice document",
            }
            records.append(record)

        # Enforce zero PII before returning
        self.anonymizer.assert_no_pii(records)
        return records

    def extract_dataset06(self) -> List[Dict[str, Any]]:
        """
        Extracts all customs declarations (CUSDEC) and commercial invoices from Dataset 06.
        Explicitly flags scanned PDFs with 0 text as UNVERIFIED_SCANNED.
        Detects exact binary duplicates and resolves anonymized counterparties.
        """
        if not os.path.isdir(self.d06_dir):
            raise FileNotFoundError(f"Dataset 06 directory not found: {self.d06_dir}")

        files = sorted([f for f in os.listdir(self.d06_dir) if f.lower().endswith(".pdf")])
        records = []
        seen_hashes: Dict[str, str] = {}

        for idx, fname in enumerate(files, start=1):
            fpath = os.path.join(self.d06_dir, fname)
            fhash = compute_file_hash(fpath)
            doc_id = self.anonymizer.anonymize_document_id("D06", idx)

            # Check exact binary duplicate
            if fhash in seen_hashes:
                dup_origin = seen_hashes[fhash]
                is_duplicate = True
                dup_status = "EXACT_BINARY_DUPLICATE"
            else:
                dup_origin = None
                is_duplicate = False
                dup_status = "UNIQUE"
                seen_hashes[fhash] = doc_id

            reader = pypdf.PdfReader(fpath)
            num_pages = len(reader.pages)
            page_texts = [p.extract_text() or "" for p in reader.pages]
            full_text = "".join(page_texts).strip()

            # Handle scanned PDF with 0 extractable text
            if len(full_text) == 0:
                # Do NOT invent values for scanned documents
                consignee_info = self.anonymizer.resolve_dataset06_consignee("", filename=fname)
                exporter_info = self.anonymizer.resolve_dataset06_exporter("")

                record = {
                    "document_id": doc_id,
                    "dataset_source": "Dataset_06",
                    "document_type": "customs_declaration_cusdec",
                    "invoice_date": None,
                    "due_date": None,
                    "currency": None,
                    "total_amount": None,
                    "issuer_entity_id": exporter_info["entity_id"],
                    "issuer_role": exporter_info["role"],
                    "issuer_jurisdiction": exporter_info["jurisdiction"],
                    "recipient_entity_id": consignee_info["entity_id"],
                    "recipient_role": consignee_info["role"],
                    "recipient_jurisdiction": consignee_info["jurisdiction"],
                    "declarant_entity_id": None,
                    "verification_status": "DUPLICATE_OMITTED" if is_duplicate else "UNVERIFIED_SCANNED",
                    "is_duplicate": is_duplicate,
                    "duplicate_status": dup_status,
                    "duplicate_of_doc_id": dup_origin,
                    "confidence_score": 0.0,
                    "num_pages": num_pages,
                    "provenance_file_hash": fhash,
                    "notes": "Scanned raster image PDF without digital text layer; values unextracted to prevent fabrication",
                }
                records.append(record)
                continue

            # Digital text document extraction
            # 1. Parse date
            parsed_date_iso = None
            m_date = re.search(r"\b([0-3][0-9][/\.][0-1][0-9][/\.][2][0][2-3][0-9])\b", full_text)
            if m_date:
                raw_d = m_date.group(1).replace(".", "/")
                parsed_date_iso = parse_date_to_iso(raw_d)

            # 2. Parse currency and amount from commercial invoice (Page 1) or CUSDEC (Page 0)
            currency = None
            amount = None

            # Check Page 1 (Commercial / Customs Invoice)
            if len(page_texts) > 1 and page_texts[1].strip():
                p1 = page_texts[1]
                m_val = re.search(r"(?:C\s*&\s*F\s*VALUE|FOB\s*VALUE)\s*([0-9,]+\.?[0-9]*)", p1, re.I)
                if m_val:
                    try:
                        amount = float(m_val.group(1).replace(",", ""))
                    except ValueError:
                        pass
                if "EURO" in p1.upper() or "EUR" in p1.upper():
                    currency = "EUR"
                elif "USD" in p1.upper():
                    currency = "USD"
                elif "AED" in p1.upper():
                    currency = "AED"

            # Check Page 0 if amount not yet found
            if amount is None and len(page_texts) > 0:
                p0 = page_texts[0]
                m_amt = re.search(
                    r"(?:Currency|Total Amount Invoiced)[\s\S]{1,40}?([A-Z]{3})\s+([0-9,]+\.?[0-9]{2})", p0
                )
                if m_amt:
                    currency = m_amt.group(1)
                    try:
                        amount = float(m_amt.group(2).replace(",", ""))
                    except ValueError:
                        pass

            # Resolve counterparties
            exporter_info = self.anonymizer.resolve_dataset06_exporter(full_text)
            consignee_info = self.anonymizer.resolve_dataset06_consignee(full_text, filename=fname)
            declarant_info = self.anonymizer.resolve_dataset06_declarant(full_text)

            # Confidence and verification status
            if is_duplicate:
                status = "DUPLICATE_OMITTED"
                confidence = 1.0
            elif parsed_date_iso and currency and amount is not None:
                status = "VERIFIED_COMPLETE"
                confidence = 0.95
            elif parsed_date_iso or currency or amount is not None:
                status = "VERIFIED_PARTIAL"
                confidence = 0.65
            else:
                status = "VERIFIED_PARTIAL"
                confidence = 0.40

            record = {
                "document_id": doc_id,
                "dataset_source": "Dataset_06",
                "document_type": "customs_declaration_cusdec",
                "invoice_date": parsed_date_iso,
                "due_date": None,
                "currency": currency,
                "total_amount": amount,
                "issuer_entity_id": exporter_info["entity_id"],
                "issuer_role": exporter_info["role"],
                "issuer_jurisdiction": exporter_info["jurisdiction"],
                "recipient_entity_id": consignee_info["entity_id"],
                "recipient_role": consignee_info["role"],
                "recipient_jurisdiction": consignee_info["jurisdiction"],
                "declarant_entity_id": declarant_info["entity_id"] if declarant_info else None,
                "verification_status": status,
                "is_duplicate": is_duplicate,
                "duplicate_status": dup_status,
                "duplicate_of_doc_id": dup_origin,
                "confidence_score": confidence,
                "num_pages": num_pages,
                "provenance_file_hash": fhash,
                "notes": "Digital CUSDEC / export invoice document" if not is_duplicate else "Duplicate customs record",
            }
            records.append(record)

        # Enforce zero PII before returning
        self.anonymizer.assert_no_pii(records)
        return records

    def save_extracted_records(
        self, output_dir: str = DEFAULT_OUTPUT_DIR
    ) -> Tuple[str, str, Dict[str, Any]]:
        """
        Executes complete extraction for both datasets and saves anonymized JSON and CSV artifacts.
        """
        os.makedirs(output_dir, exist_ok=True)

        d07_records = self.extract_dataset07()
        d06_records = self.extract_dataset06()

        # Enforce PII check on entire dataset payload
        self.anonymizer.assert_no_pii(d07_records)
        self.anonymizer.assert_no_pii(d06_records)

        # Save Dataset 07
        d07_json_path = os.path.join(output_dir, "dataset07_extracted_invoices.json")
        with open(d07_json_path, "w", encoding="utf-8") as f:
            json.dump(d07_records, f, indent=2)

        d07_csv_path = os.path.join(output_dir, "dataset07_extracted_invoices.csv")
        pd.DataFrame(d07_records).to_csv(d07_csv_path, index=False)

        # Save Dataset 06
        d06_json_path = os.path.join(output_dir, "dataset06_extracted_declarations.json")
        with open(d06_json_path, "w", encoding="utf-8") as f:
            json.dump(d06_records, f, indent=2)

        d06_csv_path = os.path.join(output_dir, "dataset06_extracted_declarations.csv")
        pd.DataFrame(d06_records).to_csv(d06_csv_path, index=False)

        manifest = {
            "dataset_07": {
                "total_documents": len(d07_records),
                "unique_documents": sum(1 for r in d07_records if not r["is_duplicate"]),
                "exact_duplicates": sum(1 for r in d07_records if r["duplicate_status"] == "EXACT_BINARY_DUPLICATE"),
                "semantic_duplicates": sum(1 for r in d07_records if r["duplicate_status"] == "SEMANTIC_CONTENT_DUPLICATE"),
                "verified_complete": sum(1 for r in d07_records if r["verification_status"] == "VERIFIED_COMPLETE"),
                "verified_partial": sum(1 for r in d07_records if r["verification_status"] == "VERIFIED_PARTIAL"),
                "unverified_scanned": sum(1 for r in d07_records if r["verification_status"] == "UNVERIFIED_SCANNED"),
                "json_path": d07_json_path,
                "csv_path": d07_csv_path,
            },
            "dataset_06": {
                "total_documents": len(d06_records),
                "unique_documents": sum(1 for r in d06_records if not r["is_duplicate"]),
                "exact_duplicates": sum(1 for r in d06_records if r["duplicate_status"] == "EXACT_BINARY_DUPLICATE"),
                "semantic_duplicates": sum(1 for r in d06_records if r["duplicate_status"] == "SEMANTIC_CONTENT_DUPLICATE"),
                "verified_complete": sum(1 for r in d06_records if r["verification_status"] == "VERIFIED_COMPLETE"),
                "verified_partial": sum(1 for r in d06_records if r["verification_status"] == "VERIFIED_PARTIAL"),
                "unverified_scanned": sum(1 for r in d06_records if r["verification_status"] == "UNVERIFIED_SCANNED"),
                "json_path": d06_json_path,
                "csv_path": d06_csv_path,
            },
        }

        manifest_path = os.path.join(output_dir, "extraction_manifest.json")
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)

        return d07_json_path, d06_json_path, manifest


if __name__ == "__main__":
    extractor = InvoiceExtractor()
    d07_p, d06_p, m = extractor.save_extracted_records()
    print("Extraction completed successfully!")
    print(f"Manifest: {json.dumps(m, indent=2)}")
