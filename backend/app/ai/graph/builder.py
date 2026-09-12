"""
Graph Builder Module (Neo4j).
Per blueprint.md Section 7 & PRD FR-05 / FR-10:
"the single point where evidence gets permanently attached to a relationship...
never write an edge without evidence".

Strict Invariants:
1. Node Scope:
   - For Stage 6, nodes created are `Device` nodes keyed by `phone_hash` (unique property).
   - `Person` nodes are deferred until entity resolution processes named people in a later stage.
2. Edge Types:
   - `CO_LOCATED_AT`: Connects two Devices co-located at crime scenes, or Device to CrimeScene.
     In Stage 6, relationships are established between Devices sharing co-location or co-movement.
   - `CO_MOVED_WITH`: Connects Device pairs that co-move across towers over distinct days.
   - `CALLED` and `TRANSACTED_WITH`: Deferred to later stage sequencing even though raw rows exist in Postgres.
3. Evidence Attachment (Hard Non-Negotiable):
   - Every edge MUST include a non-empty evidence list.
   - If an edge write is attempted with empty or missing evidence, raises `EmptyEvidenceError` (NEVER warns).
4. Parameterized Cypher:
   - Strict parameter binding with `$params`. No f-strings or string concatenation for query execution.
5. Idempotent Writes:
   - Uses `MERGE` on unique properties for nodes and relationship endpoints.
"""

import json
import logging
from typing import Any, Dict, List, Optional
from neo4j import Driver, Session

logger = logging.getLogger("nexus-crime.ai.graph.builder")


class EmptyEvidenceError(ValueError):
    """Raised when an edge write is attempted without a non-empty evidence array."""
    pass


