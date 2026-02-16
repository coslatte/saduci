"""Simulation schemas."""
from typing import Dict, Any, List
from pydantic import BaseModel


class SimulationRequest(BaseModel):
    """Schema for simulation request."""
    
    patient_id: str
    scenario: str
    parameters: Dict[str, Any]


class SimulationResponse(BaseModel):
    """Schema for simulation response."""
    
    patient_id: str
    scenario: str
    results: List[Dict[str, Any]]
    timestamp: str
