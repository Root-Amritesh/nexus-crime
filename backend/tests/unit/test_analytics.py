"""
Unit tests for Graph Analytics module (analytics.py).
Tests both Neo4j GDS primary path and NetworkX fallback path.

Verification Disciplines:
1. Relative ranking on hand-constructed graph (e.g. Star/Bridge graph where bridge node has higher betweenness).
2. Output shape parity between GDS and NetworkX paths (identical property names and value formats).
3. Deliberate fallback-trigger test that proves the fallback path executes seamlessly when GDS errors occur.
4. Testing against Mock Neo4j session/driver to ensure pure unit test determinism without live DB requirement.
"""

import pytest
from neo4j.exceptions import ClientError
from backend.app.ai.graph.analytics import GraphAnalytics, min_max_normalize


class MockAnalyticsNeo4jSession:
    def __init__(self, simulate_gds_missing=False):
        self.simulate_gds_missing = simulate_gds_missing
        self.nodes = {
            "node_hub": {"phone_hash": "node_hub"},
            "node_leaf1": {"phone_hash": "node_leaf1"},
            "node_leaf2": {"phone_hash": "node_leaf2"},
            "node_bridge": {"phone_hash": "node_bridge"},
            "node_cluster2": {"phone_hash": "node_cluster2"},
        }
        self.edges = [
            {"source": "node_hub", "target": "node_leaf1", "weight": 1.0},
            {"source": "node_hub", "target": "node_leaf2", "weight": 1.0},
            {"source": "node_hub", "target": "node_bridge", "weight": 1.0},
            {"source": "node_bridge", "target": "node_cluster2", "weight": 1.0},
        ]
        self.written_properties = {}

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass

    def run(self, query: str, parameters: dict = None):
        params = parameters or {}

        # If simulating GDS missing, raise ClientError when any gds.* procedure is called
        if self.simulate_gds_missing and "gds." in query:
            raise ClientError("Neo.ClientError.Procedure.ProcedureNotFound: There is no procedure with the name `gds.graph.project` registered for this database instance.")

        # Simulate GDS Project / Drop
        if "gds.graph.exists" in query or "gds.graph.drop" in query or "gds.graph.project" in query:
            class MockGDSResult:
                def __iter__(self):
                    return iter([])
            return MockGDSResult()

        # Simulate GDS PageRank Stream
        if "gds.pageRank.stream" in query:
            class MockPRRecord(dict):
                pass
            return [
                MockPRRecord({"phone_hash": "node_hub", "score": 0.45}),
                MockPRRecord({"phone_hash": "node_bridge", "score": 0.35}),
                MockPRRecord({"phone_hash": "node_leaf1", "score": 0.10}),
                MockPRRecord({"phone_hash": "node_leaf2", "score": 0.10}),
                MockPRRecord({"phone_hash": "node_cluster2", "score": 0.15}),
            ]

        # Simulate GDS Betweenness Stream
        if "gds.betweenness.stream" in query:
            class MockBWRecord(dict):
                pass
            return [
                MockBWRecord({"phone_hash": "node_hub", "score": 4.0}),
                MockBWRecord({"phone_hash": "node_bridge", "score": 3.0}),
                MockBWRecord({"phone_hash": "node_leaf1", "score": 0.0}),
                MockBWRecord({"phone_hash": "node_leaf2", "score": 0.0}),
                MockBWRecord({"phone_hash": "node_cluster2", "score": 0.0}),
            ]

        # Simulate GDS Louvain Stream
        if "gds.louvain.stream" in query:
            class MockLVRecord(dict):
                pass
            return [
                MockLVRecord({"phone_hash": "node_hub", "communityId": 0}),
                MockLVRecord({"phone_hash": "node_leaf1", "communityId": 0}),
                MockLVRecord({"phone_hash": "node_leaf2", "communityId": 0}),
                MockLVRecord({"phone_hash": "node_bridge", "communityId": 1}),
                MockLVRecord({"phone_hash": "node_cluster2", "communityId": 1}),
            ]

        # Simulate NetworkX Cypher Read Queries
        if "MATCH (d:Device) RETURN d.phone_hash" in query:
            return [{"phone_hash": ph} for ph in self.nodes]

        if "MATCH (a:Device)-[r]-(b:Device)" in query:
            return self.edges

        # Simulate UNWIND Batch Write Back
        if "UNWIND $batch AS item" in query:
            for item in params.get("batch", []):
                ph = item["phone_hash"]
                self.written_properties[ph] = item
            return []

        return []


