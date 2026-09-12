"""
Graph Query (Evidence-Grounded RAG) Endpoint.
Maps structured question patterns to existing Cypher/SQL queries and returns
templated natural-language answers with cited evidence records.

This is the "Evidence-Grounded Graph RAG" feature referenced in the SIH pitch deck.
Deliberately template-and-retrieval based (no external LLM API) to maintain the
offline/on-prem principle documented in blueprint.md and design.md.

All queries are parameterized per non-negotiable constraint.
"""

import logging
import re
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from neo4j import Driver

from backend.app.dependencies import get_db_session, get_neo4j_driver, get_current_investigator, InvestigatorContext
from backend.app.services.scoring_service import get_suspects_for_case
from backend.app.services import evidence_service
from backend.app.models.case import Case

logger = logging.getLogger("nexus-crime.api.v1.query")

router = APIRouter()


# --- Response Schema ---

class EvidenceCitation(BaseModel):
    """A single piece of evidence supporting the answer."""
    type: str
    description: str
    source: Optional[str] = None


class QueryResponse(BaseModel):
    """Response from the graph query endpoint."""
    question: str
    answer: str
    evidence: List[EvidenceCitation]
    query_type: str
    disclaimer: str = (
        "This is an investigative lead generated from correlated evidence patterns. "
        "It is not a verdict and must be independently verified by authorized investigators."
    )


# --- Question Pattern Matching ---

PATTERNS = [
    {
        "name": "why_flagged",
        "regex": r"(?:why|how come|what makes?|reason)\s+(?:is|was|are)\s+(.+?)\s+(?:flagged|suspicious|risky|a suspect)",
        "handler": "_handle_why_flagged",
    },
    {
        "name": "connection",
        "regex": r"(?:how|what)\s+(?:is|are)\s+(.+?)\s+(?:connected|linked|related)\s+(?:to|with)\s+(.+)",
        "handler": "_handle_connection",
    },
    {
        "name": "show_evidence",
        "regex": r"(?:show|list|get|display|what is)\s+(?:the\s+)?(?:evidence|proof|trail)\s+(?:for|of|about)\s+(.+)",
        "handler": "_handle_show_evidence",
    },
    {
        "name": "top_suspects",
        "regex": r"(?:who|what|list|show)\s+(?:are\s+)?(?:the\s+)?(?:top|main|key|highest|most)\s+(?:risk\s+)?(?:suspects?|devices?|entities)",
        "handler": "_handle_top_suspects",
    },
    {
        "name": "case_summary",
        "regex": r"(?:summarize|summary|overview|describe|what is)\s+(?:the\s+)?(?:case|investigation)",
        "handler": "_handle_case_summary",
    },
]


def _match_question(question: str) -> Optional[Dict[str, Any]]:
    """Match a question string against known patterns. Returns match info or None."""
    q = question.strip().lower().rstrip("?.")
    for pattern in PATTERNS:
        match = re.search(pattern["regex"], q, re.IGNORECASE)
        if match:
            return {
                "name": pattern["name"],
                "handler": pattern["handler"],
                "groups": match.groups(),
            }
    return None


# --- Handlers ---

def _handle_why_flagged(
    groups: tuple,
    case_id: str,
    db: Session,
    neo4j_drv: Driver,
) -> QueryResponse:
    """Explain why a device/entity is flagged — risk score breakdown + evidence."""
    device_ref = groups[0].strip().strip("'\"")

    # Get suspect risk score
    suspects_data = get_suspects_for_case(db=db, case_reference=case_id)
    if suspects_data is None:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")

    target = None
    for s in suspects_data:
        if device_ref.lower() in s["device_hash"].lower():
            target = s
            break

    if not target:
        return QueryResponse(
            question=f"Why is {device_ref} flagged?",
            answer=f"Device '{device_ref}' was not found in the suspect list for this case. "
                   f"It may not be present in the ingested data or may not have met flagging thresholds.",
            evidence=[],
            query_type="why_flagged",
        )

    breakdown = target["score_breakdown"]
    score = target["risk_score"]
    scenes = target.get("flagged_scenes", [])

    # Get evidence from Neo4j
    evidence_data = evidence_service.get_evidence_for_suspect(
        neo4j_driver=neo4j_drv,
        device_hash=target["device_hash"],
    )
    evidence_items = evidence_data.get("evidence", [])

    answer = (
        f"Device {target['device_hash']} has a composite risk score of {score:.4f}, "
        f"placing it among the flagged entities for this case. "
        f"Score breakdown: centrality contribution = {breakdown.get('centrality', 0):.4f}, "
        f"co-location events = {breakdown.get('colocation_count', 0)}, "
        f"co-movement events = {breakdown.get('comovement_count', 0)}, "
        f"call frequency factor = {breakdown.get('call_frequency', 0):.4f}. "
    )

    if scenes:
        answer += f"The device was present near {len(scenes)} crime scene(s): {', '.join(scenes)}. "

    if evidence_items:
        answer += f"This assessment is grounded in {len(evidence_items)} evidence record(s) attached to graph edges."
    else:
        answer += "No direct evidence records are attached to graph edges for this device."

    citations = [
        EvidenceCitation(
            type=ev.get("type", "correlation"),
            description=ev.get("description", str(ev)),
            source=ev.get("source", None),
        )
        for ev in evidence_items
    ]

    return QueryResponse(
        question=f"Why is {device_ref} flagged?",
        answer=answer,
        evidence=citations,
        query_type="why_flagged",
    )


