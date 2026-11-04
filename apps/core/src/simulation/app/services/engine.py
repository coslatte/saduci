"""Simulation engine classes for clinical and ICU scenarios."""
from __future__ import annotations

import random
from pathlib import Path
from typing import Any, Dict, List

from fastapi import HTTPException

from shared_core.utils import get_logger

logger = get_logger(__name__)

try:
    from simuci import Experiment, single_run, multiple_replication

    SIMUCI_AVAILABLE = True
except ImportError:
    Experiment = None  # type: ignore[misc, assignment]
    single_run = None  # type: ignore[misc, assignment]
    multiple_replication = None  # type: ignore[misc, assignment]
    SIMUCI_AVAILABLE = False


def _cast_stats(stats: Dict[str, Any]) -> Dict[str, float]:
    """Cast numpy/pandas scalar values to native floats for JSON serialization."""
    return {key: float(value) for key, value in stats.items()}


def platform_centroids_path() -> Path:
    """Ruta al CSV de centroides que consume SimUCI."""
    return Path(__file__).resolve().parent.parent.parent / "app" / "data" / "centroids.csv"


def centroids_available(path: Path | None = None) -> bool:
    """True si el CSV de centroides existe y tiene al menos una fila de datos.

    El repositorio trae un archivo placeholder (solo comentarios) cuando los
    centroides reales de SimUCI no estan disponibles; en ese caso no hay que
    intentar simular con el motor real.
    """
    csv_path = path or platform_centroids_path()
    if not csv_path.exists():
        return False
    try:
        for line in csv_path.read_text(encoding="utf-8", errors="replace").splitlines():
            stripped = line.strip()
            if stripped and not stripped.startswith("#"):
                return True
    except OSError:
        return False
    return False


