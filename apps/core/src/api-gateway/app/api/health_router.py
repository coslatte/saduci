"""Health check view."""
from __future__ import annotations

import asyncio
from time import perf_counter

import httpx
from fastapi import APIRouter, Depends

from app.controllers.auth import require_admin
from app.controllers.config import ServiceClient, user_client, patient_client, prediction_client, simulation_client
from app.schemas.auth import TokenUser

from shared_core.schemas import HealthCheck

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthCheck)
async def health_check():
    return HealthCheck(status="healthy", service="api-gateway")


@router.get("/api/admin/services/health")
async def service_health(_current_user: TokenUser = Depends(require_admin)):
    async def probe(client: ServiceClient) -> tuple[str, float]:
        started_at = perf_counter()
        try:
            result = await asyncio.wait_for(client.get("/health"), timeout=3)
            status = "healthy" if result.get("status") == "healthy" else "unhealthy"
        except httpx.HTTPStatusError:
            status = "unhealthy"
        except (httpx.RequestError, asyncio.TimeoutError):
            status = "unreachable"
        return status, round((perf_counter() - started_at) * 1000, 1)

    clients = {
        "users": user_client,
        "patients": patient_client,
        "prediction": prediction_client,
        "simulation": simulation_client,
    }
    checks = await asyncio.gather(*(probe(client) for client in clients.values()))
    return {
        "gateway": "healthy",
        **{
            key: status
            for key, (status, _) in zip(clients, checks, strict=True)
        },
        "latency_ms": {
            key: latency
            for key, (_, latency) in zip(clients, checks, strict=True)
        },
    }
