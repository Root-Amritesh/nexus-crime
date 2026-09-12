"""
Cases API Controller.
Exposes query endpoints for case investigation data.
"""

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from neo4j import Driver

from backend.app.dependencies import get_db_session, get_neo4j_driver, get_current_investigator, InvestigatorContext
from backend.app.schemas.suspect import SuspectsResponse, SuspectItem, ScoreBreakdown
from backend.app.schemas.graph import GraphResponse, GraphNode, GraphEdge
from backend.app.schemas.map_data import MapDataResponse, MapTower, MapCrimeScene, MapFlaggedDevice
from backend.app.services.scoring_service import get_suspects_for_case
from backend.app.services import evidence_service
from backend.app.models.case import Case

logger = logging.getLogger("nexus-crime.api.v1.cases")

router = APIRouter()


@router.get(
    "",
    response_model=List[dict],
    status_code=status.HTTP_200_OK,
    summary="List all cases (Supervisor only)"
)
def list_cases(
    db: Session = Depends(get_db_session),
    investigator: InvestigatorContext = Depends(get_current_investigator)
):
    """
    Returns a list of all cases.
    Gated by role: Only 'supervisor' can list all cases.
    """
    if investigator.role != "supervisor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Case listing is restricted to supervisors only."
        )

    cases = db.query(Case).all()
    return [{"case_reference": c.case_reference, "investigator_id": c.investigator_id, "created_at": c.created_at} for c in cases]


@router.get(
    "/{case_id}/suspects",
    response_model=SuspectsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get ranked suspect list for a case"
)
def get_case_suspects(
    case_id: str,
    db: Session = Depends(get_db_session),
    investigator: InvestigatorContext = Depends(get_current_investigator)
):
    """
    Read-only endpoint to retrieve the ranked suspect list for a case.
    Returns 404 if the case does not exist.
    Returns 200 with an empty list if no suspects are flagged (valid empty state per PRD Section 31).
    """
    suspects_data = get_suspects_for_case(db=db, case_reference=case_id)
    if suspects_data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case '{case_id}' not found"
        )

    suspect_items = [
        SuspectItem(
            device_hash=s["device_hash"],
            risk_score=s["risk_score"],
            score_breakdown=ScoreBreakdown(
                centrality=s["score_breakdown"]["centrality"],
                colocation_count=s["score_breakdown"]["colocation_count"],
                comovement_count=s["score_breakdown"]["comovement_count"],
                call_frequency=s["score_breakdown"]["call_frequency"]
            ),
            flagged_scenes=s["flagged_scenes"]
        )
        for s in suspects_data
    ]

    return SuspectsResponse(suspects=suspect_items)


@router.get(
    "/{case_id}/graph",
    response_model=GraphResponse,
    status_code=status.HTTP_200_OK,
    summary="Get case relationship graph for network visualization"
)
def get_case_graph(
    case_id: str,
    db: Session = Depends(get_db_session),
    neo4j_drv: Driver = Depends(get_neo4j_driver),
    investigator: InvestigatorContext = Depends(get_current_investigator)
):
    """
    Read-only endpoint to retrieve case graph nodes and evidence-linked edges.
    Returns 404 if the case does not exist.
    Returns 200 with empty nodes/edges if no graph data is present.
    """
    graph_data = evidence_service.get_graph_for_case(
        db=db,
        neo4j_driver=neo4j_drv,
        case_reference=case_id
    )
    if graph_data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case '{case_id}' not found"
        )

    return GraphResponse(
        nodes=[GraphNode(**n) for n in graph_data["nodes"]],
        edges=[GraphEdge(**e) for e in graph_data["edges"]]
    )


@router.get(
    "/{case_id}/map-data",
    response_model=MapDataResponse,
    status_code=status.HTTP_200_OK,
    summary="Get geospatial coordinates for towers, scenes, and flagged suspects"
)
def get_case_map_data(
    case_id: str,
    db: Session = Depends(get_db_session),
    investigator: InvestigatorContext = Depends(get_current_investigator)
):
    """
    Read-only endpoint to retrieve map geospatial data for a case.
    Returns 404 if the case does not exist.
    Returns 200 with empty lists if data is empty.
    """
    map_data = evidence_service.get_map_data_for_case(
        db=db,
        case_reference=case_id
    )
    if map_data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case '{case_id}' not found"
        )

    return MapDataResponse(
        towers=[MapTower(**t) for t in map_data["towers"]],
        crime_scenes=[MapCrimeScene(**s) for s in map_data["crime_scenes"]],
        flagged_devices=[MapFlaggedDevice(**d) for d in map_data["flagged_devices"]]
    )
