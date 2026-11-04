"""Health check router."""
from __future__ import annotations

from fastapi import APIRouter

from shared_core.schemas import HealthCheck

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthCheck)
async def health_check():
    return HealthCheck(status="healthy", service="patient")
