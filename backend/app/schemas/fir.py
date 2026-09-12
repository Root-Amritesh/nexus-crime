from typing import List, Any
from pydantic import BaseModel, Field


class FIRTextRequest(BaseModel):
    case_reference: str = Field(..., min_length=1, max_length=128)
    text: str = Field(..., min_length=1)


class FIRExtractionResponse(BaseModel):
    entities_extracted: List[Any] = Field(default_factory=list)
    job_id: str
