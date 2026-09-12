import csv
import io
import uuid
from datetime import datetime, timezone
from typing import Set, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from backend.app.core.exceptions import (
    MissingCaseReferenceError,
    InvalidSchemaError,
    UnknownTowerIdError,
)
from backend.app.core.logging import log_stage_event
from backend.app.models.case import Case
from backend.app.models.tower import Tower
from backend.app.models.tower_ping import TowerPing
from backend.app.models.cdr_record import CDRRecord
from backend.app.models.financial_record import FinancialRecord
from backend.app.schemas.tower_dump import TowerDumpRow, UploadResponse
from backend.app.schemas.cdr import CDRRow
from backend.app.schemas.financial import FinancialRow
from backend.app.schemas.fir import FIRExtractionResponse


def _ensure_case_exists(db: Session, case_reference: str) -> None:
    """Helper to ensure the case reference exists in the database."""
    case_ref = case_reference.strip() if case_reference else ""
    if not case_ref:
        raise MissingCaseReferenceError()
        
    case_obj = db.query(Case).filter(Case.case_reference == case_ref).first()
    if not case_obj:
        # Create a default case container if it doesn't exist yet
        case_obj = Case(
            case_reference=case_ref,
            warrant_reference="WARR-AUTO-INGEST",
            investigator_id="INV-HOST-001"
        )
        db.add(case_obj)
        db.flush()


def ingest_tower_dump(db: Session, case_reference: str, file_content: bytes) -> UploadResponse:
    """
    Parses and ingests a tower dump CSV.
    Validates case reference, schema columns, tower existence, row formatting, and handles duplicates.
    """
    if not case_reference or not case_reference.strip():
        raise MissingCaseReferenceError()

    # Decode and parse CSV
    try:
        content_str = file_content.decode("utf-8")
    except UnicodeDecodeError as e:
        raise InvalidSchemaError("File encoding must be UTF-8") from e

    csv_file = io.StringIO(content_str)
    reader = csv.DictReader(csv_file)
    print("DEBUG content_str:", repr(content_str))
    print("DEBUG reader.fieldnames before strip:", reader.fieldnames)
    
    # Strip whitespace from headers
    if reader.fieldnames:
        reader.fieldnames = [name.strip() for name in reader.fieldnames]
    else:
        raise InvalidSchemaError("Empty CSV file uploaded")
    print("DEBUG reader.fieldnames after strip:", reader.fieldnames)

    # Validate schema headers
    required_headers = {"phone_hash", "tower_id", "timestamp", "signal_strength"}
    if not required_headers.issubset(set(reader.fieldnames or [])):
        raise InvalidSchemaError(f"Missing required columns. Expected: {required_headers}")

    # Ensure case container is registered
    _ensure_case_exists(db, case_reference)

    # Cache list of valid tower IDs for validation
    valid_tower_ids: Set[str] = {t.tower_id for t in db.query(Tower.tower_id).all()}

    # First pass validation: check all tower_ids exist in metadata
    rows_data = []
    for idx, row in enumerate(reader, start=1):
        tower_id = row.get("tower_id", "").strip()
        if not tower_id:
            raise InvalidSchemaError(f"Row {idx}: missing tower_id")
        if tower_id not in valid_tower_ids:
            # Raise UnknownTowerIdError per api-contract.md
            raise UnknownTowerIdError(f"Tower ID '{tower_id}' at row {idx} does not exist in metadata")
        rows_data.append(row)

    records_ingested = 0
    records_rejected = 0
    job_id = str(uuid.uuid4())

    valid_pings_dicts = []
    for row in rows_data:
        try:
            # Pydantic validation
            validated_row = TowerDumpRow(
                phone_hash=row.get("phone_hash", "").strip(),
                tower_id=row.get("tower_id", "").strip(),
                timestamp=row.get("timestamp", "").strip(),
                signal_strength=int(row.get("signal_strength", 0))
            )
            valid_pings_dicts.append({
                "phone_hash": validated_row.phone_hash,
                "tower_id": validated_row.tower_id,
                "timestamp": validated_row.timestamp,
                "signal_strength": validated_row.signal_strength
            })
        except Exception as e:
            records_rejected += 1
            continue

    if valid_pings_dicts:
        try:
            from sqlalchemy.dialects.postgresql import insert as pg_insert
            stmt = pg_insert(TowerPing).values(valid_pings_dicts).on_conflict_do_nothing()
            res = db.execute(stmt)
            records_ingested = res.rowcount if res.rowcount is not None and res.rowcount >= 0 else len(valid_pings_dicts)
        except Exception as e:
            print("FALLBACK BULK INSERT ERROR:", e)
            for p_dict in valid_pings_dicts:
                try:
                    sp = db.begin_nested()
                    db.add(TowerPing(**p_dict))
                    db.flush()
                    records_ingested += 1
                except Exception:
                    sp.rollback()
                    records_rejected += 1

    db.commit()


    # Log ingestion stage outcome per non-negotiables.md
    log_stage_event(
        stage="ingestion",
        outcome="success",
        details={
            "case_reference": case_reference,
            "type": "tower-dump",
            "records_ingested": records_ingested,
            "records_rejected": records_rejected,
            "job_id": job_id
        }
    )

    return UploadResponse(
        status="accepted",
        records_ingested=records_ingested,
        records_rejected=records_rejected,
        job_id=job_id
    )


