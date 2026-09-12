import contextvars
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

# ContextVar to store request_id across the request lifetime
request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="system")

# Set up basic console logger
logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("nexus-crime")


def get_request_id() -> str:
    """Retrieves the current request_id from the context."""
    return request_id_var.get()


def set_request_id(request_id: str) -> None:
    """Sets the request_id in the context."""
    request_id_var.set(request_id)


def log_stage_event(stage: str, outcome: str, details: Optional[Dict[str, Any]] = None) -> None:
    """
    Logs a structured line for a pipeline stage transition.
    Enforces required fields from non-negotiables.md: request_id, timestamp, stage, outcome.
    """
    log_data = {
        "request_id": get_request_id(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "stage": stage,
        "outcome": outcome,
    }
    if details:
        log_data["details"] = details

    # Print/log as JSON string
    logger.info(json.dumps(log_data))
