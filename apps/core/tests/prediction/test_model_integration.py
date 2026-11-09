"""Paridad con el artefacto original y procedencia de resultados nuevos."""
from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.main import app
from app.models.database import get_db
from app.models.entities import PredictionRecord
from app.services import ml_model, prediction_service
from app.services.inference import (
    platform_request_to_dataframe,
    predict_probability_from_dataframe,
)
from shared_core.schemas import PlatformPredictionRequest

MODEL_DIR = Path(__file__).resolve().parents[2] / "src/prediction/models/v1"
MODEL_PATH = MODEL_DIR / "new_workflow.joblib"
ARTIFACT_SHA256 = "b58bcf14ff4ad023c608861323bcabca5fa5d9250058af9f1ed1d0e1cf1923ad"
FEATURE_KEYS = ("edad", "diag_ing1", "diag_ing2", "diag_egr2", "apache", "tiempo_vam")
# Casos sintéticos ejecutados contra el original en 2cf8140 con sklearn 1.6.1.
REFERENCE_CASES = [
    ((20, 1, 0, 30, 30, 30), 0.972226196146308),
    ((50, 5, 3, 25, 22, 24), 0.9246280866260241),
    ((14, 1, 0, 18, 18, 18), 0.028635301101828787),
    ((61, 20, 40, 40, 40, 40), 0.9991608650257583),
    ((40, 12, 23, 30, 25, 36), 0.9936743539229301),
]


@pytest.fixture(autouse=True)
def preserve_model_state():
    previous = dict(ml_model.PLATFORM_MODEL_STATE)
    yield
    ml_model.PLATFORM_MODEL_STATE.clear()
    ml_model.PLATFORM_MODEL_STATE.update(previous)


@pytest.mark.parametrize("route", ["/prediction", "/prediccion"])
@pytest.mark.parametrize("values, expected", REFERENCE_CASES)
def test_prediction_matches_original_artifact(route, values, expected):
    payload = dict(zip(FEATURE_KEYS, values, strict=True))
    with TestClient(app) as client:
        frame = platform_request_to_dataframe(PlatformPredictionRequest(**payload))
        assert predict_probability_from_dataframe(frame) == pytest.approx(expected, abs=1e-10, rel=0)
        response = client.post(route, json=payload)

    assert response.status_code == 200, response.text
    result = response.json()
    assert result["probability"] == round(expected, 4)
    assert result["predicted_class"] == int(round(expected, 4) >= result["threshold"])
    assert result["model_version"] == "v1"
    assert result["artifact_sha256"] == ARTIFACT_SHA256


@pytest.mark.parametrize("failure", ["checksum", "missing_manifest", "invalid_manifest", "features"])
def test_invalid_package_is_rejected_before_deserialization(tmp_path, monkeypatch, failure):
    artifact = tmp_path / "new_workflow.joblib"
    artifact.write_bytes(MODEL_PATH.read_bytes())
    manifest = json.loads((MODEL_DIR / "manifest.json").read_text())
    if failure == "checksum":
        artifact.write_bytes(b"corrupted artifact")
    if failure == "features":
        manifest["feature_order"] = list(reversed(manifest["feature_order"]))
    if failure != "missing_manifest":
        (tmp_path / "manifest.json").write_text(
            "not json" if failure == "invalid_manifest" else json.dumps(manifest)
        )

    ml_model.load_platform_model()
    assert ml_model.PLATFORM_MODEL_STATE["model"] is not None
    monkeypatch.setattr(ml_model, "platform_model_candidate_paths", lambda: [artifact, MODEL_PATH])
    monkeypatch.setattr(ml_model, "joblib_load", lambda _: pytest.fail("No debe deserializar"))

    ml_model.load_platform_model()

    assert ml_model.PLATFORM_MODEL_STATE["model"] is None
    assert ml_model.PLATFORM_MODEL_STATE["manifest"] is None
    with pytest.raises(HTTPException) as error:
        ml_model.require_platform_model()
    assert error.value.status_code == 503


def test_explicit_missing_path_does_not_load_another_model(tmp_path, monkeypatch):
    monkeypatch.setenv("PREDICTION_MODEL_PATH", str(tmp_path / "missing.joblib"))
    ml_model.load_platform_model()
    with pytest.raises(HTTPException) as error:
        ml_model.require_platform_model()
    assert error.value.status_code == 503


@pytest.mark.parametrize("invalid_field", ["feature_names_in_", "classes_"])
def test_loaded_model_must_match_manifest(monkeypatch, invalid_field):
    manifest = json.loads((MODEL_DIR / "manifest.json").read_text())
    model = SimpleNamespace(
        predict_proba=lambda _: [[0.25, 0.75]],
        feature_names_in_=manifest["feature_order"],
        classes_=[0, 1],
    )
    setattr(model, invalid_field, ["unexpected"])
    monkeypatch.setattr(ml_model, "joblib_load", lambda _: model)
    ml_model.load_platform_model()
    with pytest.raises(HTTPException) as error:
        ml_model.require_platform_model()
    assert error.value.status_code == 503


def test_probability_uses_positive_class_instead_of_column_position(monkeypatch):
    ml_model.load_platform_model()
    monkeypatch.setitem(
        ml_model.PLATFORM_MODEL_STATE,
        "model",
        SimpleNamespace(classes_=[1, 0], predict_proba=lambda _: [[0.8, 0.2]]),
    )
    assert predict_probability_from_dataframe(None) == 0.8


@pytest.mark.parametrize("probability", [float("nan"), float("inf"), float("-inf"), -0.1, 1.1])
def test_invalid_probability_is_not_clipped_into_a_valid_result(monkeypatch, probability):
    ml_model.load_platform_model()
    monkeypatch.setitem(
        ml_model.PLATFORM_MODEL_STATE,
        "model",
        SimpleNamespace(classes_=[0, 1], predict_proba=lambda _: [[0.0, probability]]),
    )
    with pytest.raises(HTTPException) as error:
        predict_probability_from_dataframe(None)
    assert error.value.status_code == 500


def test_provenance_is_saved_with_the_prediction_and_returned_in_explanation(monkeypatch):
    engine = create_engine(
        "sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False}
    )
    PredictionRecord.__table__.create(engine)

    def test_database():
        with Session(engine) as session:
            yield session

    monkeypatch.setitem(app.dependency_overrides, get_db, test_database)
    monkeypatch.setattr(prediction_service, "_notify_gateway", AsyncMock())
    payload = dict(zip(FEATURE_KEYS, REFERENCE_CASES[0][0], strict=True))
    try:
        with TestClient(app) as client:
            response = client.post("/prediction", json=payload, headers={"X-User-ID": "7"})
            assert response.status_code == 200, response.text
            assert response.json()["persisted"] is True
            with Session(engine) as session:
                record = session.query(PredictionRecord).one()
                assert record.user_id == 7
                assert record.prediction["model_version"] == "v1"
                assert record.prediction["artifact_sha256"] == ARTIFACT_SHA256
            explanation = client.post(
                "/prediction/explain",
                json={**payload, "method": "Impacto local por referencia"},
            )
            assert explanation.status_code == 200, explanation.text
            assert explanation.json()["artifact_sha256"] == response.json()["artifact_sha256"]
            assert explanation.json()["model_version"] == response.json()["model_version"]
    finally:
        engine.dispose()
