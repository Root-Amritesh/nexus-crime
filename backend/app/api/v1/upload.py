from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile, status
from sqlalchemy.orm import Session

from backend.app.background.tasks import run_correlation_pipeline
from backend.app.core.logging import get_request_id
from backend.app.dependencies import get_db_session, get_current_investigator, InvestigatorContext
from backend.app.schemas.tower_dump import UploadResponse
from backend.app.schemas.fir import FIRTextRequest, FIRExtractionResponse
from backend.app.services import ingestion_service

router = APIRouter()


@router.post(
    "/tower-dump",
    response_model=UploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload a tower dump CSV for a given case"
)
def upload_tower_dump(
    background_tasks: BackgroundTasks,
    case_reference: str = Form(..., description="Legal reference identifier for the case"),
    file: UploadFile = File(..., description="CSV file containing phone_hash, tower_id, timestamp, signal_strength"),
    db: Session = Depends(get_db_session),
    investigator: InvestigatorContext = Depends(get_current_investigator)
):
    """
    Ingests and validates a tower dump CSV file.
    Rejects malformed schemas, unknown tower metadata, and handles duplicate records gracefully.
    Triggers correlation pipeline in background.
    """
    file_content = file.file.read()
    response = ingestion_service.ingest_tower_dump(db, case_reference, file_content)
    # Trigger background correlation pipeline per blueprint.md Section 9.2
    background_tasks.add_task(
        run_correlation_pipeline,
        case_reference=case_reference,
        job_id=response.job_id,
        request_id=get_request_id()
    )
    return response


@router.post(
    "/cdr",
    response_model=UploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload Call Detail Records (CDR) CSV for a given case"
)
def upload_cdr(
    background_tasks: BackgroundTasks,
    case_reference: str = Form(..., description="Legal reference identifier for the case"),
    file: UploadFile = File(..., description="CSV file containing caller_hash, callee_hash, timestamp, duration"),
    db: Session = Depends(get_db_session),
    investigator: InvestigatorContext = Depends(get_current_investigator)
):
    """
    Ingests and validates a CDR CSV file.
    Triggers correlation pipeline in background.
    """
    file_content = file.file.read()
    response = ingestion_service.ingest_cdr(db, case_reference, file_content)
    # Trigger background correlation pipeline per blueprint.md Section 9.2
    background_tasks.add_task(
        run_correlation_pipeline,
        case_reference=case_reference,
        job_id=response.job_id,
        request_id=get_request_id()
    )
    return response


@router.post(
    "/financial",
    response_model=UploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload Financial Records CSV for a given case"
)
def upload_financial(
    case_reference: str = Form(..., description="Legal reference identifier for the case"),
    file: UploadFile = File(..., description="CSV file containing sender_hash, receiver_hash, amount, timestamp"),
    db: Session = Depends(get_db_session),
    investigator: InvestigatorContext = Depends(get_current_investigator)
):
    """
    Ingests and validates a Financial records CSV file.
    """
    file_content = file.file.read()
    return ingestion_service.ingest_financial(db, case_reference, file_content)


@router.post(
    "/fir-text",
    response_model=FIRExtractionResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload raw FIR narrative text for entity extraction"
)
def upload_fir_text(
    payload: FIRTextRequest,
    db: Session = Depends(get_db_session),
    investigator: InvestigatorContext = Depends(get_current_investigator)
):
    """
    Validates case reference and registers FIR text.
    Entity extraction is handled in a downstream AI stage.
    """
    return ingestion_service.ingest_fir_text(db, payload.case_reference, payload.text)
