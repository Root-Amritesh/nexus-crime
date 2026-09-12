"""
Audit Logging Service.
Logs investigator read and pipeline execution actions to the PostgreSQL audit_log table.
Per PRD Section 10 (FR-11) & Section 17 / blueprint.md Section 4.

Auth-mode tracking: records which authentication mode produced the investigator_id
for each audit entry (stored in the details JSON field to avoid requiring a migration).
"""

import logging
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from backend.app.models.audit_log import AuditLog

logger = logging.getLogger("nexus-crime.services.audit_service")


def log_investigation_action(
    db: Session,
    investigator_id: str,
    action: str,
    case_reference: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    auth_mode: Optional[str] = None,
) -> AuditLog:
    """
    Creates an immutable audit log entry in PostgreSQL.

    Args:
        db: SQLAlchemy session
        investigator_id: Who performed the action
        action: What was done (e.g. "CASE_READ", "UPLOAD_TOWER_DUMP")
        case_reference: Which case this relates to (required by FK)
        details: Additional context dict (stored as JSON)
        auth_mode: How investigator_id was established — "firebase" or "demo-header".
                   Recorded inside the details dict so every audit row is self-describing.
    """
    merged_details = details.copy() if details else {}
    if auth_mode:
        merged_details["auth_mode"] = auth_mode

    audit_entry = AuditLog(
        investigator_id=investigator_id,
        action=action,
        case_reference=case_reference,
        details=merged_details,
    )
    try:
        db.add(audit_entry)
        db.commit()
        db.refresh(audit_entry)
        return audit_entry
    except Exception as e:
        db.rollback()
        logger.error(
            "Failed to record audit log entry for investigator '%s' (auth_mode=%s): %s",
            investigator_id, auth_mode, e
        )
        raise e
