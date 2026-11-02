"""Simulation service - clinical scenario simulations."""
import os
import sys
import hashlib
import math
import random
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any

from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy import create_engine, Column, Integer, String, DateTime, JSON
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session

# Add shared modules to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from shared.schemas import (
    HealthCheck,
    SimulationRequest,
    SimulationResponse,
    ICUPatientSimulationRequest,
    ICUPatientSimulationResponse,
    PlatformSimulationRequest,
    TimeStats,
    WilcoxonRequest,
    FriedmanRequest,
    StatisticalTestResult,
)
from shared.utils import get_logger

# Import scipy for statistical tests
try:
    from scipy import stats as scipy_stats
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False

# Import SimUCI for real patient simulation
try:
    from simuci import Experiment, single_run, multiple_replication
    SIMUCI_AVAILABLE = True
except ImportError:
    SIMUCI_AVAILABLE = False

logger = get_logger(__name__)

# Database configuration
# Default to local sqlite for development convenience when DATABASE_URL is not provided.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./simulation_service.db")
_is_sqlite = DATABASE_URL.startswith("sqlite")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class SimulationRecord(Base):
    """Simulation database model."""
    __tablename__ = "simulations"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, index=True, nullable=False)
    scenario = Column(String, nullable=False)
    parameters = Column(JSON, nullable=False)
    results = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Simulation Service",
    description="Clinical scenario simulation service",
    version="1.0.0"
)


def get_db():
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


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
            # Simple exponential decay model
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
            # Simple variation model
            rng = random.Random(hour)  # Stable output without changing process-wide state

            hr_variation = rng.randint(-5, 5)
            bp_variation = rng.randint(-10, 10)
            
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
        
        # Simulate multiple possible outcomes
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
        
        # Shift probability mass to complications while preserving a distribution.
        risk = min(max(patient_risk, 0.0), 1.0)
        complication = next(item for item in outcomes if item["outcome"] == "complications")
        original_complication_probability = complication["probability"]
        complication["probability"] = min(original_complication_probability + risk * 0.2, 1.0)
        remaining_probability = 1.0 - complication["probability"]
        recovery_outcomes = [item for item in outcomes if item is not complication]
        original_recovery_probability = sum(item["probability"] for item in recovery_outcomes)
        for outcome in recovery_outcomes:
            outcome["probability"] = (
                outcome["probability"] / original_recovery_probability * remaining_probability
            )
        
        return outcomes


@app.get("/health", response_model=HealthCheck)
async def health_check():
    """Health check endpoint."""
    return HealthCheck(status="healthy", service="simulation")


@app.post("/simulations", response_model=SimulationResponse)
async def create_simulation(
    request: SimulationRequest,
    db: Session = Depends(get_db)
):
    """
    Create and run a new simulation.
    
    Supported scenarios:
    - treatment_response: Simulate response to different treatments
    - vital_signs_projection: Project vital signs over time
    - intervention_outcomes: Simulate outcomes of different interventions
    """
    logger.info(
        "Running simulation for patient %s, scenario: %s",
        request.patient_id,
        request.scenario,
    )

    # Run simulation
    try:
        simulation_engine = SimulationEngine()
        results = simulation_engine.run_simulation(request.scenario, request.parameters)
    except Exception as e:
        logger.error("Error running simulation: %s", e)
        raise HTTPException(status_code=500, detail="Simulation failed") from e

    # Save simulation to database
    db_simulation = SimulationRecord(
        patient_id=request.patient_id,
        scenario=request.scenario,
        parameters=request.parameters,
        results=results
    )
    db.add(db_simulation)
    db.commit()
    db.refresh(db_simulation)

    return SimulationResponse(
        patient_id=request.patient_id,
        scenario=request.scenario,
        results=results,
        timestamp=db_simulation.created_at.isoformat()
    )


@app.get("/simulations/{patient_id}")
async def get_patient_simulations(
    patient_id: str,
    db: Session = Depends(get_db)
):
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
                "created_at": s.created_at.isoformat()
            }
            for s in simulations
        ]
    }



@app.get("/scenarios")
async def list_scenarios():
    """List available simulation scenarios."""
    return {
        "scenarios": [
            {
                "name": "treatment_response",
                "description": "Simulate patient response to different treatments",
                "required_parameters": ["treatment", "baseline_severity", "duration_hours"]
            },
            {
                "name": "vital_signs_projection",
                "description": "Project vital signs over time",
                "required_parameters": ["heart_rate", "blood_pressure_sys", "duration_hours"]
            },
            {
                "name": "intervention_outcomes",
                "description": "Simulate outcomes of different medical interventions",
                "required_parameters": ["intervention", "patient_risk"]
            },
            {
                "name": "icu_patient_simulation",
                "description": "Real ICU patient simulation using SimUCI discrete-event engine",
                "required_parameters": ["age", "apache", "diagnosis codes", "ventilation parameters"],
                "available": SIMUCI_AVAILABLE
            }
        ]
    }


# ============================================================================
# SimUCI Integration - Real ICU Patient Simulation
# ============================================================================


