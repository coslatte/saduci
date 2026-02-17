from fastapi.testclient import TestClient

from shared.utils.auth import verify_token
from tests.conftest import load_module_from_path


def _create_client() -> TestClient:
    module = load_module_from_path(
        "api_gateway_main_test",
        "services/api-gateway/main.py",
        env={
            "SECRET_KEY": "test-secret-key-for-api-gateway-tests",
            "AUTH_USERNAME": "test_admin",
            "AUTH_PASSWORD": "test_password_123",
            "CORS_ALLOW_ORIGINS": "http://localhost:3000",
        },
    )
    return TestClient(module.app)


def test_gateway_health_endpoint() -> None:
    client = _create_client()

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["service"] == "api-gateway"


def test_login_returns_valid_jwt_token() -> None:
    client = _create_client()

    response = client.post("/auth/login", json={"username": "test_admin", "password": "test_password_123"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["token_type"] == "bearer"
    assert verify_token(payload["access_token"])["sub"] == "test_admin"


def test_login_rejects_invalid_credentials() -> None:
    client = _create_client()

    response = client.post("/auth/login", json={"username": "wrong", "password": "wrong"})

    assert response.status_code == 401


def test_protected_endpoint_requires_authentication() -> None:
    client = _create_client()

    response = client.get("/api/patients")

    assert response.status_code in {401, 403}