class GraphBuilder:
    def __init__(self, driver: Driver):
        self.driver = driver

    def create_device_node(self, session: Session, phone_hash: str) -> None:
        """
        Creates or updates a Device node idempotently using MERGE.
        """
        if not phone_hash or not isinstance(phone_hash, str) or not phone_hash.strip():
            raise ValueError("phone_hash must be a non-empty string")

        clean_hash = phone_hash.strip()
        query = """
        MERGE (d:Device {phone_hash: $phone_hash})
        ON CREATE SET d.created_at = datetime()
        RETURN d.phone_hash AS phone_hash
        """
        session.run(query, {"phone_hash": clean_hash})

    def write_co_located_relationship(
        self,
        session: Session,
        phone_hash_a: str,
        phone_hash_b: str,
        scenes: List[str],
        evidence: List[Dict[str, Any]],
        weight: float = 1.0
    ) -> None:
        """
        Writes a CO_LOCATED_AT edge between two devices with attached evidence.
        Enforces non-empty evidence invariant.
        """
        if not evidence or len(evidence) == 0:
            raise EmptyEvidenceError(
                f"Cannot write CO_LOCATED_AT edge between '{phone_hash_a}' and '{phone_hash_b}' without evidence."
            )

        # Idempotent write using MERGE
        query = """
        MERGE (a:Device {phone_hash: $phone_a})
        MERGE (b:Device {phone_hash: $phone_b})
        MERGE (a)-[r:CO_LOCATED_AT]-(b)
        SET r.scenes = $scenes,
            r.weight = $weight,
            r.evidence = $evidence_json,
            r.updated_at = datetime()
        """
        session.run(
            query,
            {
                "phone_a": phone_hash_a,
                "phone_b": phone_hash_b,
                "scenes": scenes,
                "weight": weight,
                "evidence_json": json.dumps(evidence)
            }
        )

    def write_co_moved_relationship(
        self,
        session: Session,
        phone_hash_a: str,
        phone_hash_b: str,
        distinct_days_count: int,
        days: List[str],
        evidence: List[Dict[str, Any]],
        weight: Optional[float] = None
    ) -> None:
        """
        Writes a CO_MOVED_WITH edge between two devices with attached evidence.
        Enforces non-empty evidence invariant.
        """
        if not evidence or len(evidence) == 0:
            raise EmptyEvidenceError(
                f"Cannot write CO_MOVED_WITH edge between '{phone_hash_a}' and '{phone_hash_b}' without evidence."
            )

        calc_weight = weight if weight is not None else float(distinct_days_count)

        query = """
        MERGE (a:Device {phone_hash: $phone_a})
        MERGE (b:Device {phone_hash: $phone_b})
        MERGE (a)-[r:CO_MOVED_WITH]-(b)
        SET r.distinct_days_count = $days_count,
            r.days = $days,
            r.weight = $weight,
            r.evidence = $evidence_json,
            r.updated_at = datetime()
        """
        session.run(
            query,
            {
                "phone_a": phone_hash_a,
                "phone_b": phone_hash_b,
                "days_count": distinct_days_count,
                "days": days,
                "weight": calc_weight,
                "evidence_json": json.dumps(evidence)
            }
        )

    def build_case_graph(
        self,
        resolved_entities: List[Dict[str, Any]],
        colocation_result: Dict[str, Any],
        comovement_result: Dict[str, Any]
    ) -> Dict[str, int]:
        """
        Constructs the case graph in Neo4j following strict execution ordering:
        Order 1: Resolve Entities (passed in pre-resolved from EntityResolver).
        Order 2: Create Device nodes.
        Order 3: Write CO_LOCATED_AT and CO_MOVED_WITH edges with verified evidence arrays.

        Returns write statistics: {"nodes_created": int, "edges_created": int}
        """
        nodes_written = 0
        edges_written = 0

        # Defensive check against duplicate / unresolved entities
        seen_phone_hashes = set()

        with self.driver.session() as session:
            # 1. Write Nodes for all resolved entities
            for ent in resolved_entities:
                for ph in ent.get("phone_hashes", []):
                    if ph in seen_phone_hashes:
                        logger.warning(f"Duplicate phone_hash '{ph}' encountered in resolved entities; skipping redundant node write")
                        continue
                    self.create_device_node(session, ph)
                    seen_phone_hashes.add(ph)
                    nodes_written += 1

            # Also ensure all devices in flagged colocation/comovement exist
            flagged_coloc = colocation_result.get("flagged_devices", [])
            for dev in flagged_coloc:
                ph = dev.get("phone_hash")
                if ph and ph not in seen_phone_hashes:
                    self.create_device_node(session, ph)
                    seen_phone_hashes.add(ph)
                    nodes_written += 1

            # 2. Write CO_LOCATED_AT edges between flagged devices sharing scenes
            # For each pair of flagged devices sharing at least one scene:
            for i in range(len(flagged_coloc)):
                dev_a = flagged_coloc[i]
                ph_a = dev_a.get("phone_hash")
                scenes_a = set(dev_a.get("scenes", []))
                ev_a = dev_a.get("evidence", [])

                for j in range(i + 1, len(flagged_coloc)):
                    dev_b = flagged_coloc[j]
                    ph_b = dev_b.get("phone_hash")
                    scenes_b = set(dev_b.get("scenes", []))
                    ev_b = dev_b.get("evidence", [])

                    common_scenes = list(scenes_a.intersection(scenes_b))
                    if common_scenes:
                        combined_evidence = ev_a + ev_b
                        if not combined_evidence:
                            raise EmptyEvidenceError(f"Missing evidence for co-located pair {ph_a} - {ph_b}")

                        self.write_co_located_relationship(
                            session=session,
                            phone_hash_a=ph_a,
                            phone_hash_b=ph_b,
                            scenes=common_scenes,
                            evidence=combined_evidence,
                            weight=float(len(common_scenes))
                        )
                        edges_written += 1

            # 3. Write CO_MOVED_WITH edges for flagged pairs
            flagged_pairs = comovement_result.get("flagged_pairs", [])
            for pair in flagged_pairs:
                devs = pair.get("device_pair", [])
                if len(devs) == 2:
                    ph_a, ph_b = devs[0], devs[1]
                    ev = pair.get("evidence", [])
                    days = pair.get("days", [])
                    days_count = pair.get("distinct_days_count", len(days))

                    # Non-empty evidence assertion
                    if not ev:
                        raise EmptyEvidenceError(f"Missing evidence for co-moved pair {ph_a} - {ph_b}")

                    self.write_co_moved_relationship(
                        session=session,
                        phone_hash_a=ph_a,
                        phone_hash_b=ph_b,
                        distinct_days_count=days_count,
                        days=days,
                        evidence=ev
                    )
                    edges_written += 1

        return {
            "nodes_written": nodes_written,
            "edges_written": edges_written
        }
