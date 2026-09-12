"""
Scoring Service.
Orchestration layer for Stage 8:
1. Pulls centrality/community from Neo4j (Stage 7 output).
2. Pulls colocation/comovement counts from PostgreSQL correlation_staging (Stage 5 output).
3. Pulls raw CDR interactions from PostgreSQL cdr_record (Stage 4 output) to compute
   call frequency with flagged suspects.
   * RATIONALE FOR CDR DATA SOURCE:
     Even though CALLED graph edges were deferred in Stage 6, the raw Call Detail Records
     were ingested and persisted into PostgreSQL `cdr_record` in Stage 4. Querying Postgres
     directly for CDR communication metrics ensures the scoring engine utilizes real,
     verified relational communication logs without creating artificial graph dependencies.
4. Min-max scales call frequencies within the case dataset.
5. Invokes pure-function `compute_suspect_risk_score` per suspect.
6. Persists ranked results to PostgreSQL `suspect_risk_score` table.
7. Emits structured log event per non-negotiables.md (stage="scoring", outcome=...).
"""

import logging
from typing import Any, Dict, List, Optional
from neo4j import Driver
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.ai.scoring.risk_score import compute_suspect_risk_score, load_risk_weights
from backend.app.core.logging import log_stage_event
from backend.app.models.case import Case
from backend.app.models.cdr_record import CDRRecord
from backend.app.models.correlation_staging import CorrelationStaging
from backend.app.models.suspect_risk_score import SuspectRiskScore

logger = logging.getLogger("nexus-crime.services.scoring_service")


