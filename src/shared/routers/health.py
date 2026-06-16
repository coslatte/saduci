"""Health check router for all services."""
from fastapi import APIRouter

from shared.schemas import HealthCheck


router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthCheck)
async def health_check():
    """Basic health check endpoint."""
    return HealthCheck(status="Ok", service="unknown")
