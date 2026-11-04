"""Tests del prediction service: health, carga del modelo ML y esquemas.

La carga del modelo es critica: si las rutas candidatas quedan mal calculadas
el servicio arranca pero TODAS las predicciones fallan en silencio. Estos tests
lodetectan.
"""
from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("PREDICTION_NARRATIVE_PROVIDER", "stub")

import app.main as prediction_main  # noqa: E402
from app.services import ml_model  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with TestClient(prediction_main.app) as test_client:
        yield test_client


class TestHealth:
    def test_health_responde(self, client):
        """docker-compose depende de este endpoint para depends_on."""
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["service"] == "prediction"

    def test_health_falla_si_no_se_cargo_el_modelo(self, client, monkeypatch):
        monkeypatch.setitem(ml_model.PLATFORM_MODEL_STATE, "model", None)

        resp = client.get("/health")

        assert resp.status_code == 503


class TestCargaDelModelo:
    def test_resuelve_raiz_en_una_imagen_de_servicio(self, tmp_path):
        service_dir = tmp_path / "app"
        service_dir.mkdir()

        assert ml_model._find_core_root(service_dir) == service_dir

    def test_el_modelo_se_carga(self):
        """Regresion: _SERVICE_DIR/_CORE_ROOT mal calculados hacian que el
        joblib nunca se encontrara y el servicio arrancaba sin modelo."""
        ml_model.load_platform_model()
        assert ml_model.PLATFORM_MODEL_STATE["error"] is None, (
            f"el modelo no se pudo cargar: {ml_model.PLATFORM_MODEL_STATE['error']}"
        )

    def test_la_ruta_del_modelo_existe_en_disco(self):
        ml_model.load_platform_model()
        path = ml_model.PLATFORM_MODEL_STATE["path"]
        assert path, "no se registro ninguna ruta de modelo"
        assert os.path.exists(path), f"la ruta registrada no existe: {path}"

    def test_el_modelo_expone_predict_proba(self):
        ml_model.load_platform_model()
        model = ml_model.PLATFORM_MODEL_STATE["model"]
        assert model is not None
        assert hasattr(model, "predict_proba")

    def test_hay_candidatos_configurados(self):
        candidatos = ml_model.platform_model_candidate_paths()
        assert candidatos, "no se configuro ninguna ruta candidata"
        # al menos una debe existir en el arbol del servicio
        assert any(c.exists() for c in candidatos), (
            "ninguna ruta candidata existe; revisa _SERVICE_DIR/_CORE_ROOT"
        )


class TestEsquemas:
    def test_prediction_request_acepta_features(self):
        from shared_core.schemas import PredictionRequest

        payload = PredictionRequest(
            patient_id="MRN-001",
            model_name="plataforma",
            features={"apache": 20},
        )
        assert payload.patient_id == "MRN-001"
        assert payload.features["apache"] == 20

    def test_platform_prediction_request_respeta_rangos(self):
        from shared_core.schemas import PlatformPredictionRequest
        from pydantic import ValidationError

        valido = PlatformPredictionRequest(
            edad=50, diag_ing1=5, diag_ing2=3, diag_egr2=25, apache=22, tiempo_vam=24,
        )
        assert valido.edad == 50

        with pytest.raises(ValidationError):
            PlatformPredictionRequest(
                edad=5,  # ge=14
                diag_ing1=5, diag_ing2=3, diag_egr2=25, apache=22, tiempo_vam=24,
            )

    def test_platform_explanation_extiende_prediction(self):
        from shared_core.schemas import PlatformExplanationRequest

        payload = PlatformExplanationRequest(
            edad=50, diag_ing1=5, diag_ing2=3, diag_egr2=25,
            apache=22, tiempo_vam=24,
            method="SHAP",
        )
        assert payload.method == "SHAP"
        assert payload.include_narrative is False

    def test_platform_explanation_rechaza_metodo_desconocido(self):
        from shared_core.schemas import PlatformExplanationRequest
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            PlatformExplanationRequest(
                edad=50, diag_ing1=5, diag_ing2=3, diag_egr2=25,
                apache=22, tiempo_vam=24,
                method="Magia",
            )


CARGA_PLATAFORMA_VALIDA = {
    "edad": 50,
    "diag_ing1": 5,
    "diag_ing2": 3,
    "diag_egr2": 25,
    "apache": 22,
    "tiempo_vam": 24,
}


