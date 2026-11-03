"""Tests for user CRUD endpoints."""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
SERVICE_DIR = ROOT / "src" / "api-gateway"
MODULE_PATH = SERVICE_DIR / "main.py"


def load_gateway_module(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    *,
    username: str = "admin",
    password: str = "Admin123!",
):
    database_url = f"sqlite:///{(tmp_path / 'crud_test.db').as_posix()}"
    monkeypatch.setenv("SECRET_KEY", "test-secret-key")
    monkeypatch.setenv("DATABASE_URL", database_url)
    monkeypatch.setenv("AUTH_USERNAME", username)
    monkeypatch.setenv("AUTH_PASSWORD", password)
    monkeypatch.setenv("CORS_ALLOW_ORIGINS", "http://localhost:3000")
    monkeypatch.setenv("CORS_ALLOW_CREDENTIALS", "true")

    for module_name in (
        "gateway_main_for_crud_test",
        "crud_users",
        "db",
        "models",
        "shared.utils.auth",
        "shared.utils",
        "shared.schemas.user",
        "shared.schemas",
    ):
        sys.modules.pop(module_name, None)

    spec = importlib.util.spec_from_file_location("gateway_main_for_crud_test", MODULE_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("Unable to load API Gateway module for tests")

    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


@pytest.fixture()
def gateway(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    return load_gateway_module(monkeypatch, tmp_path)


def test_create_user_as_admin(gateway):
    """Test creating a new user as admin."""
    with TestClient(gateway.app) as client:
        # Login as admin
        login_response = client.post(
            "/auth/login",
            json={"username": "admin", "password": "Admin123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Create a new user
        create_response = client.post(
            "/api/users",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "username": "medico1",
                "email": "medico1@saduci.com",
                "password": "Medico123!",
                "role": "MEDICO",
                "is_active": True,
            },
        )

        assert create_response.status_code == 200
        user = create_response.json()
        assert user["username"] == "medico1"
        assert user["email"] == "medico1@saduci.com"
        assert user["role"] == "MEDICO"
        assert user["is_active"] is True


def test_create_user_as_non_admin_fails(gateway):
    """Test that non-admin users cannot create users."""
    with TestClient(gateway.app) as client:
        # Login as admin to create a non-admin user first
        login_response = client.post(
            "/auth/login",
            json={"username": "admin", "password": "Admin123!"},
        )
        admin_token = login_response.json()["access_token"]

        create_response = client.post(
            "/api/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "username": "medico2",
                "email": "medico2@saduci.com",
                "password": "Medico123!",
                "role": "MEDICO",
            },
        )
        assert create_response.status_code == 200
        medico_token_response = client.post(
            "/auth/login",
            json={"username": "medico2", "password": "Medico123!"},
        )
        medico_token = medico_token_response.json()["access_token"]

        # Try to create another user as medico (should fail)
        fail_response = client.post(
            "/api/users",
            headers={"Authorization": f"Bearer {medico_token}"},
            json={
                "username": "medico3",
                "email": "medico3@saduci.com",
                "password": "Medico123!",
                "role": "MEDICO",
            },
        )
        assert fail_response.status_code == 403


def test_list_users_as_admin(gateway):
    """Test listing all users as admin."""
    with TestClient(gateway.app) as client:
        # Login as admin
        login_response = client.post(
            "/auth/login",
            json={"username": "admin", "password": "Admin123!"},
        )
        token = login_response.json()["access_token"]

        # Create a few users
        for i in range(2):
            client.post(
                "/api/users",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "username": f"user{i}",
                    "email": f"user{i}@saduci.com",
                    "password": "User123!",
                    "role": "MEDICO",
                },
            )

        # List all users
        list_response = client.get(
            "/api/users",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert list_response.status_code == 200
        users = list_response.json()
        assert len(users) >= 3  # admin + 2 created users
        usernames = [u["username"] for u in users]
        assert "admin" in usernames


def test_list_users_by_role(gateway):
    """Test filtering users by role."""
    with TestClient(gateway.app) as client:
        # Login as admin
        login_response = client.post(
            "/auth/login",
            json={"username": "admin", "password": "Admin123!"},
        )
        token = login_response.json()["access_token"]

        # Create users with different roles
        client.post(
            "/api/users",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "username": "doctor1",
                "email": "doctor1@saduci.com",
                "password": "Doctor123!",
                "role": "MEDICO",
            },
        )

        client.post(
            "/api/users",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "username": "admin2",
                "email": "admin2@saduci.com",
                "password": "Admin456!",
                "role": "ADMIN",
            },
        )

        # List users with MEDICO role
        medico_response = client.get(
            "/api/users?role=MEDICO",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert medico_response.status_code == 200
        medicos = medico_response.json()
        for user in medicos:
            assert user["role"] == "MEDICO"


def test_get_user_by_id(gateway):
    """Test getting a user by ID."""
    with TestClient(gateway.app) as client:
        # Login as admin
        login_response = client.post(
            "/auth/login",
            json={"username": "admin", "password": "Admin123!"},
        )
        token = login_response.json()["access_token"]

        # Create a user
        create_response = client.post(
            "/api/users",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "username": "gettest",
                "email": "gettest@saduci.com",
                "password": "Test123!",
                "role": "MEDICO",
            },
        )
        user_id = create_response.json()["id"]

        # Get the user by ID
        get_response = client.get(
            f"/api/users/{user_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert get_response.status_code == 200
        user = get_response.json()
        assert user["id"] == user_id
        assert user["username"] == "gettest"


def test_update_user(gateway):
    """Test updating a user."""
    with TestClient(gateway.app) as client:
        # Login as admin
        login_response = client.post(
            "/auth/login",
            json={"username": "admin", "password": "Admin123!"},
        )
        token = login_response.json()["access_token"]

        # Create a user
        create_response = client.post(
            "/api/users",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "username": "updatetest",
                "email": "updatetest@saduci.com",
                "password": "Test123!",
                "role": "MEDICO",
            },
        )
        user_id = create_response.json()["id"]

        # Update the user's role and email
        update_response = client.put(
            f"/api/users/{user_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "email": "updated@saduci.com",
                "role": "ADMIN",
            },
        )

        assert update_response.status_code == 200
        updated_user = update_response.json()
        assert updated_user["role"] == "ADMIN"
        assert updated_user["email"] == "updated@saduci.com"


