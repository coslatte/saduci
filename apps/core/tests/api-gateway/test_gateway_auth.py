"""Tests del API Gateway con el user-service simulado.

Cubren el proxy de autenticacion. En particular `test_login_usa_el_user_anidado`
es una regresion: el gateway recibe la envelope completa del user-service
({access_token, token_type, user}) y debe construir el UserResponse desde el
objeto `user` anidado, no desde la envelope.
"""
from __future__ import annotations

import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from httpx import HTTPStatusError

os.environ.setdefault("SECRET_KEY", "test-secret-key-deterministic")

from app.main import app  # noqa: E402

USER_OBJ = {
    "id": 1,
    "username": "admin",
    "email": "admin@saduci.com",
    "role": "ADMIN",
    "is_active": True,
    "avatar": None,
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z",
}

# lo que realmente devuelve POST /auth/login del user-service
LOGIN_ENVELOPE = {
    "access_token": "upstream-token",
    "token_type": "bearer",
    "user": USER_OBJ,
}


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


def _mock_client(**kwargs) -> AsyncMock:
    mock = AsyncMock()
    mock.post = AsyncMock(**kwargs)
    mock.get = AsyncMock(**kwargs)
    mock.put = AsyncMock()
    mock.delete = AsyncMock()
    mock.close = AsyncMock()
    return mock


class TestHealth:
    def test_gateway_health(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["service"] == "api-gateway"


class TestLoginProxy:
    @patch("app.api.auth_router.user_client")
    def test_login_exitoso(self, mock_user_client, client):
        mock_user_client.post = _mock_client(return_value=LOGIN_ENVELOPE).post
        resp = client.post("/auth/login", json={"username": "admin", "password": "x"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["token_type"] == "bearer"
        assert data["access_token"]
        # el token lo emite el gateway, no el user-service
        assert data["access_token"] != "upstream-token"

    @patch("app.api.auth_router.user_client")
    def test_login_usa_el_user_anidado(self, mock_user_client, client):
        """Regresion: antes se hacia UserResponse(**envelope) y petaba con
        'Field required' porque email/username/id no existen en el nivel raiz."""
        mock_user_client.post = _mock_client(return_value=LOGIN_ENVELOPE).post
        resp = client.post("/auth/login", json={"username": "admin", "password": "x"})
        assert resp.status_code == 200
        user = resp.json()["user"]
        assert user["username"] == "admin"
        assert user["email"] == "admin@saduci.com"
        assert user["role"] == "ADMIN"

    @patch("app.api.auth_router.user_client")
    def test_admin_queda_marcado_como_superuser(self, mock_user_client, client):
        mock_user_client.post = _mock_client(return_value=LOGIN_ENVELOPE).post
        resp = client.post("/auth/login", json={"username": "admin", "password": "x"})
        assert resp.json()["user"]["is_superuser"] is True

    @patch("app.api.auth_router.user_client")
    def test_credenciales_invalidas_da_401(self, mock_user_client, client):
        mock = _mock_client()
        mock.post.side_effect = HTTPStatusError(
            "Unauthorized", request=MagicMock(), response=MagicMock(status_code=401)
        )
        mock_user_client.post = mock.post
        resp = client.post("/auth/login", json={"username": "malo", "password": "malo"})
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Incorrect username or password"

    @patch("app.api.auth_router.user_client")
    def test_user_service_caido_da_502(self, mock_user_client, client):
        mock = _mock_client()
        mock.post.side_effect = Exception("Connection refused")
        mock_user_client.post = mock.post
        resp = client.post("/auth/login", json={"username": "admin", "password": "x"})
        assert resp.status_code == 502


class TestRegistroProxy:
    @patch("app.api.auth_router.user_client")
    def test_registro_exitoso(self, mock_user_client, client):
        envelope = {"message": "Usuario registrado correctamente", "user": USER_OBJ}
        mock_user_client.post = _mock_client(return_value=envelope).post
        resp = client.post("/auth/register", json={
            "username": "nuevo", "email": "nuevo@test.com", "password": "Secure123!",
        })
        assert resp.status_code == 200
        assert resp.json()["message"] == "Usuario registrado correctamente"


class TestProteccionDeRutas:
    def test_sin_token_responde_401(self, client):
        assert client.get("/auth/me").status_code == 401

    def test_token_invalido_responde_401(self, client):
        resp = client.get("/auth/me", headers={"Authorization": "Bearer no-es-un-token"})
        assert resp.status_code == 401

    @patch("app.api.auth_router.user_client")
    def test_auth_me_devuelve_el_usuario(self, mock_user_client, client):
        from shared_core.security import create_access_token

        token = create_access_token({
            "sub": "admin", "uid": 1, "email": "admin@saduci.com",
            "role": "ADMIN", "is_superuser": True,
        })
        mock_user_client.get = _mock_client(return_value=USER_OBJ).get
        resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.json()["username"] == "admin"
