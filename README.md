# AI-Driven Business Lifecycle Decision Support System

## Component 2 — AI-Based Business Registration & Regulatory Compliance

The implementation guide for the current profile schema, evaluation endpoint,
local retrieval, evidence limitations, sample requests, and tests is
[documentation/Component_2_Implementation_Guide.md](documentation/Component_2_Implementation_Guide.md).

### Overview

Component 2 provides **deterministic, source-grounded regulatory compliance analysis**
for Sri Lankan SMEs (initial scope: food businesses in Colombo District — bakeries, cake
shops, sweets shops, restaurants).

Core novelty:
- **Source register** — every cited law is in `data/compliance/source_register.csv`.
- **Obligation rulebook** — YAML schema in `data/compliance/rulebook/obligations.yaml`.
- **Three-valued applicability engine** — returns `applicable` / `conditional` / `unknown` / `not_applicable`; missing facts are never assumed false.
- **Metadata-aware evidence** — every result is grounded in a registered source + quote.
- **LLM constraint** — the LLM may only phrase results; it never decides applicability.

---

### Directory Structure

```
backend/
  main.py                          # FastAPI entry point
  requirements.txt                 # Python dependencies
  app/
    api/
      compliance_routes.py         # POST /compliance/analyze and GET endpoints
      component2_routes.py         # Legacy mock endpoint (kept for backward compat)
    compliance/
      schemas.py                   # Pydantic models: BusinessProfile, ObligationRule, etc.
      engine.py                    # Deterministic three-valued applicability engine
      rulebook_loader.py           # YAML loader (cached)
      source_registry.py           # CSV reader (cached)
      component1_mapper.py         # Component 1 → Component 2 field mapper

data/compliance/
  source_register.csv              # Authoritative source document registry
  raw/                             # Original PDFs (never edited)
  processed/                       # Extracted text JSON (one file per source_id)
  rulebook/
    obligations.yaml               # Obligation definitions with three-valued applies_if

scripts/compliance/
  register_source.py               # Register a new source document
  validate_rulebook.py             # Validate rulebook ↔ source register consistency

tests/compliance/
  test_engine.py                   # Pytest: applicable / not_applicable / unknown / conditional

frontend/src/components/
  component2.tsx                   # React UI: profile form + grouped results + evidence panel
```

---

### How to Run — Backend

#### 1. Install dependencies

```bash
cd backend
pip install -r requirements.txt
```

#### 2. Start the API server

```bash
# From the repo root
python -m uvicorn backend.main:app --reload --port 8000
```

Or from the backend/ directory:

```bash
cd backend
uvicorn main:app --reload --port 8000
```

#### 3. Test the endpoints

```bash
# List all obligations
curl http://localhost:8000/compliance/obligations

# List all registered sources
curl http://localhost:8000/compliance/sources

# Analyse a bakery profile (all facts known)
curl -X POST http://localhost:8000/compliance/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "business_type": "bakery",
    "local_authority": "Colombo Municipal Council",
    "handles_food": true,
    "has_physical_premises": true,
    "employee_band": "1_9",
    "is_manufacturing": true,
    "legal_form": "sole_proprietorship",
    "jurisdiction": "Western Province"
  }'

# Analyse with unknown facts (missing local_authority)
curl -X POST http://localhost:8000/compliance/analyze \
  -H "Content-Type: application/json" \
  -d '{"business_type": "bakery", "handles_food": true}'

# From Component 1 output
curl -X POST http://localhost:8000/compliance/analyze/from-component1 \
  -H "Content-Type: application/json" \
  -d '{
    "sector": "food",
    "entity_type": "Sole proprietorship",
    "municipal_council": "Colombo Municipal Council",
    "employees_count": 3,
    "activities": ["food_preparation", "retail_sales"],
    "handles_food": true,
    "has_physical_premises": true,
    "is_manufacturing": true,
    "jurisdiction": "Western Province"
  }'
```

Interactive API docs: http://localhost:8000/docs

---

### How to Run — Tests

```bash
# From repo root
pytest tests/compliance/ -v
```

Expected output: 8 tests covering applicable, not_applicable, unknown, and conditional verdicts.

---

### How to Run — Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The dashboard shows the profile form on load.
Start the backend first (port 8000) so the Analyse button can reach the API.

---

### How to Register a New Source Document

```bash
python scripts/compliance/register_source.py \
  --source-id SL-NEW-ACT-2024 \
  --authority "Ministry of Trade" \
  --title "New Trade Act 2024" \
  --doc-type act \
  --jurisdiction "Sri Lanka (National)" \
  --effective-date 2024-01-01 \
  --file data/compliance/raw/new_trade_act_2024.pdf
```

### How to Validate the Rulebook

```bash
python scripts/compliance/validate_rulebook.py
```

This checks:
- YAML parses and passes Pydantic schema
- All obligation IDs are unique
- Every `source_id` in evidence exists in `source_register.csv`
- Every non-empty `quote` appears verbatim in the processed text file

---

### Adding New Business Types

To extend the rulebook to clothing, salon, or vehicle-parts:
1. Add rows to `obligations.yaml` with `applies_if.business_type: [clothing_retail]`
2. Add the corresponding source documents via `register_source.py`
3. Run `validate_rulebook.py` — all IDs and source_ids must resolve
4. No engine code changes required

---

### Design Principles

| Principle | Implementation |
|---|---|
| LLM never decides applicability | All logic in `engine.py` is pure Python; LLM is not called |
| Three-valued logic | `None` → UNKNOWN; never coerced to False |
| Source-grounded output | Every evidence chunk has `source_id`, `page`, `url`, `quote` |
| No personal data | `BusinessProfile` has no NIC, name, or personal identifiers |
| Reviewer workflow | `reviewer_status: draft` marks unverified quotes; validator enforces verbatim match |
