"""
Evidence and Graph Query Service.
Handles read paths for:
- GET /cases/{case_id}/graph
- GET /cases/{case_id}/map-data
- GET /suspects/{device_hash}/evidence

Invariants & Constraints:
1. Explainability at Write Time:
   - Queries directly read stored `evidence` JSON strings attached to edges during Stage 6.
   - Does NOT reconstruct evidence after the fact.
2. Defense in Depth (FR-10):
   - If an edge is encountered with missing or empty evidence, logs a high-severity
     `data_integrity_violation` warning line without crashing the response.
3. Case Scoping in Neo4j:
   - Scopes nodes and edges to the target case by cross-referencing candidate devices
     belonging to the case from Postgres staging / scored suspects.
4. Structured Logging:
   - Emits consistent `stage="explainability_read"` structured log events for all 3 operations.
"""

import json
import logging
from typing import Any, Dict, List, Optional, Set
from neo4j import Driver
from sqlalchemy.orm import Session

from backend.app.core.logging import log_stage_event
from backend.app.models.case import Case
from backend.app.models.crime_scene import CrimeScene
from backend.app.models.tower import Tower
from backend.app.models.suspect_risk_score import SuspectRiskScore
from backend.app.models.correlation_staging import CorrelationStaging

logger = logging.getLogger("nexus-crime.services.evidence_service")


def get_graph_for_case(
    db: Session,
    neo4j_driver: Driver,
    case_reference: str
) -> Optional[Dict[str, Any]]:
    """
    Fetches the case graph (nodes and edges) from Neo4j scoped to the case reference.
    Returns None if the case does not exist in Postgres (triggers 404).
    Returns {"nodes": [], "edges": []} if the case exists but has no graph data yet.
    """
    case = db.query(Case).filter(Case.case_reference == case_reference).first()
    if not case:
        return None

    # 1. Determine case-scoped device hashes from PostgreSQL suspect risk scores / staging
    scored_suspects = (
        db.query(SuspectRiskScore)
        .filter(SuspectRiskScore.case_reference == case_reference)
        .all()
    )
    case_device_scores: Dict[str, float] = {s.device_hash: s.risk_score for s in scored_suspects}

    if not case_device_scores:
        # Check if staging record exists (correlation completed but no suspects or unflagged only)
        staging = (
            db.query(CorrelationStaging)
            .filter(CorrelationStaging.case_reference == case_reference)
            .order_by(CorrelationStaging.created_at.desc())
            .first()
        )
        if staging and staging.results:
            coloc = staging.results.get("colocation", {})
            for p in coloc.get("all_presences", []):
                ph = p.get("phone_hash")
                if ph and ph not in case_device_scores:
                    case_device_scores[ph] = 0.0

    if not case_device_scores:
        log_stage_event(
            stage="explainability_read",
            outcome="success",
            details={"case_reference": case_reference, "type": "graph", "nodes_count": 0, "edges_count": 0}
        )
        return {"nodes": [], "edges": []}

    target_hashes = list(case_device_scores.keys())

    # 2. Query Neo4j for nodes and edges restricted to target case device hashes
    nodes_map: Dict[str, Dict[str, Any]] = {}
    edges_list: List[Dict[str, Any]] = []

    try:
        with neo4j_driver.session() as session:
            # Query Nodes
            node_query = """
            MATCH (d:Device)
            WHERE d.phone_hash IN $hashes
            RETURN d.phone_hash AS id,
                   coalesce(d.risk_score, 0.0) AS risk_score,
                   coalesce(d.community_id, 0) AS community
            """
            node_results = session.run(node_query, {"hashes": target_hashes})
            for rec in node_results:
                dev_id = rec["id"]
                # Use Postgres risk score if computed in Stage 8, fallback to Neo4j property
                r_score = case_device_scores.get(dev_id, float(rec["risk_score"]))
                nodes_map[dev_id] = {
                    "id": dev_id,
                    "risk_score": r_score,
                    "community": int(rec["community"])
                }

            # Query Relationships
            edge_query = """
            MATCH (a:Device)-[r]-(b:Device)
            WHERE a.phone_hash IN $hashes AND b.phone_hash IN $hashes AND a.phone_hash < b.phone_hash
            RETURN DISTINCT a.phone_hash AS source,
                   b.phone_hash AS target,
                   type(r) AS type,
                   coalesce(r.weight, 1.0) AS weight,
                   r.evidence AS evidence_raw
            """
            edge_results = session.run(edge_query, {"hashes": target_hashes})
            for rec in edge_results:
                src = rec["source"]
                tgt = rec["target"]
                e_type = rec["type"]
                weight = float(rec["weight"])
                ev_raw = rec["evidence_raw"]

                # Parse and validate attached evidence
                evidence_list = []
                if ev_raw:
                    try:
                        if isinstance(ev_raw, str):
                            evidence_list = json.loads(ev_raw)
                        elif isinstance(ev_raw, list):
                            evidence_list = ev_raw
                    except Exception as e:
                        logger.warning(f"Error parsing evidence JSON for edge {src}-{tgt}: {e}")

                # FR-10 Defense in Depth Check:
                if not evidence_list:
                    logger.critical(
                        f"DATA INTEGRITY VIOLATION: Edge {src} <-> {tgt} ({e_type}) has empty evidence array!"
                    )
                    log_stage_event(
                        stage="explainability_read",
                        outcome="data_integrity_violation",
                        details={
                            "case_reference": case_reference,
                            "source": src,
                            "target": tgt,
                            "edge_type": e_type,
                            "violation": "Empty evidence array on persisted edge"
                        }
                    )

                edges_list.append({
                    "source": src,
                    "target": tgt,
                    "type": e_type,
                    "weight": weight,
                    "evidence": evidence_list
                })
    except Exception as e:
        logger.error(f"Error querying Neo4j graph for case {case_reference}: {e}")
        # Return whatever nodes we found from case records if Neo4j is degraded
        for dev_id, score in case_device_scores.items():
            if dev_id not in nodes_map:
                nodes_map[dev_id] = {"id": dev_id, "risk_score": score, "community": 0}

    log_stage_event(
        stage="explainability_read",
        outcome="success",
        details={
            "case_reference": case_reference,
            "type": "graph",
            "nodes_count": len(nodes_map),
            "edges_count": len(edges_list)
        }
    )

    return {
        "nodes": list(nodes_map.values()),
        "edges": edges_list
    }


