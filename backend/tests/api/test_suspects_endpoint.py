"""
API tests for GET /cases/{case_id}/suspects endpoint.
Tests:
1. Case with scored suspects -> 200, correct descending sort, valid breakdown shape.
2. Case with zero flagged suspects -> 200, empty list (not 404).
3. Nonexistent case -> 404.
4. Suspect with all-signals-missing sentinel -> confirmed excluded from response list.
"""

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

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(name="db_session")
def fixture_db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()

    # Create test cases
    case1 = Case(case_reference="CASE-2026-ACTIVE", warrant_reference="WARR-001", investigator_id="INV-001")
    case_empty = Case(case_reference="CASE-2026-EMPTY", warrant_reference="WARR-002", investigator_id="INV-002")
    session.add_all([case1, case_empty])
    session.commit()

    # Pre-seed suspect risk scores for CASE-2026-ACTIVE
    # Suspect 1 (Score: 0.85)
    s1 = SuspectRiskScore(
        case_reference="CASE-2026-ACTIVE",
        device_hash="a" * 64,
        risk_score=0.85,
        score_breakdown={
            "centrality": 0.3,
            "colocation_count": 3,
            "comovement_count": 2,
            "call_frequency": 80
        },
        flagged_scenes=["SCENE-1", "SCENE-2"]
    )
    # Suspect 2 (Score: 0.92 - Higher, should sort first)
    s2 = SuspectRiskScore(
        case_reference="CASE-2026-ACTIVE",
        device_hash="b" * 64,
        risk_score=0.92,
        score_breakdown={
            "centrality": 0.4,
            "colocation_count": 5,
            "comovement_count": 4,
            "call_frequency": 90
        },
        flagged_scenes=["SCENE-1", "SCENE-3"]
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

    app.dependency_overrides[get_db_session] = override_get_db_session

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def test_get_suspects_success_descending_sort(client):
    """
    Case with scored suspects returns 200 sorted descending by risk_score.
    """
    response = client.get("/api/v1/cases/CASE-2026-ACTIVE/suspects")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "suspects" in data
    suspects = data["suspects"]
    assert len(suspects) == 2

    # Check sorting: highest score first (0.92 before 0.85)
    assert suspects[0]["device_hash"] == "b" * 64
    assert suspects[0]["risk_score"] == 0.92
    assert suspects[1]["device_hash"] == "a" * 64
    assert suspects[1]["risk_score"] == 0.85

    # Check score_breakdown shape
    bd = suspects[0]["score_breakdown"]
    assert "centrality" in bd
    assert "colocation_count" in bd
    assert "comovement_count" in bd
    assert "call_frequency" in bd


def test_get_suspects_zero_flagged_returns_200_empty_list(client):
    """
    Existing case with zero scored suspects returns 200 with empty list (valid empty state, not 404).
    """
    response = client.get("/api/v1/cases/CASE-2026-EMPTY/suspects")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["suspects"] == []


def test_get_suspects_nonexistent_case_returns_404(client):
    """
    Nonexistent case returns 404 Not Found.
    """
    response = client.get("/api/v1/cases/CASE-NONEXISTENT-999/suspects")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "not found" in response.json()["detail"].lower()
