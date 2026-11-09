"""LLM narrative generation (local/gemini/huggingface/stub)."""
from __future__ import annotations

from typing import Any

import httpx
from fastapi import HTTPException

from app.services.narrative_model import generate_local_narrative
from app.services.config import (
    DEFAULT_NARRATIVE_MODEL,
    DEFAULT_NARRATIVE_PROVIDER,
    GEMINI_API_KEY,
    GEMINI_MODEL,
    GEMINI_TIMEOUT_SECONDS,
    HUGGINGFACE_API_TOKEN,
    HUGGINGFACE_API_URL,
    HUGGINGFACE_TIMEOUT_SECONDS,
    LOCAL_LLM_API_TOKEN,
    LOCAL_LLM_API_URL,
    LOCAL_LLM_MODEL,
    LOCAL_LLM_TIMEOUT_SECONDS,
    SUPPORTED_NARRATIVE_PROVIDERS,
)
from shared_core.schemas import PlatformExplanationRequest
from shared_core.schemas.prediction import PlatformExplanationEvidence
from shared_core.utils import get_logger

logger = get_logger(__name__)

NARRATIVE_SYSTEM_PROMPT = (
    "Redactas explicaciones breves de resultados de un modelo estadístico en español. "
    "Utiliza exclusivamente las cifras, categorías, método y limitaciones proporcionados. "
    "Describe los contrastes del predictor, sin diagnosticar, inferir causas médicas, "
    "recomendar tratamientos ni inventar relaciones fisiológicas. No llames SHAP, LIME "
    "o gradientes a un cálculo por sustitución. No interpretes las referencias como "
    "normalidad clínica. No atribuyas horas o días al tiempo de ventilación: la unidad "
    "está pendiente de confirmar. El modelo usa un diagnóstico de egreso; no lo presentes "
    "como una alerta temprana validada. El resultado es una estimación, no una certeza "
    "sobre el desenlace del paciente. Devuelve un párrafo de máximo tres frases."
)


def build_narrative_prompt(
    evidence: PlatformExplanationEvidence,
) -> str:
    ordered = sorted(evidence.rows, key=lambda row: abs(row.contribution), reverse=True)
    rows_context = "\n".join(
        (
            f"- {row.feature_name}: valor actual {row.patient_value_display}; "
            f"referencia {row.baseline_value_display}; probabilidad al sustituir solo "
            f"esa variable {row.baseline_probability:.4%}; diferencia del resultado actual "
            f"frente a esa sustitución {row.contribution * 100:+.4f} puntos porcentuales."
        )
        for row in ordered
    )

    return (
        "Contexto: modelo estadístico de mortalidad en UCI que requiere diagnóstico de egreso.\n"
        f"Versión del predictor: {evidence.model_version}; SHA-256: {evidence.artifact_sha256}.\n"
        f"Método ejecutado: {evidence.method}; versión: {evidence.explainer_version}.\n"
        f"Estrategia de referencia: {evidence.reference_strategy}. {evidence.reference_warning}\n"
        f"Probabilidad estimada de muerte: {evidence.probability:.4%}. "
        f"Umbral: {evidence.threshold:.4%}. Etiqueta: {evidence.predicted_label}.\n"
        "Se sustituye una variable por vez y se ejecuta el mismo pipeline completo. "
        "Los cambios no son causas clínicas ni necesariamente suman la probabilidad. "
        "La unidad del tiempo de ventilación está pendiente de confirmar.\n"
        f"Contrastes de las seis variables, ordenados por cambio absoluto:\n{rows_context}"
    )


async def call_embedded_narrative(
    prompt: str,
    temperature: float,
) -> str | None:
    narrative = await generate_local_narrative(
        system_prompt=NARRATIVE_SYSTEM_PROMPT,
        user_prompt=prompt,
        temperature=temperature,
    )
    return narrative.replace("Narrativa:", "").strip() if narrative else None


def normalize_narrative_provider(provider: str | None) -> str:
    normalized_provider = (provider or DEFAULT_NARRATIVE_PROVIDER or "stub").strip().lower()
    if normalized_provider not in SUPPORTED_NARRATIVE_PROVIDERS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported ai_provider. Use one of: stub, embedded, local, gemini, huggingface.",
        )

    return normalized_provider


