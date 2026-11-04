"""Probability, feature importance, and request→dataframe helpers."""
from __future__ import annotations

from typing import Any

import pandas as pd
from fastapi import HTTPException

from app.services.config import (
    DIAGNOSIS_BY_CODE,
    EXPLANATION_METHOD_SCALE,
    PLATFORM_FEATURE_ORDER,
    PLATFORM_LIMITS,
    PREDICTION_THRESHOLD,
)
from app.services.ml_model import require_platform_model
from shared_core.schemas import PlatformPredictionRequest


def platform_request_to_model_row(request: PlatformPredictionRequest) -> dict[str, float]:
    return {
        "Edad": float(request.edad),
        "Diag.Ing1": float(request.diag_ing1),
        "Diag.Ing2": float(request.diag_ing2),
        "Diag.Egr2": float(request.diag_egr2),
        "APACHE": float(request.apache),
        "TiempoVAM": float(request.tiempo_vam),
    }


def platform_request_to_dataframe(request: PlatformPredictionRequest) -> pd.DataFrame:
    row = platform_request_to_model_row(request)
    return pd.DataFrame([row], columns=[column for _, column, _ in PLATFORM_FEATURE_ORDER])


def predict_probability_from_dataframe(frame: pd.DataFrame) -> float:
    model = require_platform_model()

    try:
        probability = float(model.predict_proba(frame)[0][1])
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Model inference failed: {exc}") from exc

    return min(1.0, max(0.0, probability))


def platform_prediction_probability(request: PlatformPredictionRequest) -> float:
    """Compute mortality probability using the trained platform model."""
    frame = platform_request_to_dataframe(request)
    return round(predict_probability_from_dataframe(frame), 4)


def prediction_class_and_label(probability: float) -> tuple[int, str]:
    predicted_class = 1 if probability >= PREDICTION_THRESHOLD else 0
    predicted_label = "muere" if predicted_class == 1 else "vive"
    return predicted_class, predicted_label


def feature_display_value(feature_key: str, value: float) -> str:
    int_value = int(round(value))
    if feature_key in {"diag_ing1", "diag_ing2", "diag_egr2"}:
        return DIAGNOSIS_BY_CODE.get(int_value, str(int_value))

    return str(int_value)


def feature_baseline(feature_key: str) -> float:
    lower, upper = PLATFORM_LIMITS[feature_key]
    return float((lower + upper) / 2.0)


def platform_feature_importances(
    request: PlatformPredictionRequest,
    method: str,
) -> list[dict[str, Any]]:
    """Compute local, signed feature attributions for saduci-platform."""
    scale = EXPLANATION_METHOD_SCALE[method]

    original_frame = platform_request_to_dataframe(request)
    original_probability = predict_probability_from_dataframe(original_frame)

    rows: list[dict[str, Any]] = []
    for feature_key, feature_column, feature_name in PLATFORM_FEATURE_ORDER:
        patient_value = float(getattr(request, feature_key))
        baseline_value = feature_baseline(feature_key)

        perturbed = original_frame.copy()
        perturbed.at[0, feature_column] = baseline_value
        perturbed_probability = predict_probability_from_dataframe(perturbed)

        contribution = (original_probability - perturbed_probability) * scale
        if contribution > 1e-6:
            direction = "increase_risk"
        elif contribution < -1e-6:
            direction = "decrease_risk"
        else:
            direction = "neutral"

        rows.append(
            {
                "feature_key": feature_key,
                "feature_name": feature_name,
                "patient_value": patient_value,
                "patient_value_display": feature_display_value(feature_key, patient_value),
                "baseline_value": baseline_value,
                "contribution": round(contribution, 6),
                "direction": direction,
            }
        )

    return rows
