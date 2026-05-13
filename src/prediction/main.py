"""Prediction service - ML model integration."""
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
import pandas as pd
from fastapi import FastAPI, HTTPException, Depends
from joblib import load as joblib_load
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float, JSON
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session

# Add shared modules to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from shared.schemas import (
    HealthCheck,
    PredictionRequest,
    PredictionResponse,
    PlatformPredictionRequest,
    PlatformPredictionResponse,
    PlatformExplanationRequest,
    PlatformExplanationResponse,
)
from shared.utils import get_logger

logger = get_logger(__name__)

# Database configuration
# Default to local sqlite for development convenience when DATABASE_URL is not provided.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./prediction_service.db")
_is_sqlite = DATABASE_URL.startswith("sqlite")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class PredictionRecord(Base):
    """Prediction database model."""
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, index=True, nullable=False)
    model_name = Column(String, nullable=False)
    features = Column(JSON, nullable=False)
    prediction = Column(JSON, nullable=False)
    confidence = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


DB_AVAILABLE = True
try:
    # Create tables
    Base.metadata.create_all(bind=engine)
except SQLAlchemyError as exc:
    DB_AVAILABLE = False
    logger.exception("Prediction DB initialization failed: %s", exc)

app = FastAPI(
    title="Prediction Service",
    description="ML model integration service for clinical predictions",
    version="1.0.0"
)

_PLATFORM_FEATURE_ORDER = [
    ("edad", "Edad", "Age"),
    ("diag_ing1", "Diag.Ing1", "Adm.Diag1"),
    ("diag_ing2", "Diag.Ing2", "Adm.Diag2"),
    ("diag_egr2", "Diag.Egr2", "Dis.Diag2"),
    ("apache", "APACHE", "APACHE"),
    ("tiempo_vam", "TiempoVAM", "VentilatorTime"),
]

_PLATFORM_FEATURE_NAMES = [feature_name for _, _, feature_name in _PLATFORM_FEATURE_ORDER]

_PLATFORM_LIMITS = {
    "edad": (14, 61),
    "diag_ing1": (1, 20),
    "diag_ing2": (39, 173),
    "diag_egr2": (18, 40),
    "apache": (18, 40),
    "tiempo_vam": (18, 40),
}

_EXPLANATION_METHOD_SCALE = {
    "LIME": 1.00,
    "SHAP": 1.10,
    "Gradientes Integrados": 0.90,
    "Mapas de Saliencia": 1.05,
}

_DIAGNOSIS_CODE_DATA = """
0=Empty
1=Exogenous intoxication
2=Coma
3=Severe traumatic brain injury
4=Post-thoracotomy
5=Post-laparotomy
6=Post-amputation
7=Post-neurology surgery
8=Recovered cardiac arrest
9=Metabolic encephalopathy
10=Hypoxic encephalopathy
11=Incomplete hanging
12=Decompensated heart failure
13=Severe obstetric condition
14=Decompensated COPD
15=ARDS
16=BNB-EH
17=BNB-IH
18=BNV
19=Myocarditis
20=Leptospirosis
21=Severe sepsis
22=DMO
23=Septic shock
24=Hypovolemic shock
25=Cardiogenic shock
26=Myocardial infarction
27=Polytrauma
28=Myasthenic crisis
29=Hypertensive emergency
30=Status asthmaticus
31=Status epilepticus
32=Pancreatitis
33=Fat embolism
34=Stroke
35=Sleep apnea syndrome
36=Digestive bleeding
37=Chronic renal failure
38=Acute renal failure
39=Renal transplant
40=Guillain-Barre
41=AV block
42=Obstetric embolism
43=Aspiration pneumonia
44=Neuroleptic malignant syndrome
45=Diabetic ketoacidosis
46=Meningitis
47=Pulmonary edema
48=Others
"""

