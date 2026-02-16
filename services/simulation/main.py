"""Simulation service - clinical scenario simulations."""
import os
import random
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy import create_engine, Column, Integer, String, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import sys

# Add shared modules to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from shared.schemas import (
    HealthCheck,
    SimulationRequest,
    SimulationResponse,
    ICUPatientSimulationRequest,
    ICUPatientSimulationResponse
)
from shared.utils import get_logger

# Import SimUCI for real patient simulation
try:
    from simuci import Experiment, single_run, multiple_replication
    SIMUCI_AVAILABLE = True
except ImportError:
    SIMUCI_AVAILABLE = False

logger = get_logger(__name__)

# Database configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://simulation_user:simulation_pass@simulation-db:5432/simulation_db"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


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
        elif scenario == "vital_signs_projection":
            return self._simulate_vital_signs(parameters)
        elif scenario == "intervention_outcomes":
            return self._simulate_intervention_outcomes(parameters)
        else:
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
        
        # Adjust probabilities based on patient risk
        for outcome in outcomes:
            if outcome["outcome"] == "complications":
                outcome["probability"] = min(outcome["probability"] + patient_risk * 0.2, 1.0)
        
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
    logger.info(f"Running simulation for patient {request.patient_id}, scenario: {request.scenario}")
    
    # Run simulation
    try:
        engine = SimulationEngine()
        results = engine.run_simulation(request.scenario, request.parameters)
    except Exception as e:
        logger.error(f"Error running simulation: {e}")
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")
    
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
            logger.warning(f"Centroids file not found at {self.centroids_path}")
            raise FileNotFoundError(
                "Centroids CSV file required for SimUCI simulation. "
                "Please ensure centroids.csv exists in the data directory."
            )

    def run_icu_simulation(
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
            logger.info(f"Running {n_replications} simulation replications...")
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
                "all_results": results_df.to_dict(orient="records")[:10]  # First 10 for display
            }

        except ValueError as e:
            logger.error(f"Validation error in ICU simulation: {e}")
            raise HTTPException(status_code=400, detail=f"Invalid patient parameters: {str(e)}")
        except Exception as e:
            logger.error(f"Error running ICU simulation: {e}")
            raise HTTPException(status_code=500, detail=f"ICU simulation failed: {str(e)}")


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

    logger.info(f"Running ICU simulation for patient {request.patient_id}")

    # Run ICU simulation
    try:
        engine = ICUSimulationEngine()
        results = engine.run_icu_simulation(
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
        logger.error(f"Error running ICU simulation: {e}")
        raise HTTPException(status_code=500, detail=f"ICU simulation failed: {str(e)}")

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


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8003"))
    uvicorn.run(app, host="0.0.0.0", port=port)
