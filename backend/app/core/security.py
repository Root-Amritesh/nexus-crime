"""
Security utility module.
Provides SHA-256 identifier hashing helpers and future JWT/bcrypt hooks.
Per blueprint.md Section 4 & non-negotiables.md:
- Core SHA-256 identifier hashing is active.
- Auth / JWT / bcrypt scaffolding is intentionally deferred for MVP hackathon scope.
"""

import hashlib
from typing import Optional


def hash_identifier(raw_identifier: str) -> str:
    """
    Computes a deterministic 64-character lowercase SHA-256 hex digest
    for any device or phone identifier.
    """
    if not raw_identifier or not isinstance(raw_identifier, str):
        raise ValueError("raw_identifier must be a non-empty string")
    return hashlib.sha256(raw_identifier.strip().encode("utf-8")).hexdigest()


# Auth & JWT scaffolding (deferred per Stage 1 scope-boundary)
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Stub hook for future bcrypt password verification."""
    raise NotImplementedError("Authentication and password hashing are deferred beyond MVP hackathon scope.")


def create_access_token(data: dict, expires_delta: Optional[int] = None) -> str:
    """Stub hook for future JWT token generation."""
    raise NotImplementedError("JWT generation is deferred beyond MVP hackathon scope.")
