"""Simulation service proxy routes."""
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
    ICUPatientSimulationRequest,
    PlatformSimulationRequest,
    SimulationRequest,
    SimulationUpdate,
)

router = APIRouter(tags=["simulations"])


@router.post("/api/simulations")
async def create_simulation(
    simulation_data: SimulationRequest,
    current_user: TokenUser = Depends(get_current_user),
):
    result = await _proxy_with_user(
        simulation_client, "/api/simulations", simulation_data.model_dump(mode="json"), current_user
    )
    await manager.broadcast({"type": "simulation_created", "source": "api"})
    return result


@router.get("/api/simulations/count")
async def get_simulations_count(_current_user: TokenUser = Depends(get_current_user)):
    try:
        return await simulation_client.get("/api/simulations/count")
    except Exception as e:
        logger.error("Error forwarding simulation count: %s", e)
        raise _translate_upstream_error(e, "Simulation service unavailable") from e


@router.get("/api/simulations")
async def list_all_simulations(
    _current_user: TokenUser = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
):
    try:
        return await simulation_client.get(f"/api/simulations?skip={skip}&limit={limit}")
    except Exception as e:
        logger.error("Error forwarding simulation list: %s", e)
        raise _translate_upstream_error(e, "Simulation service unavailable") from e


@router.get("/api/simulations/scenarios")
async def list_simulation_scenarios(_current_user: TokenUser = Depends(get_current_user)):
    try:
        return await simulation_client.get("/api/simulations/scenarios")
    except Exception as e:
        logger.error("Error forwarding scenario list: %s", e)
        raise _translate_upstream_error(e, "Simulation service unavailable") from e


@router.get("/api/simulations/{patient_id}")
async def get_simulation_history(
    patient_id: str, _current_user: TokenUser = Depends(get_current_user)
):
    try:
        return await simulation_client.get(f"/api/simulations/{patient_id}")
    except Exception as e:
        logger.error("Error forwarding simulation history: %s", e)
        raise _translate_upstream_error(e, "Simulation service unavailable") from e


@router.put("/api/simulations/{simulation_id}")
async def update_simulation_record(
    simulation_id: int,
    payload: SimulationUpdate,
    _current_user: TokenUser = Depends(get_current_user),
):
    try:
        return await simulation_client.put(
            f"/api/simulations/{simulation_id}",
            payload.model_dump(mode="json", exclude_unset=True),
        )
    except httpx.HTTPStatusError as e:
        detail = _extract_upstream_detail(e)
        raise HTTPException(status_code=e.response.status_code, detail=detail)
    except Exception as e:
        logger.error("Simulation service unavailable: %s", e)
        raise HTTPException(status_code=502, detail="Simulation service unavailable")


@router.post("/api/simulations/icu")
async def create_icu_simulation(
    simulation_data: ICUPatientSimulationRequest,
    current_user: TokenUser = Depends(get_current_user),
):
    result = await _proxy_with_user(
        simulation_client, "/api/simulations/icu", simulation_data.model_dump(mode="json"), current_user
    )
    await manager.broadcast({"type": "simulation_created", "source": "api"})
    return result


@router.post("/simulation")
async def run_platform_simulation(
    simulation_data: PlatformSimulationRequest,
    current_user: TokenUser | None = Depends(get_current_user_optional),
):
    try:
        result = await simulation_client.post(
            "/simulation",
            simulation_data.model_dump(mode="json"),
            headers=_optional_user_headers(current_user),
        )
        await manager.broadcast({"type": "simulation_created", "source": "platform"})
        return result
    except Exception as e:
        logger.error("Error forwarding platform simulation: %s", e)
        raise HTTPException(status_code=502, detail="Simulation service unavailable") from e
