"""Patient schemas."""
from datetime import datetime
from typing import Optional, Dict, Any

from pydantic import BaseModel


class PatientBase(BaseModel):
    """Base patient schema."""

    patient_id: str
    first_name: str
    last_name: str
    date_of_birth: datetime
    gender: str
    clinical_data: Optional[Dict[str, Any]] = None


class PatientCreate(PatientBase):
    """Schema for creating a patient."""


class PatientUpdate(BaseModel):
    """Schema for updating a patient."""

    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[str] = None
    clinical_data: Optional[Dict[str, Any]] = None


class PatientResponse(PatientBase):
    """Schema for patient response."""

    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
