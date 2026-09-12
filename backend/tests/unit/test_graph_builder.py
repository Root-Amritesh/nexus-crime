"""
Unit tests for Neo4j GraphBuilder (builder.py).
Per Stage 6 specifications:
1. An edge write with a non-empty evidence array succeeds.
2. An edge write with an empty evidence array raises EmptyEvidenceError (never warns).
3. Re-running the same write twice doesn't duplicate the node/edge (tests MERGE idempotency).
"""

import pytest
from unittest.mock import MagicMock
from backend.app.ai.graph.builder import GraphBuilder, EmptyEvidenceError


class MockNeo4jSession:
    def __init__(self):
        self.queries_run = []
        self.nodes = {}  # phone_hash -> dict
        self.edges = {}  # (type, min_p, max_p) -> dict

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass

    def run(self, query: str, parameters: dict = None):
        params = parameters or {}
        self.queries_run.append({"query": query, "params": params})

        # Emulate MERGE behavior for node
        if "MERGE (d:Device {phone_hash: $phone_hash})" in query:
            ph = params.get("phone_hash")
            if ph not in self.nodes:
                self.nodes[ph] = {"phone_hash": ph, "count": 1}
            else:
                self.nodes[ph]["count"] += 1

        # Emulate MERGE behavior for CO_LOCATED_AT
        if "MERGE (a)-[r:CO_LOCATED_AT]-(b)" in query:
            p_a, p_b = params.get("phone_a"), params.get("phone_b")
            edge_key = ("CO_LOCATED_AT", min(p_a, p_b), max(p_a, p_b))
            if edge_key not in self.edges:
                self.edges[edge_key] = {"params": params, "count": 1}
            else:
                self.edges[edge_key]["count"] += 1

        # Emulate MERGE behavior for CO_MOVED_WITH
        if "MERGE (a)-[r:CO_MOVED_WITH]-(b)" in query:
            p_a, p_b = params.get("phone_a"), params.get("phone_b")
            edge_key = ("CO_MOVED_WITH", min(p_a, p_b), max(p_a, p_b))
            if edge_key not in self.edges:
                self.edges[edge_key] = {"params": params, "count": 1}
            else:
                self.edges[edge_key]["count"] += 1


class MockNeo4jDriver:
    def __init__(self, session_instance):
        self._session = session_instance

    def session(self):
        return self._session


def test_edge_write_with_evidence_succeeds():
    """
    Writing an edge with non-empty evidence executes successfully.
    """
    mock_session = MockNeo4jSession()
    mock_driver = MockNeo4jDriver(mock_session)
    builder = GraphBuilder(driver=mock_driver)

    evidence = [
        {"type": "CO_LOCATED_AT", "scene_id": "SCENE-01", "tower_id": "TOW-01", "timestamp": "2026-08-31T10:00:00Z"}
    ]

    with mock_driver.session() as session:
        builder.write_co_located_relationship(
            session=session,
            phone_hash_a="dev_111",
            phone_hash_b="dev_222",
            scenes=["SCENE-01"],
            evidence=evidence,
            weight=1.0
        )

    edge_key = ("CO_LOCATED_AT", "dev_111", "dev_222")
    assert edge_key in mock_session.edges
    assert mock_session.edges[edge_key]["count"] == 1


def test_edge_write_with_empty_evidence_raises():
    """
    Attempting to write an edge with empty evidence MUST raise EmptyEvidenceError (not warn).
    """
    mock_session = MockNeo4jSession()
    mock_driver = MockNeo4jDriver(mock_session)
    builder = GraphBuilder(driver=mock_driver)

    with pytest.raises(EmptyEvidenceError) as exc_info:
        with mock_driver.session() as session:
            builder.write_co_located_relationship(
                session=session,
                phone_hash_a="dev_111",
                phone_hash_b="dev_222",
                scenes=["SCENE-01"],
                evidence=[],  # EMPTY
                weight=1.0
            )

    assert "Cannot write CO_LOCATED_AT edge" in str(exc_info.value)

    with pytest.raises(EmptyEvidenceError):
        with mock_driver.session() as session:
            builder.write_co_moved_relationship(
                session=session,
                phone_hash_a="dev_111",
                phone_hash_b="dev_222",
                distinct_days_count=2,
                days=["2026-08-30", "2026-08-31"],
                evidence=[],  # EMPTY
            )


def test_graph_builder_idempotency_double_run():
    """
    Building the graph twice for the exact same input preserves uniqueness
    under MERGE semantics and does not produce duplicate nodes or edges.
    """
    mock_session = MockNeo4jSession()
    mock_driver = MockNeo4jDriver(mock_session)
    builder = GraphBuilder(driver=mock_driver)

    resolved_entities = [
        {"entity_id": "ENT-001", "canonical_phone_hash": "dev_A", "phone_hashes": ["dev_A"], "records": []},
        {"entity_id": "ENT-002", "canonical_phone_hash": "dev_B", "phone_hashes": ["dev_B"], "records": []}
    ]

    colocation_result = {
        "flagged_devices": [
            {
                "phone_hash": "dev_A",
                "scenes": ["SCENE-1", "SCENE-2"],
                "evidence": [{"scene_id": "SCENE-1", "tower_id": "T1", "timestamp": "2026-08-31T10:00:00Z"}]
            },
            {
                "phone_hash": "dev_B",
                "scenes": ["SCENE-1", "SCENE-2"],
                "evidence": [{"scene_id": "SCENE-1", "tower_id": "T1", "timestamp": "2026-08-31T10:00:00Z"}]
            }
        ]
    }

    comovement_result = {
        "flagged_pairs": [
            {
                "device_pair": ["dev_A", "dev_B"],
                "distinct_days_count": 2,
                "days": ["2026-08-30", "2026-08-31"],
                "evidence": [{"tower_id": "T1", "timestamp": "2026-08-30T10:00:00Z"}]
            }
        ]
    }

    # Run 1
    builder.build_case_graph(resolved_entities, colocation_result, comovement_result)
    assert len(mock_session.nodes) == 2
    assert len(mock_session.edges) == 2  # 1 CO_LOCATED_AT, 1 CO_MOVED_WITH

    # Run 2 (re-run on identical data)
    builder.build_case_graph(resolved_entities, colocation_result, comovement_result)

    # Verify total unique node and edge count did not double
    assert len(mock_session.nodes) == 2
    assert len(mock_session.edges) == 2
