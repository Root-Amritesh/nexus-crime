import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, String
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from geoalchemy2.types import Geometry
import os

from backend.app.main import app
from backend.app.db.postgres import Base, get_db_session
from backend.app.models.case import Case
from backend.app.config import settings

def patch_metadata_for_sqlite(metadata):
    for table in metadata.tables.values():
        for col in table.columns:
            if isinstance(col.type, Geometry):
                col.type = String(128)

patch_metadata_for_sqlite(Base.metadata)

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
    case1 = Case(case_reference="CASE-2026-ACTIVE", warrant_reference="WARR-001", investigator_id="INV-001")
    session.add(case1)
    session.commit()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(name="client")
def fixture_client(db_session, monkeypatch):
    def override_get_db_session():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db_session] = override_get_db_session
    
    # Force settings so the dependency sees demo mode
    monkeypatch.setattr(settings, "FIREBASE_VERIFICATION_DISABLED", True)
    
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

def test_list_cases_supervisor_success(client):
    """Supervisor can list cases."""
    response = client.get("/api/v1/cases", headers={
        "X-Demo-Investigator-Role": "supervisor"
    })
    assert response.status_code == status.HTTP_200_OK
    assert len(response.json()) > 0

def test_list_cases_investigator_forbidden(client):
    """Investigator cannot list cases."""
    response = client.get("/api/v1/cases", headers={
        "X-Demo-Investigator-Role": "investigator"
    })
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_list_cases_demo_mode_supervisor(client):
    """Supervisor in demo mode using fallback token."""
    response = client.get("/api/v1/cases", headers={
        "X-Demo-Investigator-Role": "supervisor"
    })
    assert response.status_code == status.HTTP_200_OK

def test_list_cases_demo_mode_investigator(client):
    """Investigator in demo mode defaults and is forbidden."""
    response = client.get("/api/v1/cases", headers={
        "X-Demo-Investigator-Role": "investigator"
    })
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_list_cases_unauthorized(client):
    """No authorization header defaults to investigator -> forbidden."""
    response = client.get("/api/v1/cases")
    assert response.status_code == status.HTTP_403_FORBIDDEN
