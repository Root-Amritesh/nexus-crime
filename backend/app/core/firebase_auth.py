"""
Firebase Admin Authentication Module.
Verifies Firebase ID tokens sent by the frontend.
Per Stage 1 of the sync-gap closure plan:
- In production mode: verifies tokens via firebase-admin SDK
- In demo mode (FIREBASE_VERIFICATION_DISABLED=true): falls back to header-based identity
"""

import logging
from typing import Optional

logger = logging.getLogger("nexus-crime.core.firebase_auth")

# Firebase Admin SDK — lazy initialization
_firebase_app = None
_initialized = False


def _ensure_initialized(service_account_path: Optional[str] = None) -> bool:
    """
    Lazily initialize the Firebase Admin SDK.
    Returns True if initialization succeeded, False otherwise.
    """
    global _firebase_app, _initialized
    if _initialized:
        return _firebase_app is not None

    _initialized = True
    try:
        import firebase_admin
        from firebase_admin import credentials

        if service_account_path:
            cred = credentials.Certificate(service_account_path)
            _firebase_app = firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin initialized with service account: %s", service_account_path)
        else:
            # Try application default credentials
            try:
                _firebase_app = firebase_admin.initialize_app()
                logger.info("Firebase Admin initialized with application default credentials")
            except Exception:
                logger.warning(
                    "No Firebase service account configured. "
                    "Set FIREBASE_SERVICE_ACCOUNT_PATH in .env or use FIREBASE_VERIFICATION_DISABLED=true"
                )
                return False
        return True
    except Exception as e:
        logger.error("Failed to initialize Firebase Admin: %s", e)
        return False


def verify_firebase_token(token: str, service_account_path: Optional[str] = None) -> dict:
    """
    Verifies a Firebase ID token and returns the decoded claims.

    Returns dict with at minimum:
        - uid: str (Firebase user ID)
        - email: str (user email, if available)

    Raises:
        ValueError: if the token is invalid, expired, or revoked
        RuntimeError: if Firebase Admin SDK is not initialized
    """
    if not _ensure_initialized(service_account_path):
        raise RuntimeError(
            "Firebase Admin SDK not initialized. "
            "Provide FIREBASE_SERVICE_ACCOUNT_PATH or enable FIREBASE_VERIFICATION_DISABLED."
        )

    try:
        from firebase_admin import auth

        decoded_token = auth.verify_id_token(token, check_revoked=True)
        logger.debug("Verified Firebase token for uid=%s", decoded_token.get("uid"))
        return decoded_token
    except Exception as e:
        error_type = type(e).__name__
        logger.warning("Firebase token verification failed (%s): %s", error_type, e)
        raise ValueError(f"Invalid Firebase ID token: {error_type}") from e
