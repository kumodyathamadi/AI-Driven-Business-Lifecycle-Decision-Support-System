"""Idempotent inventory and page-preserving extraction of legal PDF sources."""

from __future__ import annotations

import hashlib
import json
import logging
import os
import tempfile
from datetime import date
from pathlib import Path
from typing import Literal, Optional

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

_REPO_ROOT = Path(__file__).resolve().parents[3]
LEGAL_SOURCE_DIR = (
    _REPO_ROOT / "data" / "compliance" / "raw" / "Component2_Legal_Sources"
)
PROCESSED_SOURCE_DIR = _REPO_ROOT / "data" / "compliance" / "processed" / "legal_sources"
INVENTORY_PATH = _REPO_ROOT / "data" / "compliance" / "legal_source_inventory.json"

ExtractionStatus = Literal[
    "not_ingested", "extracted", "empty_or_scanned", "extraction_error"
]
VerificationStatus = Literal["needs_verification", "verified", "rejected"]


class LegalSourceMetadata(BaseModel):
    source_id: str
    title: str
    issuing_authority: Optional[str] = None
    document_date: Optional[str] = None
    ingestion_date: str
    file_checksum: str
    source_paths: list[str]
    category: str
    page_count: Optional[int] = None
    page_numbers: list[int] = Field(default_factory=list)
    pages_without_text: list[int] = Field(default_factory=list)
    ocr_recommended: bool = False
    extraction_status: ExtractionStatus = "not_ingested"
    extraction_error: Optional[str] = None
    processed_text_path: Optional[str] = None
    official_url: Optional[str] = None
    title_is_filename_guess: bool = True
    verification_status: VerificationStatus = "needs_verification"


class LegalSourceInventory(BaseModel):
    schema_version: int = 1
    sources: list[LegalSourceMetadata] = Field(default_factory=list)


class LegalSourceIngestionResult(BaseModel):
    discovered_files: int
    unique_sources: int
    ingested_sources: int
    skipped_sources: int
    duplicate_files: int
    extraction_errors: int
    sources: list[LegalSourceMetadata]


class PdfExtractionUnavailable(RuntimeError):
    """Raised when PDFs exist but the configured local parser is unavailable."""


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _source_id(checksum: str) -> str:
    return f"SL-C2-PDF-{checksum[:20]}"


def _processed_display_path(path: Path) -> str:
    try:
        return path.relative_to(_REPO_ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def _safe_write_json(path: Path, document: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path: Optional[Path] = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=path.parent,
            prefix=f".{path.name}.",
            suffix=".tmp",
            delete=False,
        ) as temporary:
            temporary_path = Path(temporary.name)
            json.dump(document, temporary, ensure_ascii=False, indent=2)
            temporary.write("\n")
        os.replace(temporary_path, path)
    except OSError:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)
        raise