def test_delete_user(gateway):
    """Test deleting a user."""
    with TestClient(gateway.app) as client:
        # Login as admin
        login_response = client.post(
            "/auth/login",
            json={"username": "admin", "password": "Admin123!"},
        )
        token = login_response.json()["access_token"]

        # Create a user
        create_response = client.post(
            "/api/users",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "username": "deletetest",
                "email": "deletetest@saduci.com",
                "password": "Test123!",
                "role": "MEDICO",
            },
        )
        user_id = create_response.json()["id"]

        # Delete the user
        delete_response = client.delete(
            f"/api/users/{user_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert delete_response.status_code == 200
        assert delete_response.json()["message"] == "Usuario eliminado correctamente."

        # Verify user is deleted
        get_response = client.get(
            f"/api/users/{user_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert get_response.status_code == 404


def test_create_user_with_weak_password_fails(gateway):
    """Test that creating a user with weak password fails."""
    with TestClient(gateway.app) as client:
        # Login as admin
        login_response = client.post(
            "/auth/login",
            json={"username": "admin", "password": "Admin123!"},
        )
        token = login_response.json()["access_token"]

        # Try to create a user with weak password
        create_response = client.post(
            "/api/users",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "username": "weakpass",
                "email": "weakpass@saduci.com",
                "password": "weak",
                "role": "MEDICO",
            },
        )

        assert create_response.status_code == 400
        assert "8 caracteres" in create_response.json()["detail"]


def test_create_duplicate_user_fails(gateway):
    """Test that creating a duplicate user fails."""
    with TestClient(gateway.app) as client:
        # Login as admin
        login_response = client.post(
            "/auth/login",
            json={"username": "admin", "password": "Admin123!"},
        )
        token = login_response.json()["access_token"]

        # Create a user
        client.post(
            "/api/users",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "username": "duplicate",
                "email": "duplicate@saduci.com",
                "password": "Duplicate123!",
                "role": "MEDICO",
            },
        )

        # Try to create the same user again
        create_response = client.post(
            "/api/users",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "username": "duplicate",
                "email": "duplicate2@saduci.com",
                "password": "Duplicate123!",
                "role": "MEDICO",
            },
        )

        assert create_response.status_code == 400
        assert "ya existe" in create_response.json()["detail"]
