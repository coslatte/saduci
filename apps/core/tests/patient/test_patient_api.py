"""Tests del patient service. Es asincrono (create_async_engine), asi que todo
el test corre en un unico event loop (pytest-asyncio) y el engine se dispone
en el teardown.

Importante: si se crea el engine con un event loop que luego no se cierra, el
hilo de aiosqlite queda vivo y el proceso de pytest NO termina, colgando la
suite entera. Por eso el fixture es async y hace `await engine.dispose()`.
"""
from __future__ import annotations

import os

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite://")

import app.main as patient_main  # noqa: E402
import app.models.database as db_module  # noqa: E402
import app.models.patient  # noqa: E402,F401  (registra el modelo en Base)
from shared_core.database import Base  # noqa: E402


@pytest.fixture()
async def client():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    session_factory = async_sessionmaker(bind=engine, expire_on_commit=False)

    patient_main.engine = engine
    db_module.engine = engine
    db_module.AsyncSessionLocal = session_factory

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async def _override_get_db():
        async with session_factory() as session:
            yield session

    patient_main.app.dependency_overrides[db_module.get_db] = _override_get_db
    transport = ASGITransport(app=patient_main.app)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac
    finally:
        patient_main.app.dependency_overrides.clear()
        await engine.dispose()


class TestHealth:
    async def test_health_responde(self, client):
        """El healthcheck de docker-compose depende de este endpoint."""
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["service"] == "patient"


class TestAutenticacionRequerida:
    async def test_leer_paciente_sin_token_da_401(self, client):
        resp = await client.get("/api/patients/MRN-001")
        assert resp.status_code == 401


class TestValidacionDeSchemas:
    def test_patient_create_exige_campos(self):
        from pydantic import ValidationError

        from shared_core.schemas import PatientCreate

        with pytest.raises(ValidationError):
            PatientCreate()

    def test_patient_create_rechaza_mrn_corto(self):
        from pydantic import ValidationError

        from shared_core.schemas import PatientCreate

        with pytest.raises(ValidationError):
            PatientCreate(
                mrn="X", first_name="Ana", last_name="Gomez",
                date_of_birth="1990-05-04", sex="F",
            )

    def test_patient_create_acepta_datos_validos(self):
        from shared_core.schemas import PatientCreate

        payload = PatientCreate(
            mrn="MRN-001", first_name="Ana", last_name="Gomez",
            date_of_birth="1990-05-04", sex="F",
        )
        assert payload.mrn == "MRN-001"
        assert payload.first_name == "Ana"

    def test_patient_update_es_totalmente_opcional(self):
        from shared_core.schemas import PatientUpdate

        payload = PatientUpdate()
        assert payload.first_name is None
        assert payload.last_name is None