def resolve_narrative_model(provider: str, request_model: str | None) -> str:
    candidate = (request_model or DEFAULT_NARRATIVE_MODEL or "").strip()
    if candidate:
        return candidate

    if provider == "local":
        candidate = LOCAL_LLM_MODEL
    elif provider == "gemini":
        candidate = GEMINI_MODEL

    if candidate:
        return candidate

    if provider == "gemini":
        return "gemini-2.5-flash"

    return ""


def extract_huggingface_text(payload: Any) -> str:
    if isinstance(payload, list) and payload:
        first = payload[0]
        if isinstance(first, dict):
            for key in ("generated_text", "summary_text", "text"):
                value = first.get(key)
                if isinstance(value, str) and value.strip():
                    return value.strip()

    if isinstance(payload, dict):
        for key in ("generated_text", "summary_text", "text"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()

        generated = payload.get("generated_text")
        if isinstance(generated, list) and generated:
            first_item = generated[0]
            if isinstance(first_item, str) and first_item.strip():
                return first_item.strip()

    raise ValueError("No generated text found in Hugging Face response payload")


def extract_openai_compatible_text(payload: Any) -> str:
    if isinstance(payload, dict):
        choices = payload.get("choices")
        if isinstance(choices, list) and choices:
            first_choice = choices[0]
            if isinstance(first_choice, dict):
                message = first_choice.get("message")
                if isinstance(message, dict):
                    content = message.get("content")
                    if isinstance(content, str) and content.strip():
                        return content.strip()

                text = first_choice.get("text")
                if isinstance(text, str) and text.strip():
                    return text.strip()

        content = payload.get("content")
        if isinstance(content, str) and content.strip():
            return content.strip()

    raise ValueError("No generated text found in local LLM response payload")


def extract_gemini_text(payload: Any) -> str:
    if isinstance(payload, dict):
        candidates = payload.get("candidates")
        if isinstance(candidates, list):
            for candidate in candidates:
                if not isinstance(candidate, dict):
                    continue

                content = candidate.get("content")
                if not isinstance(content, dict):
                    continue

                parts = content.get("parts")
                if not isinstance(parts, list):
                    continue

                text_chunks: list[str] = []
                for part in parts:
                    if isinstance(part, dict):
                        text = part.get("text")
                        if isinstance(text, str) and text.strip():
                            text_chunks.append(text.strip())

                if text_chunks:
                    return " ".join(text_chunks).strip()

        text = payload.get("text")
        if isinstance(text, str) and text.strip():
            return text.strip()

    raise ValueError("No generated text found in Gemini response payload")


async def call_local_narrative(
    prompt: str,
    model_name: str,
    temperature: float,
) -> str:
    if not LOCAL_LLM_API_URL:
        raise HTTPException(
            status_code=503,
            detail="PREDICTION_LOCAL_LLM_URL is required when ai_provider='local'",
        )
    if not model_name:
        raise HTTPException(
            status_code=400,
            detail="ai_model or PREDICTION_LOCAL_LLM_MODEL is required when ai_provider='local'",
        )

    resolved_url = LOCAL_LLM_API_URL
    if "{model_id}" in resolved_url:
        resolved_url = resolved_url.format(model_id=model_name)

    headers = {"Content-Type": "application/json"}
    if LOCAL_LLM_API_TOKEN:
        headers["Authorization"] = f"Bearer {LOCAL_LLM_API_TOKEN}"

    payload = {
        "model": model_name,
        "messages": [
            {
                "role": "system",
                "content": NARRATIVE_SYSTEM_PROMPT,
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": temperature,
        "max_tokens": 280,
        "stream": False,
    }

    try:
        async with httpx.AsyncClient(timeout=LOCAL_LLM_TIMEOUT_SECONDS) as client:
            response = await client.post(resolved_url, headers=headers, json=payload)
            response.raise_for_status()
            response_payload = response.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Local LLM provider returned HTTP {exc.response.status_code}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Local LLM provider call failed: {exc}",
        ) from exc

    try:
        generated_text = extract_openai_compatible_text(response_payload)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return generated_text.replace("Narrativa:", "").replace("Narrative:", "").strip()


async def call_gemini_narrative(
    prompt: str,
    model_name: str,
    temperature: float,
) -> str:
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="PREDICTION_GEMINI_API_KEY is required when ai_provider='gemini'",
        )

    resolved_model = model_name or GEMINI_MODEL or "gemini-2.5-flash"
    resolved_url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{resolved_model}:generateContent?key={GEMINI_API_KEY}"
    )

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": f"{NARRATIVE_SYSTEM_PROMPT}\n\n{prompt}"}],
            }
        ],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": 280,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=GEMINI_TIMEOUT_SECONDS) as client:
            response = await client.post(resolved_url, json=payload)
            response.raise_for_status()
            response_payload = response.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini provider returned HTTP {exc.response.status_code}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini provider call failed: {exc}",
        ) from exc

    try:
        generated_text = extract_gemini_text(response_payload)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return generated_text.replace("Narrativa:", "").replace("Narrative:", "").strip()


