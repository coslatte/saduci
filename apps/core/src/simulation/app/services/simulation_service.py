"""CRUD and run logic for simulations."""
from __future__ import annotations

from typing import Any, Dict

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.services.engine import SimulationEngine
from app.services.notify import _notify_gateway
from app.models.entities import SimulationRecord
from shared_core.schemas import (
    SimulationRequest,
    SimulationResponse,
    SimulationUpdate,
)
from shared_core.exceptions import raise_not_found
from shared_core.utils import get_logger

logger = get_logger(__name__)


async def create_simulation(
    db: Session,
    request: SimulationRequest,
    x_user_id: int | None,
    x_user_username: str | None,
) -> SimulationResponse:
    """Create and run a new clinical scenario simulation."""
    logger.info(
        "Running simulation for patient %s, scenario: %s (user_id=%s)",
        request.patient_id,
        request.scenario,
        x_user_id,
    )

    try:
        simulation_engine = SimulationEngine()
        results = simulation_engine.run_simulation(request.scenario, request.parameters)
    except Exception as e:
        logger.error("Error running simulation: %s", e)
        raise HTTPException(status_code=500, detail="Simulation failed") from e

    db_simulation = SimulationRecord(
        patient_id=request.patient_id,
        scenario=request.scenario,
        parameters=request.parameters,
        results=results,
        user_id=x_user_id,
        created_by=x_user_username,
    )
    db.add(db_simulation)
    db.commit()
    db.refresh(db_simulation)

    await _notify_gateway("simulation_created")

    return SimulationResponse(
        patient_id=request.patient_id,
        scenario=request.scenario,
        results=results,
        timestamp=db_simulation.created_at.isoformat(),
        user_id=x_user_id,
    )


def list_all_simulations(db: Session, skip: int = 0, limit: int = 100) -> Dict[str, Any]:
    """Get all simulations across all patients."""
    simulations = (
        db.query(SimulationRecord)
        .order_by(SimulationRecord.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return {
        "items": [
            {
                "id": s.id,
                "patient_id": s.patient_id,
                "scenario": s.scenario,
                "parameters": s.parameters,
                "results": s.results,
                "user_id": s.user_id,
                "created_by": s.created_by,
                "created_at": s.created_at.isoformat(),
            }
            for s in simulations
        ],
        "total": db.query(SimulationRecord).count(),
        "skip": skip,
        "limit": limit,
    }


def count_simulations(db: Session) -> Dict[str, int]:
    """Get total count of simulations."""
    return {"count": db.query(SimulationRecord).count()}


def get_patient_simulations(db: Session, patient_id: str) -> Dict[str, Any]:
    """Get all simulations for a patient."""
    simulations = db.query(SimulationRecord).filter(
        SimulationRecord.patient_id == patient_id
    ).all()

    return {
        "patient_id": patient_id,
        "simulations": [
            {
                "id": s.id,
                "scenario": s.scenario,
                "parameters": s.parameters,
                "results": s.results,
                "user_id": s.user_id,
                "created_at": s.created_at.isoformat()
            }
            for s in simulations
        ]
    }


def update_simulation(db: Session, simulation_id: int, payload: SimulationUpdate) -> Dict[str, Any]:
    """Update fields on an existing simulation record."""
    record = db.get(SimulationRecord, simulation_id)
    if not record:
        raise_not_found("Simulación")

    fields = payload.model_dump(exclude_unset=True)
    if "patient_id" in fields:
        record.patient_id = fields["patient_id"]
    if "scenario" in fields:
        record.scenario = fields["scenario"]
    if "parameters" in fields:
        record.parameters = fields["parameters"]
    if "results" in fields:
        record.results = fields["results"]

    db.add(record)
    db.commit()
    db.refresh(record)
    return {
        "id": record.id,
        "patient_id": record.patient_id,
        "scenario": record.scenario,
        "parameters": record.parameters,
        "results": record.results,
        "user_id": record.user_id,
        "created_by": record.created_by,
        "created_at": record.created_at.isoformat(),
    }


def delete_simulation(db: Session, simulation_id: int) -> Dict[str, str]:
    """Delete a simulation record."""
    record = db.get(SimulationRecord, simulation_id)
    if not record:
        raise_not_found("Simulación")

    db.delete(record)
    db.commit()
    return {"message": "Simulación eliminada correctamente."}
