"""Prediction service FastAPI application."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from shared_core.database import Base, engine

from app.models.database import get_db
from app.models.entities import PredictionRecord
from app.services.ml_model import load_platform_model
from app.api.predictions_router import router as predictions_router
from app.api.health_router import router as health_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_platform_model()
    yield


app = FastAPI(
    title="Prediction Service",
    description="ML model integration service for clinical predictions",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(health_router)
app.include_router(predictions_router)

__all__ = [
    "Base",
    "PredictionRecord",
    "app",
    "engine",
    "get_db",
]
