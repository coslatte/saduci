"""Patient schemas for the clinical registry service."""
from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class PatientBase(BaseModel):
    """Base patient schema."""

    mrn: str = Field(..., min_length=3, max_length=64)
    first_name: str = Field(..., min_length=1, max_length=120)
    last_name: str = Field(..., min_length=1, max_length=120)
    date_of_birth: date
    sex: str = Field(..., min_length=1, max_length=32)


class PatientCreate(PatientBase):
    """Create patient request."""


class PatientUpdate(BaseModel):
    """Update patient request."""

    first_name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    last_name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    date_of_birth: Optional[date] = None
    sex: Optional[str] = Field(default=None, min_length=1, max_length=32)


class PatientResponse(PatientBase):
    """Patient response payload."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class PatientLinkRequest(BaseModel):
    """Lookup request by business identifier."""

    mrn: str