class TestEndpointDePrediccion:
    """El endpoint debe recibir la sesion y la peticion en su orden real.

    El router invocaba ``create_platform_prediction(request, db, ...)`` cuando
    la firma es ``(db, request, ...)``. Dentro del servicio ``request`` era la
    ``Session`` de SQLAlchemy y la inferencia moria con
    ``'Session' object has no attribute 'edad'`` -> HTTP 500. Estos tests
    ejercitan el endpoint de verdad, que antes no lo cubria nadie.
    """

    @pytest.mark.parametrize("ruta", ["/prediccion", "/prediction"])
    def test_prediccion_devuelve_probabilidad(self, client, ruta):
        resp = client.post(ruta, json=CARGA_PLATAFORMA_VALIDA)

        assert resp.status_code == 200, resp.text
        cuerpo = resp.json()
        assert 0.0 <= cuerpo["probability"] <= 1.0
        assert cuerpo["predicted_label"] in {"vive", "muere"}
        assert cuerpo["predicted_class"] in {0, 1}
        # el porcentaje debe ser coherente con la probabilidad
        assert cuerpo["probability_percent"] == pytest.approx(
            cuerpo["probability"] * 100.0, abs=0.01
        )

    @pytest.mark.parametrize("ruta", ["/prediccion", "/prediction"])
    def test_prediccion_rechaza_carga_fuera_de_rango(self, client, ruta):
        invalida = {**CARGA_PLATAFORMA_VALIDA, "edad": 5}  # ge=14
        resp = client.post(ruta, json=invalida)

        assert resp.status_code == 422

    def test_la_respuesta_no_depende_del_orden_de_argumentos(self, client):
        """Dos peticiones idénticas deben producir la misma probabilidad.

        Si los argumentos vueltos a cruzarse, la segunda llamada falla con 500
        en lugar de devolver un número.
        """
        primera = client.post("/prediccion", json=CARGA_PLATAFORMA_VALIDA)
        segunda = client.post("/prediccion", json=CARGA_PLATAFORMA_VALIDA)

        assert primera.status_code == 200, primera.text
        assert segunda.status_code == 200, segunda.text
        assert primera.json()["probability"] == segunda.json()["probability"]


class TestExplicacion:
    def test_explicacion_devuelve_una_fila_por_variable(self, client):
        resp = client.post(
            "/prediccion/explain",
            json={**CARGA_PLATAFORMA_VALIDA, "method": "SHAP"},
        )

        assert resp.status_code == 200, resp.text
        cuerpo = resp.json()
        filas = cuerpo["rows"]
        # una fila por cada variable del modelo
        assert len(filas) == 6
        assert {fila["feature_key"] for fila in filas} == {
            "edad",
            "diag_ing1",
            "diag_ing2",
            "diag_egr2",
            "apache",
            "tiempo_vam",
        }

    def test_la_linea_base_de_las_variables_cae_dentro_del_rango_valido(self):
        """La perturbación por línea base debe usar el rango real del modelo.

        ``PLATFORM_LIMITS`` se usaba para derivarla. Si declara un rango mayor
        que el que valida el esquema (diag_ing2 llegaba hasta 173 cuando el
        máximo es 40), SHAP/LIME comparaban contra un valor que el modelo nunca
        vio y la explicación salía sesgada.
        """
        from app.services.config import PLATFORM_LIMITS
        from shared_core.schemas import PlatformPredictionRequest

        for nombre, campo in PlatformPredictionRequest.model_fields.items():
            if not campo.metadata:
                continue
            limites = [m for m in campo.metadata if hasattr(m, "ge") and hasattr(m, "le")]
            if not limites:
                continue
            ge, le = limites[0].ge, limites[0].le
            lower, upper = PLATFORM_LIMITS[nombre]
            assert (lower, upper) == (ge, le), (
                f"PLATFORM_LIMITS[{nombre!r}] no coincide con el esquema: "
                f"{(lower, upper)} vs ({ge}, {le})"
            )


class TestPersisted:
    async def test_prediccion_marca_persisted_false_si_falla_la_bd(self, client):
        """Si la persistencia falla, la respuesta lo indica en vez de tragarlo."""
        from app.services.prediction_service import create_platform_prediction
        from shared_core.schemas import PlatformPredictionRequest

        class BrokenSession:
            def add(self, *_args):
                pass

            def commit(self):
                raise RuntimeError("db down")

        request = PlatformPredictionRequest(
            edad=40, diag_ing1=1, diag_ing2=2, diag_egr2=20, apache=20, tiempo_vam=20
        )
        response = await create_platform_prediction(BrokenSession(), request, 1, "doc")
        assert response.persisted is False
