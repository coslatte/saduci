from fastapi.testclient import TestClient

from shared.utils.auth import verify_token
from tests.conftest import load_module_from_path


def _create_client() -> TestClient:
    module = load_module_from_path("api_gateway_main_test", "services/api-gateway/main.py")
    return TestClient(module.app)


def test_gateway_health_endpoint() -> None:
    client = _create_client()

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["service"] == "api-gateway"


def test_login_returns_valid_jwt_token() -> None:
    client = _create_client()

    response = client.post("/auth/login", json={"username": "admin", "password": "admin123"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["token_type"] == "bearer"
    assert verify_token(payload["access_token"])["sub"] == "admin"


def test_protected_endpoint_requires_authentication() -> None:
    client = _create_client()

    response = client.get("/api/patients")

    assert response.status_code in {401, 403}