class MockAnalyticsNeo4jDriver:
    def __init__(self, session_instance):
        self._session = session_instance

    def session(self):
        return self._session


def test_analytics_min_max_normalize():
    """
    Min-max normalization strictly bounds scores between 0.0 and 1.0.
    """
    raw_scores = {"a": 10.0, "b": 20.0, "c": 30.0}
    norm = min_max_normalize(raw_scores)
    assert norm["a"] == 0.0
    assert norm["b"] == 0.5
    assert norm["c"] == 1.0

    # Constant values
    uniform = min_max_normalize({"x": 5.0, "y": 5.0})
    assert uniform["x"] == 1.0
    assert uniform["y"] == 1.0


def test_analytics_gds_primary_path():
    """
    1. GDS path executes successfully when available.
    2. Writes back pagerank, betweenness, centrality_normalized, and community_id.
    3. Confirms relative ranking: node_hub and node_bridge have higher betweenness than leaf nodes.
    """
    session = MockAnalyticsNeo4jSession(simulate_gds_missing=False)
    driver = MockAnalyticsNeo4jDriver(session)
    analytics = GraphAnalytics(driver=driver)

    result = analytics.run_analytics(case_reference="CASE-GDS-001")

    assert result["engine"] == "neo4j_gds"
    assert result["nodes_scored"] == 5

    # Check output shape keys
    assert set(result.keys()) == {
        "engine", "nodes_scored", "pagerank", "betweenness", "centrality_normalized", "communities"
    }

    # Verify relative ordering (structural invariant)
    # node_hub betweenness > node_leaf1 betweenness
    assert result["betweenness"]["node_hub"] > result["betweenness"]["node_leaf1"]
    assert result["centrality_normalized"]["node_hub"] > result["centrality_normalized"]["node_leaf1"]

    # Verify write back to Neo4j
    assert len(session.written_properties) == 5
    for ph, props in session.written_properties.items():
        assert "pagerank" in props
        assert "betweenness" in props
        assert "centrality_normalized" in props
        assert "community_id" in props
        assert 0.0 <= props["centrality_normalized"] <= 1.0


def test_analytics_networkx_fallback_path():
    """
    1. NetworkX path executes when called directly or on fallback.
    2. Confirms relative ranking on bridge topology: node_hub / node_bridge have betweenness > 0; leaves == 0.
    3. Confirms parity of output shape with GDS path.
    """
    session = MockAnalyticsNeo4jSession(simulate_gds_missing=False)
    driver = MockAnalyticsNeo4jDriver(session)
    analytics = GraphAnalytics(driver=driver)

    result = analytics._run_networkx_pipeline(case_reference="CASE-NX-001")

    assert result["engine"] == "networkx_fallback"
    assert result["nodes_scored"] == 5

    # Check exact output shape parity
    assert set(result.keys()) == {
        "engine", "nodes_scored", "pagerank", "betweenness", "centrality_normalized", "communities"
    }

    # Relative ranking assertion for NetworkX:
    # node_hub and node_bridge connect components, so betweenness is strictly greater than leaves
    assert result["betweenness"]["node_hub"] > result["betweenness"]["node_leaf1"]
    assert result["betweenness"]["node_bridge"] > result["betweenness"]["node_leaf2"]
    assert result["betweenness"]["node_leaf1"] == 0.0

    # Normalized centrality must be in [0, 1]
    for ph, score in result["centrality_normalized"].items():
        assert 0.0 <= score <= 1.0


def test_deliberate_fallback_trigger():
    """
    PRD Section 37 / Step 3: Deliberately simulates Neo4j GDS procedure unavailability.
    Proves that run_analytics catches the ProcedureNotFound error and seamlessly executes
    the NetworkX fallback, writing all properties back without crashing.
    """
    # Create session that raises ProcedureNotFound on GDS calls
    session = MockAnalyticsNeo4jSession(simulate_gds_missing=True)
    driver = MockAnalyticsNeo4jDriver(session)
    analytics = GraphAnalytics(driver=driver)

    result = analytics.run_analytics(case_reference="CASE-FALLBACK-TEST")

    # Confirms NetworkX engine executed as fallback
    assert result["engine"] == "networkx_fallback"
    assert result["nodes_scored"] == 5
    assert len(session.written_properties) == 5

    # Structural correctness on fallback
    assert result["betweenness"]["node_hub"] > result["betweenness"]["node_leaf1"]
    assert "community_id" in session.written_properties["node_hub"]
