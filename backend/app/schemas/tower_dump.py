from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class TowerDumpRow(BaseModel):
    phone_hash: str = Field(..., min_length=64, max_length=64, description="SHA-256 phone identifier hash")
    tower_id: str = Field(..., min_length=1, max_length=64)
    timestamp: datetime
    signal_strength: int

    @field_validator("timestamp", mode="before")
    @classmethod
    def parse_timestamp(cls, value):
        if isinstance(value, datetime):
            return value
        if isinstance(value, str):
            try:
                # Handle ISO 8601 strings, replacing 'Z' with UTC timezone info if needed
                val = value.strip()
                if val.endswith("Z"):
                    val = val[:-1] + "+00:00"
                return datetime.fromisoformat(val)
            except ValueError as e:
                raise ValueError(f"Invalid ISO 8601 timestamp format: {value}") from e
        raise ValueError(f"Expected datetime or string, got {type(value)}")


class UploadResponse(BaseModel):
    status: str = "accepted"
    records_ingested: int
    records_rejected: int
    job_id: str
