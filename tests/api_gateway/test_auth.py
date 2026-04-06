from __future__ import annotations

import importlib.util
import sys
from datetime import timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
SERVICE_DIR = ROOT / "services" / "api-gateway"
MODULE_PATH = SERVICE_DIR / "main.py"


def load_gateway_module(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    *,
    username: str = "admin",
    password: str = "Admin123!",
):
    database_url = f"sqlite:///{(tmp_path / 'auth.db').as_posix()}"
    monkeypatch.setenv("SECRET_KEY", "test-secret-key")
    monkeypatch.setenv("DATABASE_URL", database_url)
    monkeypatch.setenv("AUTH_USERNAME", username)
    monkeypatch.setenv("AUTH_PASSWORD", password)
    monkeypatch.setenv("CORS_ALLOW_ORIGINS", "http://localhost:3000")
    monkeypatch.setenv("CORS_ALLOW_CREDENTIALS", "true")

    for module_name in (
        "gateway_main_for_test",
        "crud_users",
        "db",
        "models",
        "shared.utils.auth",
        "shared.utils",
        "shared.schemas.user",
        "shared.schemas",
    ):
        sys.modules.pop(module_name, None)

    spec = importlib.util.spec_from_file_location("gateway_main_for_test", MODULE_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("Unable to load API Gateway module for tests")

    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


@pytest.fixture()
def gateway(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    return load_gateway_module(monkeypatch, tmp_path)


def test_admin_is_seeded_and_can_log_in(gateway):
    with TestClient(gateway.app) as client:
        response = client.post(
            "/auth/login",
            json={"username": "admin", "password": "Admin123!"},
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["token_type"] == "bearer"
        assert payload["user"]["username"] == "admin"
        assert payload["user"]["is_superuser"] is True

        token = payload["access_token"]

        me_response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert me_response.status_code == 200
        me_payload = me_response.json()
        assert me_payload["username"] == "admin"
        assert me_payload["email"] == "admin@saduci.com"


def test_change_password_requires_valid_token_and_current_password(gateway):
    with TestClient(gateway.app) as client:
        login_response = client.post(
            "/auth/login",
            json={"username": "admin", "password": "Admin123!"},
        )
        token = login_response.json()["access_token"]

        change_response = client.post(
            "/auth/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "currentPassword": "Admin123!",
                "newPassword": "NewAdmin123!",
            },
        )
        assert change_response.status_code == 200
        assert change_response.json()["message"] == "Contraseña actualizada correctamente."

        old_login = client.post(
            "/auth/login",
            json={"username": "admin", "password": "Admin123!"},
        )
        assert old_login.status_code == 401

        new_login = client.post(
            "/auth/login",
            json={"username": "admin", "password": "NewAdmin123!"},
        )
        assert new_login.status_code == 200


def test_invalid_token_is_rejected(gateway):
    with TestClient(gateway.app) as client:
        response = client.get(
            "/auth/me",
            headers={"Authorization": "Bearer not-a-valid-token"},
        )

        assert response.status_code == 401


def test_jwt_round_trip_uses_gateway_secret(gateway):
    token = gateway.create_access_token(
        {"sub": "admin", "uid": 1},
        expires_delta=timedelta(minutes=5),
    )

    payload = gateway.verify_token(token)
    assert payload is not None
    assert payload["sub"] == "admin"
    assert payload["uid"] == 1
