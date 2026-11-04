"""Tests de la API del user service (health, registro, login) con DB en memoria."""
from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ.setdefault("AUTH_USERNAME", "admin")
os.environ.setdefault("AUTH_PASSWORD", "testpass123")

from app.models.database import Base  # noqa: E402
import app.models.database as db_module  # noqa: E402
import app.main as user_main  # noqa: E402


@pytest.fixture(scope="module")
def client():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Session = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)

    # el lifespan usa las referencias de modulo, hay que sustituir las tres
    user_main.engine = engine
    user_main.SessionLocal = Session
    db_module.engine = engine
    db_module.SessionLocal = Session

    def _override_get_db():
        session = Session()
        try:
            yield session
        finally:
            session.close()

    user_main.app.dependency_overrides[user_main.get_db] = _override_get_db
    with TestClient(user_main.app) as test_client:
        yield test_client
    user_main.app.dependency_overrides.clear()
    engine.dispose()


class TestHealth:
    def test_health_responde(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert data["service"] == "user"


class TestRegistro:
    def test_registro_exitoso(self, client):
        resp = client.post("/auth/register", json={
            "username": "registrado",
            "email": "registrado@test.com",
            "password": "Register123!",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["user"]["username"] == "registrado"
        assert data["user"]["role"] == "MEDICO"
        assert data["user"]["is_active"] is True

    def test_registro_username_duplicado(self, client):
        payload = {"username": "dup", "email": "dup1@test.com", "password": "Password123"}
        assert client.post("/auth/register", json=payload).status_code == 200
        resp = client.post("/auth/register", json={**payload, "email": "dup2@test.com"})
        assert resp.status_code == 400
        assert "ya esta en uso" in resp.json()["detail"]

    def test_registro_email_duplicado(self, client):
        assert client.post("/auth/register", json={
            "username": "email1", "email": "dup@mail.com", "password": "Password123",
        }).status_code == 200
        resp = client.post("/auth/register", json={
            "username": "email2", "email": "dup@mail.com", "password": "Password123",
        })
        assert resp.status_code == 400
        assert "ya esta registrado" in resp.json()["detail"]

    def test_registro_password_corto(self, client):
        resp = client.post("/auth/register", json={
            "username": "corto", "email": "corto@test.com", "password": "Short1",
        })
        assert resp.status_code == 400
        assert "al menos 8 caracteres" in resp.json()["detail"]


class TestLogin:
    def test_login_exitoso_devuelve_token(self, client):
        client.post("/auth/register", json={
            "username": "loginuser", "email": "loginuser@test.com", "password": "LoginPass123",
        })
        resp = client.post("/auth/login", json={
            "username": "loginuser", "password": "LoginPass123",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["access_token"]
        assert data["token_type"] == "bearer"
        assert data["user"]["username"] == "loginuser"

    def test_login_password_incorrecto(self, client):
        client.post("/auth/register", json={
            "username": "badpwd", "email": "badpwd@test.com", "password": "CorrectPass1",
        })
        resp = client.post("/auth/login", json={
            "username": "badpwd", "password": "WrongPass1",
        })
        assert resp.status_code == 401

    def test_login_usuario_inexistente(self, client):
        resp = client.post("/auth/login", json={
            "username": "noexiste", "password": "SomePass123",
        })
        assert resp.status_code == 401
