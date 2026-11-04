"""CORS parsing, service URLs/clients, rate limiting, and login constants."""
from __future__ import annotations

import os
import time
from collections import defaultdict
from typing import Any

import httpx
from fastapi import HTTPException, status

from shared_core.security import SECRET_KEY
from shared_core.utils.logger import get_logger

logger = get_logger(__name__)

LOGIN_RATE_LIMIT_MAX = int(os.getenv("LOGIN_RATE_LIMIT_MAX", "5"))
LOGIN_RATE_LIMIT_WINDOW = int(os.getenv("LOGIN_RATE_LIMIT_WINDOW", "60"))

# Secreto compartido entre el gateway y los servicios internos para el endpoint
# de eventos (no hay usuario en ese flujo). Por defecto reutiliza SECRET_KEY.
INTERNAL_EVENT_TOKEN = os.getenv("INTERNAL_EVENT_TOKEN", SECRET_KEY)

_login_attempts: dict[str, list[float]] = defaultdict(list)


def _check_rate_limit(client_ip: str) -> None:
    now = time.monotonic()
    window_start = now - LOGIN_RATE_LIMIT_WINDOW
    attempts = _login_attempts[client_ip]
    _login_attempts[client_ip] = [t for t in attempts if t > window_start]
    if len(_login_attempts[client_ip]) >= LOGIN_RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later.",
        )
    _login_attempts[client_ip].append(now)


def _parse_cors_origins(raw_origins: str) -> list[str]:
    origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    return origins or ["http://localhost:3000", "http://localhost:7000"]


CORS_ALLOW_ORIGINS = _parse_cors_origins(
    os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000,http://localhost:7000")
)
CORS_ALLOW_CREDENTIALS = os.getenv("CORS_ALLOW_CREDENTIALS", "true").lower() == "true"
if "*" in CORS_ALLOW_ORIGINS:
    CORS_ALLOW_CREDENTIALS = False

USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://user:7001")
PATIENT_SERVICE_URL = os.getenv("PATIENT_SERVICE_URL", "http://patient:7002")
PREDICTION_SERVICE_URL = os.getenv("PREDICTION_SERVICE_URL", "http://prediction:7003")
SIMULATION_SERVICE_URL = os.getenv("SIMULATION_SERVICE_URL", "http://simulation:7004")


class ServiceClient:
    """HTTP client for making requests to other services."""

    def __init__(self, base_url: str, timeout: float = 30.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.client: httpx.AsyncClient = httpx.AsyncClient(timeout=timeout)

    async def get(
        self,
        endpoint: str,
        headers: dict[str, str] | None = None,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        url = f"{self.base_url}{endpoint}"
        response = await self.client.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()

    async def post(
        self,
        endpoint: str,
        data: dict[str, Any],
        headers: dict[str, str] | None = None,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        url = f"{self.base_url}{endpoint}"
        response = await self.client.post(url, json=data, headers=headers, params=params)
        response.raise_for_status()
        return response.json()

    async def put(
        self,
        endpoint: str,
        data: dict[str, Any],
        headers: dict[str, str] | None = None,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        url = f"{self.base_url}{endpoint}"
        response = await self.client.put(url, json=data, headers=headers, params=params)
        response.raise_for_status()
        return response.json()

    async def delete(
        self,
        endpoint: str,
        headers: dict[str, str] | None = None,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        url = f"{self.base_url}{endpoint}"
        response = await self.client.delete(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()

    async def close(self) -> None:
        await self.client.aclose()


prediction_client = ServiceClient(PREDICTION_SERVICE_URL)
simulation_client = ServiceClient(SIMULATION_SERVICE_URL)
patient_client = ServiceClient(PATIENT_SERVICE_URL)
user_client = ServiceClient(USER_SERVICE_URL)

_REAL_CLIENTS: dict[str, ServiceClient] = {
    "prediction_client": prediction_client,
    "simulation_client": simulation_client,
    "patient_client": patient_client,
    "user_client": user_client,
}
