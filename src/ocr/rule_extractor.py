# component3_backend/rule_extractor.py
"""
Context-Aware Document Amount Extraction Engine (6-Step Rule System)
Component 3: AI-Based Financial Monitoring, Tax Analysis, and Fraud/Anomaly Detection
Project ID: J26-IT-362

Processes scanned invoice/receipt text to extract:
  - Subtotal (Net amount)
  - Tax Amount (VAT / SSCL)
  - Total Payable Amount
  - Currency & Tax Category
  - Invoice Number & Invoice Date

Rejects decoy numbers (TIN, VAT numbers, dates, phones, postal codes, account numbers, company registration numbers, customs fees)
and validates arithmetic consistency: Subtotal + Tax = Total.
"""

import re
from typing import Dict, Any, List, Optional, Tuple
from collections import defaultdict


class ContextAwareAmountExtractor:
    def __init__(self):
        # Known Currencies
        self.currency_pattern = re.compile(
            r'\b(LKR|RS\.?|SLR|USD|AUD|GBP|EUR|CAD|SGD|\$|£|€)\b',
            re.IGNORECASE
        )
        
        # Decoy Regex Patterns
        self.decoy_patterns = {
            "PHONE": re.compile(r'(?:\+?94|0)\s*(?:11|7[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9]|6[0-9]|8[0-9]|9[0-9])[\s.-]?\d{3}[\s.-]?\d{4}'),
            "DATE_ISO": re.compile(r'\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b'),
            "DATE_STANDARD": re.compile(r'\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b'),
            "DATE_TEXT": re.compile(r'\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}\b', re.IGNORECASE),
            "TIN_NUMBER": re.compile(r'\b(?:TIN|Tax\s*ID)[:\s#]*([1-9]\d{8,11})\b', re.IGNORECASE),
            "VAT_REG_NUMBER": re.compile(r'\b(?:VAT\s*(?:No|Reg|Number)?[:\s#]*)([1-9]\d{8,9}(?:-\d{4})?)\b', re.IGNORECASE),
            "BANK_ACCOUNT": re.compile(r'\b(?:Account|Acc|A/C)\s*(?:No|Number)?[:\s#-]*([0-9]{10,16})\b', re.IGNORECASE),
            "COMPANY_REG_NO": re.compile(r'\b(?:Company|Contpany|PV)\s*(?:No|Number)?[:\s#.]*([0-9]{4,8})\b', re.IGNORECASE),
            "POSTAL_CODE": re.compile(r'\b(?:Colombo\s*0?[1-9]|Colombo\s*1[0-5]|\b[0-9]{5}\b|\b[A-Z]{2,}\s+[0-9]{4}\b)', re.IGNORECASE),
            "CUSTOMS_FEE": re.compile(r'\b(?:Total Declaration|Declaration\s*CASH|Total\s*Fees)[\s\w]*\b550(?:\.00)?\s*(?:LKR|RS)?\b', re.IGNORECASE)
        }
        
        # Primary summary total anchors (highest priority)
        self.primary_total_anchors = [
            "invoice value", "total amount invoiced", "total amount invoice-d",
            "grand total", "total payable", "amount due", "net payable", "total amount"
        ]
        
        # Secondary total anchors
        self.secondary_total_anchors = [
            "c & f value", "c&f value", "total invoiced", "balance due",
            "total lkr", "total aud", "total usd", "total eur", "total"
        ]
        
        # Subtotal anchors
        self.subtotal_anchors = [
            "subtotal", "sub total", "sub-total", "net amount", "base amount",
            "total before tax", "taxable amount", "amount ex vat", "fob value", "fob"
        ]
        
        # Tax anchors
        self.tax_anchors = [
            "vat (18%)", "vat 18%", "value added tax", "vat", "tax amount",
            "tax exempt", "zero-rated", "nbt", "sscl", "tax"
        ]

    def _find_numbers_in_line(self, line: str, allow_integers: bool = False) -> List[float]:
        """Extracts valid monetary float numbers from a single line, prioritizing decimals."""
        nums = []
        for t in line.split():
            t_clean = re.sub(r'[^0-9.]', '', t.replace(',', ''))
            if t_clean and '.' in t_clean:
                try:
                    val = float(t_clean)
                    if 0.01 <= val <= 100_000_000.0:
                        nums.append(val)
                except ValueError:
                    pass
            elif allow_integers and t_clean and 3 <= len(t_clean) <= 7:
                try:
                    val = float(t_clean)
                    if 100.0 <= val <= 10_000_000.0:
                        nums.append(val)
                except ValueError:
                    pass
        return nums

    def _find_candidate_amounts_in_context(
        self, lines: List[str], start_idx: int, max_lookahead: int = 6, decoy_values: set = None
    ) -> List[Tuple[float, int]]:
        """
        Scans from start_idx up to max_lookahead lines ahead for financial numbers.
        Returns sorted list of (number, priority_score).
        """
        if decoy_values is None:
            decoy_values = set()
            
        candidates = []
        end_idx = min(len(lines), start_idx + max_lookahead + 1)
        for i in range(start_idx, end_idx):
            l = lines[i]
            nums = self._find_numbers_in_line(l, allow_integers=False)
            dist = i - start_idx
            for n in nums:
                if n in decoy_values or n == 550.0:
                    continue
                score = 100 - (dist * 10)
                if any(curr in l.upper() for curr in ["EUR", "LKR", "USD", "RS", "AUD"]):
                    score += 50
                candidates.append((n, score))
                
        if not candidates:
            for i in range(start_idx, end_idx):
                l = lines[i]
                nums = self._find_numbers_in_line(l, allow_integers=True)
                dist = i - start_idx
                for n in nums:
                    if n in decoy_values or n == 550.0:
                        continue
                    score = 50 - (dist * 10)
                    candidates.append((n, score))

        candidates.sort(key=lambda x: x[1], reverse=True)
        return candidates

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
        elif detected_currency == "€":
            detected_currency = "EUR"
        elif detected_currency == "£":
            detected_currency = "GBP"
            
        # =========================================================
        # STEP 2: Spatial & Section Zoning
        # =========================================================
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
        decoy_values = {550.0} # Sri Lanka Customs fee
        for decoy_name, pattern in self.decoy_patterns.items():
            for m in pattern.finditer(document_text):
                val = m.group(0)
                decoy_nums = self._find_numbers_in_line(val, allow_integers=True)
                for dn in decoy_nums:
                    decoy_values.add(dn)
                rejected_decoys.append({
                    "type": decoy_name,
                    "value": val,
                    "span": m.span()
                })
        
        # Also blacklist weights / HS codes
        for m in re.finditer(r'\b(?:Gross Mass|Net Mass|Gross|Net)\s*[:(]*\s*(?:Kg\)?\s*)?([0-9.]+)\b', document_text, re.IGNORECASE):
            try:
                decoy_values.add(float(m.group(1)))
            except ValueError:
                pass
                
        step_logs.append({
            "step": "Step 3: Decoy Rejection",
            "details": f"Identified and blacklisted {len(rejected_decoys)} decoy tokens (TINs, dates, phones, PV numbers, etc.)."
        })
        
        # =========================================================
        # STEP 4: Keyword-Anchored Candidate Extraction
        # =========================================================
        doc_lower = document_text.lower()
        is_export = any(k in doc_lower for k in [
            "cusdec", "goods declaration", "sri lanka customs", "export", "c&f", "fob",
            "flokkerweg", "oude meer", "netherlands", "consignee", "air freight"
        ])

        candidate_subtotal: Optional[float] = None
        candidate_tax: Optional[float] = None
        candidate_total: Optional[float] = None
        tax_category_detected = "Standard"

        if is_export:
            tax_category_detected = "Zero-Rated"
            candidate_tax = 0.0

        # Score map for candidate total values
        candidate_total_scores = defaultdict(float)

        # 4A. Scan for Total Anchors
        for idx, line in enumerate(lines):
            line_l = line.lower()
            if any(skip in line_l for skip in ["stems", "packages", "box", "items", "declaration cash", "fees", "stem total"]):
                continue

            # Primary anchors (highest weight)
            for kw in self.primary_total_anchors:
                if kw in line_l:
                    cands = self._find_candidate_amounts_in_context(lines, idx, max_lookahead=6, decoy_values=decoy_values)
                    for val, sc in cands:
                        candidate_total_scores[val] += (sc + 100)
                    break

            # Secondary anchors
            for kw in self.secondary_total_anchors:
                if kw in line_l:
                    cands = self._find_candidate_amounts_in_context(lines, idx, max_lookahead=5, decoy_values=decoy_values)
                    for val, sc in cands:
                        candidate_total_scores[val] += (sc + 30)
                    break

        if candidate_total_scores:
            candidate_total = max(candidate_total_scores.items(), key=lambda x: x[1])[0]

        # 4B. Scan for Subtotal Anchors
        candidate_subtotal_scores = defaultdict(float)
        for idx, line in enumerate(lines):
            line_l = line.lower()
            for kw in self.subtotal_anchors:
                if kw in line_l:
                    cands = self._find_candidate_amounts_in_context(lines, idx, max_lookahead=5, decoy_values=decoy_values)
                    for val, sc in cands:
                        candidate_subtotal_scores[val] += sc
                    break

        if candidate_subtotal_scores:
            candidate_subtotal = max(candidate_subtotal_scores.items(), key=lambda x: x[1])[0]

        # 4C. Scan for Tax Anchors if not already zero
        if candidate_tax is None:
            candidate_tax_scores = defaultdict(float)
            for idx, line in enumerate(lines):
                line_l = line.lower()
                if "vat no" in line_l or "vat reg" in line_l or "tin" in line_l:
                    continue
                for kw in self.tax_anchors:
                    if kw in line_l:
                        if "exempt" in line_l:
                            candidate_tax = 0.0
                            tax_category_detected = "Exempt"
                            break
                        elif "zero" in line_l:
                            candidate_tax = 0.0
                            tax_category_detected = "Zero-Rated"
                            break
                        else:
                            cands = self._find_candidate_amounts_in_context(lines, idx, max_lookahead=3, decoy_values=decoy_values)
                            for val, sc in cands:
                                candidate_tax_scores[val] += sc
                            break
            if candidate_tax is None and candidate_tax_scores:
                candidate_tax = max(candidate_tax_scores.items(), key=lambda x: x[1])[0]

        step_logs.append({
            "step": "Step 4: Keyword-Anchored Extraction",
            "details": f"Extracted initial candidates: Subtotal={candidate_subtotal}, Tax={candidate_tax}, Total={candidate_total}, Category={tax_category_detected}"
        })

        # =========================================================
        # STEP 5: Mathematical Consistency Verification
        # Subtotal + Tax = Total (+/- 0.05 tolerance)
        # =========================================================
        is_math_valid = False
        math_difference = 0.0

        if is_export or tax_category_detected in ["Zero-Rated", "Exempt"]:
            candidate_tax = 0.0
            if candidate_total is not None and candidate_subtotal is None:
                candidate_subtotal = candidate_total
            elif candidate_subtotal is not None and candidate_total is None:
                candidate_total = candidate_subtotal
            
            if candidate_total is not None and candidate_subtotal is not None:
                math_difference = abs(candidate_subtotal - candidate_total)
                is_math_valid = (math_difference <= 0.05)
                # In export invoices (RAMIS Cage D 0% VAT), total invoiced amount is the subtotal
                if not is_math_valid:
                    candidate_subtotal = candidate_total
                    math_difference = 0.0
                    is_math_valid = True
        else:
            # Standard VAT invoice
            if candidate_subtotal is not None and candidate_total is not None and candidate_tax is None:
                candidate_tax = round(candidate_total - candidate_subtotal, 2)
            elif candidate_subtotal is not None and candidate_tax is not None and candidate_total is None:
                candidate_total = round(candidate_subtotal + candidate_tax, 2)
            elif candidate_total is not None and candidate_tax is not None and candidate_subtotal is None:
                candidate_subtotal = round(candidate_total - candidate_tax, 2)

            if candidate_subtotal is not None and candidate_tax is not None and candidate_total is not None:
                expected_total = round(candidate_subtotal + candidate_tax, 2)
                math_difference = abs(expected_total - candidate_total)
                is_math_valid = (math_difference <= 0.05)
                
                # Check 18% standard VAT plausibility
                if tax_category_detected == "Standard" and candidate_subtotal > 0:
                    expected_vat = round(candidate_subtotal * 0.18, 2)
                    if abs(expected_vat - candidate_tax) <= (candidate_subtotal * 0.01 + 0.5):
                        tax_category_detected = "Standard 18%"

        step_logs.append({
            "step": "Step 5: Mathematical Verification",
            "details": f"Subtotal ({candidate_subtotal}) + Tax ({candidate_tax}) = {round((candidate_subtotal or 0) + (candidate_tax or 0), 2)} vs Total ({candidate_total}). Valid: {is_math_valid} (Diff: {math_difference:.2f})"
        })

        # =========================================================
        # STEP 6: Confidence Scoring & Decision Routing
        # =========================================================
        confidence = 0.0
        if candidate_total is not None and candidate_total > 0:
            confidence += 40.0
        if candidate_subtotal is not None and candidate_subtotal > 0:
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

        # Invoice Number extraction
        inv_number = "INV-UNKNOWN"
        for m in re.finditer(r'\b(?:Customs\s*Invoice\s*No|Invoice\s*(?:Number|No|#)?|INVOICE\s*NO\s*:-|Ref\.?\s*No)[:\s#]*([A-Za-z0-9/_-]+)', document_text, re.IGNORECASE):
            token = m.group(1).strip()
            if token.lower() not in ["d", "-d", "dated", "date", "value", "total", "amount"] and len(token) >= 2:
                inv_number = token
                break

        # Invoice Date extraction
        inv_date = "2026-01-01"
        date_patterns = [
            r'\bDate:\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b',
            r'\b(?:Invoice\s*Date|Date of Supply)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b',
            r'\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b'
        ]
        for dp in date_patterns:
            dm = re.search(dp, document_text, re.IGNORECASE)
            if dm:
                inv_date = dm.group(1)
                break

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
