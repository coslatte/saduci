"""API Gateway service - routing and JWT authentication."""

import os
import sys
import time
from collections import defaultdict
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session


def _setup_import_paths() -> None:
    """Add service and shared directories to Python path."""
    service_dir = os.path.dirname(__file__)
    sys.path.insert(0, service_dir)
    sys.path.insert(0, os.path.join(service_dir, ".."))


_setup_import_paths()

from crud_users import (  # noqa: E402
    authenticate_user,
    count_users,
    create_user,
    get_user_by_id,
    get_user_by_identifier,
    get_user_by_username,
    get_user_by_email,
    get_all_users,
    delete_user,
    update_password,
)
from db import Base, SessionLocal, engine, get_db  # noqa: E402
from models import User  # noqa: E402

from shared.schemas import (  # noqa: E402
    HealthCheck,
    PredictionRequest,
    PlatformPredictionRequest,
    PlatformExplanationRequest,
    SimulationRequest,
    ICUPatientSimulationRequest,
    PlatformSimulationRequest,
    WilcoxonRequest,
    FriedmanRequest,
    UserResponse,
    RegisterRequest,
    RegisterResponse,
    UserCreateRequest,
)
from shared.utils import (  # noqa: E402
    get_logger,
    create_access_token,
    verify_password,
    verify_token,
    ServiceClient,
)


logger = get_logger(__name__)
security = HTTPBearer(auto_error=False)

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


AUTH_USERNAME = os.getenv("AUTH_USERNAME", "").strip()
AUTH_PASSWORD = os.getenv("AUTH_PASSWORD", "").strip()

CORS_ALLOW_ORIGINS = _parse_cors_origins(
    os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000,http://localhost:8000")
)
CORS_ALLOW_CREDENTIALS = os.getenv("CORS_ALLOW_CREDENTIALS", "true").lower() == "true"
if "*" in CORS_ALLOW_ORIGINS:
    CORS_ALLOW_CREDENTIALS = False

# Service URLs from environment
# NOTE:
# - In Docker Compose, these are injected as container DNS names (prediction/simulation)
# - For local development without Docker, localhost defaults avoid 502 from unresolved hosts
PREDICTION_SERVICE_URL = os.getenv("PREDICTION_SERVICE_URL", "http://localhost:8002")
SIMULATION_SERVICE_URL = os.getenv("SIMULATION_SERVICE_URL", "http://localhost:8003")
PATIENT_SERVICE_URL = os.getenv("PATIENT_SERVICE_URL", "http://localhost:8001")

# Service clients (initialised early, cleaned up via lifespan)
prediction_client = ServiceClient(PREDICTION_SERVICE_URL)
simulation_client = ServiceClient(SIMULATION_SERVICE_URL)
patient_client = ServiceClient(PATIENT_SERVICE_URL)


def _extract_upstream_detail(error: httpx.HTTPStatusError) -> str:
    """Extract a concise error detail from an upstream HTTP response."""
    response = error.response

    try:
        payload = response.json()
        if isinstance(payload, dict) and "detail" in payload:
            detail = payload["detail"]
            return detail if isinstance(detail, str) else str(detail)
    except ValueError:
        pass

    response_text = response.text.strip()
    if response_text:
        return response_text

    return f"Upstream service returned HTTP {response.status_code}"


def _translate_prediction_proxy_error(error: Exception) -> HTTPException:
    """Map prediction upstream errors to meaningful gateway responses."""
    if isinstance(error, httpx.TimeoutException):
        return HTTPException(status_code=504, detail="Prediction service timed out")

    if isinstance(error, httpx.HTTPStatusError):
        status_code = error.response.status_code
        detail = _extract_upstream_detail(error)
        return HTTPException(status_code=status_code, detail=detail)

    if isinstance(error, httpx.RequestError):
        return HTTPException(status_code=502, detail="Prediction service unavailable")

    return HTTPException(status_code=502, detail="Prediction service unavailable")


def _seed_admin_user(db: Session) -> User:
    """Create the first admin user from environment credentials."""
    admin_username = AUTH_USERNAME
    admin_email = (
        admin_username if "@" in admin_username else f"{admin_username}@saduci.com"
    )
    admin_user = create_user(
        db,
        username=admin_username,
        email=admin_email,
        password=AUTH_PASSWORD,
        is_superuser=True,
    )
    logger.info("Seeded initial admin user '%s'", admin_user.username)
    return admin_user


