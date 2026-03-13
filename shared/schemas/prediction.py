"""Prediction schemas."""
from typing import Dict, Any, Optional, List, Literal

from pydantic import BaseModel, Field


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


class PlatformPredictionRequest(BaseModel):
    """Request schema used by saduci-platform prediction UI."""

    edad: int = Field(ge=14, le=61)
    diag_ing1: int = Field(ge=1, le=20)
    diag_ing2: int = Field(ge=39, le=173)
    diag_egr2: int = Field(ge=18, le=40)
    apache: int = Field(ge=18, le=40)
    tiempo_vam: int = Field(ge=18, le=40)


class PlatformPredictionResponse(BaseModel):
    """Prediction response expected by saduci-platform."""

    probability: float


class PlatformExplanationRequest(PlatformPredictionRequest):
    """Explanation request schema used by saduci-platform prediction UI."""

    method: Literal["LIME", "SHAP", "Gradientes Integrados", "Mapas de Saliencia"]


class PlatformExplanationResponse(BaseModel):
    """Explanation response expected by saduci-platform."""

    feature_names: List[str]
    importances: List[float]
