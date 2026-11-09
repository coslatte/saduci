"""La narrativa consume los contrastes del pipeline que calcula la probabilidad."""
from __future__ import annotations

from unittest.mock import AsyncMock
import json

import httpx
import pandas as pd
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.services import ml_model, narrative
from app.services.inference import platform_request_to_dataframe
from shared_core.schemas import PlatformPredictionRequest

CASE = {
    "patient_id": "SYNTHETIC-NOT-FOR-THE-LLM",
    "edad": 50,
    "diag_ing1": 5,
    "diag_ing2": 3,
    "diag_egr2": 25,
    "apache": 22,
    "tiempo_vam": 24,
    "method": "Impacto local por referencia",
}
MODEL_COLUMNS = {
    "edad": "Edad",
    "diag_ing1": "Diag.Ing1",
    "diag_ing2": "Diag.Ing2",
    "diag_egr2": "Diag.Egr2",
    "apache": "APACHE",
    "tiempo_vam": "TiempoVAM",
}


def test_evidence_matches_the_complete_pipeline_and_the_llm_prompt(monkeypatch):
    generator = AsyncMock(return_value="Texto simulado para verificar el transporte de evidencia.")
    monkeypatch.setattr(narrative, "call_embedded_narrative", generator)
    with TestClient(app) as client:
        model = ml_model.require_platform_model()
        original_predict = model.predict_proba
        frames = []

        def record_prediction(frame):
            frames.append(frame.copy())
            return original_predict(frame)

        monkeypatch.setattr(model, "predict_proba", record_prediction)
        response = client.post(
            "/prediction/explain",
            json={**CASE, "include_narrative": True, "ai_provider": "embedded"},
        )
        assert response.status_code == 200, response.text
        evidence = response.json()
        assert len(frames) == 7
        frame = platform_request_to_dataframe(PlatformPredictionRequest(**CASE))
        positive_index = list(model.classes_).index(1)
        original = float(original_predict(frame)[0][positive_index])
        assert evidence["probability"] == round(original, 4)
        assert evidence["narrative_status"] == "generated"
        assert evidence["method"] == "Impacto local por referencia"
        assert evidence["explainer_version"] == "reference-impact-v1"
        assert evidence["reference_strategy"] == "schema-midpoint-v1"
        assert "no son valores normales" in evidence["reference_warning"]

        prompt = generator.await_args.kwargs["prompt"]
        assert evidence["artifact_sha256"] in prompt
        assert evidence["model_version"] in prompt
        assert f"{evidence['probability']:.4%}" in prompt
        assert CASE["patient_id"] not in prompt
        assert len(evidence["rows"]) == 6
        for row in evidence["rows"]:
            modified = frame.copy()
            modified.at[0, MODEL_COLUMNS[row["feature_key"]]] = row["baseline_value"]
            expected = float(original_predict(modified)[0][positive_index])
            assert row["baseline_probability"] == pytest.approx(expected)
            assert row["contribution"] == round(original - expected, 6)
            assert row["feature_name"] in prompt
            assert row["patient_value_display"] in prompt
            assert row["baseline_value_display"] in prompt
            assert f"{expected:.4%}" in prompt
            assert f"{row['contribution'] * 100:+.4f}" in prompt
        pd.testing.assert_frame_equal(frames[0], frame)


@pytest.mark.parametrize("method", ["SHAP", "LIME", "Gradientes Integrados", "Mapas de Saliencia"])
def test_unimplemented_method_is_rejected_before_generation(monkeypatch, method):
    generator = AsyncMock()
    monkeypatch.setattr(narrative, "generate_local_narrative", generator)
    with TestClient(app) as client:
        response = client.post(
            "/prediction/explain", json={**CASE, "method": method, "include_narrative": True}
        )
    assert response.status_code == 422
    generator.assert_not_called()


