"""
Graph visualization response schemas.
Per api-contract.md: GET /cases/{case_id}/graph
"""

from typing import List, Dict, Any, Literal
from pydantic import BaseModel, Field


# Edge types existing as of Stage 6: CO_LOCATED_AT, CO_MOVED_WITH
# CALLED and TRANSACTED_WITH remain deferred to later graph enhancement stages
EdgeType = Literal["CO_LOCATED_AT", "CO_MOVED_WITH", "CALLED", "TRANSACTED_WITH"]


class GraphNode(BaseModel):
    id: str = Field(..., description="Device identifier hash")
    risk_score: float = Field(..., ge=0.0, le=1.0, description="Computed risk score (0-1)")
    community: int = Field(..., ge=0, description="Louvain community ID")


class GraphEdge(BaseModel):
    source: str = Field(..., description="Source device hash")
    target: str = Field(..., description="Target device hash")
    type: EdgeType = Field(..., description="Connection type (CO_LOCATED_AT, CO_MOVED_WITH)")
    weight: float = Field(..., description="Strength/frequency of connection")
    evidence: List[Dict[str, Any]] = Field(default_factory=list, description="Attached evidence audit trail")


class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
