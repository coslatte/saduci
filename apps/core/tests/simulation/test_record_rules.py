"""Reglas de modificación de registros."""
from fastapi.testclient import TestClient

from app.main import app


def test_no_se_pueden_eliminar_registros():
    with TestClient(app) as client:
        assert client.delete("/api/simulations/1").status_code == 405
        assert client.delete("/api/statistical-tests/1").status_code == 405


def test_simulacion_solo_admite_fecha():
    with TestClient(app) as client:
        assert client.put("/api/simulations/1", json={"created_at": "2025-01-01T12:00:00", "scenario": "otro"}).status_code == 422