def _handle_connection(
    groups: tuple,
    case_id: str,
    db: Session,
    neo4j_drv: Driver,
) -> QueryResponse:
    """How is X connected to Y — shortest path + edge evidence."""
    entity_a = groups[0].strip().strip("'\"")
    entity_b = groups[1].strip().strip("'\"")

    # Get graph data
    graph_data = evidence_service.get_graph_for_case(
        db=db, neo4j_driver=neo4j_drv, case_reference=case_id
    )
    if graph_data is None:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")

    nodes = graph_data.get("nodes", [])
    edges = graph_data.get("edges", [])

    # Find matching nodes
    node_a = None
    node_b = None
    for n in nodes:
        nid = n.get("id", "").lower()
        if entity_a.lower() in nid:
            node_a = n
        if entity_b.lower() in nid:
            node_b = n

    if not node_a or not node_b:
        missing = []
        if not node_a:
            missing.append(entity_a)
        if not node_b:
            missing.append(entity_b)
        return QueryResponse(
            question=f"How is {entity_a} connected to {entity_b}?",
            answer=f"Could not find the following entities in the case graph: {', '.join(missing)}. "
                   f"They may not appear in the ingested data for case {case_id}.",
            evidence=[],
            query_type="connection",
        )

    # BFS shortest path
    adj: Dict[str, List[Dict]] = {}
    for n in nodes:
        adj[n["id"]] = []
    for e in edges:
        adj.setdefault(e["source"], []).append(e)
        adj.setdefault(e["target"], []).append({"source": e["target"], "target": e["source"], **{k: v for k, v in e.items() if k not in ("source", "target")}})

    from collections import deque
    queue = deque([(node_a["id"], [node_a["id"]])])
    visited = {node_a["id"]}
    found_path = None

    while queue:
        current, path = queue.popleft()
        if current == node_b["id"]:
            found_path = path
            break
        for edge in adj.get(current, []):
            neighbor = edge["target"]
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, path + [neighbor]))

    if not found_path:
        return QueryResponse(
            question=f"How is {entity_a} connected to {entity_b}?",
            answer=f"No direct or indirect connection path was found between {entity_a} and {entity_b} "
                   f"in the current case graph.",
            evidence=[],
            query_type="connection",
        )

    # Collect edge evidence along the path
    path_evidence = []
    for i in range(len(found_path) - 1):
        for e in edges:
            if (e["source"] == found_path[i] and e["target"] == found_path[i + 1]) or \
               (e["target"] == found_path[i] and e["source"] == found_path[i + 1]):
                for ev in e.get("evidence", []):
                    path_evidence.append(ev)

    answer = (
        f"{entity_a} and {entity_b} are connected through a path of {len(found_path)} nodes: "
        f"{' → '.join(found_path)}. "
        f"This path involves {len(found_path) - 1} relationship(s) with "
        f"{len(path_evidence)} attached evidence record(s)."
    )

    citations = [
        EvidenceCitation(
            type=ev.get("type", "edge_evidence"),
            description=ev.get("description", str(ev)),
            source=ev.get("source", None),
        )
        for ev in path_evidence
    ]

    return QueryResponse(
        question=f"How is {entity_a} connected to {entity_b}?",
        answer=answer,
        evidence=citations,
        query_type="connection",
    )


def _handle_show_evidence(
    groups: tuple,
    case_id: str,
    db: Session,
    neo4j_drv: Driver,
) -> QueryResponse:
    """Show all evidence records for a device."""
    device_ref = groups[0].strip().strip("'\"")

    evidence_data = evidence_service.get_evidence_for_suspect(
        neo4j_driver=neo4j_drv,
        device_hash=device_ref,
    )
    evidence_items = evidence_data.get("evidence", [])

    if not evidence_items:
        return QueryResponse(
            question=f"Show evidence for {device_ref}",
            answer=f"No evidence records found for device '{device_ref}'. "
                   f"The device may not exist in the graph or may have no annotated edges.",
            evidence=[],
            query_type="show_evidence",
        )

    answer = (
        f"Found {len(evidence_items)} evidence record(s) attached to graph edges "
        f"involving device {device_ref}. Each record was captured during the "
        f"correlation pipeline and represents a pattern worth investigation."
    )

    citations = [
        EvidenceCitation(
            type=ev.get("type", "correlation"),
            description=ev.get("description", str(ev)),
            source=ev.get("source", None),
        )
        for ev in evidence_items
    ]

    return QueryResponse(
        question=f"Show evidence for {device_ref}",
        answer=answer,
        evidence=citations,
        query_type="show_evidence",
    )


