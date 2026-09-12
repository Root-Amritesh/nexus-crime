"""
API tests for GET /cases/{case_id}/graph endpoint.
Tests:
1. Case with nodes/edges -> 200 with correct GraphResponse shape.
2. Case with no graph data -> 200 empty.
3. Nonexistent case -> 404.
"""

import json
import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, String
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from geoalchemy2.types import Geometry

from backend.app.main import app
from backend.app.db.postgres import Base, get_db_session
from backend.app.dependencies import get_neo4j_driver
from backend.app.models.case import Case
from backend.app.models.suspect_risk_score import SuspectRiskScore


def patch_metadata(metadata):
    for table in metadata.tables.values():
        for col in table.columns:
            if isinstance(col.type, Geometry):
                col.type = String(128)


patch_metadata(Base.metadata)

engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class MockGraphNeo4jSession:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass

    def run(self, query: str, parameters: dict = None):
        params = parameters or {}
        hashes = params.get("hashes", [])

        if "MATCH (d:Device)" in query:
            # Return nodes for matching hashes
            class MockNodeRecord(dict):
                pass
            return [
                MockNodeRecord({"id": h, "risk_score": 0.85, "community": 1})
                for h in hashes
            ]

        if "MATCH (a:Device)-[r]-(b:Device)" in query:
            class MockEdgeRecord(dict):
                pass
            if len(hashes) >= 2:
                return [
                    MockEdgeRecord({
                        "source": hashes[0],
                        "target": hashes[1],
                        "type": "CO_LOCATED_AT",
                        "weight": 2.0,
                        "evidence_raw": json.dumps([
                            {"scene_id": "SCENE-1", "tower_id": "TOW-1", "timestamp": "2026-08-31T10:00:00Z"}
                        ])
                    })
                ]
            return []

        return []


class MockGraphNeo4jDriver:
    def session(self):
        return MockGraphNeo4jSession()


@pytest.fixture(name="db_session")
def fixture_db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()

    case_populated = Case(case_reference="CASE-GRAPH-POPULATED", warrant_reference="W-1", investigator_id="INV-1")
    case_empty = Case(case_reference="CASE-GRAPH-EMPTY", warrant_reference="W-2", investigator_id="INV-2")
    session.add_all([case_populated, case_empty])
    session.commit()

    # Pre-seed suspect risk scores for populated case
    s1 = SuspectRiskScore(
        case_reference="CASE-GRAPH-POPULATED",
        device_hash="a" * 64,
        risk_score=0.85,
        score_breakdown={"centrality": 0.3, "colocation_count": 2, "comovement_count": 2, "call_frequency": 50},
        flagged_scenes=["SCENE-1"]
    )
    s2 = SuspectRiskScore(
        case_reference="CASE-GRAPH-POPULATED",
        device_hash="b" * 64,
        risk_score=0.75,
        score_breakdown={"centrality": 0.2, "colocation_count": 2, "comovement_count": 1, "call_frequency": 30},
        flagged_scenes=["SCENE-1"]
    )
    session.add_all([s1, s2])
    session.commit()

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(name="client")
def fixture_client(db_session):
    def override_get_db_session():
        try:
            yield db_session
        finally:
            pass

    def override_get_neo4j_driver():
        return MockGraphNeo4jDriver()

    app.dependency_overrides[get_db_session] = override_get_db_session
    app.dependency_overrides[get_neo4j_driver] = override_get_neo4j_driver

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def test_get_case_graph_populated(client):
    response = client.get("/api/v1/cases/CASE-GRAPH-POPULATED/graph")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "nodes" in data
    assert "edges" in data
    assert len(data["nodes"]) == 2
    assert len(data["edges"]) == 1
    edge = data["edges"][0]
    assert edge["type"] == "CO_LOCATED_AT"
    assert len(edge["evidence"]) == 1


def test_get_case_graph_empty(client):
    response = client.get("/api/v1/cases/CASE-GRAPH-EMPTY/graph")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["nodes"] == []
    assert data["edges"] == []


def test_get_case_graph_not_found(client):
    response = client.get("/api/v1/cases/CASE-NONEXISTENT/graph")
    assert response.status_code == status.HTTP_404_NOT_FOUND
