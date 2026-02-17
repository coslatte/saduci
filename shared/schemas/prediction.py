"""Prediction schemas."""
from typing import Dict, Any, Optional

from pydantic import BaseModel


class PredictionRequest(BaseModel):
    """Schema for prediction request."""

    patient_id: str
    model_name: str
    features: Dict[str, Any]


class PredictionResponse(BaseModel):
    """Schema for prediction response."""

    patient_id: str
    model_name: str
    prediction: Any
    confidence: Optional[float] = None
    timestamp: str
