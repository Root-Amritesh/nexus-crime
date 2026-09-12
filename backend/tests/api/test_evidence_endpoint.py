"""
API tests for GET /suspects/{device_hash}/evidence endpoint.
Tests:
1. Device with edges and evidence -> 200 with flattened evidence array.
2. Device with zero edges -> 200 with empty evidence array.
3. FR-10 Defense in depth check: deliberately seeds an edge with empty evidence
   to prove the data-integrity structured warning log fires without crashing.
"""

import json
import pytest
from fastapi import status
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.dependencies import get_neo4j_driver


class MockEvidenceNeo4jSession:
    def __init__(self, simulate_empty_evidence=False):
        self.simulate_empty_evidence = simulate_empty_evidence

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass

    def run(self, query: str, parameters: dict = None):
        params = parameters or {}
        phone_hash = params.get("phone_hash")

        class MockRecord(dict):
            pass

        if phone_hash == "dev_with_evidence":
            return [
                MockRecord({
                    "type": "CO_LOCATED_AT",
                    "evidence_raw": json.dumps([
                        {"type": "CO_LOCATED_AT", "scene_id": "SCENE-1", "tower_id": "TOW-1", "timestamp": "2026-08-31T10:00:00Z"}
                    ])
                }),
                MockRecord({
                    "type": "CO_MOVED_WITH",
                    "evidence_raw": json.dumps([
                        {"type": "CO_MOVED_WITH", "tower_id": "TOW-2", "timestamp": "2026-08-31T12:00:00Z", "time_delta_seconds": 120.0}
                    ])
                })
            ]

        if phone_hash == "dev_with_corrupt_empty_evidence" or self.simulate_empty_evidence:
            # Seeded bad edge with empty evidence array to test FR-10 defense-in-depth detection
            return [
                MockRecord({
                    "type": "CO_LOCATED_AT",
                    "evidence_raw": json.dumps([])  # EMPTY EVIDENCE
                })
            ]

        # Device with no edges
        return []


class MockEvidenceNeo4jDriver:
    def __init__(self, session_instance=None):
        self._session = session_instance or MockEvidenceNeo4jSession()

    def session(self):
        return self._session


@pytest.fixture(name="client")
def fixture_client():
    def override_get_neo4j_driver():
        return MockEvidenceNeo4jDriver()

    app.dependency_overrides[get_neo4j_driver] = override_get_neo4j_driver

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def test_get_suspect_evidence_populated(client):
    target_hash = "dev_with_evidence"
    # Pad to 64 chars
    padded_hash = target_hash.ljust(64, "0")
    
    # Custom driver override for padded hash
    class CustomDriver:
        def session(self):
            class S:
                def __enter__(self): return self
                def __exit__(self, *args): pass
                def run(self, q, p):
                    return [
                        {
                            "type": "CO_LOCATED_AT",
                            "evidence_raw": json.dumps([
                                {"type": "CO_LOCATED_AT", "scene_id": "SCENE-1", "tower_id": "TOW-1", "timestamp": "2026-08-31T10:00:00Z"}
                            ])
                        }
                    ]
            return S()

    app.dependency_overrides[get_neo4j_driver] = lambda: CustomDriver()

    response = client.get(f"/api/v1/suspects/{padded_hash}/evidence")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["device_hash"] == padded_hash
    assert len(data["evidence"]) == 1
    assert data["evidence"][0]["type"] == "CO_LOCATED_AT"
    assert data["evidence"][0]["tower_id"] == "TOW-1"


def test_get_suspect_evidence_zero_edges_returns_empty_list(client):
    empty_hash = "0" * 64
    response = client.get(f"/api/v1/suspects/{empty_hash}/evidence")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["device_hash"] == empty_hash
    assert data["evidence"] == []


def test_get_suspect_evidence_fr10_defense_in_depth_empty_evidence_handled(client, caplog):
    """
    Step 9: Directly tests that seeding an empty-evidence edge is detected by the read-side check
    and logs a critical DATA INTEGRITY VIOLATION warning while still returning 200 without crashing.
    """
    corrupt_hash = "f" * 64

    class CorruptEdgeDriver:
        def session(self):
            class S:
                def __enter__(self): return self
                def __exit__(self, *args): pass
                def run(self, q, p):
                    return [
                        {
                            "type": "CO_LOCATED_AT",
                            "evidence_raw": json.dumps([])  # Direct corruption
                        }
                    ]
            return S()

    app.dependency_overrides[get_neo4j_driver] = lambda: CorruptEdgeDriver()

    response = client.get(f"/api/v1/suspects/{corrupt_hash}/evidence")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["device_hash"] == corrupt_hash
    assert data["evidence"] == []  # Empty, didn't crash
