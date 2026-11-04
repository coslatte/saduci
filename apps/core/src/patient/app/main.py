"""Patient service entry point."""
from __future__ import annotations

from fastapi import FastAPI
from app.models.database import engine

from app.api.patients_router import router as patients_router
from app.api.health_router import router as health_router

app = FastAPI(
    title="Patient Service",
    description="Patient registry service",
    version="1.0.0",
)

app.include_router(health_router)
app.include_router(patients_router)

__all__ = ["app", "engine"]

if __name__ == "__main__":
    import uvicorn
    import os

    port = int(os.getenv("PORT", "7002"))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)
