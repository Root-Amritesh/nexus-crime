"""
Suspects API Controller.
Exposes explainability endpoints for specific suspects.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from neo4j import Driver

from backend.app.dependencies import get_db_session, get_neo4j_driver, get_current_investigator, InvestigatorContext
from backend.app.schemas.evidence import SuspectEvidenceResponse, EvidenceItem
from backend.app.services import evidence_service

logger = logging.getLogger("nexus-crime.api.v1.suspects")

router = APIRouter()


@router.get(
    "/{device_hash}/evidence",
    response_model=SuspectEvidenceResponse,
    status_code=status.HTTP_200_OK,
    summary="Get explainability supporting evidence trail for a suspect"
)
def get_suspect_evidence(
    device_hash: str,
    db: Session = Depends(get_db_session),
    neo4j_drv: Driver = Depends(get_neo4j_driver),
    investigator: InvestigatorContext = Depends(get_current_investigator)
):
    """
    Read-only endpoint to retrieve the attached evidence trail for a suspect.
    Returns 200 with an empty evidence list if no edges exist for this device hash
    (per api-contract.md convention).
    """
    data = evidence_service.get_evidence_for_suspect(
        neo4j_driver=neo4j_drv,
        device_hash=device_hash
    )

    return SuspectEvidenceResponse(
        device_hash=data["device_hash"],
        evidence=[EvidenceItem(**ev) for ev in data["evidence"]]
    )