def get_map_data_for_case(
    db: Session,
    case_reference: str
) -> Optional[Dict[str, Any]]:
    """
    Queries PostgreSQL for Towers, CrimeScenes, and Flagged Devices for a case.
    Returns None if the case does not exist (triggers 404).
    """
    case = db.query(Case).filter(Case.case_reference == case_reference).first()
    if not case:
        return None

    # 1. Fetch Crime Scenes for this case
    scenes_orm = db.query(CrimeScene).filter(CrimeScene.case_reference == case_reference).all()
    crime_scenes = [
        {
            "scene_id": s.scene_id,
            "latitude": s.latitude,
            "longitude": s.longitude,
            "incident_type": s.incident_type,
            "time_window_start": s.time_window_start,
            "time_window_end": s.time_window_end
        }
        for s in scenes_orm
    ]

    # 2. Fetch Towers
    towers_orm = db.query(Tower).all()
    towers = [
        {
            "tower_id": t.tower_id,
            "latitude": t.latitude,
            "longitude": t.longitude,
            "coverage_radius_km": t.coverage_radius_km
        }
        for t in towers_orm
    ]

    # 3. Fetch Flagged Devices from Stage 8's persisted SuspectRiskScores
    flagged_scores = (
        db.query(SuspectRiskScore)
        .filter(SuspectRiskScore.case_reference == case_reference)
        .order_by(SuspectRiskScore.risk_score.desc())
        .all()
    )

    flagged_devices = [
        {
            "device_hash": s.device_hash,
            "risk_score": s.risk_score,
            "flagged_scenes": s.flagged_scenes or []
        }
        for s in flagged_scores
    ]

    log_stage_event(
        stage="explainability_read",
        outcome="success",
        details={
            "case_reference": case_reference,
            "type": "map-data",
            "towers_count": len(towers),
            "scenes_count": len(crime_scenes),
            "flagged_devices_count": len(flagged_devices)
        }
    )

    return {
        "towers": towers,
        "crime_scenes": crime_scenes,
        "flagged_devices": flagged_devices
    }


def get_evidence_for_suspect(
    neo4j_driver: Driver,
    device_hash: str
) -> Dict[str, Any]:
    """
    Directly queries Neo4j for all edges connected to `device_hash` and flattens
    their stored evidence arrays into the response shape.
    Returns {"device_hash": device_hash, "evidence": []} if no edges exist.
    """
    evidence_items = []

    try:
        with neo4j_driver.session() as session:
            query = """
            MATCH (d:Device {phone_hash: $phone_hash})-[r]-()
            RETURN DISTINCT type(r) AS type, r.evidence AS evidence_raw
            """
            results = session.run(query, {"phone_hash": device_hash})
            for rec in results:
                e_type = rec["type"]
                ev_raw = rec["evidence_raw"]

                parsed_evidence = []
                if ev_raw:
                    try:
                        if isinstance(ev_raw, str):
                            parsed_evidence = json.loads(ev_raw)
                        elif isinstance(ev_raw, list):
                            parsed_evidence = ev_raw
                    except Exception as e:
                        logger.warning(f"Error parsing evidence JSON for suspect {device_hash}: {e}")

                # FR-10 Defense in depth
                if not parsed_evidence:
                    logger.critical(
                        f"DATA INTEGRITY VIOLATION: Edge for device {device_hash} ({e_type}) has empty evidence array!"
                    )
                    log_stage_event(
                        stage="explainability_read",
                        outcome="data_integrity_violation",
                        details={
                            "device_hash": device_hash,
                            "edge_type": e_type,
                            "violation": "Empty evidence array on persisted edge"
                        }
                    )

                for item in parsed_evidence:
                    evidence_items.append({
                        "type": item.get("type", e_type),
                        "tower_id": item.get("tower_id"),
                        "timestamp": item.get("timestamp"),
                        "scene_id": item.get("scene_id"),
                        "time_delta_seconds": item.get("time_delta_seconds")
                    })
    except Exception as e:
        logger.warning(f"Error querying Neo4j evidence for device {device_hash}: {e}")

    log_stage_event(
        stage="explainability_read",
        outcome="success",
        details={
            "device_hash": device_hash,
            "type": "suspect-evidence",
            "evidence_count": len(evidence_items)
        }
    )

    return {
        "device_hash": device_hash,
        "evidence": evidence_items
    }
