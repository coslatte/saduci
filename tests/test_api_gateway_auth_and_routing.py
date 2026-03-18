"""Extended tests for the API Gateway authentication, rate-limiting, and routing."""
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient

from shared.utils.auth import create_access_token
from tests.conftest import load_module_from_path

_GW_ENV = {
    "SECRET_KEY": "gw-test-routing-secret-key",
    "AUTH_USERNAME": "admin",
    "AUTH_PASSWORD": "s3cr3t!",
    "CORS_ALLOW_ORIGINS": "http://localhost:3000,http://localhost:8000",
}


def _create_client() -> TestClient:
    """Fresh gateway client (and in-memory state) for each test."""
    module = load_module_from_path(
        "api_gw_routing_test",
        "services/api-gateway/main.py",
        env=_GW_ENV,
    )
    return TestClient(module.app)


def _get_token(client: TestClient) -> str:
    """Log in and return a valid JWT."""
    response = client.post("/auth/login", json={"username": "admin", "password": "s3cr3t!"})
    assert response.status_code == 200
    return response.json()["access_token"]


# ─── Health ───────────────────────────────────────────────────────────────────


def test_health_check_returns_all_expected_fields() -> None:
    response = _create_client().get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert body["service"] == "api-gateway"
    assert "version" in body


# ─── Login validation ─────────────────────────────────────────────────────────


def test_login_missing_password_returns_422() -> None:
    response = _create_client().post("/auth/login", json={"username": "admin"})

    assert response.status_code == 422


def test_login_missing_username_returns_422() -> None:
    response = _create_client().post("/auth/login", json={"password": "s3cr3t!"})

    assert response.status_code == 422


def test_login_empty_body_returns_422() -> None:
    response = _create_client().post("/auth/login", json={})

    assert response.status_code == 422


def test_login_returns_bearer_token_type() -> None:
    response = _create_client().post("/auth/login", json={"username": "admin", "password": "s3cr3t!"})

    assert response.json()["token_type"] == "bearer"


def test_login_token_is_non_empty_string() -> None:
    response = _create_client().post("/auth/login", json={"username": "admin", "password": "s3cr3t!"})

    token = response.json()["access_token"]
    assert isinstance(token, str) and len(token) > 0


# ─── Rate limiting ────────────────────────────────────────────────────────────


def test_rate_limit_triggers_after_max_attempts() -> None:
    """Exceeding the configured rate limit must return HTTP 429."""
    module = load_module_from_path(
        "api_gw_ratelimit_test",
        "services/api-gateway/main.py",
        env={**_GW_ENV, "LOGIN_RATE_LIMIT_MAX": "3", "LOGIN_RATE_LIMIT_WINDOW": "60"},
    )
    client = TestClient(module.app)

    for _ in range(3):
        client.post("/auth/login", json={"username": "x", "password": "y"})

    # The 4th attempt must be blocked
    response = client.post("/auth/login", json={"username": "x", "password": "y"})

    assert response.status_code == 429


def test_successful_login_within_rate_limit_succeeds() -> None:
    """A single valid login must succeed even with rate limiting active."""
    module = load_module_from_path(
        "api_gw_ratelimit_ok_test",
        "services/api-gateway/main.py",
        env={**_GW_ENV, "LOGIN_RATE_LIMIT_MAX": "5", "LOGIN_RATE_LIMIT_WINDOW": "60"},
    )
    client = TestClient(module.app)

    response = client.post("/auth/login", json={"username": "admin", "password": "s3cr3t!"})

    assert response.status_code == 200


# ─── JWT auth checks ─────────────────────────────────────────────────────────


def test_tampered_jwt_is_rejected_with_401() -> None:
    client = _create_client()

    response = client.get("/api/patients", headers={"Authorization": "Bearer tampered.jwt.token"})

    assert response.status_code in {401, 403}


def test_expired_token_is_rejected() -> None:
    """A token with a negative expiry must be rejected."""
    expired_token = create_access_token(
        data={"sub": "admin"},
        expires_delta=timedelta(seconds=-1),
    )
    client = _create_client()

    response = client.get("/api/patients", headers={"Authorization": f"Bearer {expired_token}"})

    assert response.status_code in {401, 403}


def test_missing_authorization_header_returns_403() -> None:
    response = _create_client().get("/api/patients")

    assert response.status_code in {401, 403}


def test_valid_token_is_accepted_by_auth_layer() -> None:
    """A valid JWT must pass auth (gateway may return 502 if upstream is down, but NOT 401/403)."""
    client = _create_client()
    token = _get_token(client)

    response = client.get("/api/patients", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code not in {401, 403}


@pytest.mark.parametrize(
    "method,path,kwargs",
    [
        ("PUT", "/api/patients/P001", {"json": {"first_name": "Ana"}}),
        ("DELETE", "/api/patients/P001", {}),
        (
            "POST",
            "/api/patients/import",
            {"files": {"file": ("patients.csv", b"patient_id,first_name,last_name,date_of_birth,gender\nP1,Ana,Lopez,1980-01-01,female\n", "text/csv")}},
        ),
        ("GET", "/api/predictions/models", {}),
        ("GET", "/api/predictions/P001", {}),
        ("GET", "/api/simulations/scenarios", {}),
        ("GET", "/api/simulations/P001", {}),
    ],
)
def test_gateway_exposes_additional_service_routes(method, path, kwargs) -> None:
    client = _create_client()
    token = _get_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    response = client.request(method, path, headers=headers, **kwargs)

    assert response.status_code != 404


# ─── Protected routes ─────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "method,path,body",
    [
        ("GET", "/api/patients", None),
        ("POST", "/api/predictions", {}),
        ("POST", "/api/simulations", {}),
        ("POST", "/api/simulations/icu", {}),
    ],
)
def test_protected_routes_reject_unauthenticated_requests(method, path, body) -> None:
    client = _create_client()

    if method == "GET":
        response = client.get(path)
    else:
        response = client.post(path, json=body)

    assert response.status_code in {401, 403}


# ─── Unprotected routes ───────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "path",
    [
        "/simulation",
        "/statistics/wilcoxon",
        "/statistics/friedman",
        "/prediccion",
        "/prediccion/explain",
    ],
)
def test_unprotected_routes_return_validation_not_auth_error(path) -> None:
    """/simulation and /statistics/* are public; an empty body yields 422, not 401/403."""
    response = _create_client().post(path, json={})

    assert response.status_code == 422


# ─── Unknown routes ───────────────────────────────────────────────────────────


def test_unknown_route_returns_404() -> None:
    assert _create_client().get("/does-not-exist").status_code == 404


def test_unknown_nested_route_returns_404() -> None:
    assert _create_client().get("/api/nonexistent").status_code == 404
