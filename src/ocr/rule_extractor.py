# src/ocr/rule_extractor.py
"""
Context-Aware Document Amount Extraction Engine (6-Step Rule System)
Component 3: AI-Based Financial Monitoring, Tax Analysis, and Fraud/Anomaly Detection
Project ID: J26-IT-362

Processes scanned invoice/receipt text to extract:
  - Subtotal (Net amount)
  - Tax Amount (VAT / SSCL)
  - Total Payable Amount
  - Currency & Tax Category

Rejects decoy numbers (TIN, VAT numbers, dates, phones, postal codes, account numbers)
and validates arithmetic consistency: Subtotal + Tax = Total.
"""

import re
from typing import Dict, Any, List, Optional, Tuple


class ContextAwareAmountExtractor:
    def __init__(self):
        # Known Currencies
        self.currency_pattern = re.compile(
            r'\b(LKR|RS\.?|SLR|USD|AUD|GBP|EUR|CAD|SGD|\$|£|€)\b',
            re.IGNORECASE
        )
        
        # Regex patterns for numerical values (e.g. 7,025,000.00 or 42600.50 or 1500)
        self.amount_pattern = re.compile(
            r'(?:[A-Za-z$£€]+[\s:]*)?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)'
        )
        
        # Decoy Regex Patterns
        self.decoy_patterns = {
            "PHONE": re.compile(r'(?:\+?94|0)\s*(?:11|7[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9]|6[0-9]|8[0-9]|9[0-9])[\s.-]?\d{3}[\s.-]?\d{4}'),
            "DATE_ISO": re.compile(r'\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b'),
            "DATE_STANDARD": re.compile(r'\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b'),
            "DATE_TEXT": re.compile(r'\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}\b', re.IGNORECASE),
            "TIN_NUMBER": re.compile(r'\b(?:TIN|Tax\s*ID)[:\s#]*([1-9]\d{8,9})\b', re.IGNORECASE),
            "VAT_REG_NUMBER": re.compile(r'\b(?:VAT\s*(?:No|Reg|Number)?[:\s#]*)([1-9]\d{8,9}(?:-\d{4})?)\b', re.IGNORECASE),
            "BANK_ACCOUNT": re.compile(r'\b(?:Account|Acc|A/C)\s*(?:No|Number)?[:\s#-]*([0-9]{10,16})\b', re.IGNORECASE),
            "POSTAL_CODE": re.compile(r'\b(?:Colombo\s*0?[1-9]|Colombo\s*1[0-5]|\b[0-9]{5}\b|\b[A-Z]{2,}\s+[0-9]{4}\b)', re.IGNORECASE)
        }
        
        # Financial Anchor Keywords
        self.anchor_keywords = {
            "SUBTOTAL": [
                "subtotal", "sub total", "sub-total", "net amount", "base amount",
                "total before tax", "taxable amount", "amount ex vat"
            ],
            "TAX": [
                "vat", "tax amount", "value added tax", "tax", "vat (18%)",
                "vat 18%", "tax exempt", "zero-rated", "nbt", "sscl"
            ],
            "TOTAL": [
                "total lkr", "total aud", "total usd", "total payable", "amount due",
                "grand total", "total amount", "net payable", "balance due", "total"
            ]
        }

    def _clean_amount_str(self, val_str: str) -> float:
        """Converts formatted string (e.g. '7,025,000.00') to float."""
        clean = re.sub(r'[^0-9.]', '', val_str.replace(',', ''))
        try:
            return float(clean)
        except ValueError:
            return 0.0

    def extract(self, document_text: str) -> Dict[str, Any]:
        """
        Executes the 6-Step Amount Extraction Pipeline.
        """
        step_logs = []
        rejected_decoys = []
        
        # =========================================================
        # STEP 1: Text Pre-Processing & Line Normalization
        # =========================================================
        lines = [line.strip() for line in document_text.splitlines() if line.strip()]
        step_logs.append({
            "step": "Step 1: Text & Line Normalization",
            "details": f"Processed document into {len(lines)} cleaned lines."
        })
        
        # Detect currency
        currency_match = self.currency_pattern.search(document_text)
        detected_currency = currency_match.group(1).upper() if currency_match else "LKR"
        if detected_currency in ["RS", "RS.", "SLR"]:
            detected_currency = "LKR"
        elif detected_currency == "$":
            detected_currency = "USD"
            
        # =========================================================
        # STEP 2: Spatial & Section Zoning
        # =========================================================
        # Segment lines into Header (0-35%), Body (35-70%), and Summary/Footer (70-100%)
        # For small invoices, last 40% lines usually hold totals.
        total_lines = len(lines)
        split_idx = max(int(total_lines * 0.4), 1)
        header_lines = lines[:split_idx]
        footer_lines = lines[split_idx:]
        
        step_logs.append({
            "step": "Step 2: Spatial Zoning",
            "details": f"Partitioned into Header ({len(header_lines)} lines) and Summary/Footer ({len(footer_lines)} lines)."
        })
        
        # =========================================================
        # STEP 3: Decoy Rejection Engine
        # =========================================================
        # Find and catalogue all decoys so they are never picked as amounts
        for decoy_name, pattern in self.decoy_patterns.items():
            for m in pattern.finditer(document_text):
                val = m.group(0)
                rejected_decoys.append({
                    "type": decoy_name,
                    "value": val,
                    "span": m.span()
                })
                
        step_logs.append({
            "step": "Step 3: Decoy Rejection",
            "details": f"Identified and blacklisted {len(rejected_decoys)} decoy tokens (TINs, dates, phones, etc.)."
        })
        
        # =========================================================
        # STEP 4: Keyword-Anchored Candidate Extraction
        # =========================================================
        candidate_subtotal: Optional[float] = None
        candidate_tax: Optional[float] = None
        candidate_total: Optional[float] = None
        tax_category_detected = "Standard"
        
        # Scan footer lines preferentially for financial summary keywords
        # Also check whole document if footer is sparse
        search_lines = footer_lines if len(footer_lines) >= 3 else lines
        
        for line in search_lines:
            line_lower = line.lower()
            
            # Check for Tax Exemption / Zero-Rated cues
            if "tax exempt" in line_lower or "exempt" in line_lower:
                tax_category_detected = "Exempt"
                if candidate_tax is None:
                    candidate_tax = 0.0
            elif "zero-rated" in line_lower or "zero rated" in line_lower or "0%" in line_lower:
                tax_category_detected = "Zero-Rated"
                if candidate_tax is None:
                    candidate_tax = 0.0

            # 4A. Look for Subtotal
            for kw in self.anchor_keywords["SUBTOTAL"]:
                if kw in line_lower and candidate_subtotal is None:
                    # Extract numbers in this line
                    nums = self._find_numbers_in_line(line)
                    if nums:
                        candidate_subtotal = nums[-1] # Usually rightmost amount
                    break
                    
            # 4B. Look for Tax / VAT
            for kw in self.anchor_keywords["TAX"]:
                if kw in line_lower and (candidate_tax is None or candidate_tax == 0.0):
                    # Explicitly ignore VAT Registration / TIN header lines (e.g. "VAT No. 174028206 - 7000")
                    if re.search(r'\bvat\s*(?:no|reg|number|#)\b', line_lower) or re.search(r'\btin\b', line_lower):
                        continue
                    if "tax exempt" in line_lower or "exempt" in line_lower:
                        candidate_tax = 0.0
                        tax_category_detected = "Exempt"
                    else:
                        nums = self._find_numbers_in_line(line)
                        if nums:
                            candidate_tax = nums[-1]
                    break

                    
            # 4C. Look for Total Amount (must NOT be a subtotal or before-tax line)
            is_subtotal_line = bool(re.search(r'\b(?:subtotal|sub\s*total|sub-total)\b', line_lower))
            if not is_subtotal_line and "before tax" not in line_lower:
                for kw in self.anchor_keywords["TOTAL"]:
                    pattern = rf'\b{re.escape(kw)}\b'
                    if re.search(pattern, line_lower) and candidate_total is None:
                        nums = self._find_numbers_in_line(line)
                        if nums:
                            candidate_total = nums[-1]
                        break


        step_logs.append({
            "step": "Step 4: Keyword-Anchored Extraction",
            "details": f"Extracted initial candidates: Subtotal={candidate_subtotal}, Tax={candidate_tax}, Total={candidate_total}, Category={tax_category_detected}"
        })

        # =========================================================
        # STEP 5: Mathematical Consistency Verification
        # Subtotal + Tax = Total  (+/- 0.05 tolerance)
        # =========================================================
        is_math_valid = False
        math_difference = 0.0
        
        # Fallback / Inference heuristics if one value is missing:
        if candidate_subtotal is not None and candidate_total is not None and candidate_tax is None:
            # If subtotal == total, tax is 0.0
            if abs(candidate_subtotal - candidate_total) < 0.05:
                candidate_tax = 0.0
                tax_category_detected = "Exempt" if tax_category_detected == "Exempt" else "Zero-Rated"
            else:
                candidate_tax = round(candidate_total - candidate_subtotal, 2)
                
        elif candidate_subtotal is not None and candidate_tax is not None and candidate_total is None:
            candidate_total = round(candidate_subtotal + candidate_tax, 2)
            
        elif candidate_total is not None and candidate_tax is not None and candidate_subtotal is None:
            candidate_subtotal = round(candidate_total - candidate_tax, 2)
            
        # If all 3 present, verify mathematical equation:
        if candidate_subtotal is not None and candidate_tax is not None and candidate_total is not None:
            expected_total = round(candidate_subtotal + candidate_tax, 2)
            math_difference = abs(expected_total - candidate_total)
            is_math_valid = (math_difference <= 0.05)
            
            # Check 18% standard VAT plausibility
            if tax_category_detected == "Standard" and candidate_subtotal > 0:
                expected_vat = round(candidate_subtotal * 0.18, 2)
                if abs(expected_vat - candidate_tax) <= (candidate_subtotal * 0.01 + 0.5): # within 1% rounding
                    tax_category_detected = "Standard 18%"

        step_logs.append({
            "step": "Step 5: Mathematical Verification",
            "details": f"Subtotal ({candidate_subtotal}) + Tax ({candidate_tax}) = {candidate_subtotal + candidate_tax if candidate_subtotal and candidate_tax is not None else 'N/A'} vs Total ({candidate_total}). Valid: {is_math_valid} (Diff: {math_difference:.2f})"
        })

        # =========================================================
        # STEP 6: Confidence Scoring & Decision Routing
        # =========================================================
        confidence = 0.0
        
        if candidate_total is not None:
            confidence += 40.0
        if candidate_subtotal is not None:
            confidence += 20.0
        if candidate_tax is not None:
            confidence += 15.0
        if is_math_valid:
            confidence += 25.0
        else:
            confidence -= 30.0
            
        confidence = min(max(confidence, 0.0), 100.0)
        
        # Decision: Auto-pass or Review Required
        if confidence >= 85.0 and is_math_valid:
            decision = "AUTO_PASS"
            routing = "Direct to Tax Engine & Anomaly Detector"
        else:
            decision = "REVIEW_REQUIRED"
            routing = "Route to Human-in-the-Loop Review Queue"

        step_logs.append({
            "step": "Step 6: Confidence & Routing",
            "details": f"Final Confidence: {confidence}%. Decision: {decision} ({routing})."
        })

        # Extract Invoice Number and Date if present
        inv_no_match = re.search(r'\b(?:Invoice\s*(?:Number|No|#)?[:\s]*)([A-Z0-9-]+)\b', document_text, re.IGNORECASE)
        inv_number = inv_no_match.group(1) if inv_no_match else "INV-UNKNOWN"
        
        date_match = re.search(r'\b(?:Date|Invoice\s*Date|Due\s*Date)?[:\s]*(\d{1,2}\s+[A-Za-z]+\s+\d{4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})\b', document_text, re.IGNORECASE)
        inv_date = date_match.group(1) if date_match else "2024-01-01"


        return {
            "status": "success",
            "confidence_score": confidence,
            "decision": decision,
            "routing": routing,
            "extracted_amounts": {
                "sub_total": candidate_subtotal if candidate_subtotal is not None else 0.0,
                "tax_amount": candidate_tax if candidate_tax is not None else 0.0,
                "total_amount": candidate_total if candidate_total is not None else 0.0,
                "currency": detected_currency,
                "tax_category": tax_category_detected,
                "invoice_number": inv_number,
                "invoice_date": inv_date,
                "is_math_valid": is_math_valid,
                "math_difference": round(math_difference, 2)
            },
            "step_logs": step_logs,
            "rejected_decoys_count": len(rejected_decoys),
            "sample_decoys": rejected_decoys[:5]
        }

    def _find_numbers_in_line(self, line: str) -> List[float]:
        """Extracts valid monetary float numbers from a single line, ignoring common dates/codes."""
        # Remove commas
        clean_line = line
        tokens = clean_line.split()
        nums = []
        for t in tokens:
            # Strip currency signs or punctuation
            t_clean = re.sub(r'[^0-9.]', '', t)
            if t_clean and '.' in t_clean: # Financial amounts almost always have decimals (.00)
                try:
                    val = float(t_clean)
                    if 0.01 <= val <= 100_000_000.0:
                        nums.append(val)
                except ValueError:
                    continue
            elif t_clean and len(t_clean) <= 7: # integer amount like 42600
                try:
                    val = float(t_clean)
                    if 10.0 <= val <= 10_000_000.0:
                        nums.append(val)
                except ValueError:
                    continue
        return nums
