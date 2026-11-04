"""Simulation service (MVC entry point)."""
from __future__ import annotations

import os

from fastapi import FastAPI

from shared_core.utils import get_logger
from app.models.database import Base, SessionLocal, engine, get_db
from app.models.entities import SimulationRecord, StatisticalTestRecord
from app.api.simulations_router import router as simulations_router
from app.api.health_router import router as health_router
from app.services.engine import SimulationEngine, ICUSimulationEngine, SIMUCI_AVAILABLE

logger = get_logger(__name__)

app = FastAPI(
    title="Simulation Service",
    description="Clinical simulation service for ICU settings",
    version="1.0.0",
)
app.include_router(health_router)
app.include_router(simulations_router)

__all__ = [
    "Base",
    "SimulationRecord",
    "StatisticalTestRecord",
    "SessionLocal",
    "app",
    "engine",
    "get_db",
    "SimulationEngine",
    "ICUSimulationEngine",
    "SIMUCI_AVAILABLE",
]

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "7004"))
    uvicorn.run(app, host="0.0.0.0", port=port)