def _handle_top_suspects(
    groups: tuple,
    case_id: str,
    db: Session,
    neo4j_drv: Driver,
) -> QueryResponse:
    """List top suspects for the case."""
    suspects_data = get_suspects_for_case(db=db, case_reference=case_id)
    if suspects_data is None:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")

    if not suspects_data:
        return QueryResponse(
            question="Who are the top suspects?",
            answer=f"No flagged suspects found for case {case_id}. "
                   f"The correlation pipeline may not have run yet, or no devices met the flagging threshold.",
            evidence=[],
            query_type="top_suspects",
        )

    top_n = suspects_data[:5]  # Top 5
    lines = []
    for i, s in enumerate(top_n, 1):
        lines.append(
            f"{i}. {s['device_hash']} — risk score: {s['risk_score']:.4f}, "
            f"flagged at {len(s.get('flagged_scenes', []))} scene(s)"
        )

    answer = (
        f"Top {len(top_n)} flagged entities for case {case_id} (ranked by composite risk score):\n"
        + "\n".join(lines)
        + f"\n\nThese scores are computed from centrality, co-location frequency, "
        f"co-movement patterns, and call analysis — all grounded in ingested evidence."
    )

    citations = [
        EvidenceCitation(
            type="risk_score",
            description=f"{s['device_hash']}: score={s['risk_score']:.4f}",
            source="scoring_service",
        )
        for s in top_n
    ]

    return QueryResponse(
        question="Who are the top suspects?",
        answer=answer,
        evidence=citations,
        query_type="top_suspects",
    )


def _handle_case_summary(
    groups: tuple,
    case_id: str,
    db: Session,
    neo4j_drv: Driver,
) -> QueryResponse:
    """Summarize the case."""
    case = db.query(Case).filter(Case.case_reference == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")

    suspects_data = get_suspects_for_case(db=db, case_reference=case_id)
    suspect_count = len(suspects_data) if suspects_data else 0

    graph_data = evidence_service.get_graph_for_case(
        db=db, neo4j_driver=neo4j_drv, case_reference=case_id
    )
    node_count = len(graph_data["nodes"]) if graph_data else 0
    edge_count = len(graph_data["edges"]) if graph_data else 0

    answer = (
        f"Case {case_id} (status: {case.status}) — "
        f"The knowledge graph contains {node_count} nodes and {edge_count} edges. "
        f"{suspect_count} device(s) have been flagged based on composite risk scoring. "
        f"All findings are investigative leads grounded in correlated evidence, "
        f"not verdicts."
    )

    return QueryResponse(
        question="Case summary",
        answer=answer,
        evidence=[],
        query_type="case_summary",
    )


# --- Handler dispatch ---

HANDLER_MAP = {
    "_handle_why_flagged": _handle_why_flagged,
    "_handle_connection": _handle_connection,
    "_handle_show_evidence": _handle_show_evidence,
    "_handle_top_suspects": _handle_top_suspects,
    "_handle_case_summary": _handle_case_summary,
}


# --- Endpoint ---

@router.get(
    "/{case_id}/query",
    response_model=QueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Evidence-grounded graph query — ask a question, get a cited answer",
)
def query_case_graph(
    case_id: str,
    q: str = Query(..., description="Natural-language question about the case"),
    db: Session = Depends(get_db_session),
    neo4j_drv: Driver = Depends(get_neo4j_driver),
    investigator: InvestigatorContext = Depends(get_current_investigator),
):
    """
    Evidence-Grounded Graph RAG endpoint.
    Maps structured question patterns to existing graph/SQL queries and returns
    a templated natural-language answer with cited evidence records.

    Supported question patterns:
    - "Why is [device] flagged?" — risk breakdown + evidence
    - "How is [A] connected to [B]?" — shortest path + edge evidence
    - "Show evidence for [device]" — all evidence records
    - "Who are the top suspects?" — ranked suspect list
    - "Summarize the case" — case overview with graph stats

    No external LLM API is used. Answers are template-based, grounded in
    real graph data. All findings are labeled as investigative leads.
    """
    matched = _match_question(q)

    if not matched:
        return QueryResponse(
            question=q,
            answer=(
                "I couldn't match your question to a known pattern. "
                "Try asking:\n"
                '• "Why is [device_hash] flagged?"\n'
                '• "How is [device_A] connected to [device_B]?"\n'
                '• "Show evidence for [device_hash]"\n'
                '• "Who are the top suspects?"\n'
                '• "Summarize the case"'
            ),
            evidence=[],
            query_type="unmatched",
        )

    handler_fn = HANDLER_MAP[matched["handler"]]
    return handler_fn(
        groups=matched["groups"],
        case_id=case_id,
        db=db,
        neo4j_drv=neo4j_drv,
    )
