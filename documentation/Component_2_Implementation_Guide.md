# Component 2 Implementation Guide

Component 2 is a deterministic, evidence-aware regulatory decision-support
service. It does not provide legal advice and does not use an LLM to determine
applicability. The current rulebook is a limited initial corpus; entries and
source extracts marked `draft` or containing placeholder text must not be
presented as verified law.

## Implemented request flow

```text
React profile form
  -> POST /api/v1/component2/evaluate
  -> Pydantic validation and canonicalization
  -> three-valued rule engine
  -> local Chroma/SentenceTransformers retrieval (or disclosed lexical fallback)
  -> deterministic explanation and registration guidance
  -> PostgreSQL/SQLite evaluation record
```

## Backend modules

| Module | Responsibility |
| --- | --- |
| `backend/app/compliance/profile.py` | Accepts profile aliases used by Component 1 and the UI, validates counts and collections, normalizes sector/entity names, and reports missing core facts. Unknown values remain unknown. |
| `backend/app/compliance/engine.py` | Applies the YAML rulebook deterministically. An unknown fact is not coerced to false; business sectors outside the current rulebook are marked `not_covered`. |
| `backend/app/compliance/rulebook_loader.py` | Loads and validates `data/compliance/rulebook/obligations.yaml`. |
| `backend/app/compliance/source_registry.py` | Resolves source identifiers to registered metadata. |
| `backend/app/compliance/retrieval.py` | Chunks local `sources/*.txt`, indexes and queries a local Chroma collection using SentenceTransformers, and identifies draft/placeholders in every returned excerpt. When either package is unavailable, provides explicitly labeled keyword retrieval instead. |
| `backend/app/compliance/guidance.py` | Maps rule results to Mandatory / Conditional / Not Applicable, builds explanations and next steps, and refuses to invent document checklists or cite excerpts from a different source than the rule. |
| `backend/app/api/component2_routes.py` | Exposes the evaluation API, profile completeness and follow-up questions, response assembly, and persistence. |
| `backend/models.py` | Defines `ComplianceEvaluationRecord`; stored profile/result JSON excludes business names and personal identifiers. |
| `alembic/versions/2026_10_14_0002_component2_evaluation_records.py` | Adds the PostgreSQL/SQLite-compatible evaluation-history table. |

### Project structure added or wired for this component

```text
backend/
  app/
    api/component2_routes.py
    compliance/
      profile.py
      engine.py
      retrieval.py
      guidance.py
      rulebook_loader.py
      source_registry.py
  models.py
alembic/versions/2026_10_14_0002_component2_evaluation_records.py
data/compliance/
  profiles/                  # API request examples
  rulebook/obligations.yaml
  source_register.csv
  chroma/                     # local vector index; generated at runtime
sources/                      # local source text corpus
frontend/src/components/component2.tsx
tests/compliance/test_component2_api.py
documentation/Component_2_Implementation_Guide.md
```

## Profile contract

The API accepts `business_type` or `sector`, location details, ownership/legal
form, employees (`employees`, `employees_count`, or `number_of_employees`),
products/services, business size, and operational facts. Fields not supplied
remain unknown. Partial profiles are accepted so the engine can identify
missing facts; `profile_validation.missing_required_fields` identifies core
profile information still needed for a complete assessment. Business size and
products/services are normalized and included in context/retrieval, but the
current rules do not use them as applicability triggers.

```json
{
  "business_type": "bakery",
  "sector": "food",
  "location": "Colombo",
  "province": "Western Province",
  "local_authority": "Colombo Municipal Council",
  "ownership": "sole_proprietorship",
  "employees": 4,
  "products_services": ["Bread", "Cakes"],
  "business_size": "small",
  "handles_food": true,
  "has_physical_premises": true
}
```

## API

- `POST /api/v1/component2/evaluate` (also `/api/v1/component2/analyze`)
  validates the profile, returns classified obligations and guidance, and
  stores an evaluation record. `retrieval_mode` indicates
  `chroma_sentence_transformers` or `lexical_fallback`.
- The response contains the normalized `business_context`, a completeness
  report, summary counts, source-linked obligation results, guidance, an
  evaluation identifier, deterministic priority labels, and a
  legal-advice/evidence-quality disclaimer. Priority is a review ordering hint,
  not a statutory deadline or legal risk score.
- The `compliance_evaluation_records` table stores `id`, `business_context`
  (JSON/JSONB), `result` (JSON/JSONB), `retrieval_mode`, and `created_at`.
- The UI uses `VITE_API_BASE_URL` to select the API origin; it defaults to
  `http://localhost:8000`.

To apply the database migration in a deployed environment:

```powershell
alembic upgrade head
```

## Retrieval and evidence controls

Install `backend/requirements.txt` to enable the local vector path. The first
vector query downloads/loads `sentence-transformers/all-MiniLM-L6-v2` into the
local model cache and persists vectors under `data/compliance/chroma/`.
No profile text is sent to a hosted embedding API. The local text corpus is
not authoritative merely because it is indexed: returned evidence carries
`reviewer_status`, `contains_placeholder`, and registry metadata. Results
cannot be classified as Mandatory unless the rule engine and evidence review
allow it. The current rulebook has no verified required-document checklists,
so `required_documents` is empty with an explicit notice to confirm documents
with the authority.

## Sample profiles and tests

Sample API payloads are in `data/compliance/profiles/`:

- `food_bakery_api.json`
- `clothing_retail_api.json`
- `incomplete_business_api.json`

Run the focused tests from the repository root:

```powershell
pytest tests/compliance/test_component2_api.py tests/compliance/test_engine.py
```

The test cases cover alias normalization, range validation, missing profile
facts, unsupported sectors, draft evidence, safe document guidance, response
classification, and evaluation persistence.

## Current research boundary

The rulebook currently covers a narrow set of food-business rules. Clothing,
salon, vehicle, other sectors, and unsupported local authorities must be
treated as `not_covered`, not as having no obligations. Some local text files
explicitly say `[PLACEHOLDER LEGAL TEXT]`; source references and legal
conclusions require legal-domain review and replacement with official,
current Sri Lankan Acts, regulations, gazettes, and local-authority material
before research or production claims are made.