PREDICTION_THRESHOLD = float(os.getenv("PREDICTION_THRESHOLD", "0.5"))
DEFAULT_NARRATIVE_PROVIDER = os.getenv("PREDICTION_NARRATIVE_PROVIDER", "stub").strip().lower()
DEFAULT_NARRATIVE_MODEL = os.getenv("PREDICTION_NARRATIVE_MODEL", "").strip()
LOCAL_LLM_API_URL = os.getenv("PREDICTION_LOCAL_LLM_URL", "").strip()
LOCAL_LLM_MODEL = os.getenv("PREDICTION_LOCAL_LLM_MODEL", "").strip()
LOCAL_LLM_API_TOKEN = os.getenv("PREDICTION_LOCAL_LLM_TOKEN", "").strip()
LOCAL_LLM_TIMEOUT_SECONDS = float(os.getenv("PREDICTION_LOCAL_LLM_TIMEOUT_SECONDS", "60"))
GEMINI_API_KEY = os.getenv("PREDICTION_GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("PREDICTION_GEMINI_MODEL", "gemini-2.5-flash").strip()
GEMINI_TIMEOUT_SECONDS = float(os.getenv("PREDICTION_GEMINI_TIMEOUT_SECONDS", "60"))
HUGGINGFACE_API_URL = os.getenv("HUGGINGFACE_API_URL", "").strip()
HUGGINGFACE_API_TOKEN = os.getenv("HUGGINGFACE_API_TOKEN", "").strip()
HUGGINGFACE_TIMEOUT_SECONDS = float(os.getenv("HUGGINGFACE_TIMEOUT_SECONDS", "30"))

SUPPORTED_NARRATIVE_PROVIDERS = {"stub", "local", "gemini", "huggingface"}

_PLATFORM_MODEL_STATE: dict[str, Any] = {
    "model": None,
    "path": None,
    "error": None,
}


def _parse_diagnosis_map(raw_mapping: str) -> dict[int, str]:
    mapping: dict[int, str] = {}
    for line in raw_mapping.strip().splitlines():
        left, right = line.strip().split("=", maxsplit=1)
        mapping[int(left)] = right.strip()
    return mapping


_DIAGNOSIS_BY_CODE = _parse_diagnosis_map(_DIAGNOSIS_CODE_DATA)


def _platform_model_candidate_paths() -> list[Path]:
    repo_root = Path(__file__).resolve().parents[2]
    configured_path = os.getenv("PREDICTION_MODEL_PATH", "").strip()

    candidates: list[Path] = []
    if configured_path:
        candidates.append(Path(configured_path))

    candidates.extend(
        [
            Path(__file__).resolve().parent / "new_workflow.joblib",
            repo_root / "research_files" / "new_workflow.joblib",
            Path.cwd() / "research_files" / "new_workflow.joblib",
            Path.cwd() / "new_workflow.joblib",
        ]
    )

    deduped: list[Path] = []
    seen: set[str] = set()
    for candidate in candidates:
        key = str(candidate)
        if key not in seen:
            deduped.append(candidate)
            seen.add(key)

    return deduped


def _load_platform_model() -> None:
    load_errors: list[str] = []
    for candidate_path in _platform_model_candidate_paths():
        if not candidate_path.exists():
            continue

        try:
            loaded_model = joblib_load(candidate_path)
            if not hasattr(loaded_model, "predict_proba"):
                raise TypeError("Loaded object does not expose predict_proba")

            _PLATFORM_MODEL_STATE["model"] = loaded_model
            _PLATFORM_MODEL_STATE["path"] = str(candidate_path)
            _PLATFORM_MODEL_STATE["error"] = None
            logger.info("Loaded platform prediction model from %s", _PLATFORM_MODEL_STATE["path"])
            return
        except (OSError, ValueError, TypeError, ImportError, AttributeError) as exc:
            load_errors.append(f"{candidate_path}: {exc}")

    _PLATFORM_MODEL_STATE["model"] = None
    _PLATFORM_MODEL_STATE["path"] = None
    _PLATFORM_MODEL_STATE["error"] = "; ".join(load_errors) if load_errors else "new_workflow.joblib not found"
    logger.error("Platform model could not be loaded: %s", _PLATFORM_MODEL_STATE["error"])


def _require_platform_model() -> Any:
    if _PLATFORM_MODEL_STATE["model"] is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Prediction model unavailable. Set PREDICTION_MODEL_PATH or provide "
                "research_files/new_workflow.joblib. "
                f"Details: {_PLATFORM_MODEL_STATE['error']}"
            ),
        )

    return _PLATFORM_MODEL_STATE["model"]


def get_db():
    """Get database session."""
    if not DB_AVAILABLE:
        raise HTTPException(status_code=503, detail="Prediction database unavailable")

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _platform_request_to_model_row(request: PlatformPredictionRequest) -> dict[str, float]:
    return {
        "Edad": float(request.edad),
        "Diag.Ing1": float(request.diag_ing1),
        "Diag.Ing2": float(request.diag_ing2),
        "Diag.Egr2": float(request.diag_egr2),
        "APACHE": float(request.apache),
        "TiempoVAM": float(request.tiempo_vam),
    }