class SimulationEngine:
    """
    Simulation engine for clinical scenarios.
    In production, this would use more sophisticated models.
    """

    def run_simulation(self, scenario: str, parameters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Run a simulation based on scenario and parameters.

        Args:
            scenario: Type of simulation to run
            parameters: Simulation parameters

        Returns:
            List of simulation results over time
        """
        if scenario == "treatment_response":
            return self._simulate_treatment_response(parameters)
        if scenario == "vital_signs_projection":
            return self._simulate_vital_signs(parameters)
        if scenario == "intervention_outcomes":
            return self._simulate_intervention_outcomes(parameters)

        raise ValueError(f"Unknown scenario: {scenario}")

    def _simulate_treatment_response(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Simulate treatment response over time."""
        treatment = params.get("treatment", "standard")
        baseline_severity = params.get("baseline_severity", 5)
        duration_hours = params.get("duration_hours", 24)

        results = []
        for hour in range(0, duration_hours + 1, 4):
            if treatment == "aggressive":
                improvement = baseline_severity * (0.85 ** (hour / 4))
            else:
                improvement = baseline_severity * (0.92 ** (hour / 4))

            results.append({
                "hour": hour,
                "severity_score": round(improvement, 2),
                "status": "improving" if improvement < baseline_severity * 0.8 else "stable"
            })

        return results

    def _simulate_vital_signs(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Simulate vital signs projection."""
        heart_rate = params.get("heart_rate", 80)
        blood_pressure_sys = params.get("blood_pressure_sys", 120)
        duration_hours = params.get("duration_hours", 12)

        results = []
        for hour in range(0, duration_hours + 1, 2):
            random.seed(hour)  # For consistency

            hr_variation = random.randint(-5, 5)
            bp_variation = random.randint(-10, 10)

            results.append({
                "hour": hour,
                "heart_rate": heart_rate + hr_variation,
                "blood_pressure_sys": blood_pressure_sys + bp_variation,
                "blood_pressure_dia": int((blood_pressure_sys + bp_variation) * 0.67),
                "status": "normal"
            })

        return results

    def _simulate_intervention_outcomes(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Simulate different intervention outcomes."""
        intervention = params.get("intervention", "standard_care")
        patient_risk = params.get("patient_risk", 0.5)

        outcomes = []

        if intervention == "immediate_surgery":
            outcomes = [
                {"outcome": "full_recovery", "probability": 0.7, "days_to_discharge": 7},
                {"outcome": "partial_recovery", "probability": 0.2, "days_to_discharge": 14},
                {"outcome": "complications", "probability": 0.1, "days_to_discharge": 21}
            ]
        elif intervention == "conservative_treatment":
            outcomes = [
                {"outcome": "full_recovery", "probability": 0.5, "days_to_discharge": 14},
                {"outcome": "partial_recovery", "probability": 0.35, "days_to_discharge": 21},
                {"outcome": "complications", "probability": 0.15, "days_to_discharge": 28}
            ]
        else:
            outcomes = [
                {"outcome": "full_recovery", "probability": 0.6, "days_to_discharge": 10},
                {"outcome": "partial_recovery", "probability": 0.3, "days_to_discharge": 17},
                {"outcome": "complications", "probability": 0.1, "days_to_discharge": 24}
            ]

        for outcome in outcomes:
            if outcome["outcome"] == "complications":
                outcome["probability"] = min(outcome["probability"] + patient_risk * 0.2, 1.0)

        return outcomes


class ICUSimulationEngine:
    """
    Wrapper for SimUCI discrete-event simulation engine.
    Provides real-life ICU patient trajectory simulation.
    """

    def __init__(self):
        """Initialize ICU simulation engine with centroids data."""
        self.centroids_path = platform_centroids_path()
        if not centroids_available(self.centroids_path):
            logger.warning("Centroids data missing or placeholder at %s", self.centroids_path)
            raise FileNotFoundError(
                "Centroids CSV file required for SimUCI simulation. "
                "Please ensure centroids.csv contains real data."
            )

    def run_icu_simulation(  # pylint: disable=too-many-arguments,too-many-positional-arguments,too-many-locals
        self,
        age: int,
        diagnosis_admission1: int,
        diagnosis_admission2: int,
        diagnosis_admission3: int,
        diagnosis_admission4: int,
        apache: int,
        respiratory_insufficiency: int,
        artificial_ventilation: int,
        uti_stay: int,
        vam_time: int,
        preuti_stay_time: int,
        percent: int = 10,
        n_replications: int = 100
    ) -> Dict[str, Any]:
        """
        Run ICU patient simulation using SimUCI.

        Args:
            age: Patient age (14-100 years)
            diagnosis_admission1-4: Diagnosis codes (0-30)
            apache: APACHE II score (0-70)
            respiratory_insufficiency: Respiratory insufficiency severity (0-8)
            artificial_ventilation: Ventilation type (0-3)
            uti_stay: ICU stay duration in hours
            vam_time: Mechanical ventilation time in hours
            preuti_stay_time: Pre-ICU stay time in hours
            percent: Percentage parameter (1-100)
            n_replications: Number of simulation replications

        Returns:
            Dictionary with simulation results and statistics
        """
        if not SIMUCI_AVAILABLE:
            raise RuntimeError("SimUCI library is not installed. Cannot run ICU simulation.")

        try:
            experiment = Experiment(
                age=age,
                diagnosis_admission1=diagnosis_admission1,
                diagnosis_admission2=diagnosis_admission2,
                diagnosis_admission3=diagnosis_admission3,
                diagnosis_admission4=diagnosis_admission4,
                apache=apache,
                respiratory_insufficiency=respiratory_insufficiency,
                artificial_ventilation=artificial_ventilation,
                uti_stay=uti_stay,
                vam_time=vam_time,
                preuti_stay_time=preuti_stay_time,
                percent=percent,
                validate=True  # Enable input validation
            )

            logger.info("Running %s simulation replications...", n_replications)
            results_df = multiple_replication(
                experiment,
                n_reps=n_replications,
                centroids_path=str(self.centroids_path)
            )

            # Compute statistics (cast numpy scalars to native floats for JSON encoding)
            statistics = {
                "mean": _cast_stats(results_df.mean().to_dict()),
                "std": _cast_stats(results_df.std().to_dict()),
                "min": _cast_stats(results_df.min().to_dict()),
                "max": _cast_stats(results_df.max().to_dict()),
                "median": _cast_stats(results_df.median().to_dict()),
            }

            sample_result = single_run(
                experiment,
                centroids_path=str(self.centroids_path)
            )

            return {
                "sample_result": sample_result,
                "statistics": statistics,
                "n_replications": n_replications,
                "all_results": results_df.head(10).to_dict(orient="records")
            }

        except ValueError as e:
            logger.error("Validation error in ICU simulation: %s", e)
            raise HTTPException(status_code=400, detail="Invalid patient parameters") from e
        except Exception as e:
            logger.error("Error running ICU simulation: %s", e)
            raise HTTPException(status_code=500, detail="ICU simulation failed") from e
