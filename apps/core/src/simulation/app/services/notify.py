"""Gateway notification helpers."""
from __future__ import annotations

import os

import httpx

from shared_core.security import SECRET_KEY
from shared_core.utils import get_logger

logger = get_logger(__name__)

GATEWAY_URL = os.getenv("GATEWAY_URL", "http://api-gateway:7000")
INTERNAL_EVENT_TOKEN = os.getenv("INTERNAL_EVENT_TOKEN", SECRET_KEY)


async def _notify_gateway(event_type: str) -> None:
    """Fire-and-forget notification to the API Gateway about a DB change."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{GATEWAY_URL}/api/internal/event",
                json={"type": event_type, "source": "simulation_service"},
                headers={"X-Internal-Token": INTERNAL_EVENT_TOKEN},
            )
    except Exception:
        logger.debug("Failed to notify gateway (non-critical): %s", event_type)
