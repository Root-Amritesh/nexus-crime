"""
Suspect schemas.
Wired in Stage 5+.
"""

from typing import List
from pydantic import BaseModel, Field


class ScoreBreakdown(BaseModel):
    centrality: float = Field(..., description="Normalized centrality score (0-1)")
    colocation_count: int = Field(..., ge=0)
    comovement_count: int = Field(..., ge=0)
    call_frequency: int = Field(..., ge=0)


class SuspectItem(BaseModel):
    device_hash: str = Field(..., min_length=64, max_length=64)
    risk_score: float = Field(..., ge=0.0, le=1.0)
    score_breakdown: ScoreBreakdown
    flagged_scenes: List[str] = Field(default_factory=list)


class SuspectsResponse(BaseModel):
    suspects: List[SuspectItem]
