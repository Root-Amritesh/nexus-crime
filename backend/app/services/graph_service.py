"""
Graph Service.
Orchestration layer for Stage 6:
1. Fetches persisted correlation results from PostgreSQL staging table (`correlation_staging`).
2. Runs Entity Resolution (resolver.py).
3. Invokes GraphBuilder (builder.py) to write nodes and evidence-linked edges to Neo4j.
4. Emits structured log line per non-negotiables.md (stage="graph_write", outcome=...).
"""

import logging
from typing import Any, Dict, Optional
from neo4j import Driver
from sqlalchemy.orm import Session

from backend.app.ai.entity_resolution.resolver import EntityResolver
from backend.app.ai.graph.builder import GraphBuilder
from backend.app.ai.graph.analytics import GraphAnalytics
from backend.app.core.logging import log_stage_event
from backend.app.models.correlation_staging import CorrelationStaging

logger = logging.getLogger("nexus-crime.services.graph_service")


def construct_graph_for_case(
    db: Session,
    neo4j_driver: Driver,
    case_reference: str,
    job_id: str
) -> Dict[str, Any]:
    """
    Orchestrates the Stage 6 & 7 graph pipeline:
    - Loads staged correlation output from Postgres
    - Resolves entities (phone_hash-based and candidate records)
    - Writes Device nodes and CO_LOCATED_AT / CO_MOVED_WITH edges with evidence into Neo4j
    - Runs PageRank, Betweenness Centrality, and Louvain Community Detection (GDS with NetworkX fallback)
    - Emits structured log events
    """
    case_ref = case_reference.strip() if case_reference else ""
    if not case_ref:
        log_stage_event(
            stage="graph_write",
            outcome="failed",
            details={"error": "Missing case reference", "job_id": job_id}
        )
        raise ValueError("case_reference cannot be empty")

    # 1. Fetch Stage 5 correlation output from Postgres staging table
    staging_record = (
        db.query(CorrelationStaging)
        .filter(CorrelationStaging.case_reference == case_ref)
        .order_by(CorrelationStaging.created_at.desc())
        .first()
    )

    if not staging_record or not staging_record.results:
        log_stage_event(
            stage="graph_write",
            outcome="failed",
            details={"error": f"No correlation staging record found for case '{case_ref}'", "job_id": job_id}
        )
        raise ValueError(f"No correlation staging record found for case '{case_ref}'")

    correlation_data = staging_record.results
    colocation_result = correlation_data.get("colocation", {})
    comovement_result = correlation_data.get("comovement", {})

    # 2. Extract unique candidate device records for Entity Resolution
    candidate_records = []
    # From colocation
    for presence in colocation_result.get("all_presences", []):
        ph = presence.get("phone_hash")
        if ph:
            candidate_records.append({"phone_hash": ph})

    # From comovement
    for pair in comovement_result.get("flagged_pairs", []) + comovement_result.get("weak_evidence_pairs", []):
        for ph in pair.get("device_pair", []):
            if ph:
                candidate_records.append({"phone_hash": ph})

    # 3. Run Entity Resolution strictly before node creation
    resolver = EntityResolver()
    resolution_output = resolver.resolve_entities(candidate_records)
    resolved_entities = resolution_output.get("resolved_entities", [])

    # 4. Build Neo4j Graph
    builder = GraphBuilder(driver=neo4j_driver)
    write_stats = builder.build_case_graph(
        resolved_entities=resolved_entities,
        colocation_result=colocation_result,
        comovement_result=comovement_result
    )

    # 5. Emit structured log line for graph_write
    log_stage_event(
        stage="graph_write",
        outcome="success",
        details={
            "case_reference": case_ref,
            "job_id": job_id,
            "nodes_written": write_stats.get("nodes_written", 0),
            "edges_written": write_stats.get("edges_written", 0),
            "resolved_entities_count": len(resolved_entities),
            "review_queue_count": resolution_output.get("review_queue_count", 0)
        }
    )

    # 6. Stage 7: Run Graph Analytics (GDS with NetworkX Fallback)
    analytics_engine = GraphAnalytics(driver=neo4j_driver)
    analytics_results = analytics_engine.run_analytics(case_reference=case_ref)

    return {
        "case_reference": case_ref,
        "job_id": job_id,
        "write_stats": write_stats,
        "resolution": resolution_output,
        "analytics": analytics_results
    }
