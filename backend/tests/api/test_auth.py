"""
API tests for authentication middleware.

Tests:
1. Request with no token/header -> 401 when FIREBASE_VERIFICATION_DISABLED=false
2. Request with X-Demo-Investigator-Id header -> succeeds and records auth_mode=demo-header
   when FIREBASE_VERIFICATION_DISABLED=true
3. Valid Firebase token (mocked) -> returns correct investigator_id
"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi import APIRouter, Depends, status
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.dependencies import get_current_investigator, InvestigatorContext
from backend.app.config import Settings

# Temporary auth-test endpoint for testing purposes
_test_router = APIRouter()


@_test_router.get("/auth-test")
def auth_test_endpoint(investigator: InvestigatorContext = Depends(get_current_investigator)):
    return {
        "investigator_id": investigator.investigator_id,
        "auth_mode": investigator.auth_mode,
        "role": investigator.role,
    }


# Mount the test router
app.include_router(_test_router, prefix="/api/v1/test", tags=["Test"])


@pytest.fixture(name="client")
def fixture_client():
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


class TestFirebaseModeAuth:
    """Tests when FIREBASE_VERIFICATION_DISABLED=false (real Firebase verification)."""

    @patch("backend.app.dependencies.settings")
    def test_no_token_returns_401(self, mock_settings, client):
        """Request with no Authorization header should return 401."""
        mock_settings.FIREBASE_VERIFICATION_DISABLED = False
        mock_settings.FIREBASE_SERVICE_ACCOUNT_PATH = None

        response = client.get("/api/v1/test/auth-test")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        data = response.json()
        assert "Authorization" in data["detail"] or "token" in data["detail"].lower()

    @patch("backend.app.dependencies.settings")
    def test_malformed_token_returns_401(self, mock_settings, client):
        """Request with malformed Authorization header should return 401."""
        mock_settings.FIREBASE_VERIFICATION_DISABLED = False
        mock_settings.FIREBASE_SERVICE_ACCOUNT_PATH = None

        response = client.get(
            "/api/v1/test/auth-test",
            headers={"Authorization": "NotBearer sometoken"}
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @patch("backend.app.dependencies.settings")
    @patch("backend.app.core.firebase_auth.verify_firebase_token")
    def test_valid_firebase_token_returns_investigator(self, mock_verify, mock_settings, client):
        """Valid Firebase token should return correct investigator context."""
        mock_settings.FIREBASE_VERIFICATION_DISABLED = False
        mock_settings.FIREBASE_SERVICE_ACCOUNT_PATH = "/fake/path.json"

        mock_verify.return_value = {
            "uid": "firebase-uid-123",
            "email": "officer@department.gov.in",
            "role": "investigator",
        }

        response = client.get(
            "/api/v1/test/auth-test",
            headers={"Authorization": "Bearer valid-test-token"}
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["investigator_id"] == "officer@department.gov.in"
        assert data["auth_mode"] == "firebase"
        assert data["role"] == "investigator"
        mock_verify.assert_called_once_with("valid-test-token", service_account_path="/fake/path.json")


class TestDemoModeAuth:
    """Tests when FIREBASE_VERIFICATION_DISABLED=true (demo/development mode)."""

    @patch("backend.app.dependencies.settings")
    def test_demo_mode_default_investigator(self, mock_settings, client):
        """Demo mode with no header should use default INV-DEMO-001."""
        mock_settings.FIREBASE_VERIFICATION_DISABLED = True

        response = client.get("/api/v1/test/auth-test")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["investigator_id"] == "INV-DEMO-001"
        assert data["auth_mode"] == "demo-header"

    @patch("backend.app.dependencies.settings")
    def test_demo_mode_custom_investigator(self, mock_settings, client):
        """Demo mode with custom X-Demo-Investigator-Id header."""
        mock_settings.FIREBASE_VERIFICATION_DISABLED = True

        response = client.get(
            "/api/v1/test/auth-test",
            headers={"X-Demo-Investigator-Id": "INV-CUSTOM-42"}
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["investigator_id"] == "INV-CUSTOM-42"
        assert data["auth_mode"] == "demo-header"

    @patch("backend.app.dependencies.settings")
    def test_demo_mode_supervisor_role(self, mock_settings, client):
        """Demo mode with supervisor role header."""
        mock_settings.FIREBASE_VERIFICATION_DISABLED = True

        response = client.get(
            "/api/v1/test/auth-test",
            headers={
                "X-Demo-Investigator-Id": "INV-SUPER-01",
                "X-Demo-Investigator-Role": "supervisor"
            }
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["investigator_id"] == "INV-SUPER-01"
        assert data["role"] == "supervisor"
        assert data["auth_mode"] == "demo-header"

    @patch("backend.app.dependencies.settings")
    def test_demo_mode_invalid_role_defaults_to_investigator(self, mock_settings, client):
        """Invalid role value should default to 'investigator'."""
        mock_settings.FIREBASE_VERIFICATION_DISABLED = True

        response = client.get(
            "/api/v1/test/auth-test",
            headers={
                "X-Demo-Investigator-Id": "INV-TEST",
                "X-Demo-Investigator-Role": "admin"  # invalid
            }
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["role"] == "investigator"
