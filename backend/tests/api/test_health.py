"""
API tests for GET /health endpoint.
Tests:
1. Both databases healthy -> status: "ok", postgres: "ok", neo4j: "ok", HTTP 200.
2. PostgreSQL down, Neo4j up -> status: "error", postgres: "error", neo4j: "ok", HTTP 200 (does not 500).
3. Neo4j down, PostgreSQL up -> status: "error", postgres: "ok", neo4j: "error", HTTP 200 (does not 500).
4. Both databases down -> status: "error", postgres: "error", neo4j: "error", HTTP 200 (does not 500).
"""

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.main import app
from backend.app.db.postgres import Base, get_db_session
from backend.app.dependencies import get_neo4j_driver

# SQLite test engine
engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(name="client")
def fixture_client():
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_health_both_healthy(client):
    """Both PostgreSQL and Neo4j connections are healthy."""
    def healthy_db_session():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    class HealthyNeo4jSession:
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def run(self, q):
            class R:
                def single(self): return {"alive": 1}
            return R()

    class HealthyDriver:
        def session(self): return HealthyNeo4jSession()

    app.dependency_overrides[get_db_session] = healthy_db_session
    app.dependency_overrides[get_neo4j_driver] = lambda: HealthyDriver()

    response = client.get("/api/v1/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "ok"
    assert data["postgres"] == "ok"
    assert data["neo4j"] == "ok"


def test_health_postgres_down_does_not_500(client):
    """Postgres down, Neo4j up -> returns 200 with partial failure payload, never crashes with 500."""
    def failing_db_session():
        mock_sess = MagicMock()
        mock_sess.execute.side_effect = Exception("Postgres connection timeout")
        yield mock_sess

    class HealthyNeo4jSession:
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def run(self, q):
            class R:
                def single(self): return {"alive": 1}
            return R()

    class HealthyDriver:
        def session(self): return HealthyNeo4jSession()

    app.dependency_overrides[get_db_session] = failing_db_session
    app.dependency_overrides[get_neo4j_driver] = lambda: HealthyDriver()

    response = client.get("/api/v1/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "error"
    assert data["postgres"] == "error"
    assert data["neo4j"] == "ok"


def test_health_neo4j_down_does_not_500(client):
    """Neo4j down, Postgres up -> returns 200 with partial failure payload, never crashes with 500."""
    def healthy_db_session():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    class FailingDriver:
        def session(self):
            raise Exception("Neo4j Bolt connection refused")

    app.dependency_overrides[get_db_session] = healthy_db_session
    app.dependency_overrides[get_neo4j_driver] = lambda: FailingDriver()

    response = client.get("/api/v1/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "error"
    assert data["postgres"] == "ok"
    assert data["neo4j"] == "error"


def test_health_both_down_does_not_500(client):
    """Both databases down -> returns 200 with error statuses."""
    def failing_db_session():
        mock_sess = MagicMock()
        mock_sess.execute.side_effect = Exception("Postgres down")
        yield mock_sess

    class FailingDriver:
        def session(self):
            raise Exception("Neo4j down")

    app.dependency_overrides[get_db_session] = failing_db_session
    app.dependency_overrides[get_neo4j_driver] = lambda: FailingDriver()

    response = client.get("/api/v1/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "error"
    assert data["postgres"] == "error"
    assert data["neo4j"] == "error"
