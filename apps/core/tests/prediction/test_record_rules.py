"""Reglas de modificación de registros."""
from fastapi.testclient import TestClient

from app.main import app


def test_no_se_pueden_eliminar_registros():
    with TestClient(app) as client:
        assert client.delete("/api/predictions/1").status_code == 405


def test_prediccion_solo_admite_fecha():
    with TestClient(app) as client:
        assert client.put("/api/predictions/1", json={"created_at": "2025-01-01T12:00:00", "patient_id": "otro"}).status_code == 422
