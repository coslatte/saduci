"""Tests del simulation service: health, disponibilidad del motor y esquemas."""
from __future__ import annotations

import os
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", "sqlite://")

import app.main as simulation_main  # noqa: E402
from app.services import engine as engine_module  # noqa: E402


PLATFORM_SIM_PAYLOAD = {
    "age": 60,
    "apache": 20,
    "d1": 5,
    "artif_vent": 1,
    "vam_time": 48,
    "uti_stay": 72,
    "preuti_stay": 4,
    "resp_insuf": 2,
}


@pytest.fixture(scope="module")
def client():
    with TestClient(simulation_main.app) as test_client:
        yield test_client


class TestHealth:
    def test_health_responde(self, client):
        """docker-compose depende de este endpoint para depends_on."""
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["service"] == "simulation"


class TestDatosDelMotor:
    def test_centroids_existe(self):
        """engine.py lo resuelve en <servicio>/app/data/centroids.csv.
        Si se mueve, el motor cae al modelo estadistico sin avisar."""
        path = Path(engine_module.__file__).resolve().parent.parent.parent / "app" / "data" / "centroids.csv"
        assert path.exists(), f"no existe el dataset de centroids en {path}"

    def test_el_servicio_expone_el_motor(self):
        assert hasattr(simulation_main, "SimulationEngine")
        assert hasattr(simulation_main, "ICUSimulationEngine")


class TestEsquemas:
    def test_simulation_request_acepta_payload(self):
        from shared_core.schemas import SimulationRequest

        payload = SimulationRequest(
            patient_id="MRN-001",
            scenario="treatment_response",
            parameters={"intensity": 0.5},
        )
        assert payload.scenario == "treatment_response"
        assert payload.parameters["intensity"] == 0.5

    def test_simulation_request_exige_parameters(self):
        from shared_core.schemas import SimulationRequest
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            SimulationRequest(patient_id="MRN-001", scenario="treatment_response")

    def test_platform_simulation_request_acepta_payload_completo(self):
        from shared_core.schemas import PlatformSimulationRequest

        payload = PlatformSimulationRequest(
            patient_id="MRN-001",
            age=60,
            apache=20,
            d1=5,
            artif_vent=1,
            vam_time=48,
            uti_stay=72,
            preuti_stay=4,
            resp_insuf=2,
        )
        assert payload.age == 60
        assert payload.n_runs == 5000  # valor por defecto

    def test_platform_simulation_rechaza_edad_fuera_de_rango(self):
        from shared_core.schemas import PlatformSimulationRequest
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            PlatformSimulationRequest(
                age=5,  # el dominio exige ge=14
                apache=20, d1=5, artif_vent=1, vam_time=48,
                uti_stay=72, preuti_stay=4, resp_insuf=2,
            )

    def test_rota_de_simulaciones_responde(self, client):
        """Smoke test de un endpoint de solo lectura."""
        resp = client.get("/api/simulations/scenarios")
        assert resp.status_code == 200
        assert "scenarios" in resp.json()


class TestAtribucionDeUsuario:
    """El gateway reenvia X-User-ID / X-User-Username; el router debe pasarlos."""

    def test_crear_simulacion_pasa_los_headers(self, client):
        with patch(
            "app.api.simulations_router.create_simulation",
            new=AsyncMock(return_value={"ok": True}),
        ) as mock:
            resp = client.post(
                "/api/simulations",
                json={"patient_id": "MRN-1", "scenario": "treatment_response", "parameters": {}},
                headers={"X-User-ID": "7", "X-User-Username": "doc"},
            )
        assert resp.status_code == 200
        assert mock.await_args.args[2] == 7
        assert mock.await_args.args[3] == "doc"

    def test_sin_headers_la_atribucion_es_nula(self, client):
        with patch(
            "app.api.simulations_router.create_simulation",
            new=AsyncMock(return_value={"ok": True}),
        ) as mock:
            resp = client.post(
                "/api/simulations",
                json={"patient_id": "MRN-2", "scenario": "treatment_response", "parameters": {}},
            )
        assert resp.status_code == 200
        assert mock.await_args.args[2] is None
        assert mock.await_args.args[3] is None

    def test_platform_simulation_pasa_los_headers(self, client):
        with patch(
            "app.api.simulations_router.run_platform_simulation_logic",
            return_value={"simulation": {}, "prediction": {}},
        ), patch(
            "app.api.simulations_router.persist_platform_simulation",
            new=AsyncMock(return_value=True),
        ) as mock:
            resp = client.post(
                "/simulation",
                json=PLATFORM_SIM_PAYLOAD,
                headers={"X-User-ID": "9", "X-User-Username": "ana"},
            )
        assert resp.status_code == 200
        assert mock.await_args.args[3] == 9
        assert mock.await_args.args[4] == "ana"


class TestPersisted:
    def test_platform_simulation_marca_persisted_true(self, client):
        with patch(
            "app.api.simulations_router.run_platform_simulation_logic",
            return_value={"simulation": {}, "prediction": {}},
        ), patch(
            "app.api.simulations_router.persist_platform_simulation",
            new=AsyncMock(return_value=True),
        ):
            resp = client.post("/simulation", json=PLATFORM_SIM_PAYLOAD)
        assert resp.status_code == 200
        assert resp.json()["persisted"] is True

    def test_platform_simulation_marca_persisted_false_si_falla_la_bd(self, client):
        with patch(
            "app.api.simulations_router.run_platform_simulation_logic",
            return_value={"simulation": {}, "prediction": {}},
        ), patch(
            "app.api.simulations_router.persist_platform_simulation",
            new=AsyncMock(return_value=False),
        ):
            resp = client.post("/simulation", json=PLATFORM_SIM_PAYLOAD)
        assert resp.status_code == 200
        assert resp.json()["persisted"] is False


class TestFallback:
    def test_centroids_available_detecta_placeholder(self, tmp_path):
        from app.services.engine import centroids_available

        placeholder = tmp_path / "centroids.csv"
        placeholder.write_text("# solo comentarios\n# otra linea, con coma\n", encoding="utf-8")
        assert centroids_available(placeholder) is False

        real = tmp_path / "real.csv"
        real.write_text("0.1,0.2,0.3\n0.4,0.5,0.6\n", encoding="utf-8")
        assert centroids_available(real) is True

    def test_platform_simulation_no_falla_sin_centroides(self):
        """Con el CSV placeholder, la simulacion debe degradar al modelo
        estadistico (no devolver 400 ni lanzar)."""
        from app.services import engine
        from app.services.platform import run_platform_simulation_logic
        from shared_core.schemas import PlatformSimulationRequest

        request = PlatformSimulationRequest(**PLATFORM_SIM_PAYLOAD)
        result = run_platform_simulation_logic(request)

        assert isinstance(result["fallback"], bool)
        assert "simulation" in result
        if not engine.centroids_available():
            assert result["fallback"] is True

    def test_endpoint_simulation_responde_200_sin_centroides(self, client):
        """Regresion: el CSV placeholder provocaba un 400 'Invalid parameters'."""
        resp = client.post("/simulation", json=PLATFORM_SIM_PAYLOAD)
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert "simulation" in body
        assert isinstance(body["fallback"], bool)
