"""Probability, feature importance, and request→dataframe helpers."""
from __future__ import annotations

import math
from typing import Any

import pandas as pd
from fastapi import HTTPException

from app.services.config import (
    DIAGNOSIS_BY_CODE,
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
        positive_class_index = list(model.classes_).index(1)
        probability = float(model.predict_proba(frame)[0][positive_class_index])
        if not math.isfinite(probability) or not 0.0 <= probability <= 1.0:
            raise ValueError("El modelo devolvió una probabilidad inválida")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Model inference failed: {exc}") from exc

    return probability


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
    return float(round((lower + upper) / 2.0))


def reference_impact_rows(
    request: PlatformPredictionRequest,
    original_frame: pd.DataFrame,
    original_probability: float,
) -> list[dict[str, Any]]:
    """Compare the model output with one input replaced by a reference value."""

    rows: list[dict[str, Any]] = []
    for feature_key, feature_column, feature_name in PLATFORM_FEATURE_ORDER:
        patient_value = float(getattr(request, feature_key))
        baseline_value = feature_baseline(feature_key)

        perturbed = original_frame.copy()
        perturbed.at[0, feature_column] = baseline_value
        perturbed_probability = predict_probability_from_dataframe(perturbed)

        contribution = original_probability - perturbed_probability
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
                "baseline_value_display": feature_display_value(feature_key, baseline_value),
                "baseline_probability": perturbed_probability,
                "contribution": round(contribution, 6),
                "direction": direction,
            }
        )

    return rows
