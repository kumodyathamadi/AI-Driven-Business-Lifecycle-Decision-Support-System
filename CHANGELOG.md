# Changelog - SME360 AI Upgrades

All notable changes to the SME360 AI Feasibility Decision Support System are documented in this file.

## [Phase 1: Data Correctness] - 2026-10-01

### Fixed
- **Root Cause of LKR NaN & Missing Customers**:
  - `backend/routes/analysis.py` previously omitted `available_capital_lkr` and `expected_customers_per_day` in the serialization dictionary for records returned to the frontend.
  - Added full numeric property serialization for `available_capital_lkr`, `expected_customers_per_day`, `predicted_label`, and `stage_label`.
- **False Infeasible Labeling**:
  - Frontend components checked `rec.predicted_label` while the backend previously mapped it under non-matching keys (`rec.feasibility_label`), defaulting to red "Infeasible" badges. Both keys are now populated consistently.
  - Preprocessor now cleans numeric strings ("Rs. 500,000", "500k", "5 Lakh") before passing values to the Random Forest model, preventing `NaN` and `ValueError` during inference.
- **Inconsistent Business Stages & DB Migration**:
  - Ran migration script `scripts/migrate_canonical_stages.py` converting all 37 database records into canonical values: `new_startup` and `existing`.
  - Added mapper in `src/preprocessing/preprocessor.py` to translate canonical DB values into model training tokens (`'New'` / `'Existing'`).
- **Inaccurate Dashboard Counts**:
  - Replaced hardcoded client-side length (`recentRecords.length` = 5) with a real SQL `COUNT(*)` query (`GET /api/business/records` and aggregate summary `GET /api/business/summary`).
- **UI Fallbacks**:
  - Built `frontend/src/utils/formatters.js` ensuring missing or null values render as `"Not provided"` instead of `NaN` or empty strings.

### Added
- Reusable UI design system components:
  - `frontend/src/components/common/Badge.jsx` (`FeasibilityBadge`, `StageBadge`)
  - `frontend/src/components/common/KPICard.jsx`
  - `frontend/src/components/common/Skeleton.jsx` (`Skeleton`, `TableSkeleton`, `CardSkeleton`)
  - `frontend/src/components/common/EmptyState.jsx`
  - `frontend/src/components/common/ConfirmDialog.jsx`
  - `frontend/src/components/common/Toast.jsx`
- Migration script: `scripts/migrate_canonical_stages.py`
- Test suite: `tests/test_data_correctness.py`
