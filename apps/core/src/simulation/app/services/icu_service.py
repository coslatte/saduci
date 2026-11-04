"""ICU simulation service with SimUCI availability checks and fallback."""
from __future__ import annotations

from typing import Any, Dict

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.services.engine import ICUSimulationEngine, SIMUCI_AVAILABLE
from app.services.platform import _fallback_icu_simulation
from app.models.entities import SimulationRecord
from shared_core.utils import get_logger

logger = get_logger(__name__)


async def create_icu_simulation(
    db: Session,
    request: Any,
    x_user_id: int | None,
    x_user_username: str | None,
) -> Dict[str, Any]:
    """Create and run a real ICU patient simulation using SimUCI."""
    if not SIMUCI_AVAILABLE:
        logger.warning("SimUCI not available – using statistical fallback")
        results = _fallback_icu_simulation(request)
    else:
        try:
            icu_engine = ICUSimulationEngine()
            results = icu_engine.run_icu_simulation(
                age=request.age,
                diagnosis_admission1=request.diagnosis_admission1,
                diagnosis_admission2=request.diagnosis_admission2,
                diagnosis_admission3=request.diagnosis_admission3,
                diagnosis_admission4=request.diagnosis_admission4,
                apache=request.apache,
                respiratory_insufficiency=request.respiratory_insufficiency,
                artificial_ventilation=request.artificial_ventilation,
                uti_stay=request.uti_stay,
                vam_time=request.vam_time,
                preuti_stay_time=request.preuti_stay_time,
                percent=request.percent,
                n_replications=request.n_replications,
            )
        except FileNotFoundError as e:
            logger.warning(
                "SimUCI centroids unavailable – falling back to statistical model: %s", e
            )
            results = _fallback_icu_simulation(request)
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Error running ICU simulation: %s", e)
            raise HTTPException(status_code=500, detail="ICU simulation failed") from e

    db_simulation = SimulationRecord(
        patient_id=request.patient_id,
        scenario="icu_patient_simulation",
        parameters={
            "age": request.age,
            "diagnosis_admission1": request.diagnosis_admission1,
            "diagnosis_admission2": request.diagnosis_admission2,
            "diagnosis_admission3": request.diagnosis_admission3,
            "diagnosis_admission4": request.diagnosis_admission4,
            "apache": request.apache,
            "respiratory_insufficiency": request.respiratory_insufficiency,
            "artificial_ventilation": request.artificial_ventilation,
            "uti_stay": request.uti_stay,
            "vam_time": request.vam_time,
            "preuti_stay_time": request.preuti_stay_time,
            "percent": request.percent,
            "n_replications": request.n_replications,
        },
        results=results,
        user_id=x_user_id,
        created_by=x_user_username,
    )
    db.add(db_simulation)
    db.commit()
    db.refresh(db_simulation)

    from app.services.notify import _notify_gateway
    await _notify_gateway("simulation_created")

    return {
        "patient_id": request.patient_id,
        "simulation_results": results,
        "statistics": results.get("statistics"),
        "timestamp": db_simulation.created_at.isoformat(),
        "user_id": x_user_id,
    }
