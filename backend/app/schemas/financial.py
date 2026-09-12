from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class FinancialRow(BaseModel):
    sender_hash: str = Field(..., min_length=64, max_length=64, description="SHA-256 sender identifier hash")
    receiver_hash: str = Field(..., min_length=64, max_length=64, description="SHA-256 receiver identifier hash")
    amount: float = Field(..., gt=0.0)
    timestamp: datetime

    @field_validator("timestamp", mode="before")
    @classmethod
    def parse_timestamp(cls, value):
        if isinstance(value, datetime):
            return value
        if isinstance(value, str):
            try:
                val = value.strip()
                if val.endswith("Z"):
                    val = val[:-1] + "+00:00"
                return datetime.fromisoformat(val)
            except ValueError as e:
                raise ValueError(f"Invalid ISO 8601 timestamp format: {value}") from e
        raise ValueError(f"Expected datetime or string, got {type(value)}")