def ingest_cdr(db: Session, case_reference: str, file_content: bytes) -> UploadResponse:
    """
    Parses and ingests a Call Detail Record (CDR) CSV.
    """
    if not case_reference or not case_reference.strip():
        raise MissingCaseReferenceError()

    try:
        content_str = file_content.decode("utf-8")
    except UnicodeDecodeError as e:
        raise InvalidSchemaError("File encoding must be UTF-8") from e

    csv_file = io.StringIO(content_str)
    reader = csv.DictReader(csv_file)
    
    if reader.fieldnames:
        reader.fieldnames = [name.strip() for name in reader.fieldnames]
    else:
        raise InvalidSchemaError("Empty CSV file uploaded")

    # The CSV schema can contain 'duration' which maps to 'duration_seconds' in ORM
    headers = set(reader.fieldnames or [])
    has_duration = "duration" in headers
    has_duration_seconds = "duration_seconds" in headers
    
    if not has_duration and not has_duration_seconds:
        raise InvalidSchemaError("Missing duration field in CDR schema")
        
    required_headers = {"caller_hash", "callee_hash", "timestamp"}
    if not required_headers.issubset(headers):
        raise InvalidSchemaError(f"Missing required columns. Expected: {required_headers}")

    _ensure_case_exists(db, case_reference)

    records_ingested = 0
    records_rejected = 0
    job_id = str(uuid.uuid4())

    for row in reader:
        dur_val = row.get("duration") or row.get("duration_seconds")
        try:
            validated_row = CDRRow(
                caller_hash=row.get("caller_hash", "").strip(),
                callee_hash=row.get("callee_hash", "").strip(),
                timestamp=row.get("timestamp", "").strip(),
                duration_seconds=int(dur_val) if dur_val else 0
            )
        except (ValueError, TypeError, KeyError):
            records_rejected += 1
            continue

        record = CDRRecord(
            caller_hash=validated_row.caller_hash,
            callee_hash=validated_row.callee_hash,
            timestamp=validated_row.timestamp,
            duration_seconds=validated_row.duration_seconds
        )

        db.add(record)
        records_ingested += 1

    db.commit()

    log_stage_event(
        stage="ingestion",
        outcome="success",
        details={
            "case_reference": case_reference,
            "type": "cdr",
            "records_ingested": records_ingested,
            "records_rejected": records_rejected,
            "job_id": job_id
        }
    )

    return UploadResponse(
        status="accepted",
        records_ingested=records_ingested,
        records_rejected=records_rejected,
        job_id=job_id
    )


def ingest_financial(db: Session, case_reference: str, file_content: bytes) -> UploadResponse:
    """
    Parses and ingests a Financial Records CSV.
    """
    if not case_reference or not case_reference.strip():
        raise MissingCaseReferenceError()

    try:
        content_str = file_content.decode("utf-8")
    except UnicodeDecodeError as e:
        raise InvalidSchemaError("File encoding must be UTF-8") from e

    csv_file = io.StringIO(content_str)
    reader = csv.DictReader(csv_file)
    
    if reader.fieldnames:
        reader.fieldnames = [name.strip() for name in reader.fieldnames]
    else:
        raise InvalidSchemaError("Empty CSV file uploaded")

    required_headers = {"sender_hash", "receiver_hash", "amount", "timestamp"}
    if not required_headers.issubset(set(reader.fieldnames or [])):
        raise InvalidSchemaError(f"Missing required columns. Expected: {required_headers}")

    _ensure_case_exists(db, case_reference)

    records_ingested = 0
    records_rejected = 0
    job_id = str(uuid.uuid4())

    for row in reader:
        try:
            validated_row = FinancialRow(
                sender_hash=row.get("sender_hash", "").strip(),
                receiver_hash=row.get("receiver_hash", "").strip(),
                amount=float(row.get("amount", 0)),
                timestamp=row.get("timestamp", "").strip()
            )
        except (ValueError, TypeError, KeyError):
            records_rejected += 1
            continue

        record = FinancialRecord(
            sender_hash=validated_row.sender_hash,
            receiver_hash=validated_row.receiver_hash,
            amount=validated_row.amount,
            timestamp=validated_row.timestamp
        )

        db.add(record)
        records_ingested += 1

    db.commit()

    log_stage_event(
        stage="ingestion",
        outcome="success",
        details={
            "case_reference": case_reference,
            "type": "financial",
            "records_ingested": records_ingested,
            "records_rejected": records_rejected,
            "job_id": job_id
        }
    )

    return UploadResponse(
        status="accepted",
        records_ingested=records_ingested,
        records_rejected=records_rejected,
        job_id=job_id
    )


def ingest_fir_text(db: Session, case_reference: str, text: str) -> FIRExtractionResponse:
    """
    Validates case reference and stub persists the raw text.
    NER/NLP extraction lands in a later AI-pipeline stage.
    """
    if not case_reference or not case_reference.strip():
        raise MissingCaseReferenceError()
    if not text or not text.strip():
        raise InvalidSchemaError("FIR text content cannot be empty")

    _ensure_case_exists(db, case_reference)
    job_id = str(uuid.uuid4())

    # Stub: NER extraction is unimplemented in Stage 4
    log_stage_event(
        stage="ingestion",
        outcome="success",
        details={
            "case_reference": case_reference,
            "type": "fir-text",
            "job_id": job_id,
            "comment": "NER/NLP extraction deferred to a later AI stage"
        }
    )

    return FIRExtractionResponse(
        entities_extracted=[],
        job_id=job_id
    )
