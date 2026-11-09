from __future__ import annotations

from datetime import datetime

from typing import Dict, Any, Optional, List, Literal

from pydantic import BaseModel, ConfigDict, Field


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
    model_config = ConfigDict(extra="forbid")

    created_at: datetime


class PlatformPredictionRequest(BaseModel):
    patient_id: Optional[str] = None
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
    model_version: str
    artifact_sha256: str


class PlatformFeatureExplanationRow(BaseModel):
    feature_key: str
    feature_name: str
    patient_value: float
    patient_value_display: str
    baseline_value: float
    baseline_value_display: str
    baseline_probability: float = Field(ge=0.0, le=1.0)
    contribution: float
    direction: Literal["increase_risk", "decrease_risk", "neutral"]


class PlatformExplanationRequest(PlatformPredictionRequest):
    method: Literal["Impacto local por referencia"] = "Impacto local por referencia"
    include_narrative: bool = False
    ai_provider: Optional[Literal["stub", "embedded", "local", "gemini", "huggingface"]] = None
    ai_model: Optional[str] = None
    temperature: float = Field(default=0.2, ge=0.0, le=1.0)


class PlatformExplanationEvidence(BaseModel):
    method: Literal["Impacto local por referencia"]
    explainer_version: Literal["reference-impact-v1"] = "reference-impact-v1"
    reference_strategy: Literal["schema-midpoint-v1"] = "schema-midpoint-v1"
    reference_warning: str
    probability: float
    threshold: float = 0.5
    predicted_class: int
    predicted_label: Literal["vive", "muere"]
    rows: List[PlatformFeatureExplanationRow]
    model_version: str
    artifact_sha256: str


class PlatformExplanationResponse(PlatformExplanationEvidence):
    feature_names: List[str]
    importances: List[float]
    narrative_status: Literal["disabled", "generated", "template", "fallback"] = "disabled"
    narrative: Optional[str] = None
    narrative_provider: Optional[str] = None
    narrative_model: Optional[str] = None
