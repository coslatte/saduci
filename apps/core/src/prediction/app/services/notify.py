"""Gateway change notifications."""
from __future__ import annotations

import httpx

from app.services.config import GATEWAY_URL, INTERNAL_EVENT_TOKEN
from shared_core.utils import get_logger

logger = get_logger(__name__)


async def notify_gateway(event_type: str) -> None:
    """Fire-and-forget notification to the API Gateway about a DB change."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{GATEWAY_URL}/api/internal/event",
                json={"type": event_type, "source": "prediction_service"},
                headers={"X-Internal-Token": INTERNAL_EVENT_TOKEN},
            )
    except Exception:
        logger.debug("Failed to notify gateway (non-critical): %s", event_type)
