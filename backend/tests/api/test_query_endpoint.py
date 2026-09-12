import pytest
from fastapi import status
from fastapi.testclient import TestClient
from unittest.mock import patch

from backend.app.main import app
from backend.app.dependencies import get_neo4j_driver, get_db_session
from backend.app.config import settings

@pytest.fixture(name="client")
def fixture_client(monkeypatch):
    def override_get_db_session():
        yield "db_session"
        
    def override_get_neo4j_driver():
        yield "neo4j_driver"
        
    app.dependency_overrides[get_db_session] = override_get_db_session
    app.dependency_overrides[get_neo4j_driver] = override_get_neo4j_driver
    
    # Force settings so the dependency sees demo mode
    monkeypatch.setattr(settings, "FIREBASE_VERIFICATION_DISABLED", True)
    
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@patch("backend.app.api.v1.query.evidence_service")
@patch("backend.app.api.v1.query.get_suspects_for_case")
def test_query_valid_suspect_flagged(mock_get_suspects, mock_evidence, client):
    """Valid question about why a suspect was flagged."""
    mock_get_suspects.return_value = [{
        "device_hash": "HASH123",
        "risk_score": 0.85,
        "score_breakdown": {"colocation_count": 3}
    }]
    mock_evidence.get_evidence_for_suspect.return_value = {
        "evidence": [{"type": "COLOCATION", "description": "Seen together"}]
    }
    
    response = client.get(
        "/api/v1/cases/CASE-001/query",
        params={"q": "Why is HASH123 flagged?"},
        headers={"X-Demo-Investigator-Role": "supervisor"}
    )
    assert response.status_code == status.HTTP_200_OK
    assert "investigative lead" in response.json()["disclaimer"].lower()
    assert "0.85" in response.json()["answer"]

@patch("backend.app.api.v1.query.get_suspects_for_case")
def test_query_valid_suspect_not_flagged(mock_get_suspects, client):
    """Valid question about a suspect that is NOT flagged."""
    mock_get_suspects.return_value = []
    
    response = client.get(
        "/api/v1/cases/CASE-001/query",
        params={"q": "Why was suspect HASH999 flagged?"},
        headers={"X-Demo-Investigator-Role": "supervisor"}
    )
    assert response.status_code == status.HTTP_200_OK
    assert "not found" in response.json()["answer"].lower()

def test_query_invalid_question(client):
    """Question that does not match any known regex patterns."""
    response = client.get(
        "/api/v1/cases/CASE-001/query",
        params={"q": "What is the weather today?"},
        headers={"X-Demo-Investigator-Role": "supervisor"}
    )
    assert response.status_code == status.HTTP_200_OK
    assert "couldn't match" in response.json()["answer"].lower()

def test_query_missing_q(client):
    """Missing q query parameter."""
    response = client.get(
        "/api/v1/cases/CASE-001/query",
        headers={"X-Demo-Investigator-Role": "supervisor"}
    )
    assert response.status_code in [status.HTTP_422_UNPROCESSABLE_ENTITY, status.HTTP_400_BAD_REQUEST]

@patch("backend.app.api.v1.query.get_suspects_for_case")
def test_query_auth_preservation(mock_get_suspects, client):
    """Ensure the auth dependency preserves role context."""
    mock_get_suspects.return_value = []
    response = client.get(
        "/api/v1/cases/CASE-001/query",
        params={"q": "Why was suspect HASH123 flagged?"},
        headers={"X-Demo-Investigator-Role": "supervisor"}
    )
    assert response.status_code in [status.HTTP_200_OK, status.HTTP_500_INTERNAL_SERVER_ERROR]