def compute_and_persist_case_scores(
    db: Session,
    neo4j_driver: Driver,
    case_reference: str,
    job_id: str
) -> List[Dict[str, Any]]:
    """
    Computes risk scores for all candidate devices in a case and persists them.
    """
    case_ref = case_reference.strip() if case_reference else ""
    if not case_ref:
        log_stage_event(
            stage="scoring",
            outcome="failed",
            details={"error": "Missing case reference", "job_id": job_id}
        )
        raise ValueError("case_reference cannot be empty")

    case = db.query(Case).filter(Case.case_reference == case_ref).first()
    if not case:
        log_stage_event(
            stage="scoring",
            outcome="failed",
            details={"error": f"Case '{case_ref}' not found", "job_id": job_id}
        )
        raise ValueError(f"Case '{case_ref}' not found")

    # 1. Fetch Stage 5 correlation output
    staging_record = (
        db.query(CorrelationStaging)
        .filter(CorrelationStaging.case_reference == case_ref)
        .order_by(CorrelationStaging.created_at.desc())
        .first()
    )

    colocation_data = staging_record.results.get("colocation", {}) if staging_record and staging_record.results else {}
    comovement_data = staging_record.results.get("comovement", {}) if staging_record and staging_record.results else {}

    # Extract suspect map from colocation (flagged devices with >= 2 crime scene presences)
    suspects_coloc: Dict[str, Dict[str, Any]] = {}
    for dev in colocation_data.get("flagged_devices", []):
        ph = dev.get("phone_hash")
        if ph:
            suspects_coloc[ph] = dev


    # Extract suspect map from comovement (flagged pairs only)
    suspects_comove_count: Dict[str, int] = {}
    for pair in comovement_data.get("flagged_pairs", []):
        for ph in pair.get("device_pair", []):
            suspects_comove_count[ph] = suspects_comove_count.get(ph, 0) + pair.get("distinct_days_count", 1)


    # 2. Fetch Centrality Metrics from Neo4j (Stage 7 output)
    centrality_map: Dict[str, float] = {}
    try:
        with neo4j_driver.session() as session:
            res = session.run("MATCH (d:Device) RETURN d.phone_hash AS phone_hash, d.centrality_normalized AS centrality")
            for record in res:
                ph = record["phone_hash"]
                c_val = record["centrality"]
                if ph and c_val is not None:
                    centrality_map[ph] = float(c_val)
    except Exception as e:
        logger.warning(f"Could not read centrality from Neo4j ({e}). Will apply signal fallback.")

    # 3. All candidate devices across sources
    all_device_hashes = set(suspects_coloc.keys()) | set(suspects_comove_count.keys()) | set(centrality_map.keys())

    # 4. Fetch raw CDR records from Postgres for call frequencies with flagged devices
    flagged_devices_set = set(d["phone_hash"] for d in colocation_data.get("flagged_devices", []))
    raw_call_frequencies: Dict[str, int] = {}

    if all_device_hashes:
        # Query CDR records where either caller or callee is in dataset
        cdr_records = db.query(CDRRecord).all()
        for cdr in cdr_records:
            c_in = cdr.caller_hash
            c_out = cdr.callee_hash

            # Count calls between any device and known flagged suspects
            if c_in in all_device_hashes and c_out in flagged_devices_set:
                raw_call_frequencies[c_in] = raw_call_frequencies.get(c_in, 0) + 1
            if c_out in all_device_hashes and c_in in flagged_devices_set:
                raw_call_frequencies[c_out] = raw_call_frequencies.get(c_out, 0) + 1

    # Min-max normalize call frequency within case dataset
    normalized_call_freq: Dict[str, float] = {}
    if raw_call_frequencies:
        max_calls = max(raw_call_frequencies.values())
        min_calls = min(raw_call_frequencies.values())
        call_range = max_calls - min_calls
        for dev, count in raw_call_frequencies.items():
            if call_range > 0:
                normalized_call_freq[dev] = (count - min_calls) / call_range
            else:
                normalized_call_freq[dev] = 1.0 if max_calls > 0 else 0.0

    # 5. Compute Risk Score per Suspect
    weights = load_risk_weights()
    scored_suspects: List[Dict[str, Any]] = []

    # Clean existing scores for idempotency
    db.query(SuspectRiskScore).filter(SuspectRiskScore.case_reference == case_ref).delete()

    for phone_hash in all_device_hashes:
        # Retrieve signals (None if signal is unavailable)
        c_norm = centrality_map.get(phone_hash)
        coloc_item = suspects_coloc.get(phone_hash)
        coloc_count = coloc_item.get("scene_count") if coloc_item else None
        flagged_scenes = coloc_item.get("scenes", []) if coloc_item else []
        comove_count = suspects_comove_count.get(phone_hash)
        call_freq_norm = normalized_call_freq.get(phone_hash)

        risk_score, breakdown = compute_suspect_risk_score(
            centrality_normalized=c_norm,
            colocation_count=coloc_count,
            comovement_count=comove_count,
            call_frequency_normalized=call_freq_norm,
            weights_config=weights
        )

        # Sentinel case: all signals missing or 0 -> exclude background devices from ranked suspect list
        has_evidence = bool(flagged_scenes) or bool(coloc_count) or bool(comove_count) or bool(c_norm) or bool(call_freq_norm)
        if risk_score is None or not has_evidence:
            logger.warning(
                f"Excluding unflagged device '{phone_hash}' for case '{case_ref}': no evidence or signals."
            )
            continue


        # Persist to Postgres
        score_record = SuspectRiskScore(
            case_reference=case_ref,
            device_hash=phone_hash,
            risk_score=risk_score,
            score_breakdown=breakdown,
            flagged_scenes=flagged_scenes
        )
        db.add(score_record)

        scored_suspects.append({
            "device_hash": phone_hash,
            "risk_score": risk_score,
            "score_breakdown": breakdown,
            "flagged_scenes": flagged_scenes
        })

    db.commit()

    # Sort descending by risk_score
    scored_suspects.sort(key=lambda s: s["risk_score"], reverse=True)

    # 6. Structured log line per non-negotiables
    log_stage_event(
        stage="scoring",
        outcome="success",
        details={
            "case_reference": case_ref,
            "job_id": job_id,
            "suspects_scored_count": len(scored_suspects)
        }
    )

    return scored_suspects


def get_suspects_for_case(db: Session, case_reference: str) -> List[Dict[str, Any]]:
    """
    Read-only query to fetch ranked suspects for a given case reference.
    Returns 404-inducing None if case doesn't exist.
    """
    case = db.query(Case).filter(Case.case_reference == case_reference).first()
    if not case:
        return None

    scores = (
        db.query(SuspectRiskScore)
        .filter(SuspectRiskScore.case_reference == case_reference)
        .order_by(SuspectRiskScore.risk_score.desc())
        .all()
    )

    return [
        {
            "device_hash": s.device_hash,
            "risk_score": s.risk_score,
            "score_breakdown": s.score_breakdown,
            "flagged_scenes": s.flagged_scenes
        }
        for s in scores
    ]
