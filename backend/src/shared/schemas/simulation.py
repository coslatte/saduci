"""Simulation schemas."""
from typing import Dict, Any, List, Optional

from pydantic import BaseModel, Field


class TimeStats(BaseModel):
    """Time statistics with 95% confidence interval."""

    mean: float
    std: float
    ci_lower: float
    ci_upper: float


class PlatformSimulationRequest(BaseModel):
    """Request schema matching saduci-platform simulation format."""

    age: int = Field(..., ge=14, le=100, description="Patient age in years")
    apache: int = Field(..., ge=0, le=36, description="APACHE II score")
    d1: int = Field(..., ge=0, le=40, description="Primary diagnosis code")
    d2: int = Field(0, ge=0, le=40, description="Secondary diagnosis code")
    d3: int = Field(0, ge=0, le=40, description="Tertiary diagnosis code")
    d4: int = Field(0, ge=0, le=40, description="Quaternary diagnosis code")
    diag_egreso2: int = Field(0, ge=0, le=40, description="Secondary discharge diagnosis code")
    artif_vent: int = Field(..., ge=0, le=2, description="Artificial ventilation type")
    vam_time: int = Field(..., ge=24, le=700, description="Mechanical ventilation time in hours")
    uti_stay: int = Field(..., ge=0, le=200, description="ICU stay duration in hours")
    preuti_stay: int = Field(..., ge=0, le=34, description="Pre-ICU stay time in hours")
    resp_insuf: int = Field(..., ge=0, le=5, description="Respiratory insufficiency cause")
    percent: int = Field(3, ge=0, le=10, description="Simulation percentage parameter")
    n_runs: int = Field(200, ge=50, le=100000, description="Number of simulation runs")


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


class ICUPatientSimulationRequest(BaseModel):
    """Schema for ICU patient simulation using SimUCI."""

    patient_id: str
    age: int = Field(..., ge=14, le=100, description="Patient age in years")
    diagnosis_admission1: int = Field(
        ..., ge=0, le=30, description="Primary admission diagnosis code"
    )
    diagnosis_admission2: int = Field(
        0, ge=0, le=30, description="Secondary admission diagnosis code"
    )
    diagnosis_admission3: int = Field(
        0, ge=0, le=30, description="Tertiary admission diagnosis code"
    )
    diagnosis_admission4: int = Field(
        0, ge=0, le=30, description="Quaternary admission diagnosis code"
    )
    apache: int = Field(..., ge=0, le=70, description="APACHE II score")
    respiratory_insufficiency: int = Field(
        ..., ge=0, le=8, description="Respiratory insufficiency severity"
    )
    artificial_ventilation: int = Field(
        ..., ge=0, le=3, description="Artificial ventilation type"
    )
    # Note: uti_stay refers to ICU (Unidad de Terapia Intensiva) stay, not Urinary Tract Infection
    uti_stay: int = Field(
        ..., ge=1, le=8760, description="Expected ICU (UTI) stay in hours (max ~1 year)"
    )
    vam_time: int = Field(
        ..., ge=0, le=8760, description="Mechanical ventilation time in hours (max ~1 year)"
    )
    preuti_stay_time: int = Field(
        ..., ge=0, le=8760, description="Pre-ICU stay time in hours (max ~1 year)"
    )
    percent: int = Field(10, ge=1, le=100, description="Percentage parameter for simulation")
    n_replications: int = Field(
        100, ge=1, le=1000, description="Number of simulation replications"
    )


class ICUPatientSimulationResponse(BaseModel):
    """Schema for ICU patient simulation response."""

    patient_id: str
    simulation_results: Dict[str, Any]
    statistics: Optional[Dict[str, Any]] = None
    timestamp: str
