"""Ingest the Component 2 PDF source pack into page-preserving processed records."""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.app.compliance.legal_sources import (  # noqa: E402
    PdfExtractionUnavailable,
    ingest_legal_sources,
)


def main() -> int:
    try:
        result = ingest_legal_sources()
    except (OSError, ValueError, PdfExtractionUnavailable) as exc:
        print(f"Legal-source ingestion failed: {exc}", file=sys.stderr)
        return 1

    print(
        "Legal-source ingestion complete: "
        f"{result.discovered_files} PDFs discovered, "
        f"{result.unique_sources} unique sources, "
        f"{result.ingested_sources} extracted, "
        f"{result.skipped_sources} unchanged, "
        f"{result.duplicate_files} duplicate files, "
        f"{result.extraction_errors} extraction errors."
    )
    return 1 if result.extraction_errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
