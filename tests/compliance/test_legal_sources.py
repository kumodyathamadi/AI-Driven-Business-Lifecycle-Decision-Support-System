"""Tests for repeatable, source-grounded legal PDF ingestion."""

from __future__ import annotations

import json
from pathlib import Path

import pymupdf as fitz
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.app.api.component2_routes import router
import backend.app.compliance.retrieval as retrieval
from backend.app.compliance.legal_sources import (
    LegalSourceInventory,
    LegalSourceMetadata,
    get_legal_source_inventory,
    ingest_legal_sources,
)


def _write_pdf(path: Path, pages: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    document = fitz.open()
    for text in pages:
        page = document.new_page()
        if text:
            page.insert_text((72, 72), text)
    document.save(path)
    document.close()


def test_ingests_recursive_pdfs_with_pages_and_candidate_metadata(tmp_path: Path):
    source_root = tmp_path / "raw"
    _write_pdf(source_root / "food" / "act.pdf", ["Section 1", "Section 2"])
    processed_root = tmp_path / "processed"
    inventory_path = tmp_path / "inventory.json"

    result = ingest_legal_sources(source_root, processed_root, inventory_path)

    assert result.discovered_files == 1
    assert result.unique_sources == 1
    source = result.sources[0]
    assert source.source_id.startswith("SL-C2-PDF-")
    assert len(source.file_checksum) == 64
    assert source.source_paths == ["food/act.pdf"]
    assert source.page_count == 2
    assert source.page_numbers == [1, 2]
    assert source.verification_status == "needs_verification"
    assert source.extraction_status == "extracted"

    extracted = json.loads((processed_root / f"{source.source_id}.json").read_text())
    assert extracted["pages"] == [
        {"page_number": 1, "text": "Section 1"},
        {"page_number": 2, "text": "Section 2"},
    ]
    assert inventory_path.exists()


def test_deduplicates_identical_pdfs_and_skips_unchanged_reingestion(tmp_path: Path):
    source_root = tmp_path / "raw"
    _write_pdf(source_root / "food" / "act.pdf", ["Same PDF content"])
    duplicate = source_root / "other" / "copy.pdf"
    duplicate.parent.mkdir(parents=True)
    duplicate.write_bytes((source_root / "food" / "act.pdf").read_bytes())
    processed_root = tmp_path / "processed"
    inventory_path = tmp_path / "inventory.json"

    first = ingest_legal_sources(source_root, processed_root, inventory_path)
    second = ingest_legal_sources(source_root, processed_root, inventory_path)

    assert first.discovered_files == 2
    assert first.unique_sources == 1
    assert first.duplicate_files == 1
    assert first.ingested_sources == 1
    assert first.sources[0].source_paths == ["food/act.pdf", "other/copy.pdf"]
    assert second.ingested_sources == 0
    assert second.skipped_sources == 1
    assert len(get_legal_source_inventory(inventory_path).sources) == 1
    saved_inventory = json.loads(inventory_path.read_text())
    assert len(saved_inventory["sources"]) == 1


def test_empty_or_scanned_pdf_is_marked_without_claiming_ocr(tmp_path: Path):
    source_root = tmp_path / "raw"
    _write_pdf(source_root / "scanned.pdf", [""])

    result = ingest_legal_sources(
        source_root,
        tmp_path / "processed",
        tmp_path / "inventory.json",
    )

    assert result.sources[0].extraction_status == "empty_or_scanned"
    assert result.sources[0].pages_without_text == [1]
    assert result.sources[0].ocr_recommended is True
    assert result.sources[0].verification_status == "needs_verification"


def test_partially_scanned_pdf_recommends_ocr_for_blank_pages(tmp_path: Path):
    source_root = tmp_path / "raw"
    _write_pdf(source_root / "mixed.pdf", ["Extractable page", ""])

    result = ingest_legal_sources(
        source_root,
        tmp_path / "processed",
        tmp_path / "inventory.json",
    )

    assert result.sources[0].extraction_status == "extracted"
    assert result.sources[0].pages_without_text == [2]
    assert result.sources[0].ocr_recommended is True


def test_corrupt_pdf_failure_is_recorded_and_does_not_abort_batch(tmp_path: Path):
    source_root = tmp_path / "raw"
    _write_pdf(source_root / "valid.pdf", ["Valid text"])
    corrupt = source_root / "corrupt.pdf"
    corrupt.write_bytes(b"not a PDF")

    result = ingest_legal_sources(
        source_root,
        tmp_path / "processed",
        tmp_path / "inventory.json",
    )

    assert result.discovered_files == 2
    assert result.extraction_errors == 1
    assert sum(source.extraction_status == "extraction_error" for source in result.sources) == 1
    assert sum(source.extraction_status == "extracted" for source in result.sources) == 1
    assert next(
        source for source in result.sources
        if source.extraction_status == "extraction_error"
    ).extraction_error


def test_inventory_and_ingestion_api_endpoints(monkeypatch, tmp_path: Path):
    import backend.app.api.component2_routes as component2_routes

    source_root = tmp_path / "raw"
    _write_pdf(source_root / "act.pdf", ["Clause text"])
    processed_root = tmp_path / "processed"
    inventory_path = tmp_path / "inventory.json"
    monkeypatch.setattr(
        component2_routes,
        "get_legal_source_inventory",
        lambda: LegalSourceInventory(),
    )
    monkeypatch.setattr(
        component2_routes,
        "ingest_legal_sources",
        lambda: ingest_legal_sources(source_root, processed_root, inventory_path),
    )
    app = FastAPI()
    app.include_router(router)

    client = TestClient(app)
    assert client.get("/api/v1/component2/sources").status_code == 200
    response = client.post("/api/v1/component2/sources/ingest")

    assert response.status_code == 200
    assert response.json()["discovered_files"] == 1
    assert response.json()["sources"][0]["verification_status"] == "needs_verification"


def test_pdf_candidate_retrieval_preserves_page_and_unverified_status(
    monkeypatch,
    tmp_path: Path,
):
    source_id = "SL-C2-PDF-0123456789abcdef0123"
    processed_path = tmp_path / "processed.json"
    processed_path.write_text(
        json.dumps(
            {
                "file_checksum": "a" * 64,
                "pages": [
                    {"page_number": 1, "text": "Unrelated information."},
                    {
                        "page_number": 7,
                        "text": "Food premises hygiene and inspection information.",
                    },
                ],
            }
        ),
        encoding="utf-8",
    )
    source = LegalSourceMetadata(
        source_id=source_id,
        title="example_filename_title",
        ingestion_date="2026-10-14",
        file_checksum="a" * 64,
        source_paths=["food/example.pdf"],
        category="food",
        page_count=2,
        page_numbers=[1, 2],
        extraction_status="extracted",
        processed_text_path=str(processed_path),
    )
    monkeypatch.setattr(
        retrieval,
        "get_legal_source_inventory",
        lambda: LegalSourceInventory(sources=[source]),
    )

    result = retrieval.retrieve_legal_candidates("food hygiene inspection", top_k=1)

    assert result["mode"] == "lexical_pdf_candidates"
    assert len(result["evidence"]) == 1
    candidate = result["evidence"][0]
    assert candidate["metadata"]["source_id"] == source_id
    assert candidate["metadata"]["page"] == 7
    assert candidate["metadata"]["verification_status"] == "needs_verification"
    assert candidate["metadata"]["title_is_filename_guess"] is True
