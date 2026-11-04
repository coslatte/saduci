"""Platform / fallback simulation helpers."""
from __future__ import annotations

import hashlib
import math
import random
from typing import Any, Dict

from sqlalchemy.orm import Session

from app.services.engine import (
    Experiment,
    SIMUCI_AVAILABLE,
    centroids_available,
    multiple_replication,
    platform_centroids_path,
)
from app.services.notify import _notify_gateway
from app.models.entities import SimulationRecord
from shared_core.schemas import (
    ICUPatientSimulationRequest,
    PlatformSimulationRequest,
    TimeStats,
)
from shared_core.utils import get_logger

logger = get_logger(__name__)

_PLATFORM_SIM_VARS = ["pre_vam", "vam", "post_vam", "uci", "post_uci"]


def _platform_fallback_seed(request: PlatformSimulationRequest) -> int:
    """Build a stable seed for the platform fallback simulation."""
    seed_source = "|".join(
        str(value)
        for value in (
            request.age,
            request.apache,
            request.d1,
            request.d2,
            request.d3,
            request.d4,
            request.diag_egreso2,
            request.artif_vent,
            request.vam_time,
            request.uti_stay,
            request.preuti_stay,
            request.resp_insuf,
            request.percent,
            request.n_runs,
        )
    )
    digest = hashlib.sha256(seed_source.encode("utf-8")).digest()
    return int.from_bytes(digest[:8], "big", signed=False)


def _make_time_stats(mean: float, std: float, n: int) -> TimeStats:
    """Build a TimeStats with 95% confidence interval."""
    margin = 1.96 * std / math.sqrt(max(n, 1))
    return TimeStats(
        mean=round(mean, 4),
        std=round(std, 4),
        ci_lower=round(mean - margin, 4),
        ci_upper=round(mean + margin, 4),
    )


def _mortality_prediction(apache: int, age: int) -> Dict[str, Any]:
    """
    Compute a simple binary mortality prediction from APACHE II score and age.

    APACHE II contributes 80 % of the weight (max score 36) and age 10 %
    (max 100 years), giving a probability in the range [0.05, 0.95].
    A probability >= 0.5 maps to class 1 (mortality predicted).
    """
    prob = min(0.95, max(0.05, apache / 36.0 * 0.8 + age / 100.0 * 0.1))
    return {"class": 1 if prob >= 0.5 else 0, "probability": round(prob, 4)}


def _fallback_platform_simulation(request: PlatformSimulationRequest) -> Dict[str, Any]:
    """
    Fallback simulation when SimUCI is not available.
    Generates plausible values based on patient parameters.
    Uses a deterministic seed derived from the key clinical parameters so that
    identical inputs always produce identical outputs.
    """
    rng = random.Random(_platform_fallback_seed(request))
    n = request.n_runs

    base_vam = request.vam_time * (1.0 + request.apache / 36.0 * 0.5)
    base_uti = request.uti_stay * (1.0 + request.apache / 36.0 * 0.3)
    pre_vam_mean = max(1.0, request.preuti_stay * 0.8 + rng.gauss(0, 1))

    simulation: Dict[str, TimeStats] = {}
    for var, mean_val, std_frac in [
        ("pre_vam", pre_vam_mean, 0.25),
        ("vam", base_vam, 0.30),
        ("post_vam", base_vam * 0.4, 0.35),
        ("uci", base_uti, 0.20),
        ("post_uci", base_uti * 0.5, 0.40),
    ]:
        std_val = max(0.1, mean_val * std_frac)
        simulation[var] = _make_time_stats(abs(mean_val), std_val, n)

    return {
        "simulation": {k: v.model_dump() for k, v in simulation.items()},
        "prediction": _mortality_prediction(request.apache, request.age),
    }


