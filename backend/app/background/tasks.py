"""
Background tasks orchestration per blueprint.md Section 6 and Section 9.2.

Uses FastAPI BackgroundTasks (in-process) as an explicit hackathon architectural choice.
Ensures every pipeline stage logs structured events, and unhandled exceptions are caught
and logged without vanishing silently per blueprint.md Section 21 Reliability.
"""

import logging
from typing import Optional
from sqlalchemy.orm import Session

from backend.app.core.logging import log_stage_event, set_request_id
from backend.app.db.postgres import SyncSessionLocal
from backend.app.db.neo4j_driver import get_neo4j_driver
from backend.app.services.correlation_service import run_correlation_for_case
from backend.app.services.graph_service import construct_graph_for_case
from backend.app.services.scoring_service import compute_and_persist_case_scores

logger = logging.getLogger("nexus-crime.background.tasks")


def run_correlation_pipeline(case_reference: str, job_id: str, request_id: Optional[str] = None) -> None:
    """
    Entry point for the background pipeline (Stages 5-8).
    1. Runs Correlation (Co-location and Co-movement) and persists output to PostgreSQL staging.
    2. Runs Entity Resolution, builds the Neo4j graph with evidence-linked edges, and executes Graph Analytics.
    3. Computes final weighted Risk Scores and persists ranked suspects.
    Triggered post-upload for tower dump and CDR files.
    """
    if request_id:
        set_request_id(request_id)

    logger.info(f"Starting end-to-end AI pipeline for case={case_reference}, job_id={job_id}")

    db: Session = SyncSessionLocal()
    neo4j_driver = next(get_neo4j_driver())


    try:
        # Stage 5: Correlation
        run_correlation_for_case(db=db, case_reference=case_reference, job_id=job_id)

        # Stage 6 & 7: Entity Resolution + Neo4j Graph Construction + Graph Analytics
        construct_graph_for_case(db=db, neo4j_driver=neo4j_driver, case_reference=case_reference, job_id=job_id)

        # Stage 8: Risk Scoring Engine
        compute_and_persist_case_scores(db=db, neo4j_driver=neo4j_driver, case_reference=case_reference, job_id=job_id)

    except Exception as e:
        # Per blueprint.md Section 21: Never let an unhandled exception vanish silently
        logger.error(f"Pipeline failed for case={case_reference}, job_id={job_id}: {str(e)}", exc_info=True)
        log_stage_event(
            stage="pipeline",
            outcome="failed",
            details={
                "case_reference": case_reference,
                "job_id": job_id,
                "error": str(e),
                "error_type": type(e).__name__
            }
        )
    finally:
        db.close()
