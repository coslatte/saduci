"""Prediction service proxy routes."""
from __future__ import annotations

import httpx
from fastapi import APIRouter, Depends, HTTPException

from app.controllers.auth import (
    get_current_user,
    get_current_user_optional,
    require_especialista_or_admin,
    _optional_user_headers,
)
from app.controllers.config import logger, prediction_client
from app.controllers.proxy import (
    _extract_upstream_detail,
    _proxy_with_user,
    _translate_prediction_proxy_error,
    _translate_upstream_error,
)
from app.schemas.auth import TokenUser
from app.websocket.manager import manager
from shared_core.schemas import (
    PlatformExplanationRequest,
    PlatformPredictionRequest,
    PredictionRequest,
    PredictionUpdate,
)

router = APIRouter(tags=["predictions"])


@router.post("/api/predictions")
async def create_prediction(
    prediction_data: PredictionRequest,
    current_user: TokenUser = Depends(require_especialista_or_admin),
):
    result = await _proxy_with_user(
        prediction_client, "/predictions", prediction_data.model_dump(mode="json"), current_user
    )
    await manager.broadcast({"type": "prediction_created", "source": "api"})
    return result


@router.get("/api/predictions/models")
async def list_prediction_models(_current_user: TokenUser = Depends(get_current_user)):
    try:
        return await prediction_client.get("/api/predictions/models")
    except Exception as e:
        logger.error("Error forwarding model list: %s", e)
        raise _translate_upstream_error(e, "Prediction service unavailable") from e


@router.get("/api/predictions/count")
async def get_predictions_count(_current_user: TokenUser = Depends(get_current_user)):
    try:
        return await prediction_client.get("/api/predictions/count")
    except Exception as e:
        logger.error("Error forwarding prediction count: %s", e)
        raise _translate_upstream_error(e, "Prediction service unavailable") from e


@router.get("/api/predictions")
async def list_all_predictions(
    _current_user: TokenUser = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
):
    try:
        return await prediction_client.get(f"/api/predictions?skip={skip}&limit={limit}")
    except Exception as e:
        logger.error("Error forwarding prediction list: %s", e)
        raise _translate_upstream_error(e, "Prediction service unavailable") from e


@router.get("/api/predictions/{patient_id}")
async def get_prediction_history(
    patient_id: str, _current_user: TokenUser = Depends(get_current_user)
):
    try:
        return await prediction_client.get(f"/api/predictions/{patient_id}")
    except Exception as e:
        logger.error("Error forwarding prediction history: %s", e)
        raise _translate_upstream_error(e, "Prediction service unavailable") from e


@router.put("/api/predictions/{prediction_id}")
async def update_prediction_record(
    prediction_id: int,
    payload: PredictionUpdate,
    _current_user: TokenUser = Depends(require_especialista_or_admin),
):
    try:
        return await prediction_client.put(
            f"/api/predictions/{prediction_id}", payload.model_dump(mode="json", exclude_unset=True)
        )
    except httpx.HTTPStatusError as e:
        detail = _extract_upstream_detail(e)
        raise HTTPException(status_code=e.response.status_code, detail=detail)
    except Exception as e:
        logger.error("Prediction service unavailable: %s", e)
        raise HTTPException(status_code=502, detail="Prediction service unavailable")


@router.delete("/api/predictions/{prediction_id}")
async def delete_prediction_record(
    prediction_id: int,
    _current_user: TokenUser = Depends(require_especialista_or_admin),
):
    try:
        return await prediction_client.delete(f"/api/predictions/{prediction_id}")
    except httpx.HTTPStatusError as e:
        detail = _extract_upstream_detail(e)
        raise HTTPException(status_code=e.response.status_code, detail=detail)
    except Exception as e:
        logger.error("Prediction service unavailable: %s", e)
        raise HTTPException(status_code=502, detail="Prediction service unavailable")


@router.post("/prediction")
async def run_platform_prediction(
    prediction_data: PlatformPredictionRequest,
    current_user: TokenUser | None = Depends(get_current_user_optional),
):
    try:
        result = await prediction_client.post(
            "/prediction",
            prediction_data.model_dump(mode="json"),
            headers=_optional_user_headers(current_user),
        )
        await manager.broadcast({"type": "prediction_created", "source": "platform"})
        return result
    except Exception as e:
        logger.error("Error forwarding platform prediction: %s (%s)", e, type(e).__name__)
        raise _translate_prediction_proxy_error(e) from e


@router.post("/prediccion")
async def run_platform_prediction_es(
    prediction_data: PlatformPredictionRequest,
    current_user: TokenUser | None = Depends(get_current_user_optional),
):
    return await run_platform_prediction(prediction_data, current_user)


@router.post("/prediction/explain")
async def run_platform_prediction_explain(
    explain_data: PlatformExplanationRequest,
    current_user: TokenUser | None = Depends(get_current_user_optional),
):
    try:
        result = await prediction_client.post(
            "/prediction/explain",
            explain_data.model_dump(mode="json"),
            headers=_optional_user_headers(current_user),
        )
        await manager.broadcast({"type": "explanation_created", "source": "platform"})
        return result
    except Exception as e:
        logger.error("Error forwarding platform explainability: %s (%s)", e, type(e).__name__)
        raise _translate_prediction_proxy_error(e) from e


@router.post("/prediccion/explain")
async def run_platform_prediction_explain_es(
    explain_data: PlatformExplanationRequest,
    current_user: TokenUser | None = Depends(get_current_user_optional),
):
    return await run_platform_prediction_explain(explain_data, current_user)
