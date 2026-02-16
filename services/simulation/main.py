"""Simulation service - clinical scenario simulations."""
import os
from datetime import datetime
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy import create_engine, Column, Integer, String, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import sys

# Add shared modules to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from shared.schemas import HealthCheck, SimulationRequest, SimulationResponse
from shared.utils import get_logger

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
    created_at = Column(DateTime, default=datetime.utcnow)


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
            import random
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
            }
        ]
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8003"))
    uvicorn.run(app, host="0.0.0.0", port=port)