def _platform_request_to_dataframe(request: PlatformPredictionRequest) -> pd.DataFrame:
    row = _platform_request_to_model_row(request)
    return pd.DataFrame([row], columns=[column for _, column, _ in _PLATFORM_FEATURE_ORDER])


def _predict_probability_from_dataframe(frame: pd.DataFrame) -> float:
    model = _require_platform_model()

    try:
        probability = float(model.predict_proba(frame)[0][1])
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Model inference failed: {exc}") from exc

    return min(1.0, max(0.0, probability))


def _platform_prediction_probability(request: PlatformPredictionRequest) -> float:
    """Compute mortality probability using the trained platform model."""
    frame = _platform_request_to_dataframe(request)
    return round(_predict_probability_from_dataframe(frame), 4)


def _prediction_class_and_label(probability: float) -> tuple[int, str]:
    predicted_class = 1 if probability >= PREDICTION_THRESHOLD else 0
    predicted_label = "muere" if predicted_class == 1 else "vive"
    return predicted_class, predicted_label


def _feature_display_value(feature_key: str, value: float) -> str:
    int_value = int(round(value))
    if feature_key in {"diag_ing1", "diag_ing2", "diag_egr2"}:
        return _DIAGNOSIS_BY_CODE.get(int_value, str(int_value))

    return str(int_value)


def _feature_baseline(feature_key: str) -> float:
    lower, upper = _PLATFORM_LIMITS[feature_key]
    return float((lower + upper) / 2.0)


def _platform_feature_importances(
    request: PlatformPredictionRequest,
    method: str,
) -> list[dict[str, Any]]:
    """Compute local, signed feature attributions for saduci-platform."""
    scale = _EXPLANATION_METHOD_SCALE[method]

    original_frame = _platform_request_to_dataframe(request)
    original_probability = _predict_probability_from_dataframe(original_frame)

    rows: list[dict[str, Any]] = []
    for feature_key, feature_column, feature_name in _PLATFORM_FEATURE_ORDER:
        patient_value = float(getattr(request, feature_key))
        baseline_value = _feature_baseline(feature_key)

        perturbed = original_frame.copy()
        perturbed.at[0, feature_column] = baseline_value
        perturbed_probability = _predict_probability_from_dataframe(perturbed)

        contribution = (original_probability - perturbed_probability) * scale
        if contribution > 1e-6:
            direction = "increase_risk"
        elif contribution < -1e-6:
            direction = "decrease_risk"
        else:
            direction = "neutral"

        rows.append(
            {
                "feature_key": feature_key,
                "feature_name": feature_name,
                "patient_value": patient_value,
                "patient_value_display": _feature_display_value(feature_key, patient_value),
                "baseline_value": baseline_value,
                "contribution": round(contribution, 6),
                "direction": direction,
            }
        )

    return rows


def _build_narrative_prompt(
    probability: float,
    predicted_label: str,
    rows: list[dict[str, Any]],
    method: str,
) -> str:
    rows_context = ", ".join(
        (
            f"({row['feature_name']}, {row['patient_value_display']}, "
            f"{row['contribution']})"
        )
        for row in rows
    )

    return (
        "You are a specialist in Intensive Care Medicine and clinical data science. "
        "Explain hidden mortality risk in ICU patients in clear clinical Spanish. "
        f"Current mortality probability: {probability:.2%}. "
        f"Binary model output: {predicted_label}. "
        f"Attribution method: {method}. "
        "Input format is (Clinical Parameter, Observed Value, Feature Importance Score). "
        f"Input Data: {rows_context}. "
        "Provide ONLY one paragraph beginning with 'Narrativa:'."
    )


def _normalize_narrative_provider(provider: str | None) -> str:
    normalized_provider = (provider or DEFAULT_NARRATIVE_PROVIDER or "stub").strip().lower()
    if normalized_provider not in SUPPORTED_NARRATIVE_PROVIDERS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported ai_provider. Use one of: stub, local, gemini, huggingface.",
        )

    return normalized_provider


def _resolve_narrative_model(provider: str, request_model: str | None) -> str:
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


def _extract_huggingface_text(payload: Any) -> str:
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


def _extract_openai_compatible_text(payload: Any) -> str:
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


def _extract_gemini_text(payload: Any) -> str:
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


