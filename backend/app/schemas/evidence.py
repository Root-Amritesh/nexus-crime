"""
Evidence response schema for explainability panel.
Per api-contract.md and PRD Section 16/31: GET /suspects/{device_hash}/evidence
"""

from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class EvidenceItem(BaseModel):
    type: str = Field(..., description="Evidence type (e.g. CO_LOCATED_AT, CO_MOVED_WITH)")
    tower_id: Optional[str] = Field(None, description="Associated tower identifier")
    timestamp: Optional[str] = Field(None, description="Event timestamp (ISO 8601)")
    scene_id: Optional[str] = Field(None, description="Associated crime scene identifier if applicable")
    time_delta_seconds: Optional[float] = Field(None, description="Time delta for co-movement if applicable")


class SuspectEvidenceResponse(BaseModel):
    device_hash: str = Field(..., min_length=64, max_length=64, description="Target device hash")
    evidence: List[EvidenceItem] = Field(default_factory=list, description="Flattened list of audit evidence items")
