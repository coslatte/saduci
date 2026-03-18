"""API Gateway service - routing and JWT authentication."""
import os
import sys
import time
from collections import defaultdict
from contextlib import asynccontextmanager
from datetime import timedelta

from fastapi import FastAPI, HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add shared modules to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from shared.schemas import (
    HealthCheck,
    PatientCreate,
    PredictionRequest,
    PlatformPredictionRequest,
    PlatformExplanationRequest,
    SimulationRequest,
    ICUPatientSimulationRequest,
    PlatformSimulationRequest,
    WilcoxonRequest,
    FriedmanRequest,
)
from shared.utils import get_logger, create_access_token, verify_token, ServiceClient


logger = get_logger(__name__)
security = HTTPBearer()

# ---------------------------------------------------------------------------
# Rate limiter (in-memory, per-process)
# ---------------------------------------------------------------------------
LOGIN_RATE_LIMIT_MAX = int(os.getenv("LOGIN_RATE_LIMIT_MAX", "5"))
LOGIN_RATE_LIMIT_WINDOW = int(os.getenv("LOGIN_RATE_LIMIT_WINDOW", "60"))

_login_attempts: dict[str, list[float]] = defaultdict(list)


def _check_rate_limit(client_ip: str) -> None:
    now = time.monotonic()
    window_start = now - LOGIN_RATE_LIMIT_WINDOW
    attempts = _login_attempts[client_ip]
    # Prune old entries
    _login_attempts[client_ip] = [t for t in attempts if t > window_start]
    if len(_login_attempts[client_ip]) >= LOGIN_RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later.",
        )
    _login_attempts[client_ip].append(now)


def _parse_cors_origins(raw_origins: str) -> list[str]:
    origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    return origins or ["http://localhost:3000", "http://localhost:8000"]


AUTH_USERNAME = os.getenv("AUTH_USERNAME")
AUTH_PASSWORD = os.getenv("AUTH_PASSWORD")
if not AUTH_USERNAME or not AUTH_PASSWORD:
    raise RuntimeError("AUTH_USERNAME and AUTH_PASSWORD must be configured")

CORS_ALLOW_ORIGINS = _parse_cors_origins(
    os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000,http://localhost:8000")
)
CORS_ALLOW_CREDENTIALS = os.getenv("CORS_ALLOW_CREDENTIALS", "true").lower() == "true"
if "*" in CORS_ALLOW_ORIGINS:
    CORS_ALLOW_CREDENTIALS = False

# Service URLs from environment
# NOTE:
# - In Docker Compose, these are injected as container DNS names (patient/prediction/simulation)
# - For local development without Docker, localhost defaults avoid 502 from unresolved hosts
PATIENT_SERVICE_URL = os.getenv("PATIENT_SERVICE_URL", "http://localhost:8001")
PREDICTION_SERVICE_URL = os.getenv("PREDICTION_SERVICE_URL", "http://localhost:8002")
SIMULATION_SERVICE_URL = os.getenv("SIMULATION_SERVICE_URL", "http://localhost:8003")

# Service clients (initialised early, cleaned up via lifespan)
patient_client = ServiceClient(PATIENT_SERVICE_URL)
prediction_client = ServiceClient(PREDICTION_SERVICE_URL)
simulation_client = ServiceClient(SIMULATION_SERVICE_URL)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield
    await patient_client.close()
    await prediction_client.close()
    await simulation_client.close()


