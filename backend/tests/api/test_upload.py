import io
import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, String
from sqlalchemy.orm import sessionmaker
from geoalchemy2.types import Geometry

from backend.app.main import app
from backend.app.db.postgres import Base, get_db_session
from backend.app.dependencies import get_neo4j_driver
from backend.app.models.tower import Tower
from backend.app.models.tower_ping import TowerPing
from backend.app.models.case import Case


def patch_metadata_for_sqlite(metadata):
    """
    Replaces Geometry columns in Base.metadata with String columns.
    Allows creating tables on standard in-memory SQLite without spatialite extensions.
    """
    for table in metadata.tables.values():
        for col in table.columns:
            if isinstance(col.type, Geometry):
                col.type = String(128)


# Apply patching before building schema in test engine
patch_metadata_for_sqlite(Base.metadata)

# Create in-memory SQLite engine with StaticPool to persist connection
from sqlalchemy.pool import StaticPool
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(name="db_session")
def fixture_db_session():
    """Fixture that initializes the database schema and yields a session."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    
    # Pre-seed metadata: valid towers
    tower1 = Tower(tower_id="TOWER-001", latitude=12.97159, longitude=77.59456, coverage_radius_km=1.5)
    tower2 = Tower(tower_id="TOWER-002", latitude=13.08268, longitude=80.27071, coverage_radius_km=2.0)
    session.add_all([tower1, tower2])
    session.commit()
    
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(name="client")
def fixture_client(db_session):
    """Fixture that configures get_db_session and get_neo4j_driver dependencies."""
    def override_get_db_session():
        try:
            yield db_session
        finally:
            pass

    def override_get_neo4j_driver():
        # Stub Neo4j driver mock
        class MockSession:
            def __enter__(self):
                return self
            def __exit__(self, exc_type, exc_val, exc_tb):
                pass
            def run(self, query):
                class MockRecord(dict):
                    pass
                class MockResult:
                    def single(self):
                        return MockRecord(alive=1)
                return MockResult()
        class MockDriver:
            def session(self):
                return MockSession()
            def close(self):
                pass
        return MockDriver()

    app.dependency_overrides[get_db_session] = override_get_db_session
    app.dependency_overrides[get_neo4j_driver] = override_get_neo4j_driver
    
    with TestClient(app) as test_client:
        yield test_client
        
    app.dependency_overrides.clear()


# -----------------------------------------------------------------------------
# Test Cases
# -----------------------------------------------------------------------------

def test_upload_tower_dump_success(client):
    """
    1. Well-formed tower-dump upload -> 202 + correct counts.
    """
    csv_data = (
        "phone_hash,tower_id,timestamp,signal_strength\n"
        + ("a" * 64) + ",TOWER-001,2026-08-31T09:00:00Z,-75\n"
        + ("b" * 64) + ",TOWER-002,2026-08-31T09:05:00Z,-80\n"
    )
    file = ("tower_dump.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")
    
    response = client.post(
        "/api/v1/upload/tower-dump",
        data={"case_reference": "CASE-2026-001"},
        files={"file": file}
    )
    
    print("RESPONSE STATUS:", response.status_code)
    print("RESPONSE JSON:", response.json())
    assert response.status_code == status.HTTP_202_ACCEPTED
    resp_json = response.json()
    assert resp_json["status"] == "accepted"
    assert resp_json["records_ingested"] == 2
    assert resp_json["records_rejected"] == 0
    assert "job_id" in resp_json


def test_upload_tower_dump_missing_case_reference(client):
    """
    2. Missing case_reference -> 422 MISSING_CASE_REFERENCE.
    """
    csv_data = "phone_hash,tower_id,timestamp,signal_strength\n"
    file = ("tower_dump.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")
    
    # Missing case_reference form parameter
    response = client.post(
        "/api/v1/upload/tower-dump",
        files={"file": file}
    )
    
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    resp_json = response.json()
    assert resp_json["error"] == "MISSING_CASE_REFERENCE"
    assert "case_reference form field is required" in resp_json["detail"]


def test_upload_tower_dump_malformed_schema(client):
    """
    3. Malformed schema (missing column) -> 400 INVALID_SCHEMA.
    """
    # CSV is missing the signal_strength column
    csv_data = (
        "phone_hash,tower_id,timestamp\n"
        + ("a" * 64) + ",TOWER-001,2026-08-31T09:00:00Z\n"
    )
    file = ("tower_dump.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")
    
    response = client.post(
        "/api/v1/upload/tower-dump",
        data={"case_reference": "CASE-2026-001"},
        files={"file": file}
    )
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    resp_json = response.json()
    assert resp_json["error"] == "INVALID_SCHEMA"


def test_upload_tower_dump_unknown_tower_id(client):
    """
    4. Unknown tower_id -> 400 UNKNOWN_TOWER_ID.
    """
    # TOWER-999 does not exist in pre-seeded metadata
    csv_data = (
        "phone_hash,tower_id,timestamp,signal_strength\n"
        + ("a" * 64) + ",TOWER-999,2026-08-31T09:00:00Z,-75\n"
    )
    file = ("tower_dump.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")
    
    response = client.post(
        "/api/v1/upload/tower-dump",
        data={"case_reference": "CASE-2026-001"},
        files={"file": file}
    )
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    resp_json = response.json()
    assert resp_json["error"] == "UNKNOWN_TOWER_ID"


def test_upload_tower_dump_duplicate_rejected(client):
    """
    5. Duplicate row on re-upload -> counted in records_rejected, not a 500.
    """
    # Contains two exact identical pings (same phone, tower, and timestamp)
    csv_data = (
        "phone_hash,tower_id,timestamp,signal_strength\n"
        + ("a" * 64) + ",TOWER-001,2026-08-31T09:00:00Z,-75\n"
        + ("a" * 64) + ",TOWER-001,2026-08-31T09:00:00Z,-75\n"
    )
    file = ("tower_dump.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")
    
    response = client.post(
        "/api/v1/upload/tower-dump",
        data={"case_reference": "CASE-2026-001"},
        files={"file": file}
    )
    
    assert response.status_code == status.HTTP_202_ACCEPTED
    resp_json = response.json()
    assert resp_json["status"] == "accepted"
    # One row is inserted, the second is rejected due to composite unique constraint
    assert resp_json["records_ingested"] == 1
    assert resp_json["records_rejected"] == 1


def test_health_endpoint_success(client):
    """
    Verifies that the aggregated health endpoint returns overall DB connectivity status.
    """
    response = client.get("/api/v1/health")
    assert response.status_code == status.HTTP_200_OK
    resp_json = response.json()
    assert resp_json["status"] == "ok"
    assert resp_json["postgres"] == "ok"
    assert resp_json["neo4j"] == "ok"
