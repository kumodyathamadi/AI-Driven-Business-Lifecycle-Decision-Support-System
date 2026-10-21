# Component 4 — End-to-End Demonstration Verification Report

**Execution Timestamp:** 2026-10-21 14:20:28
**Verification Status:** All 5 required scenarios executed and verified successfully.

## Scenario Summary Table

| # | Scenario Description | SME Name | Risk Cat (Score) | Growth Decision | GNN / Evidence Status | Outcome |
|---|----------------------|----------|-------------------|-----------------|-----------------------|---------|
| 1 | Adequate Inputs | Royal Bakers Pvt Ltd | LOW (0.24) | MODIFY | GNN: Medium | PASS |
| 2 | Missing Liquidity Info | Lanka Corner Mart | LOW (0.33) | MODIFY | Liquidity: INSUFFICIENT | PASS |
| 3 | Projected Startup | Artisan Ceylon Roasters | LOW (0.25) | MODIFY | Tracked Estimates | PASS |
| 4 | Isolated Graph Node | Solo IT Consulting Services | LOW (0.15) | PROCEED | Degree 0 Handled | PASS |
| 5 | Delayed / Conditional Action | Overextended Logistics Ltd | HIGH (0.65) | DELAY | Red Flag: Active Delinquency | PASS |

## Detailed Verification Notes

1. **Adequate Inputs (Scenario 1):** Verified complete financial inputs, positive operating cash flow, safe debt service, and successful recommendation generation.
2. **Missing Liquidity (Scenario 2):** When cash reserves and cost details are omitted, the engine correctly tags `category_evidence_sufficiency['liquidity'] = 'INSUFFICIENT_EVIDENCE'`, includes `UNKNOWN_LIQUIDITY_RESERVES` mitigation, and does not fabricate a 100,000 LKR reserve.
3. **Projected Startup (Scenario 3):** Startups flagged as `is_projected: True` have inputs attributed to `user_estimates_and_projections`, preserving truth-in-advertising without inventing a fake 2-year history.
4. **Isolated Graph Node (Scenario 4):** Nodes with degree 0 are processed via self-loops and local node embeddings without hallucinating synthetic counterparties or crashing.
5. **Delayed Action (Scenario 5):** When proposed capex vastly exceeds reserves (30x) and active repayment delinquency exists, the engine generates `DELAY`, activates critical red flags, and links recommendations to liquidity stabilization.
