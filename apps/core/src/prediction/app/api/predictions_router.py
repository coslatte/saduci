"""Prediction HTTP router, including Spanish aliases."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.services.diagnoses import list_diagnoses, list_respiratory_insufficiency_types
from shared_core.schemas.diagnosis import DiagnosisResponse
from app.services.prediction_service import (
    create_prediction,
    create_platform_prediction,
    explain_platform_prediction,
    list_all_predictions,
    count_predictions,
    get_patient_predictions,
    update_prediction,
    list_models,
)
from shared_core.schemas import (
    PlatformExplanationRequest,
    PlatformExplanationResponse,
    PlatformPredictionRequest,
    PlatformPredictionResponse,
    PredictionRequest,
    PredictionResponse,
    PredictionUpdate,
)

router = APIRouter(tags=["predictions"])


@router.post("/predictions", response_model=PredictionResponse)
async def create_prediction_endpoint(
    request: PredictionRequest,
    db: Session = Depends(get_db),
    x_user_id: int | None = Header(default=None, alias="X-User-ID"),
    x_user_username: str | None = Header(default=None, alias="X-User-Username"),
):
    """Create a new prediction."""
    return await create_prediction(db, request, x_user_id, x_user_username)


@router.post("/prediction", response_model=PlatformPredictionResponse)
async def create_platform_prediction_endpoint(
    request: PlatformPredictionRequest,
    db: Session = Depends(get_db),
    x_user_id: int | None = Header(default=None, alias="X-User-ID"),
    x_user_username: str | None = Header(default=None, alias="X-User-Username"),
):
    """Alias endpoint for /prediccion."""
    return await create_platform_prediction(db, request, x_user_id, x_user_username)


@router.post("/prediccion", response_model=PlatformPredictionResponse)
async def create_platform_prediction_spanish(
    request: PlatformPredictionRequest,
    db: Session = Depends(get_db),
    x_user_id: int | None = Header(default=None, alias="X-User-ID"),
    x_user_username: str | None = Header(default=None, alias="X-User-Username"),
):
    """Prediction endpoint compatible with saduci-platform frontend."""
    return await create_platform_prediction(db, request, x_user_id, x_user_username)


@router.post("/prediction/explain", response_model=PlatformExplanationResponse)
async def explain_platform_prediction_endpoint(request: PlatformExplanationRequest):
    """Explainability endpoint."""
    return await explain_platform_prediction(request)


@router.post("/prediccion/explain", response_model=PlatformExplanationResponse)
async def explain_platform_prediction_spanish(request: PlatformExplanationRequest):
    """Explainability endpoint compatible with saduci-platform frontend."""
    return await explain_platform_prediction(request)


@router.get("/api/predictions")
async def list_all_predictions_api(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
):
    """Get all predictions across all patients."""
    return list_all_predictions(db, skip=skip, limit=limit)


@router.get("/api/predictions/models")
async def list_models_api():
    """List available prediction models."""
    return list_models()


@router.get("/api/predictions/count")
async def count_predictions_api(db: Session = Depends(get_db)):
    """Get total count of predictions."""
    return count_predictions(db)


@router.get("/api/predictions/{patient_id}")
async def get_patient_predictions_api(patient_id: str, db: Session = Depends(get_db)):
    """Get all predictions for a patient."""
    return get_patient_predictions(db, patient_id)


@router.put("/api/predictions/{prediction_id}")
async def update_prediction_api(
    prediction_id: int,
    payload: PredictionUpdate,
    db: Session = Depends(get_db),
):
    return update_prediction(db, prediction_id, payload)


@router.get("/api/diagnoses", response_model=list[DiagnosisResponse])
async def list_diagnoses_api(db: Session = Depends(get_db)):
    return list_diagnoses(db)


@router.get("/api/respiratory-insufficiency-types", response_model=list[DiagnosisResponse])
async def list_respiratory_insufficiency_types_api(db: Session = Depends(get_db)):
    return list_respiratory_insufficiency_types(db)