class ICUSimulationEngine:
    """
    Wrapper for SimUCI discrete-event simulation engine.
    Provides real-life ICU patient trajectory simulation.
    """

    def __init__(self):
        """Initialize ICU simulation engine with centroids data."""
        self.centroids_path = Path(__file__).parent / "data" / "centroids.csv"
        if not self.centroids_path.exists():
            logger.warning("Centroids file not found at %s", self.centroids_path)
            raise FileNotFoundError(
                "Centroids CSV file required for SimUCI simulation. "
                "Please ensure centroids.csv exists in the data directory."
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
            # Create experiment with patient parameters
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

            # Run multiple replications to get statistical results
            logger.info("Running %s simulation replications...", n_replications)
            results_df = multiple_replication(
                experiment,
                n_reps=n_replications,
                centroids_path=str(self.centroids_path)
            )

            # Compute statistics
            statistics = {
                "mean": results_df.mean().to_dict(),
                "std": results_df.std().to_dict(),
                "min": results_df.min().to_dict(),
                "max": results_df.max().to_dict(),
                "median": results_df.median().to_dict(),
            }

            # Get first replication as sample result
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


@app.post("/simulations/icu", response_model=ICUPatientSimulationResponse)
async def create_icu_simulation(
    request: ICUPatientSimulationRequest,
    db: Session = Depends(get_db)
):
    """
    Create and run a real ICU patient simulation using SimUCI.

    This endpoint uses the SimUCI discrete-event simulation engine to model
    real-life ICU patient trajectories based on clinical parameters.

    The simulation uses:
    - Patient clustering based on clinical features
    - Statistical distributions from real ICU data
    - Discrete-event simulation for realistic time progression
    - Multiple replications for statistical validation

    Returns detailed simulation results including:
    - Sample simulation outcome
    - Statistical measures (mean, std, min, max, median)
    - Multiple replication results for analysis
    """
    if not SIMUCI_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="SimUCI simulation engine is not available. Please install simuci package."
        )

    logger.info("Running ICU simulation for patient %s", request.patient_id)

    # Run ICU simulation
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
            n_replications=request.n_replications
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error running ICU simulation: %s", e)
        raise HTTPException(status_code=500, detail="ICU simulation failed") from e

    # Save simulation to database
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
            "n_replications": request.n_replications
        },
        results=results
    )
    db.add(db_simulation)
    db.commit()
    db.refresh(db_simulation)

    return ICUPatientSimulationResponse(
        patient_id=request.patient_id,
        simulation_results=results,
        statistics=results.get("statistics"),
        timestamp=db_simulation.created_at.isoformat()
    )


# ============================================================================
# Platform-compatible simulation endpoint (saduci-platform format)
# ============================================================================

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


@app.post("/simulation")
async def run_platform_simulation(request: PlatformSimulationRequest):
    """
    Run a clinical ICU simulation in saduci-platform format.

    Accepts the compact parameter set used by the saduci-platform frontend and
    returns time-phase statistics (pre_vam, vam, post_vam, uci, post_uci) with
    95% confidence intervals plus a binary mortality prediction.

    When SimUCI is installed the endpoint uses the full discrete-event engine;
    otherwise a statistical fallback is applied.
    """
    logger.info("Running platform simulation (age=%s, apache=%s)", request.age, request.apache)

    if not SIMUCI_AVAILABLE:
        logger.warning("SimUCI not available – using statistical fallback")
        return _fallback_platform_simulation(request)

    try:
        centroids_path = Path(__file__).parent / "data" / "centroids.csv"
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
            centroids_path=str(centroids_path),
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
        }

    except ValueError as exc:
        logger.error("Validation error in platform simulation: %s", exc)
        raise HTTPException(status_code=400, detail=f"Invalid parameters: {exc}") from exc
    except Exception as exc:
        logger.error("Error running platform simulation: %s", exc)
        raise HTTPException(status_code=500, detail=f"Simulation failed: {exc}") from exc


# ============================================================================
# Statistical tests (Wilcoxon signed-rank, Friedman)
# ============================================================================

@app.post("/statistics/wilcoxon", response_model=StatisticalTestResult)
async def run_wilcoxon_test(request: WilcoxonRequest):
    """
    Run a Wilcoxon signed-rank test on two paired samples.

    Returns the test statistic and two-tailed p-value.
    Requires scipy.
    """
    if not SCIPY_AVAILABLE:
        raise HTTPException(status_code=503, detail="scipy is not installed; cannot run statistical tests.")

    if len(request.x) != len(request.y):
        raise HTTPException(status_code=400, detail="Samples x and y must have the same length.")
    if len(request.x) < 2:
        raise HTTPException(status_code=400, detail="Each sample must contain at least 2 observations.")

    try:
        result = scipy_stats.wilcoxon(request.x, request.y)
        return StatisticalTestResult(statistic=float(result.statistic), p_value=float(result.pvalue))
    except Exception as exc:
        logger.error("Wilcoxon test error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Statistical test failed: {exc}") from exc


@app.post("/statistics/friedman", response_model=StatisticalTestResult)
async def run_friedman_test(request: FriedmanRequest):
    """
    Run a Friedman chi-square test across multiple related samples.

    Returns the test statistic and p-value.
    Requires scipy.
    """
    if not SCIPY_AVAILABLE:
        raise HTTPException(status_code=503, detail="scipy is not installed; cannot run statistical tests.")

    if len(request.samples) < 3:
        raise HTTPException(status_code=400, detail="Friedman test requires at least 3 sample groups.")

    lengths = [len(s) for s in request.samples]
    if len(set(lengths)) != 1:
        raise HTTPException(status_code=400, detail="All sample groups must have the same length.")
    if lengths[0] < 2:
        raise HTTPException(status_code=400, detail="Each sample group must contain at least 2 observations.")

    try:
        result = scipy_stats.friedmanchisquare(*request.samples)
        return StatisticalTestResult(statistic=float(result.statistic), p_value=float(result.pvalue))
    except Exception as exc:
        logger.error("Friedman test error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Statistical test failed: {exc}") from exc


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8003"))
    uvicorn.run(app, host="0.0.0.0", port=port)