async def call_huggingface_narrative(
    prompt: str,
    model_name: str,
    temperature: float,
) -> str:
    if not HUGGINGFACE_API_URL:
        raise HTTPException(
            status_code=503,
            detail="HUGGINGFACE_API_URL is required when ai_provider='huggingface'",
        )

    resolved_url = HUGGINGFACE_API_URL
    if "{model_id}" in resolved_url:
        if not model_name:
            raise HTTPException(
                status_code=400,
                detail="ai_model is required when HUGGINGFACE_API_URL uses {model_id}",
            )
        resolved_url = resolved_url.format(model_id=model_name)

    headers = {"Content-Type": "application/json"}
    if HUGGINGFACE_API_TOKEN:
        headers["Authorization"] = f"Bearer {HUGGINGFACE_API_TOKEN}"

    payload = {
        "inputs": f"{NARRATIVE_SYSTEM_PROMPT}\n\n{prompt}",
        "parameters": {
            "temperature": temperature,
            "max_new_tokens": 280,
            "return_full_text": False,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=HUGGINGFACE_TIMEOUT_SECONDS) as client:
            response = await client.post(resolved_url, headers=headers, json=payload)
            response.raise_for_status()
            response_payload = response.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Hugging Face provider returned HTTP {exc.response.status_code}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Hugging Face provider call failed: {exc}",
        ) from exc

    try:
        generated_text = extract_huggingface_text(response_payload)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return generated_text.replace("Narrativa:", "").replace("Narrative:", "").strip()


def build_stub_narrative(
    evidence: PlatformExplanationEvidence,
) -> str:
    ordered = sorted(evidence.rows, key=lambda row: abs(row.contribution), reverse=True)
    most_relevant = ordered[:2]
    changes = "; ".join(
        f"{row.feature_name} ({row.patient_value_display}) presenta una diferencia de "
        f"{row.contribution * 100:+.2f} puntos porcentuales frente a la referencia técnica "
        f"{row.baseline_value_display}"
        for row in most_relevant
    ) or "no hay diferencias locales disponibles"
    label = "supervivencia" if evidence.predicted_label == "vive" else "mortalidad"
    threshold_position = "por debajo" if evidence.probability < evidence.threshold else "igual o por encima"

    return (
        f"El modelo estima una probabilidad de muerte de {evidence.probability:.1%}, {threshold_position} del umbral "
        f"de {evidence.threshold:.1%}, por lo que clasifica el resultado como {label}. {changes}. "
        "Es una explicación de la sensibilidad del modelo, no una causa médica ni una certeza "
        "sobre la evolución del paciente."
    )


async def generate_narrative(
    request: PlatformExplanationRequest,
    evidence: PlatformExplanationEvidence,
) -> tuple[str | None, str | None, str | None, str]:
    if not request.include_narrative:
        return None, None, None, "disabled"

    provider = normalize_narrative_provider(request.ai_provider)
    model_name = resolve_narrative_model(provider, request.ai_model)

    if provider == "stub":
        return build_stub_narrative(evidence), "stub", "template-reference-v2", "template"

    prompt = build_narrative_prompt(evidence)
    try:
        if provider == "embedded":
            narrative = await call_embedded_narrative(
                prompt=prompt,
                temperature=request.temperature,
            )
        elif provider == "local":
            narrative = await call_local_narrative(prompt, model_name, request.temperature)
        elif provider == "gemini":
            narrative = await call_gemini_narrative(prompt, model_name, request.temperature)
        else:
            narrative = await call_huggingface_narrative(prompt, model_name, request.temperature)

        if narrative and narrative.strip():
            return narrative, provider, model_name or None, "generated"
    except Exception as exc:
        logger.warning("Narrative provider failed: provider=%s error_type=%s", provider, type(exc).__name__)

    return (
        build_stub_narrative(evidence),
        "stub",
        "template-reference-v2",
        "fallback",
    )