def _read_existing_inventory(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    with path.open(encoding="utf-8") as inventory_file:
        document = json.load(inventory_file)
    inventory = LegalSourceInventory.model_validate(document)
    return {source.source_id: source.model_dump() for source in inventory.sources}


def get_legal_source_inventory(
    inventory_path: Path = INVENTORY_PATH,
) -> LegalSourceInventory:
    """Return the saved legal-PDF inventory without scanning or mutating files."""
    if not inventory_path.exists():
        return LegalSourceInventory()
    with inventory_path.open(encoding="utf-8") as inventory_file:
        return LegalSourceInventory.model_validate(json.load(inventory_file))


def ingest_legal_sources(
    source_root: Path = LEGAL_SOURCE_DIR,
    processed_root: Path = PROCESSED_SOURCE_DIR,
    inventory_path: Path = INVENTORY_PATH,
) -> LegalSourceIngestionResult:
    """Discover PDFs recursively, deduplicate by content, and extract text per page."""
    pdf_paths = (
        sorted(
            (
                path for path in source_root.rglob("*")
                if path.is_file() and path.suffix.lower() == ".pdf"
            ),
            key=lambda path: path.relative_to(source_root).as_posix().casefold(),
        )
        if source_root.exists()
        else []
    )
    if not pdf_paths:
        return LegalSourceIngestionResult(
            discovered_files=0,
            unique_sources=0,
            ingested_sources=0,
            skipped_sources=0,
            duplicate_files=0,
            extraction_errors=0,
            sources=[],
        )

    try:
        import pymupdf as fitz
    except ImportError as exc:
        raise PdfExtractionUnavailable(
            "PDF extraction requires PyMuPDF. Install the backend dependencies "
            "and retry legal-source ingestion."
        ) from exc

    existing = _read_existing_inventory(inventory_path)
    grouped_paths: dict[str, list[Path]] = {}
    for path in pdf_paths:
        grouped_paths.setdefault(_sha256(path), []).append(path)

    today = date.today().isoformat()
    sources: list[LegalSourceMetadata] = []
    ingested_count = 0
    skipped_count = 0
    error_count = 0

    for checksum, paths in sorted(grouped_paths.items()):
        source_id = _source_id(checksum)
        previous = existing.get(source_id, {})
        relative_paths = [path.relative_to(source_root).as_posix() for path in paths]
        primary_path = paths[0]
        title = primary_path.stem.replace("_", " ").replace("-", " ").strip()
        processed_path = processed_root / f"{source_id}.json"
        previous_is_reusable = (
            previous.get("file_checksum") == checksum
            and previous.get("extraction_status")
            in {"extracted", "empty_or_scanned"}
            and processed_path.is_file()
        )

        if previous_is_reusable:
            extraction_status = previous["extraction_status"]
            page_count = previous.get("page_count")
            page_numbers = previous.get("page_numbers", [])
            pages_without_text = previous.get("pages_without_text", [])
            extraction_error = None
            skipped_count += 1
        else:
            try:
                document = fitz.open(primary_path)
                try:
                    pages = []
                    pages_without_text = []
                    for page_number, page in enumerate(document, start=1):
                        text = page.get_text("text").strip()
                        pages.append({"page_number": page_number, "text": text})
                        if not text:
                            pages_without_text.append(page_number)
                    page_count = len(document)
                finally:
                    document.close()

                extraction_status = (
                    "extracted" if any(page["text"] for page in pages)
                    else "empty_or_scanned"
                )
                extraction_error = None
                _safe_write_json(
                    processed_path,
                    {
                        "source_id": source_id,
                        "file_checksum": checksum,
                        "verification_status": previous.get(
                            "verification_status", "needs_verification"
                        ),
                        "pages": pages,
                    },
                )
                ingested_count += 1
            except Exception as exc:
                logger.exception("Could not extract legal PDF %s", primary_path)
                extraction_status = "extraction_error"
                page_count = None
                page_numbers = []
                pages_without_text = []
                extraction_error = f"{type(exc).__name__}: {exc}"
                error_count += 1

        record = {
            **previous,
            "source_id": source_id,
            "title": previous.get("title") or title,
            "issuing_authority": previous.get("issuing_authority"),
            "document_date": previous.get("document_date"),
            "ingestion_date": previous.get("ingestion_date") or today,
            "file_checksum": checksum,
            "source_paths": relative_paths,
            "category": primary_path.parent.relative_to(source_root).as_posix(),
            "page_count": page_count,
            "page_numbers": list(range(1, page_count + 1)) if page_count is not None else page_numbers,
            "pages_without_text": pages_without_text,
            "extraction_status": extraction_status,
            "extraction_error": extraction_error,
            "processed_text_path": (
                _processed_display_path(processed_path)
                if extraction_status in {"extracted", "empty_or_scanned"}
                else None
            ),
            "official_url": previous.get("official_url"),
            "verification_status": previous.get(
                "verification_status", "needs_verification"
            ),
        }
        record["ocr_recommended"] = bool(pages_without_text)
        sources.append(LegalSourceMetadata.model_validate(record))

    inventory = LegalSourceInventory(sources=sources)
    _safe_write_json(inventory_path, inventory.model_dump())
    return LegalSourceIngestionResult(
        discovered_files=len(pdf_paths),
        unique_sources=len(sources),
        ingested_sources=ingested_count,
        skipped_sources=skipped_count,
        duplicate_files=len(pdf_paths) - len(sources),
        extraction_errors=error_count,
        sources=sources,
    )
