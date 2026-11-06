"""CRUD and platform prediction business logic."""
from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.services.config import PLATFORM_FEATURE_NAMES, PREDICTION_THRESHOLD
from app.services.inference import (
    platform_feature_importances,
    platform_prediction_probability,
    prediction_class_and_label,
)
from app.services.narrative import generate_narrative
from app.services.notify import notify_gateway
from app.models.entities import PredictionRecord
from shared_core.schemas import (
    PlatformExplanationRequest,
    PlatformExplanationResponse,
    PlatformPredictionRequest,
    PlatformPredictionResponse,
    PredictionRequest,
    PredictionResponse,
    PredictionUpdate,
)
from shared_core.utils import get_logger
from shared_core.exceptions import raise_not_found

logger = get_logger(__name__)


async def _notify_gateway(event_type: str) -> None:
    """Fire-and-forget notification to the API Gateway about a DB change."""
    await notify_gateway(event_type)


_PLATFORM_FEATURE_KEYS = ("edad", "diag_ing1", "diag_ing2", "diag_egr2", "apache", "tiempo_vam")


def risk_level(risk: float) -> str:
    """Convert risk score to a simple categorical level."""
    if risk < 0.3:
        return "low"
    if risk < 0.6:
        return "medium"

    return "high"


def prediction_payload(
    model_name: str, features: dict[str, Any]
) -> tuple[dict[str, Any], float]:
    """Build the response for the legacy /predictions contract.

    Only ``mortality_risk`` is supported and it requires the canonical feature
    set. There is no ad-hoc fallback: inventing values would be misleading.
    """
    if model_name != "mortality_risk":
        raise HTTPException(status_code=400, detail=f"Unsupported model_name: {model_name}")

    missing = [key for key in _PLATFORM_FEATURE_KEYS if key not in features]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Faltan features requeridas para mortality_risk: {', '.join(missing)}",
        )

    request = PlatformPredictionRequest(
        **{key: int(features[key]) for key in _PLATFORM_FEATURE_KEYS}
    )
    probability = platform_prediction_probability(request)
    return {
        "risk_score": probability,
        "risk_level": risk_level(probability),
    }, round(probability, 4)


async def create_prediction(
    db: Session,
    request: PredictionRequest,
    x_user_id: int | None,
    x_user_username: str | None,
) -> PredictionResponse:
    logger.info(
        "Creating prediction for patient %s with model %s (user_id=%s)",
        request.patient_id,
        request.model_name,
        x_user_id,
    )

    try:
        prediction, confidence = prediction_payload(request.model_name, request.features)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error running model: %s", e)
        raise HTTPException(status_code=500, detail="Model prediction failed") from e

    db_prediction = PredictionRecord(
        patient_id=request.patient_id,
        model_name=request.model_name,
        features=request.features,
        prediction=prediction,
        confidence=confidence,
        user_id=x_user_id,
        created_by=x_user_username,
    )
    db.add(db_prediction)
    db.commit()
    db.refresh(db_prediction)

    await _notify_gateway("prediction_created")

    return PredictionResponse(
        patient_id=request.patient_id,
        model_name=request.model_name,
        prediction=prediction,
        confidence=confidence,
        timestamp=db_prediction.created_at.isoformat(),
        user_id=x_user_id,
    )


async def create_platform_prediction(
    db: Session,
    request: PlatformPredictionRequest,
    x_user_id: int | None,
    x_user_username: str | None,
) -> PlatformPredictionResponse:
    probability = platform_prediction_probability(request)
    predicted_class, predicted_label = prediction_class_and_label(probability)
    response = PlatformPredictionResponse(
        probability=probability,
        probability_percent=round(probability * 100.0, 2),
        predicted_class=predicted_class,
        predicted_label=predicted_label,
        threshold=PREDICTION_THRESHOLD,
    )

    try:
        db_prediction = PredictionRecord(
            patient_id="PRED-PENDING",
            model_name="platform_mortality",
            features=request.model_dump(mode="json"),
            prediction=response.model_dump(mode="json"),
            confidence=probability,
            user_id=x_user_id,
            created_by=x_user_username,
        )
        db.add(db_prediction)
        db.flush()
        db_prediction.patient_id = f"PRED-{db_prediction.id:06d}"
        db.commit()
        await _notify_gateway("prediction_created")
    except Exception as exc:
        logger.error("Could not save platform prediction record to DB: %s", exc)
        response.persisted = False

    return response


async def explain_platform_prediction(
    request: PlatformExplanationRequest,
) -> PlatformExplanationResponse:
    probability = platform_prediction_probability(request)
    predicted_class, predicted_label = prediction_class_and_label(probability)
    rows = platform_feature_importances(request, request.method)

    narrative = None
    narrative_provider = None
    narrative_model = None
    if request.include_narrative:
        narrative, narrative_provider, narrative_model = await generate_narrative(
            request=request,
            probability=probability,
            predicted_label=predicted_label,
            rows=rows,
        )

    return PlatformExplanationResponse(
        method=request.method,
        probability=probability,
        threshold=PREDICTION_THRESHOLD,
        predicted_class=predicted_class,
        predicted_label=predicted_label,
        feature_names=PLATFORM_FEATURE_NAMES,
        importances=[row["contribution"] for row in rows],
        rows=rows,
        narrative=narrative,
        narrative_provider=narrative_provider,
        narrative_model=narrative_model,
    )


def list_all_predictions(db: Session, skip: int = 0, limit: int = 100) -> dict[str, Any]:
    predictions = (
        db.query(PredictionRecord)
        .order_by(PredictionRecord.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return {
        "items": [
            {
                "id": p.id,
                "patient_id": p.patient_id,
                "model_name": p.model_name,
                "features": p.features,
                "prediction": p.prediction,
                "confidence": p.confidence,
                "user_id": p.user_id,
                "created_by": p.created_by,
                "created_at": p.created_at.isoformat(),
            }
            for p in predictions
        ],
        "total": db.query(PredictionRecord).count(),
        "skip": skip,
        "limit": limit,
    }


def count_predictions(db: Session) -> dict[str, int]:
    return {"count": db.query(PredictionRecord).count()}


def get_patient_predictions(db: Session, patient_id: str) -> dict[str, Any]:
    predictions = (
        db.query(PredictionRecord).filter(PredictionRecord.patient_id == patient_id).all()
    )

    return {
        "patient_id": patient_id,
        "predictions": [
            {
                "id": p.id,
                "model_name": p.model_name,
                "prediction": p.prediction,
                "confidence": p.confidence,
                "user_id": p.user_id,
                "created_by": p.created_by,
                "created_at": p.created_at.isoformat(),
            }
            for p in predictions
        ],
    }


def update_prediction(db: Session, prediction_id: int, payload: PredictionUpdate) -> dict[str, Any]:
    record = db.get(PredictionRecord, prediction_id)
    if not record:
        raise_not_found("Predicción")

    record.created_at = payload.created_at

    db.add(record)
    db.commit()
    db.refresh(record)
    return {
        "id": record.id,
        "patient_id": record.patient_id,
        "model_name": record.model_name,
        "features": record.features,
        "prediction": record.prediction,
        "confidence": record.confidence,
        "user_id": record.user_id,
        "created_by": record.created_by,
        "created_at": record.created_at.isoformat(),
    }


def list_models() -> dict[str, Any]:
    return {
        "models": [
            {
                "name": "mortality_risk",
                "description": (
                    "Predicts mortality risk with the trained platform model; "
                    "requires the canonical feature set"
                ),
                "required_features": list(_PLATFORM_FEATURE_KEYS),
            },
        ]
    }
