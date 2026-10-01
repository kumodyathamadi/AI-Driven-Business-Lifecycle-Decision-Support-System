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

## [Phase 2: Routing and Authentication] - 2026-10-01

### Added
- **Full URL-Based Routing (`react-router-dom`)**:
  - `/login`: Dedicated authentication view supporting Sign In, Account Registration, and instant demo auto-fill (`demo@sme360.ai` / `password123`).
  - `/dashboard`: Primary system overview with real metrics and activity tables.
  - `/businesses`: Paginated list of analyzed SME profiles.
  - `/analysis/new`: Intake view supporting natural-language AI prefill and manual forms.
  - `/businesses/:id`: Unified Business Workspace overview.
  - `/businesses/:id/feasibility`: Class probability distribution and outcome cards.
  - `/businesses/:id/insights`: Explainability drivers (positive & negative SHAP factors).
  - `/businesses/:id/recommendations`: Strategic actionable recommendations.
  - `/businesses/:id/options`: TOPSIS multi-criteria decision comparison table.
  - `/businesses/:id/scenarios`: Interactive What-If parameter simulators.
  - `/businesses/:id/plan`: Export-ready business plan with PDF and DOCX generators.
  - `*`: Custom 404 "Page Not Found" screen.
- **Route Protection & History Navigation**:
  - `<ProtectedRoute>` guarding all operational routes and redirecting unauthorized visitors to `/login` while preserving `location.state.from`.
  - Supports browser back/forward and direct refresh with deep state persistence.
- **Workspace Layout & Navigation**:
  - `WorkspaceLayout`: Fetches business record once by `:id` and distributes via React Router context (`useOutletContext()`).
  - `BusinessNotFound`: Friendly 404/403 page displayed when accessing unknown or unauthorized business IDs.
  - `Sidebar`: Uses `NavLink` with active route highlighting, disabling workspace items until a business is selected.
  - `Breadcrumbs`: Dynamically parses URL hierarchy with interactive links.
- **Backend Authentication & User Isolation**:
  - `backend/auth_utils.py`: Secure PBKDF2 password hashing with cryptographically secure salt; HMAC-SHA256 JWT tokens.
  - `backend/routes/auth.py`: Registration, login, and `/api/auth/me` endpoints.
  - Automatically seeds demo user `demo@sme360.ai` and associates existing database records.
  - Records and dashboard summaries are filtered by authenticated `user_id`.
  - Automated test suite: `tests/test_auth.py`.

## [Phase 3: New Analysis Intake] - 2026-10-01

### Added
- **3-Step Analysis Flow (`Describe -> Review -> Analyze`)**:
  - Implemented interactive step indicator guiding the user through context selection, field verification, and model execution.
- **Example Prompt Chips**:
  - Pre-curated prompts for all 4 SME categories (Bakery, Clothing, Mini-Mart, Beauty Salon) plus Existing Business expansion scenarios.
  - Clicking any chip automatically pre-fills the description, sets stage, and configures expansion goals.
- **Extracted Field Review & Confidence Highlighting**:
  - Step 2 reveals extracted attributes (sector, district, capital, experience, unit price, expected customers) as editable inputs.
  - Highlights low-confidence extractions with amber warnings (`⚠️ Needs verification`) before committing to prediction.
- **Sri Lankan Geographic & Numeric Validations**:
  - All 25 official Sri Lankan administrative districts selectable in dropdowns.
  - Strict validations on positive numeric capital and daily customer throughput with friendly error alerts.
- **Progressive Execution State**:
  - Loading screen communicating market benchmark matching, Random Forest scoring, SHAP explainability, and TOPSIS strategy generation.
  - Preserved "Fill Form Manually" as a secondary direct-entry route.

## [Phase 4: My Businesses Upgrades] - 2026-10-01

### Added
- **Record Display Standardization**:
  - Titles displayed uniformly as `Category · District` (e.g. `Bakery / Food / Grocery · Homagama`), with record ID styled as small secondary text.
  - Feasibility badge and numeric confidence score on every card and table row.
- **Server-Side Pagination, Sorting, and Multi-Filter Controls**:
  - Pagination with configurable rows per page (10, 20, 50).
  - Sorting by `newest`, `highest_score`, `lowest_score`, and `oldest`.
  - Multi-dimensional filters: Business Stage (`new_startup`, `existing`), Sector (4 categories), District (25 Sri Lankan districts), and Feasibility Result (`Feasible`, `Conditionally Feasible`, `Infeasible`).
  - Real-time keyword search.
- **Card & Data Table View Toggle**:
  - Dual responsive presentation modes: visual grid cards with quick KPI metrics and compact tabular format with direct action buttons.
