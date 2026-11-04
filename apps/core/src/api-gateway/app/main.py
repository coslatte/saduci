"""API Gateway service - routing and JWT authentication (MVC entry point)."""
from __future__ import annotations

import os
from contextlib import asynccontextmanager


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.controllers.config import (
    CORS_ALLOW_CREDENTIALS,
    CORS_ALLOW_ORIGINS,
    patient_client,
    prediction_client,
    simulation_client,
    user_client,
)
from app.api import (
    auth_router,
    health_router,
    patients_router,
    predictions_router,
    simulations_router,
    statistics_router,
    users_router,
    websocket_router,
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield
    await prediction_client.close()
    await simulation_client.close()
    await patient_client.close()
    await user_client.close()


app = FastAPI(
    title="API Gateway",
    description="API Gateway for saduci-core - handles routing and JWT authentication",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_credentials=CORS_ALLOW_CREDENTIALS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(predictions_router)
app.include_router(simulations_router)
app.include_router(patients_router)
app.include_router(statistics_router)
app.include_router(websocket_router)

__all__ = [
    "app",
    "patient_client",
    "prediction_client",
    "simulation_client",
    "user_client",
]

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "7000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
