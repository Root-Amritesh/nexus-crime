"""
Map Data response schemas.
Per api-contract.md and PRD Section 16: GET /cases/{case_id}/map-data
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class MapTower(BaseModel):
    tower_id: str = Field(..., description="Tower identifier")
    latitude: float = Field(..., description="Tower latitude")
    longitude: float = Field(..., description="Tower longitude")
    coverage_radius_km: float = Field(..., description="Coverage radius in km")


class MapCrimeScene(BaseModel):
    scene_id: str = Field(..., description="Crime scene identifier")
    latitude: float = Field(..., description="Crime scene latitude")
    longitude: float = Field(..., description="Crime scene longitude")
    incident_type: str = Field(..., description="Type of incident")
    time_window_start: datetime = Field(..., description="Start of incident window")
    time_window_end: datetime = Field(..., description="End of incident window")


class MapFlaggedDevice(BaseModel):
    device_hash: str = Field(..., min_length=64, max_length=64, description="Device phone hash")
    risk_score: float = Field(..., ge=0.0, le=1.0, description="Risk score")
    flagged_scenes: List[str] = Field(default_factory=list, description="Scenes where device was flagged")


class MapDataResponse(BaseModel):
    towers: List[MapTower] = Field(default_factory=list)
    crime_scenes: List[MapCrimeScene] = Field(default_factory=list)
    flagged_devices: List[MapFlaggedDevice] = Field(default_factory=list)
