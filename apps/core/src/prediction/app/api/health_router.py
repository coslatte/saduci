"""Health check router."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.services.ml_model import PLATFORM_MODEL_STATE
from shared_core.schemas import HealthCheck

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthCheck)
async def health_check():
    if PLATFORM_MODEL_STATE["model"] is None:
        raise HTTPException(
            status_code=503,
            detail="El modelo de predicción no está disponible.",
        )
    return HealthCheck(status="healthy", service="prediction")
