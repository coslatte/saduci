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
    PREDICTION_THRESHOLD,
    SUPPORTED_NARRATIVE_PROVIDERS,
)
from shared_core.schemas import PlatformExplanationRequest
from shared_core.utils import get_logger

logger = get_logger(__name__)


def build_narrative_prompt(
    probability: float,
    predicted_label: str,
    rows: list[dict[str, Any]],
    threshold: float,
) -> str:
    ordered = sorted(rows, key=lambda row: abs(float(row["contribution"])), reverse=True)
    rows_context = "\n".join(
        (
            f"- {row['feature_name']}: valor actual {row['patient_value_display']}; "
            f"referencia {row['baseline_value']}; diferencia estimada "
            f"{float(row['contribution']) * 100:+.2f} puntos porcentuales en probabilidad de muerte."
        )
        for row in ordered[:4]
    ) or "- No hay diferencias locales disponibles."

    return (
        f"Probabilidad estimada por el modelo de muerte: {probability:.1%}. "
        f"Umbral de clasificación: {threshold:.1%}. "
        f"Etiqueta del modelo: {predicted_label}.\n"
        "Las diferencias siguientes se calcularon cambiando una variable por vez a su valor de "
        "referencia y volviendo a ejecutar el mismo modelo predictivo. No son causas clínicas ni "
        "efectos causales.\n"
        f"Variables con mayor cambio absoluto:\n{rows_context}"
    )


async def call_embedded_narrative(
    prompt: str,
    temperature: float,
) -> str | None:
    narrative = await generate_local_narrative(
        system_prompt=(
            "Redactas explicaciones breves de resultados de un modelo estadístico en español. "
            "Describe únicamente la probabilidad, el umbral y las diferencias de variables "
            "incluidas en los datos. No diagnostiques, no infieras causas médicas, no recomiendes "
            "tratamientos y no inventes relaciones fisiológicas. Aclara que el resultado es una "
            "estimación del modelo, no una certeza sobre el desenlace del paciente. Devuelve un "
            "solo párrafo de máximo tres frases."
        ),
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
                "content": (
                    "Eres un especialista en medicina intensiva. Respondes en español clínico, "
                    "sin bullets y con tono explicativo."
                ),
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
                "parts": [{"text": prompt}],
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
        "inputs": prompt,
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
    probability: float,
    predicted_label: str,
    rows: list[dict[str, Any]],
    threshold: float,
) -> str:
    ordered = sorted(rows, key=lambda row: abs(float(row["contribution"])), reverse=True)
    most_relevant = ordered[:2]
    changes = "; ".join(
        f"{row['feature_name']} ({row['patient_value_display']}) cambió la probabilidad estimada "
        f"{float(row['contribution']) * 100:+.2f} puntos porcentuales frente al valor de referencia"
        for row in most_relevant
    ) or "no hay diferencias locales disponibles"
    label = "supervivencia" if predicted_label == "vive" else "mortalidad"
    threshold_position = "por debajo" if probability < threshold else "igual o por encima"

    return (
        f"El modelo estima una probabilidad de muerte de {probability:.1%}, {threshold_position} del umbral "
        f"de {threshold:.1%}, por lo que clasifica el resultado como {label}. {changes}. "
        "Es una explicación de la sensibilidad del modelo, no una causa médica ni una certeza "
        "sobre la evolución del paciente."
    )


async def generate_narrative(
    request: PlatformExplanationRequest,
    probability: float,
    predicted_label: str,
    rows: list[dict[str, Any]],
) -> tuple[str | None, str | None, str | None]:
    if not request.include_narrative:
        return None, None, None

    provider = normalize_narrative_provider(request.ai_provider)
    model_name = resolve_narrative_model(provider, request.ai_model)

    prompt = build_narrative_prompt(
        probability=probability,
        predicted_label=predicted_label,
        rows=rows,
        threshold=PREDICTION_THRESHOLD,
    )

    if provider == "embedded":
        try:
            narrative = await call_embedded_narrative(
                prompt=prompt,
                temperature=request.temperature,
            )
        except Exception as exc:
            logger.warning("Local narrative generation failed: %s", exc)
            narrative = None

        if narrative:
            return narrative, provider, model_name or None

        logger.warning("Using deterministic narrative because the local model is unavailable")
        return (
            build_stub_narrative(probability, predicted_label, rows, PREDICTION_THRESHOLD),
            "stub",
            "template-clinical-v1",
        )

    if provider == "local":
        narrative = await call_local_narrative(
            prompt=prompt,
            model_name=model_name,
            temperature=request.temperature,
        )
        return narrative, provider, model_name or None

    if provider == "gemini":
        narrative = await call_gemini_narrative(
            prompt=prompt,
            model_name=model_name,
            temperature=request.temperature,
        )
        return narrative, provider, model_name or None

    if provider == "huggingface":
        narrative = await call_huggingface_narrative(
            prompt=prompt,
            model_name=model_name,
            temperature=request.temperature,
        )
        return narrative, provider, model_name or None

    narrative = build_stub_narrative(
        probability=probability,
        predicted_label=predicted_label,
        rows=rows,
        threshold=PREDICTION_THRESHOLD,
    )
    return narrative, "stub", "template-clinical-v1"
