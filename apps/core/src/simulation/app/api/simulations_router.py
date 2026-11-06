"""API routes for simulations and statistics."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.services.simulation_service import (
    create_simulation,
    list_all_simulations,
    count_simulations,
    get_patient_simulations,
    update_simulation,
)
from app.services.icu_service import create_icu_simulation as icu_create
from app.services.platform import run_platform_simulation_logic, persist_platform_simulation
from app.services.statistics import (
    run_wilcoxon_test,
    run_friedman_test,
    create_statistical_test_record,
    list_statistical_test_records,
    update_statistical_test,
)
from app.models.database import get_db
from shared_core.schemas import (
    FriedmanRequest,
    ICUPatientSimulationRequest,
    PlatformSimulationRequest,
    SimulationRequest,
    SimulationUpdate,
    StatisticalTestCreate,
    StatisticalTestUpdate,
    WilcoxonRequest,
)

router = APIRouter()


@router.post("/api/simulations")
async def create_simulation_endpoint(
    simulation_data: SimulationRequest,
    db: Session = Depends(get_db),
    x_user_id: int | None = Header(default=None, alias="X-User-ID"),
    x_user_username: str | None = Header(default=None, alias="X-User-Username"),
):
    return await create_simulation(db, simulation_data, x_user_id, x_user_username)


@router.get("/api/simulations/count")
async def get_simulations_count(db: Session = Depends(get_db)):
    return count_simulations(db)


@router.get("/api/simulations")
async def list_simulations(db: Session = Depends(get_db), skip: int = 0, limit: int = 100):
    return list_all_simulations(db, skip=skip, limit=limit)


@router.get("/api/simulations/scenarios")
async def list_simulation_scenarios(db: Session = Depends(get_db)):
    return {"scenarios": ["treatment_response", "vital_signs_projection", "intervention_outcomes"]}


@router.get("/api/simulations/{patient_id}")
async def get_simulation_history(patient_id: str, db: Session = Depends(get_db)):
    return get_patient_simulations(db, patient_id)


@router.put("/api/simulations/{simulation_id}")
async def update_simulation_endpoint(
    simulation_id: int,
    payload: SimulationUpdate,
    db: Session = Depends(get_db),
):
    return update_simulation(db, simulation_id, payload)


@router.post("/api/simulations/icu")
async def create_icu_simulation_endpoint(
    simulation_data: ICUPatientSimulationRequest,
    db: Session = Depends(get_db),
    x_user_id: int | None = Header(default=None, alias="X-User-ID"),
    x_user_username: str | None = Header(default=None, alias="X-User-Username"),
):
    return await icu_create(db, simulation_data, x_user_id, x_user_username)


@router.post("/simulation")
async def run_platform_simulation_endpoint(
    simulation_data: PlatformSimulationRequest,
    db: Session = Depends(get_db),
    x_user_id: int | None = Header(default=None, alias="X-User-ID"),
    x_user_username: str | None = Header(default=None, alias="X-User-Username"),
):
    result = run_platform_simulation_logic(simulation_data)
    result["persisted"] = await persist_platform_simulation(
        db, simulation_data, result, x_user_id, x_user_username
    )
    return result


@router.post("/statistics/wilcoxon")
async def wilcoxon_endpoint(
    request: WilcoxonRequest,
    db: Session = Depends(get_db),
    x_user_id: int | None = Header(default=None, alias="X-User-ID"),
    x_user_username: str | None = Header(default=None, alias="X-User-Username"),
):
    return await run_wilcoxon_test(db, request, x_user_id, x_user_username)


@router.post("/statistics/friedman")
async def friedman_endpoint(
    request: FriedmanRequest,
    db: Session = Depends(get_db),
    x_user_id: int | None = Header(default=None, alias="X-User-ID"),
    x_user_username: str | None = Header(default=None, alias="X-User-Username"),
):
    return await run_friedman_test(db, request, x_user_id, x_user_username)


@router.get("/api/statistical-tests")
async def list_stat_tests(db: Session = Depends(get_db), skip: int = 0, limit: int = 100):
    return list_statistical_test_records(db, skip=skip, limit=limit)


@router.post("/api/statistical-tests")
async def create_stat_test_endpoint(
    payload: StatisticalTestCreate,
    db: Session = Depends(get_db),
    x_user_id: int | None = Header(default=None, alias="X-User-ID"),
    x_user_username: str | None = Header(default=None, alias="X-User-Username"),
):
    return await create_statistical_test_record(db, payload, x_user_id, x_user_username)


@router.put("/api/statistical-tests/{test_id}")
async def update_stat_test_endpoint(
    test_id: int,
    payload: StatisticalTestUpdate,
    db: Session = Depends(get_db),
):
    return update_statistical_test(db, test_id, payload)