- **Near-Duplicate Run Detection**:
  - Intelligent clustering of runs sharing identical category and district.
  - Banner notification with one-click filter to review or compare duplicate runs.
- **Soft Delete with Confirmation & Undo Toast**:
  - Modal confirmation dialog preventing accidental deletions.
  - RESTful soft delete (`DELETE /api/business/record/{id}`) with instant undo toast notification (`POST /api/business/record/{id}/restore`).
  - Excludes soft-deleted records from lists and dashboard aggregate calculations.

## [Phase 5: Dashboard Upgrades] - 2026-10-01

### Added
- **4 Real-Time Executive KPI Cards**:
  - Total Analyses (SQL count of non-deleted records).
  - Feasible Rate (percentage of viable evaluated projects).
  - Average Capital (properly formatted in `LKR`, e.g. `LKR 1,840,000`).
  - Top Sector (most frequently analyzed SME industry).
- **Interactive Recharts Visualizations**:
  - Feasibility Outcome Distribution: Custom Recharts Donut chart displaying Feasible, Conditionally Feasible, and Infeasible breakdown with tooltips and legend.
  - Analyses Activity Timeline: Recharts Bar chart showing temporal volume of evaluations.
- **"Continue Where You Left Off" Hero Card**:
  - Highlights the most recent SME analysis with key metrics (capital, customer volume, date, feasibility badge with score) and a direct "Open Workspace" action button.
- **Enhanced Recent Analyses Table**:
  - Displays numeric confidence score beside feasibility status badge.
  - Formats capital in `LKR`, customers in `/day`, and dates in human-readable format.
  - Direct deep links into `/businesses/:id`.
  - Empty state with onboarding call-to-action for new users with zero analyses.

## [Phase 6: Business Workspace] - 2026-10-01

### Added
- **Unified Workspace Layout & Context Sharing**:
  - `WorkspaceLayout.jsx` fetches business record once by `:id` and shares with all module tabs via React Router context (`useOutletContext()`).
  - Added Business Switcher dropdown in the workspace header strip allowing instant switching across evaluated SME records while maintaining active tab.
- **Feasibility Explainability Integration**:
  - `FeasibilityCard.jsx` embedded factor contribution breakdown explaining *why* the score was predicted, highlighting top positive supporting factors (+) and top negative risk hurdles (-).
  - Direct deep link to technical attribution in Key Insights (`/businesses/:id/insights`).
- **Live Debounced Scenario Explorer**:
  - Interactive What-If simulator in `WhatIfSimulator.jsx` with real-time sliders for Capital, Customers/Day, Expected Price, and Monthly Budget.
  - Live auto-scoring mode with 600ms debounce connecting directly to trained ML model.
  - Side-by-side Baseline vs. Modified Scenario comparison card with delta score percentage (+/- %), visual impact indicators, and quick "Reset Baseline" action.
- **Business Plan Sharing & Exports**:
  - Direct download triggers for PDF and DOCX business plans with instant toast feedback.
  - One-click "Share Link" copying direct URL to clipboard.
  - Native "Print View" formatting for clean print / PDF generation.

## [Phase 7: System-Level Polish & Accessibility] - 2026-10-01

### Added
- **Multilingual Support (i18n)**:
  - English (`en`), Sinhala (`si` - සිංහල), and Tamil (`ta` - தமிழ்) translations in `src/utils/i18n.js`.
  - `LanguageProvider` with persistent state across browser reloads via `localStorage`.
- **System Settings & Profile Dashboard (`/settings`, `/profile`, `/help`)**:
  - Language selection switcher with instant interface updates.
  - User identity, operator role, and LKR currency configuration.
  - "How Scoring Works" educational guide breaking down the 5-stage ML, SHAP, and TOPSIS pipeline.
  - Prominent Decision Support Legal & Research Disclaimer banner.
- **Audit Trail & Regulatory Event Logging**:
  - Database entity `AnalysisAuditLog` tracking all analysis creation, deletion, and restoration events with actor email, timestamp, inputs snapshot, and outcome score.
  - REST API endpoint `GET /api/business/audit-logs` with user isolation.
  - Interactive Audit Trail table in Settings with real-time refresh.
- **Enhanced Connection Health & Resiliency**:
  - Navbar indicator displaying "Disconnected, retrying..." with red/amber indicator and an immediate "Retry Now" action button.
- **Accessibility & UX Polish**:
  - High-contrast `:focus-visible` focus rings for keyboard navigation.
  - Responsive layout ensuring stacked views on mobile/tablet viewports.


