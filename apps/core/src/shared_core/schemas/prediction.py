from __future__ import annotations

from typing import Dict, Any, Optional, List, Literal

from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    patient_id: str
    model_name: str
    features: Dict[str, Any]


class PredictionResponse(BaseModel):
    patient_id: str
    model_name: str
    prediction: Any
    confidence: Optional[float] = None
    timestamp: str
    user_id: int | None = None


class PredictionUpdate(BaseModel):
    patient_id: str | None = None
    model_name: str | None = None
    features: Dict[str, Any] | None = None
    prediction: Any | None = None
    confidence: float | None = None


class PlatformPredictionRequest(BaseModel):
    edad: int = Field(ge=14, le=61)
    diag_ing1: int = Field(ge=1, le=20)
    diag_ing2: int = Field(ge=0, le=40)
    diag_egr2: int = Field(ge=18, le=40)
    apache: int = Field(ge=18, le=40)
    tiempo_vam: int = Field(ge=18, le=40)


class PlatformPredictionResponse(BaseModel):
    probability: float
    probability_percent: float
    predicted_class: int
    predicted_label: Literal["vive", "muere"]
    threshold: float
    persisted: bool = True


class PlatformFeatureExplanationRow(BaseModel):
    feature_key: str
    feature_name: str
    patient_value: float
    patient_value_display: str
    baseline_value: float
    contribution: float
    direction: Literal["increase_risk", "decrease_risk", "neutral"]


class PlatformExplanationRequest(PlatformPredictionRequest):
    method: Literal["LIME", "SHAP", "Gradientes Integrados", "Mapas de Saliencia"]
    include_narrative: bool = False
    ai_provider: Optional[Literal["stub", "local", "gemini", "huggingface"]] = None
    ai_model: Optional[str] = None
    temperature: float = Field(default=0.2, ge=0.0, le=1.0)


class PlatformExplanationResponse(BaseModel):
    method: str
    probability: float
    predicted_class: int
    predicted_label: Literal["vive", "muere"]
    feature_names: List[str]
    importances: List[float]
    rows: List[PlatformFeatureExplanationRow]
    narrative: Optional[str] = None
    narrative_provider: Optional[str] = None
    narrative_model: Optional[str] = None
