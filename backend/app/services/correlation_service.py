"""
Correlation Service.
Orchestrates data fetching, AI correlation execution (co-location and co-movement),
merging results, persisting to PostgreSQL staging, and emitting structured logging.
"""

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from backend.app.ai.correlation.colocation import compute_colocation
from backend.app.ai.correlation.comovement import compute_comovement
from backend.app.core.logging import log_stage_event
from backend.app.models.case import Case
from backend.app.models.crime_scene import CrimeScene
from backend.app.models.tower import Tower
from backend.app.models.tower_ping import TowerPing
from backend.app.models.correlation_staging import CorrelationStaging


def run_correlation_for_case(
    db: Session,
    case_reference: str,
    job_id: str
) -> Dict[str, Any]:
    """
    Orchestrates the end-to-end Stage 5 correlation pipeline:
    1. Fetches CrimeScene records for the case.
    2. Fetches Tower metadata.
    3. Fetches TowerPing records associated with case towers/scene times.
    4. Computes co-location correlation.
    5. Computes co-movement correlation.
    6. Merges results into a single structured dictionary with evidence objects.
    7. Persists output to PostgreSQL `correlation_staging` table.
    8. Emits structured log line per non-negotiables.md (stage="correlation", outcome="success"|"failed").
    """
    case_ref = case_reference.strip() if case_reference else ""
    if not case_ref:
        log_stage_event(
            stage="correlation",
            outcome="failed",
            details={"error": "Missing case reference", "job_id": job_id}
        )
        raise ValueError("case_reference cannot be empty")

    # Fetch Case and Crime Scenes
    case = db.query(Case).filter(Case.case_reference == case_ref).first()
    if not case:
        log_stage_event(
            stage="correlation",
            outcome="failed",
            details={"error": f"Case '{case_ref}' not found in database", "job_id": job_id}
        )
        raise ValueError(f"Case '{case_ref}' not found in database")

    crime_scenes_orm = db.query(CrimeScene).filter(CrimeScene.case_reference == case_ref).all()
    towers_orm = db.query(Tower).all()
    pings_orm = db.query(TowerPing).all()

    # Convert ORM objects to plain dicts for pure AI correlation functions
    crime_scenes = [
        {
            "scene_id": s.scene_id,
            "latitude": s.latitude,
            "longitude": s.longitude,
            "time_window_start": s.time_window_start,
            "time_window_end": s.time_window_end,
            "incident_type": s.incident_type
        }
        for s in crime_scenes_orm
    ]

    towers = [
        {
            "tower_id": t.tower_id,
            "latitude": t.latitude,
            "longitude": t.longitude,
            "coverage_radius_km": t.coverage_radius_km
        }
        for t in towers_orm
    ]

    tower_pings = [
        {
            "phone_hash": p.phone_hash,
            "tower_id": p.tower_id,
            "timestamp": p.timestamp,
            "signal_strength": p.signal_strength
        }
        for p in pings_orm
    ]

    # 1. Run Co-location
    colocation_result = compute_colocation(crime_scenes, towers, tower_pings)

    # 2. Run Co-movement
    comovement_result = compute_comovement(tower_pings)

    # 3. Merge results
    merged_results = {
        "case_reference": case_ref,
        "job_id": job_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "colocation": colocation_result,
        "comovement": comovement_result,
        "summary": {
            "total_pings_analyzed": len(tower_pings),
            "scenes_analyzed": len(crime_scenes),
            "colocation_flagged_count": len(colocation_result.get("flagged_devices", [])),
            "colocation_unflagged_count": len(colocation_result.get("unflagged_devices", [])),
            "comovement_flagged_pairs_count": len(comovement_result.get("flagged_pairs", [])),
            "comovement_weak_pairs_count": len(comovement_result.get("weak_evidence_pairs", [])),
        }
    }

    # 4. Persist to correlation_staging table
    staging_record = CorrelationStaging(
        case_reference=case_ref,
        job_id=job_id,
        results=merged_results
    )
    db.add(staging_record)
    db.commit()

    # 5. Log structured success line
    log_stage_event(
        stage="correlation",
        outcome="success",
        details={
            "case_reference": case_ref,
            "job_id": job_id,
            "flagged_colocation_devices": len(colocation_result.get("flagged_devices", [])),
            "flagged_comovement_pairs": len(comovement_result.get("flagged_pairs", [])),
        }
    )

    return merged_results