app = FastAPI(
    title="API Gateway",
    description="API Gateway for sadeci-core - handles routing and JWT authentication",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_credentials=CORS_ALLOW_CREDENTIALS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


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
async def login(request: LoginRequest, req: Request):
    """Authenticate user and return JWT token."""
    _check_rate_limit(req.client.host if req.client else "unknown")

    if request.username == AUTH_USERNAME and request.password == AUTH_PASSWORD:
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
async def list_patients(_current_user: dict = Depends(get_current_user)):
    """Forward request to patient service."""
    try:
        return await patient_client.get("/patients")
    except Exception as e:
        logger.error("Error forwarding to patient service: %s", e)
        raise HTTPException(status_code=502, detail="Patient service unavailable") from e


@app.post("/api/patients")
async def create_patient(patient_data: PatientCreate, _current_user: dict = Depends(get_current_user)):
    """Forward request to patient service."""
    try:
        return await patient_client.post("/patients", patient_data.model_dump(mode="json"))
    except Exception as e:
        logger.error("Error forwarding to patient service: %s", e)
        raise HTTPException(status_code=502, detail="Patient service unavailable") from e


@app.get("/api/patients/{patient_id}")
async def get_patient(patient_id: str, _current_user: dict = Depends(get_current_user)):
    """Forward request to patient service."""
    try:
        return await patient_client.get(f"/patients/{patient_id}")
    except Exception as e:
        logger.error("Error forwarding to patient service: %s", e)
        raise HTTPException(status_code=502, detail="Patient service unavailable") from e


# Prediction service endpoints
@app.post("/api/predictions")
async def create_prediction(prediction_data: PredictionRequest, _current_user: dict = Depends(get_current_user)):
    """Forward request to prediction service."""
    try:
        return await prediction_client.post("/predictions", prediction_data.model_dump(mode="json"))
    except Exception as e:
        logger.error("Error forwarding to prediction service: %s", e)
        raise HTTPException(status_code=502, detail="Prediction service unavailable") from e


@app.post("/prediccion")
async def run_platform_prediction(prediction_data: PlatformPredictionRequest):
    """
    Forward saduci-platform prediction request to prediction service.

    This endpoint is unauthenticated to match the saduci-platform client
    which does not attach a JWT token to prediction calls.
    """
    try:
        return await prediction_client.post("/prediccion", prediction_data.model_dump(mode="json"))
    except Exception as e:
        logger.error("Error forwarding platform prediction to prediction service: %s", e)
        raise HTTPException(status_code=502, detail="Prediction service unavailable") from e


@app.post("/prediccion/explain")
async def run_platform_prediction_explain(explain_data: PlatformExplanationRequest):
    """
    Forward saduci-platform explainability request to prediction service.

    This endpoint is unauthenticated to match the saduci-platform client
    which does not attach a JWT token to prediction explainability calls.
    """
    try:
        return await prediction_client.post("/prediccion/explain", explain_data.model_dump(mode="json"))
    except Exception as e:
        logger.error("Error forwarding platform explainability to prediction service: %s", e)
        raise HTTPException(status_code=502, detail="Prediction service unavailable") from e


# Simulation service endpoints
@app.post("/api/simulations")
async def create_simulation(simulation_data: SimulationRequest, _current_user: dict = Depends(get_current_user)):
    """Forward request to simulation service."""
    try:
        return await simulation_client.post("/simulations", simulation_data.model_dump(mode="json"))
    except Exception as e:
        logger.error("Error forwarding to simulation service: %s", e)
        raise HTTPException(status_code=502, detail="Simulation service unavailable") from e


@app.post("/api/simulations/icu")
async def create_icu_simulation(simulation_data: ICUPatientSimulationRequest, _current_user: dict = Depends(get_current_user)):
    """Forward ICU patient simulation request to simulation service."""
    try:
        return await simulation_client.post("/simulations/icu", simulation_data.model_dump(mode="json"))
    except Exception as e:
        logger.error("Error forwarding ICU simulation to simulation service: %s", e)
        raise HTTPException(status_code=502, detail="ICU simulation service unavailable") from e


@app.post("/simulation")
async def run_platform_simulation(simulation_data: PlatformSimulationRequest):
    """
    Forward saduci-platform simulation request to simulation service.

    This endpoint is unauthenticated to match the saduci-platform client
    which does not attach a JWT token to simulation calls.
    """
    try:
        return await simulation_client.post("/simulation", simulation_data.model_dump(mode="json"))
    except Exception as e:
        logger.error("Error forwarding platform simulation to simulation service: %s", e)
        raise HTTPException(status_code=502, detail="Simulation service unavailable") from e


@app.post("/statistics/wilcoxon")
async def run_wilcoxon_test(test_data: WilcoxonRequest):
    """Forward Wilcoxon signed-rank test request to simulation service."""
    try:
        return await simulation_client.post("/statistics/wilcoxon", test_data.model_dump(mode="json"))
    except Exception as e:
        logger.error("Error forwarding Wilcoxon test to simulation service: %s", e)
        raise HTTPException(status_code=502, detail="Statistics service unavailable") from e


@app.post("/statistics/friedman")
async def run_friedman_test(test_data: FriedmanRequest):
    """Forward Friedman chi-square test request to simulation service."""
    try:
        return await simulation_client.post("/statistics/friedman", test_data.model_dump(mode="json"))
    except Exception as e:
        logger.error("Error forwarding Friedman test to simulation service: %s", e)
        raise HTTPException(status_code=502, detail="Statistics service unavailable") from e


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