def _fallback_icu_simulation(request: ICUPatientSimulationRequest) -> Dict[str, Any]:
    """
    Statistical fallback for the ICU endpoint when SimUCI centroids are missing.

    Maps the ICU request onto the platform parameter set (clamping to its valid
    ranges) and reuses the deterministic statistical model so the endpoint keeps
    returning results instead of failing.
    """
    platform_like = PlatformSimulationRequest(
        age=min(max(request.age, 14), 100),
        apache=min(request.apache, 36),
        d1=min(request.diagnosis_admission1, 40),
        d2=min(request.diagnosis_admission2, 40),
        d3=min(request.diagnosis_admission3, 40),
        d4=min(request.diagnosis_admission4, 40),
        diag_egreso2=0,
        artif_vent=min(request.artificial_ventilation, 2),
        vam_time=min(max(request.vam_time, 24), 700),
        uti_stay=min(request.uti_stay, 200),
        preuti_stay=min(request.preuti_stay_time, 34),
        resp_insuf=min(request.respiratory_insufficiency, 5),
        percent=min(max(request.percent, 3), 10),
        n_runs=min(max(request.n_replications, 50), 100000),
    )
    fallback = _fallback_platform_simulation(platform_like)
    stats = fallback["simulation"]
    return {
        "sample_result": {var: round(data["mean"]) for var, data in stats.items()},
        "statistics": {
            "mean": {var: data["mean"] for var, data in stats.items()},
            "std": {var: data["std"] for var, data in stats.items()},
            "ci_lower": {var: data["ci_lower"] for var, data in stats.items()},
            "ci_upper": {var: data["ci_upper"] for var, data in stats.items()},
        },
        "n_replications": request.n_replications,
        "all_results": [],
        "fallback": True,
    }


def run_platform_simulation_logic(request: PlatformSimulationRequest) -> Dict[str, Any]:
    """Run platform simulation via SimUCI or statistical fallback."""
    if not SIMUCI_AVAILABLE or not centroids_available():
        logger.warning("SimUCI o centroides no disponibles – usando fallback estadistico")
        return {**_fallback_platform_simulation(request), "fallback": True}

    try:
        experiment = Experiment(
            age=request.age,
            diagnosis_admission1=request.d1,
            diagnosis_admission2=request.d2,
            diagnosis_admission3=request.d3,
            diagnosis_admission4=request.d4,
            apache=request.apache,
            respiratory_insufficiency=request.resp_insuf,
            artificial_ventilation=request.artif_vent,
            uti_stay=request.uti_stay,
            vam_time=request.vam_time,
            preuti_stay_time=request.preuti_stay,
            percent=request.percent,
            validate=True,
        )

        results_df = multiple_replication(
            experiment,
            n_reps=request.n_runs,
            centroids_path=str(platform_centroids_path()),
        )

        simulation: Dict[str, TimeStats] = {}
        for var in _PLATFORM_SIM_VARS:
            col = results_df[var] if var in results_df.columns else None
            if col is not None:
                simulation[var] = _make_time_stats(
                    float(col.mean()), float(col.std()), len(col)
                )
            else:
                simulation[var] = TimeStats(mean=0.0, std=0.0, ci_lower=0.0, ci_upper=0.0)

        return {
            "simulation": {k: v.model_dump() for k, v in simulation.items()},
            "prediction": _mortality_prediction(request.apache, request.age),
            "fallback": False,
        }

    except Exception as exc:
        logger.warning(
            "SimUCI engine failed – fallback estadistico: %s",
            exc,
        )
        return {**_fallback_platform_simulation(request), "fallback": True}


async def persist_platform_simulation(
    db: Session,
    request: PlatformSimulationRequest,
    result: Dict[str, Any],
    x_user_id: int | None,
    x_user_username: str | None,
) -> bool:
    """Persist the platform simulation; return False if the record could not be stored."""
    try:
        db_simulation = SimulationRecord(
            patient_id=request.patient_id or f"SIM-{request.age}-{request.apache}",
            scenario="platform_simulation",
            parameters=request.model_dump(mode="json"),
            results=result,
            user_id=x_user_id,
            created_by=x_user_username,
        )
        db.add(db_simulation)
        db.commit()
        await _notify_gateway("simulation_created")
        return True
    except Exception as exc:
        logger.error("Could not save platform simulation record to DB: %s", exc)
        return False