@pytest.mark.parametrize(
    "provider, helper",
    [
        ("embedded", "call_embedded_narrative"),
        ("local", "call_local_narrative"),
        ("gemini", "call_gemini_narrative"),
        ("huggingface", "call_huggingface_narrative"),
    ],
)
def test_provider_failure_keeps_the_numerical_evidence(monkeypatch, provider, helper):
    generator = AsyncMock(side_effect=HTTPException(status_code=502, detail="Synthetic timeout"))
    monkeypatch.setattr(narrative, helper, generator)
    with TestClient(app) as client:
        response = client.post(
            "/prediction/explain",
            json={**CASE, "include_narrative": True, "ai_provider": provider},
        )
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["probability"] == 0.9246
    assert len(result["rows"]) == 6
    assert result["narrative_status"] == "fallback"
    assert result["narrative_provider"] == "stub"
    assert "92.5%" in result["narrative"]
    assert result["artifact_sha256"] == "b58bcf14ff4ad023c608861323bcabca5fa5d9250058af9f1ed1d0e1cf1923ad"
    generator.assert_awaited_once()


@pytest.mark.parametrize("empty", [None, "", "   "])
def test_empty_local_output_uses_an_identified_template(monkeypatch, empty):
    monkeypatch.setattr(narrative, "call_embedded_narrative", AsyncMock(return_value=empty))
    with TestClient(app) as client:
        response = client.post(
            "/prediction/explain",
            json={**CASE, "include_narrative": True, "ai_provider": "embedded"},
        )
    assert response.status_code == 200
    assert response.json()["narrative_status"] == "fallback"


def test_disabled_narrative_and_requested_template_are_distinguished(monkeypatch):
    generator = AsyncMock()
    monkeypatch.setattr(narrative, "call_embedded_narrative", generator)
    with TestClient(app) as client:
        disabled = client.post("/prediction/explain", json=CASE).json()
        template = client.post(
            "/prediction/explain", json={**CASE, "include_narrative": True, "ai_provider": "stub"}
        ).json()
    assert disabled["narrative_status"] == "disabled"
    assert disabled["narrative"] is None
    assert template["narrative_status"] == "template"
    assert template["narrative"]
    generator.assert_not_called()


@pytest.mark.parametrize("provider", ["local", "gemini", "huggingface"])
def test_provider_adapter_receives_the_same_evidence_and_instructions(monkeypatch, provider):
    payloads = []

    def receive(request):
        payloads.append(json.loads(request.content))
        return httpx.Response(200, json={
            "choices": [{"message": {"content": "Texto sintético."}}],
            "candidates": [{"content": {"parts": [{"text": "Texto sintético."}]}}],
            "generated_text": "Texto sintético.",
        })

    real_client = httpx.AsyncClient
    transport = httpx.MockTransport(receive)
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: real_client(transport=transport, **kwargs))
    monkeypatch.setattr(narrative, "LOCAL_LLM_API_URL", "http://synthetic.invalid/chat/completions")
    monkeypatch.setattr(narrative, "GEMINI_API_KEY", "synthetic-key")
    monkeypatch.setattr(narrative, "HUGGINGFACE_API_URL", "http://synthetic.invalid/generate")
    with TestClient(app) as client:
        response = client.post("/prediction/explain", json={
            **CASE, "include_narrative": True, "ai_provider": provider, "ai_model": "synthetic-model",
        })
    assert response.status_code == 200, response.text
    assert response.json()["narrative_status"] == "generated"
    assert len(payloads) == 1
    if provider == "local":
        assert payloads[0]["messages"][0]["content"] == narrative.NARRATIVE_SYSTEM_PROMPT
        prompt = payloads[0]["messages"][1]["content"]
    elif provider == "gemini":
        prompt = payloads[0]["contents"][0]["parts"][0]["text"]
        assert narrative.NARRATIVE_SYSTEM_PROMPT in prompt
    else:
        prompt = payloads[0]["inputs"]
        assert narrative.NARRATIVE_SYSTEM_PROMPT in prompt
    assert "Impacto local por referencia" in prompt
    assert response.json()["artifact_sha256"] in prompt
    for row in response.json()["rows"]:
        assert row["feature_name"] in prompt
        assert row["baseline_value_display"] in prompt
