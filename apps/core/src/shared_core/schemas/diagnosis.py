"""Diagnosis catalog API contract."""
from pydantic import BaseModel, ConfigDict


class DiagnosisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
