"""API Gateway service - routing and JWT authentication."""
import os
from datetime import timedelta
from typing import Optional
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys

# Add shared modules to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from shared.schemas import HealthCheck
from shared.utils import get_logger, create_access_token, verify_token, ServiceClient


logger = get_logger(__name__)
security = HTTPBearer()

app = FastAPI(
    title="API Gateway",
    description="API Gateway for sadeci-core - handles routing and JWT authentication",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service URLs from environment
PATIENT_SERVICE_URL = os.getenv("PATIENT_SERVICE_URL", "http://patient:8001")
PREDICTION_SERVICE_URL = os.getenv("PREDICTION_SERVICE_URL", "http://prediction:8002")
SIMULATION_SERVICE_URL = os.getenv("SIMULATION_SERVICE_URL", "http://simulation:8003")

# Service clients
patient_client = ServiceClient(PATIENT_SERVICE_URL)
prediction_client = ServiceClient(PREDICTION_SERVICE_URL)
simulation_client = ServiceClient(SIMULATION_SERVICE_URL)


class LoginRequest(BaseModel):
    """Login request schema."""
    username: str
    password: str


class TokenResponse(BaseModel):
    """Token response schema."""
    access_token: str
    token_type: str = "bearer"


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify JWT token and return user info."""
    token = credentials.credentials
    payload = verify_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return payload


@app.get("/health", response_model=HealthCheck)
async def health_check():
    """Health check endpoint."""
    return HealthCheck(status="healthy", service="api-gateway")


@app.post("/auth/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """
    Authenticate user and return JWT token.
    
    In production, this should verify against a user database.
    """
    # Simplified authentication for demo purposes
    # In production, verify against database
    if request.username and request.password:
        access_token = create_access_token(
            data={"sub": request.username},
            expires_delta=timedelta(minutes=30)
        )
        return TokenResponse(access_token=access_token)
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password"
    )


# Patient service endpoints
@app.get("/api/patients")
async def list_patients(user: dict = Depends(get_current_user)):
    """Forward request to patient service."""
    try:
        return await patient_client.get("/patients")
    except Exception as e:
        logger.error(f"Error forwarding to patient service: {e}")
        raise HTTPException(status_code=500, detail="Patient service unavailable")


@app.post("/api/patients")
async def create_patient(patient_data: dict, user: dict = Depends(get_current_user)):
    """Forward request to patient service."""
    try:
        return await patient_client.post("/patients", patient_data)
    except Exception as e:
        logger.error(f"Error forwarding to patient service: {e}")
        raise HTTPException(status_code=500, detail="Patient service unavailable")


@app.get("/api/patients/{patient_id}")
async def get_patient(patient_id: str, user: dict = Depends(get_current_user)):
    """Forward request to patient service."""
    try:
        return await patient_client.get(f"/patients/{patient_id}")
    except Exception as e:
        logger.error(f"Error forwarding to patient service: {e}")
        raise HTTPException(status_code=500, detail="Patient service unavailable")


# Prediction service endpoints
@app.post("/api/predictions")
async def create_prediction(prediction_data: dict, user: dict = Depends(get_current_user)):
    """Forward request to prediction service."""
    try:
        return await prediction_client.post("/predictions", prediction_data)
    except Exception as e:
        logger.error(f"Error forwarding to prediction service: {e}")
        raise HTTPException(status_code=500, detail="Prediction service unavailable")


# Simulation service endpoints
@app.post("/api/simulations")
async def create_simulation(simulation_data: dict, user: dict = Depends(get_current_user)):
    """Forward request to simulation service."""
    try:
        return await simulation_client.post("/simulations", simulation_data)
    except Exception as e:
        logger.error(f"Error forwarding to simulation service: {e}")
        raise HTTPException(status_code=500, detail="Simulation service unavailable")


@app.post("/api/simulations/icu")
async def create_icu_simulation(simulation_data: dict, user: dict = Depends(get_current_user)):
    """Forward ICU patient simulation request to simulation service."""
    try:
        return await simulation_client.post("/simulations/icu", simulation_data)
    except Exception as e:
        logger.error(f"Error forwarding ICU simulation to simulation service: {e}")
        raise HTTPException(status_code=500, detail="ICU simulation service unavailable")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
