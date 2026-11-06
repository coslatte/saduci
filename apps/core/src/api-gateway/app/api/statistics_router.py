"""Statistics / statistical-tests proxy routes."""
from __future__ import annotations

import httpx
from fastapi import APIRouter, Depends, HTTPException

from app.controllers.auth import (
    get_current_user,
    get_current_user_optional,
    _optional_user_headers,
)
from app.controllers.config import logger, simulation_client
from app.controllers.proxy import (
    _extract_upstream_detail,
    _proxy_with_user,
    _translate_upstream_error,
)
from app.schemas.auth import TokenUser
from app.websocket.manager import manager
from shared_core.schemas import (
    FriedmanRequest,
    StatisticalTestCreate,
    StatisticalTestUpdate,
    WilcoxonRequest,
)

router = APIRouter(tags=["statistics"])


@router.post("/statistics/wilcoxon")
async def run_wilcoxon_test(
    test_data: WilcoxonRequest,
    current_user: TokenUser | None = Depends(get_current_user_optional),
):
    headers = _optional_user_headers(current_user)
    try:
        return await simulation_client.post(
            "/statistics/wilcoxon", test_data.model_dump(mode="json"), headers=headers
        )
    except Exception as e:
        logger.error("Error forwarding Wilcoxon test: %s", e)
        raise HTTPException(status_code=502, detail="Statistics service unavailable") from e


@router.post("/statistics/friedman")
async def run_friedman_test(
    test_data: FriedmanRequest,
    current_user: TokenUser | None = Depends(get_current_user_optional),
):
    headers = _optional_user_headers(current_user)
    try:
        return await simulation_client.post(
            "/statistics/friedman", test_data.model_dump(mode="json"), headers=headers
        )
    except Exception as e:
        logger.error("Error forwarding Friedman test: %s", e)
        raise HTTPException(status_code=502, detail="Statistics service unavailable") from e


@router.get("/api/statistical-tests")
async def list_statistical_test_records(
    _current_user: TokenUser = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
):
    try:
        return await simulation_client.get(f"/api/statistical-tests?skip={skip}&limit={limit}")
    except Exception as e:
        logger.error("Error forwarding statistical tests list: %s", e)
        raise _translate_upstream_error(e, "Simulation service unavailable") from e


@router.post("/api/statistical-tests")
async def create_statistical_test_record(
    test_data: StatisticalTestCreate,
    current_user: TokenUser = Depends(get_current_user),
):
    result = await _proxy_with_user(
        simulation_client, "/api/statistical-tests", test_data.model_dump(mode="json"), current_user
    )
    await manager.broadcast({"type": "statistical_test_created", "source": "api"})
    return result


@router.put("/api/statistical-tests/{test_id}")
async def update_statistical_test_record(
    test_id: int,
    payload: StatisticalTestUpdate,
    _current_user: TokenUser = Depends(get_current_user),
):
    try:
        return await simulation_client.put(
            f"/api/statistical-tests/{test_id}",
            payload.model_dump(mode="json", exclude_unset=True),
        )
    except httpx.HTTPStatusError as e:
        detail = _extract_upstream_detail(e)
        raise HTTPException(status_code=e.response.status_code, detail=detail)
    except Exception as e:
        logger.error("Simulation service unavailable: %s", e)
        raise HTTPException(status_code=502, detail="Simulation service unavailable")
