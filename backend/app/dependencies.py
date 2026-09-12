"""
FastAPI Dependency Injection Providers.
Provides database sessions, Neo4j driver, and authenticated investigator identity.
"""

import logging
from dataclasses import dataclass, field
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from neo4j import Driver
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.db.postgres import get_db_session
from backend.app.db.neo4j_driver import get_neo4j_driver

logger = logging.getLogger("nexus-crime.dependencies")


@dataclass
class InvestigatorContext:
    """
    Authenticated investigator identity resolved from request.
    Carries the auth_mode so every downstream consumer (audit logs, etc.)
    can record HOW the identity was established.
    """
    investigator_id: str
    auth_mode: str  # "firebase" or "demo-header"
    role: str = field(default="investigator")  # "investigator" or "supervisor"
    email: Optional[str] = None


def get_current_investigator(request: Request) -> InvestigatorContext:
    """
    Resolves the current investigator identity from the request.

    Two modes, controlled by FIREBASE_VERIFICATION_DISABLED in .env:

    1. Firebase mode (FIREBASE_VERIFICATION_DISABLED=false):
       - Extracts Bearer token from Authorization header
       - Verifies via firebase-admin SDK
       - Returns uid/email as investigator_id
       - Reads custom claim 'role' if present (default: "investigator")

    2. Demo mode (FIREBASE_VERIFICATION_DISABLED=true):
       - Reads X-Demo-Investigator-Id header (default: "INV-DEMO-001")
       - Reads X-Demo-Investigator-Role header (default: "investigator")
       - Clearly logged as demo-mode access

    Raises HTTPException 401 if auth fails in Firebase mode.
    """
    if settings.FIREBASE_VERIFICATION_DISABLED:
        # --- DEMO MODE ---
        demo_id = request.headers.get("X-Demo-Investigator-Id", "INV-DEMO-001")
        demo_role = request.headers.get("X-Demo-Investigator-Role", "investigator")

        # Validate role values
        if demo_role not in ("investigator", "supervisor"):
            demo_role = "investigator"

        logger.info(
            "AUTH_MODE=demo-header | investigator_id=%s | role=%s | "
            "WARNING: Demo mode active — no real authentication performed",
            demo_id, demo_role
        )

        return InvestigatorContext(
            investigator_id=demo_id,
            auth_mode="demo-header",
            role=demo_role,
            email=None,
        )

    # --- FIREBASE MODE ---
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header. Expected: Bearer <firebase_id_token>",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_header[len("Bearer "):]

    try:
        from backend.app.core.firebase_auth import verify_firebase_token

        decoded = verify_firebase_token(
            token,
            service_account_path=settings.FIREBASE_SERVICE_ACCOUNT_PATH or None,
        )

        uid = decoded.get("uid", "")
        email = decoded.get("email", "")
        # Use email as investigator_id if available, else uid
        investigator_id = email if email else uid
        # Read custom claim for role (set via Firebase Admin SDK)
        role = decoded.get("role", "investigator")
        if role not in ("investigator", "supervisor"):
            role = "investigator"

        logger.info(
            "AUTH_MODE=firebase | investigator_id=%s | uid=%s | role=%s",
            investigator_id, uid, role,
        )

        return InvestigatorContext(
            investigator_id=investigator_id,
            auth_mode="firebase",
            role=role,
            email=email,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        ) from e
    except RuntimeError as e:
        # Firebase Admin not initialized — server config issue
        logger.error("Firebase Admin SDK not ready: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service not configured. Contact administrator.",
        ) from e


__all__ = [
    "get_db_session",
    "get_neo4j_driver",
    "get_current_investigator",
    "InvestigatorContext",
]