async def _call_local_narrative(
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
        generated_text = _extract_openai_compatible_text(response_payload)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return generated_text.replace("Narrativa:", "").replace("Narrative:", "").strip()


async def _call_gemini_narrative(
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
        generated_text = _extract_gemini_text(response_payload)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return generated_text.replace("Narrativa:", "").replace("Narrative:", "").strip()


async def _call_huggingface_narrative(
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
        generated_text = _extract_huggingface_text(response_payload)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return generated_text.replace("Narrativa:", "").replace("Narrative:", "").strip()


def _build_stub_narrative(
    probability: float,
    predicted_label: str,
    rows: list[dict[str, Any]],
) -> str:
    ordered = sorted(rows, key=lambda row: abs(float(row["contribution"])), reverse=True)
    positive = [row for row in ordered if float(row["contribution"]) > 0][:2]
    negative = [row for row in ordered if float(row["contribution"]) < 0][:2]

    positive_txt = ", ".join(
        f"{row['feature_name']}={row['patient_value_display']}" for row in positive
    ) or "sin factores claros de aumento"

    negative_txt = ", ".join(
        f"{row['feature_name']}={row['patient_value_display']}" for row in negative
    ) or "sin factores claros de reduccion"

    return (
        f"Probabilidad estimada de no sobrevida: {probability:.2%} "
        f"(salida binaria: {predicted_label}). "
        f"Factores que aumentan riesgo: {positive_txt}. "
        f"Factores que reducen riesgo: {negative_txt}. "
        "Interpretar junto al juicio clinico y evolucion temporal del paciente."
    )


async def _generate_narrative(
    request: PlatformExplanationRequest,
    probability: float,
    predicted_label: str,
    rows: list[dict[str, Any]],
) -> tuple[str | None, str | None, str | None]:
    if not request.include_narrative:
        return None, None, None

    provider = _normalize_narrative_provider(request.ai_provider)
    model_name = _resolve_narrative_model(provider, request.ai_model)

    prompt = _build_narrative_prompt(
        probability=probability,
        predicted_label=predicted_label,
        rows=rows,
        method=request.method,
    )

    if provider == "local":
        narrative = await _call_local_narrative(
            prompt=prompt,
            model_name=model_name,
            temperature=request.temperature,
        )
        return narrative, provider, model_name or None

    if provider == "gemini":
        narrative = await _call_gemini_narrative(
            prompt=prompt,
            model_name=model_name,
            temperature=request.temperature,
        )
        return narrative, provider, model_name or None

    if provider == "huggingface":
        narrative = await _call_huggingface_narrative(
            prompt=prompt,
            model_name=model_name,
            temperature=request.temperature,
        )
        return narrative, provider, model_name or None

    narrative = _build_stub_narrative(probability=probability, predicted_label=predicted_label, rows=rows)
    return narrative, "stub", "template-clinical-v1"


class DummyMLModel:
    """
    Dummy ML model for demonstration purposes.
    In production, this is replaced with actual ML models.
    """

    def __init__(self, model_name: str):
        self.model_name = model_name

    def predict(self, features: dict) -> tuple:
        """
        Make a prediction based on features.

        Returns:
            Tuple of (prediction, confidence)
        """
        # Simulate different models
        if self.model_name == "mortality_risk":
            # Simple mortality risk calculation
            age = features.get("age", 50)
            severity_score = features.get("severity_score", 5)
            risk = min((age / 100 + severity_score / 10) / 2, 1.0)
            return {
                "risk_score": round(risk, 3),
                "risk_level": self._get_risk_level(risk),
            }, round(0.85, 2)

        if self.model_name == "length_of_stay":
            # Simple length of stay prediction
            severity = features.get("severity_score", 5)
            age = features.get("age", 50)
            days = int(severity * 2 + age / 20)
            return {"predicted_days": days}, round(0.78, 2)

        if self.model_name == "readmission_risk":
            # Simple readmission risk
            comorbidities = features.get("comorbidities", 1)
            age = features.get("age", 50)
            risk = min((comorbidities * 0.2 + age / 200), 1.0)
            return {
                "risk_score": round(risk, 3),
                "risk_level": self._get_risk_level(risk),
            }, round(0.82, 2)

        return {"result": "unknown_model"}, 0.0
    
    def _get_risk_level(self, risk: float) -> str:
        """Convert risk score to level."""
        if risk < 0.3:
            return "low"
        if risk < 0.6:
            return "medium"

        return "high"


@app.get("/health", response_model=HealthCheck)
async def health_check():
    """Health check endpoint."""
    return HealthCheck(status="healthy", service="prediction")


@app.post("/predictions", response_model=PredictionResponse)
async def create_prediction(
    request: PredictionRequest,
    db: Session = Depends(get_db)
):
    """
    Create a new prediction.

    Supported models:
    - mortality_risk: Predicts mortality risk based on age and severity score
    - length_of_stay: Predicts length of stay in ICU
    - readmission_risk: Predicts risk of readmission
    """
    logger.info(
        "Creating prediction for patient %s with model %s",
        request.patient_id,
        request.model_name,
    )

    # Load and run model
    try:
        model = DummyMLModel(request.model_name)
        prediction, confidence = model.predict(request.features)
    except Exception as e:
        logger.error("Error running model: %s", e)
        raise HTTPException(status_code=500, detail="Model prediction failed") from e

    # Save prediction to database
    db_prediction = PredictionRecord(
        patient_id=request.patient_id,
        model_name=request.model_name,
        features=request.features,
        prediction=prediction,
        confidence=confidence
    )
    db.add(db_prediction)
    db.commit()
    db.refresh(db_prediction)

    return PredictionResponse(
        patient_id=request.patient_id,
        model_name=request.model_name,
        prediction=prediction,
        confidence=confidence,
        timestamp=db_prediction.created_at.isoformat()
    )


@app.post("/prediction", response_model=PlatformPredictionResponse)
async def create_platform_prediction_v2(request: PlatformPredictionRequest):
    """Alias endpoint for /prediccion - maintains naming consistency with platform."""
    return await create_platform_prediction(request)


@app.post("/prediccion", response_model=PlatformPredictionResponse)
async def create_platform_prediction(request: PlatformPredictionRequest):
    """Prediction endpoint compatible with saduci-platform frontend."""
    probability = _platform_prediction_probability(request)
    predicted_class, predicted_label = _prediction_class_and_label(probability)
    return PlatformPredictionResponse(
        probability=probability,
        probability_percent=round(probability * 100.0, 2),
        predicted_class=predicted_class,
        predicted_label=predicted_label,
        threshold=PREDICTION_THRESHOLD,
    )


@app.post("/prediction/explain", response_model=PlatformExplanationResponse)
async def explain_platform_prediction_v2(request: PlatformExplanationRequest):
    """Alias endpoint for /prediccion/explain - maintains naming consistency with platform."""
    return await explain_platform_prediction(request)


@app.post("/prediccion/explain", response_model=PlatformExplanationResponse)
async def explain_platform_prediction(request: PlatformExplanationRequest):
    """Explainability endpoint compatible with saduci-platform frontend."""
    probability = _platform_prediction_probability(request)
    predicted_class, predicted_label = _prediction_class_and_label(probability)
    rows = _platform_feature_importances(request, request.method)

    narrative, narrative_provider, narrative_model = await _generate_narrative(
        request=request,
        probability=probability,
        predicted_label=predicted_label,
        rows=rows,
    )

    return PlatformExplanationResponse(
        method=request.method,
        probability=probability,
        predicted_class=predicted_class,
        predicted_label=predicted_label,
        feature_names=_PLATFORM_FEATURE_NAMES,
        importances=[row["contribution"] for row in rows],
        rows=rows,
        narrative=narrative,
        narrative_provider=narrative_provider,
        narrative_model=narrative_model,
    )


@app.get("/predictions/{patient_id}")
async def get_patient_predictions(
    patient_id: str,
    db: Session = Depends(get_db)
):
    """Get all predictions for a patient."""
    predictions = db.query(PredictionRecord).filter(
        PredictionRecord.patient_id == patient_id
    ).all()

    return {
        "patient_id": patient_id,
        "predictions": [
            {
                "id": p.id,
                "model_name": p.model_name,
                "prediction": p.prediction,
                "confidence": p.confidence,
                "created_at": p.created_at.isoformat()
            }
            for p in predictions
        ]
    }


@app.get("/models")
async def list_models():
    """List available prediction models."""
    return {
        "models": [
            {
                "name": "mortality_risk",
                "description": "Predicts mortality risk based on clinical features",
                "required_features": ["age", "severity_score"]
            },
            {
                "name": "length_of_stay",
                "description": "Predicts expected length of stay in ICU",
                "required_features": ["age", "severity_score"]
            },
            {
                "name": "readmission_risk",
                "description": "Predicts risk of hospital readmission",
                "required_features": ["age", "comorbidities"]
            }
        ]
    }


_load_platform_model()


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8002"))
    uvicorn.run(app, host="0.0.0.0", port=port)
