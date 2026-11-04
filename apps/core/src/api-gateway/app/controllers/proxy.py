"""Upstream error translation and authenticated proxy helpers."""
from __future__ import annotations

from typing import Any

import httpx
from fastapi import HTTPException

from app.controllers.auth import _user_auth_headers
from app.controllers.config import logger, ServiceClient
from app.schemas.auth import TokenUser


def _extract_upstream_detail(error: httpx.HTTPStatusError) -> str:
    response = error.response
    try:
        payload = response.json()
        if isinstance(payload, dict) and "detail" in payload:
            detail = payload["detail"]
            return detail if isinstance(detail, str) else str(detail)
    except ValueError:
        pass
    response_text = response.text.strip()
    if response_text:
        return response_text
    return f"Upstream service returned HTTP {response.status_code}"


def _translate_prediction_proxy_error(error: Exception) -> HTTPException:
    if isinstance(error, httpx.TimeoutException):
        return HTTPException(status_code=504, detail="Prediction service timed out")
    if isinstance(error, httpx.HTTPStatusError):
        status_code = error.response.status_code
        detail = _extract_upstream_detail(error)
        return HTTPException(status_code=status_code, detail=detail)
    if isinstance(error, httpx.RequestError):
        return HTTPException(status_code=502, detail="Prediction service unavailable")
    return HTTPException(status_code=502, detail="Prediction service unavailable")


def _translate_upstream_error(error: Exception, unavailable_detail: str) -> HTTPException:
    if isinstance(error, httpx.TimeoutException):
        return HTTPException(status_code=504, detail="Upstream service timed out")
    if isinstance(error, httpx.HTTPStatusError):
        return HTTPException(
            status_code=error.response.status_code,
            detail=_extract_upstream_detail(error),
        )
    return HTTPException(status_code=502, detail=unavailable_detail)


async def _proxy_with_user(
    client: ServiceClient,
    endpoint: str,
    data: dict[str, Any],
    current_user: TokenUser,
) -> Any:
    headers = _user_auth_headers(current_user)
    try:
        return await client.post(endpoint, data, headers=headers)
    except httpx.HTTPStatusError as e:
        detail = _extract_upstream_detail(e)
        raise HTTPException(status_code=e.response.status_code, detail=detail)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Upstream service timed out")
    except Exception as e:
        logger.error("Upstream service error: %s", e)
        raise HTTPException(status_code=502, detail="Upstream service unavailable")