def _seed_demo_users(db: Session) -> None:
    """Create demo users for testing."""
    demo_users = [
        {
            "username": "analista1",
            "email": "analista1@saduci.com",
            "password": "password123",
            "is_superuser": False,
            "is_active": True,
        },
        {
            "username": "analista2",
            "email": "analista2@saduci.com",
            "password": "password123",
            "is_superuser": False,
            "is_active": True,
        },
        {
            "username": "doctor",
            "email": "doctor@saduci.com",
            "password": "doctor123",
            "is_superuser": False,
            "is_active": True,
        },
    ]

    for user_data in demo_users:
        existing = get_user_by_username(db, user_data["username"])
        if not existing:
            create_user(db, **user_data)
            logger.info("Seeded demo user '%s'", user_data["username"])


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if count_users(db) == 0:
            if not AUTH_USERNAME or not AUTH_PASSWORD:
                raise RuntimeError(
                    "AUTH_USERNAME and AUTH_PASSWORD must be configured to seed the initial admin user",
                )
            _seed_admin_user(db)
            _seed_demo_users(db)

    yield
    await prediction_client.close()
    await simulation_client.close()
    await patient_client.close()


app = FastAPI(
    title="API Gateway",
    description="API Gateway for saduci-core - handles routing and JWT authentication",
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


class LoginResponse(BaseModel):
    """Login response schema."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse


TokenResponse = LoginResponse


class PasswordChangeRequest(BaseModel):
    """Password change request schema."""

    model_config = ConfigDict(populate_by_name=True)

    current_password: str = Field(alias="currentPassword")
    new_password: str = Field(alias="newPassword")


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Verify JWT token and return the current user from the database."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_token(credentials.credentials)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user: User | None = None
    user_id = payload.get("uid")
    if user_id is not None:
        user = get_user_by_id(db, user_id)

    if user is None:
        identifier = payload.get("sub")
        if isinstance(identifier, str) and identifier.strip():
            user = get_user_by_identifier(db, identifier)

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


@app.get("/health", response_model=HealthCheck)
async def health_check():
    """Health check endpoint."""
    return HealthCheck(status="healthy", service="api-gateway")


@app.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest, req: Request, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token."""
    _check_rate_limit(req.client.host if req.client else "unknown")

    user = authenticate_user(db, request.username, request.password)

    if user is not None:
        access_token = create_access_token(
            data={
                "sub": user.username,
                "uid": user.id,
                "email": user.email,
                "is_superuser": user.is_superuser,
            },
        )
        return LoginResponse(
            access_token=access_token,
            user=UserResponse.model_validate(user),
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password",
    )


@app.post("/auth/register", response_model=RegisterResponse)
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if username already exists
    existing_user = get_user_by_username(db, request.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre de usuario ya está en uso",
        )

    # Check if email already exists
    existing_email = get_user_by_email(db, request.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está registrado",
        )

    # Validate password length
    if len(request.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña debe tener al menos 8 caracteres",
        )

    # Create the user (not a superuser by default)
    new_user = create_user(
        db,
        username=request.username,
        email=request.email,
        password=request.password,
        is_superuser=False,
    )

    return RegisterResponse(
        message="Usuario registrado correctamente",
        user=UserResponse.model_validate(new_user),
    )


@app.get("/auth/me", response_model=UserResponse)
async def read_current_user(current_user: User = Depends(get_current_user)):
    """Return the authenticated user profile."""
    return UserResponse.model_validate(current_user)


@app.post("/auth/change-password")
async def change_password(
    request: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change the password for the authenticated user."""
    if len(request.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe tener al menos 8 caracteres.",
        )

    if not verify_password(request.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual es incorrecta.",
        )

    update_password(db, current_user, request.new_password)
    return {"message": "Contraseña actualizada correctamente."}


# Prediction service endpoints
@app.post("/api/predictions")
async def create_prediction(
    prediction_data: PredictionRequest, _current_user: User = Depends(get_current_user)
):
    """Forward request to prediction service."""
    try:
        return await prediction_client.post(
            "/predictions", prediction_data.model_dump(mode="json")
        )
    except Exception as e:
        logger.error("Error forwarding to prediction service: %s", e)
        raise HTTPException(
            status_code=502, detail="Prediction service unavailable"
        ) from e


@app.get("/api/predictions/models")
async def list_prediction_models(_current_user: User = Depends(get_current_user)):
    """Forward model catalogue request to prediction service."""
    try:
        return await prediction_client.get("/models")
    except Exception as e:
        logger.error("Error forwarding model list to prediction service: %s", e)
        raise HTTPException(
            status_code=502, detail="Prediction service unavailable"
        ) from e


@app.get("/api/predictions/{patient_id}")
async def get_prediction_history(
    patient_id: str, _current_user: User = Depends(get_current_user)
):
    """Forward prediction history request to prediction service."""
    try:
        return await prediction_client.get(f"/predictions/{patient_id}")
    except Exception as e:
        logger.error("Error forwarding prediction history to prediction service: %s", e)
        raise HTTPException(
            status_code=502, detail="Prediction service unavailable"
        ) from e


@app.post("/prediction")
async def run_platform_prediction(prediction_data: PlatformPredictionRequest):
    """
    Forward saduci-platform prediction request to prediction service.

    This endpoint is unauthenticated to match the saduci-platform client
    which does not attach a JWT token to prediction calls.
    """
    try:
        return await prediction_client.post(
            "/prediction", prediction_data.model_dump(mode="json")
        )
    except Exception as e:
        logger.error(
            "Error forwarding platform prediction to prediction service: %s (%s)",
            e,
            type(e).__name__,
        )
        raise _translate_prediction_proxy_error(e) from e


@app.post("/prediction/explain")
async def run_platform_prediction_explain(explain_data: PlatformExplanationRequest):
    """
    Forward saduci-platform explainability request to prediction service.

    This endpoint is unauthenticated to match the saduci-platform client
    which does not attach a JWT token to prediction explainability calls.
    """
    try:
        return await prediction_client.post(
            "/prediction/explain", explain_data.model_dump(mode="json")
        )
    except Exception as e:
        logger.error(
            "Error forwarding platform explainability to prediction service: %s (%s)",
            e,
            type(e).__name__,
        )
        raise _translate_prediction_proxy_error(e) from e


# Simulation service endpoints
@app.post("/api/simulations")
async def create_simulation(
    simulation_data: SimulationRequest, _current_user: User = Depends(get_current_user)
):
    """Forward request to simulation service."""
    try:
        return await simulation_client.post(
            "/simulations", simulation_data.model_dump(mode="json")
        )
    except Exception as e:
        logger.error("Error forwarding to simulation service: %s", e)
        raise HTTPException(
            status_code=502, detail="Simulation service unavailable"
        ) from e


@app.get("/api/simulations/scenarios")
async def list_simulation_scenarios(_current_user: User = Depends(get_current_user)):
    """Forward scenario catalogue request to simulation service."""
    try:
        return await simulation_client.get("/scenarios")
    except Exception as e:
        logger.error("Error forwarding scenario list to simulation service: %s", e)
        raise HTTPException(
            status_code=502, detail="Simulation service unavailable"
        ) from e


@app.get("/api/simulations/{patient_id}")
async def get_simulation_history(
    patient_id: str, _current_user: User = Depends(get_current_user)
):
    """Forward simulation history request to simulation service."""
    try:
        return await simulation_client.get(f"/simulations/{patient_id}")
    except Exception as e:
        logger.error("Error forwarding simulation history to simulation service: %s", e)
        raise HTTPException(
            status_code=502, detail="Simulation service unavailable"
        ) from e


@app.post("/api/simulations/icu")
async def create_icu_simulation(
    simulation_data: ICUPatientSimulationRequest,
    _current_user: User = Depends(get_current_user),
):
    """Forward ICU patient simulation request to simulation service."""
    try:
        return await simulation_client.post(
            "/simulations/icu", simulation_data.model_dump(mode="json")
        )
    except Exception as e:
        logger.error("Error forwarding ICU simulation to simulation service: %s", e)
        raise HTTPException(
            status_code=502, detail="ICU simulation service unavailable"
        ) from e


@app.post("/api/patients")
async def create_patient(
    patient_data: dict, _current_user: User = Depends(get_current_user)
):
    """Forward patient creation request to patient service."""
    try:
        return await patient_client.post("/patients", patient_data)
    except Exception as e:
        logger.error("Error forwarding patient creation to patient service: %s", e)
        raise HTTPException(
            status_code=502, detail="Patient service unavailable"
        ) from e


@app.get("/api/patients/{mrn}")
async def get_patient(mrn: str, _current_user: User = Depends(get_current_user)):
    """Forward patient lookup request to patient service."""
    try:
        return await patient_client.get(f"/patients/{mrn}")
    except Exception as e:
        logger.error("Error forwarding patient lookup to patient service: %s", e)
        raise HTTPException(
            status_code=502, detail="Patient service unavailable"
        ) from e


@app.put("/api/patients/{mrn}")
async def update_patient(
    mrn: str, patient_data: dict, _current_user: User = Depends(get_current_user)
):
    """Forward patient update request to patient service."""
    try:
        return await patient_client.put(f"/patients/{mrn}", patient_data)
    except Exception as e:
        logger.error("Error forwarding patient update to patient service: %s", e)
        raise HTTPException(
            status_code=502, detail="Patient service unavailable"
        ) from e


@app.post("/simulation")
async def run_platform_simulation(simulation_data: PlatformSimulationRequest):
    """
    Forward saduci-platform simulation request to simulation service.

    This endpoint is unauthenticated to match the saduci-platform client
    which does not attach a JWT token to simulation calls.
    """
    try:
        return await simulation_client.post(
            "/simulation", simulation_data.model_dump(mode="json")
        )
    except Exception as e:
        logger.error(
            "Error forwarding platform simulation to simulation service: %s", e
        )
        raise HTTPException(
            status_code=502, detail="Simulation service unavailable"
        ) from e


@app.post("/statistics/wilcoxon")
async def run_wilcoxon_test(test_data: WilcoxonRequest):
    """Forward Wilcoxon signed-rank test request to simulation service."""
    try:
        return await simulation_client.post(
            "/statistics/wilcoxon", test_data.model_dump(mode="json")
        )
    except Exception as e:
        logger.error("Error forwarding Wilcoxon test to simulation service: %s", e)
        raise HTTPException(
            status_code=502, detail="Statistics service unavailable"
        ) from e


@app.post("/statistics/friedman")
async def run_friedman_test(test_data: FriedmanRequest):
    """Forward Friedman chi-square test request to simulation service."""
    try:
        return await simulation_client.post(
            "/statistics/friedman", test_data.model_dump(mode="json")
        )
    except Exception as e:
        logger.error("Error forwarding Friedman test to simulation service: %s", e)
        raise HTTPException(
            status_code=502, detail="Statistics service unavailable"
        ) from e


# User management endpoints (admin only)
def require_superuser(current_user: User = Depends(get_current_user)) -> User:
    """Require the current user to be a superuser."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere permisos de administrador",
        )
    return current_user


@app.get("/admin/users", response_model=list[UserResponse])
async def list_users(
    _current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    """List all users (admin only)."""
    users = get_all_users(db)
    return [UserResponse.model_validate(user) for user in users]


@app.post("/admin/users", response_model=UserResponse)
async def create_user_admin(
    request: UserCreateRequest,
    _current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    """Create a new user with specified role (admin only)."""
    existing_user = get_user_by_username(db, request.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre de usuario ya está en uso",
        )

    existing_email = get_user_by_email(db, request.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está registrado",
        )

    if len(request.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña debe tener al menos 8 caracteres",
        )

    new_user = create_user(
        db,
        username=request.username,
        email=request.email,
        password=request.password,
        is_active=request.is_active,
        is_superuser=request.is_superuser,
    )
    return UserResponse.model_validate(new_user)


@app.delete("/admin/users/{user_id}")
async def delete_user_admin(
    user_id: int,
    _current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db),
):
    """Delete a user (admin only)."""
    if _current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes eliminar tu propia cuenta",
        )

    success = delete_user(db, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )
    return {"message": "Usuario eliminado correctamente"}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
