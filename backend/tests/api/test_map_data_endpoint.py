"""
API tests for GET /cases/{case_id}/map-data endpoint.
Tests:
1. Populated case with towers, crime scenes, and scored flagged suspects -> 200 with complete data.
2. Empty case -> 200 with empty lists.
3. Nonexistent case -> 404.
"""

from datetime import datetime, timezone
import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, String
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from geoalchemy2.types import Geometry

from backend.app.main import app
from backend.app.db.postgres import Base, get_db_session
from backend.app.models.case import Case
from backend.app.models.tower import Tower
from backend.app.models.crime_scene import CrimeScene
from backend.app.models.suspect_risk_score import SuspectRiskScore


def patch_metadata(metadata):
    for table in metadata.tables.values():
        for col in table.columns:
            if isinstance(col.type, Geometry):
                col.type = String(128)


patch_metadata(Base.metadata)

engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(name="db_session")
def fixture_db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()

    # Pre-seed towers
    t1 = Tower(tower_id="TOW-01", latitude=12.97159, longitude=77.59456, coverage_radius_km=1.5)
    session.add(t1)

    # Pre-seed populated case with crime scene and scored suspect
    case_pop = Case(case_reference="CASE-MAP-POP", warrant_reference="W-1", investigator_id="INV-1")
    scene1 = CrimeScene(
        scene_id="SCENE-01",
        case_reference="CASE-MAP-POP",
        latitude=12.97159,
        longitude=77.59456,
        time_window_start=datetime(2026, 8, 31, 10, 0, tzinfo=timezone.utc),
        time_window_end=datetime(2026, 8, 31, 12, 0, tzinfo=timezone.utc),
        incident_type="Theft",
        geom="POINT(77.59456 12.97159)"
    )
    s1 = SuspectRiskScore(
        case_reference="CASE-MAP-POP",
        device_hash="c" * 64,
        risk_score=0.88,
        score_breakdown={"centrality": 0.3, "colocation_count": 2, "comovement_count": 3, "call_frequency": 60},
        flagged_scenes=["SCENE-01"]
    )
    session.add_all([case_pop, scene1, s1])

    # Pre-seed empty case
    case_empty = Case(case_reference="CASE-MAP-EMPTY", warrant_reference="W-2", investigator_id="INV-2")
    session.add(case_empty)

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


def test_get_map_data_populated(client):
    response = client.get("/api/v1/cases/CASE-MAP-POP/map-data")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data["towers"]) == 1
    assert len(data["crime_scenes"]) == 1
    assert len(data["flagged_devices"]) == 1
    assert data["flagged_devices"][0]["device_hash"] == "c" * 64
    assert data["flagged_devices"][0]["risk_score"] == 0.88


def test_get_map_data_empty(client):
    response = client.get("/api/v1/cases/CASE-MAP-EMPTY/map-data")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data["towers"]) == 1  # Global towers exist
    assert data["crime_scenes"] == []
    assert data["flagged_devices"] == []


def test_get_map_data_not_found(client):
    response = client.get("/api/v1/cases/CASE-DOESNOTEXIST/map-data")
    assert response.status_code == status.HTTP_404_NOT_FOUND
