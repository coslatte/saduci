"""Load and require the platform ML model."""
from __future__ import annotations

import hashlib
import os
from pathlib import Path
from typing import Any, Literal

from fastapi import HTTPException
from joblib import load as joblib_load
from pydantic import BaseModel, ConfigDict, Field

from app.services.config import PLATFORM_FEATURE_ORDER
from shared_core.utils import get_logger

logger = get_logger(__name__)

_SERVICE_DIR = Path(__file__).resolve().parents[2]


def _find_core_root(service_dir: Path) -> Path:
    """Find the monorepo core root, or fall back to a standalone image root."""
    return next(
        (
            parent
            for parent in service_dir.parents
            if (parent / "src" / "prediction").is_dir()
        ),
        service_dir,
    )


_CORE_ROOT = _find_core_root(_SERVICE_DIR)


class ModelManifest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    manifest_version: Literal[1]
    model_id: Literal["platform_mortality"]
    model_version: str = Field(min_length=1)
    artifact_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    feature_order: list[str]
    positive_class: Literal[1]
    source_repository: str = Field(min_length=1)
    source_commit: str = Field(pattern=r"^[a-f0-9]{40}$")


PLATFORM_MODEL_STATE: dict[str, Any] = {
    "model": None,
    "path": None,
    "error": None,
    "manifest": None,
}


def platform_model_candidate_paths() -> list[Path]:
    configured_path = os.getenv("PREDICTION_MODEL_PATH", "").strip()

    if configured_path:
        return [Path(configured_path)]

    candidates = [
        _SERVICE_DIR / "artifacts" / "v1" / "new_workflow.joblib",
        _CORE_ROOT / "src" / "prediction" / "artifacts" / "v1" / "new_workflow.joblib",
        Path.cwd() / "src" / "prediction" / "artifacts" / "v1" / "new_workflow.joblib",
        _SERVICE_DIR / "models" / "v1" / "new_workflow.joblib",
        _CORE_ROOT / "src" / "prediction" / "models" / "v1" / "new_workflow.joblib",
        Path.cwd() / "src" / "prediction" / "models" / "v1" / "new_workflow.joblib",
        Path.cwd() / "new_workflow.joblib",
    ]

    deduped: list[Path] = []
    seen: set[str] = set()
    for candidate in candidates:
        key = str(candidate)
        if key not in seen:
            deduped.append(candidate)
            seen.add(key)

    return deduped


def load_platform_model() -> None:
    PLATFORM_MODEL_STATE.update(model=None, path=None, error=None, manifest=None)
    load_errors: list[str] = []
    for candidate_path in platform_model_candidate_paths():
        if not candidate_path.exists():
            continue

        try:
            manifest = ModelManifest.model_validate_json(
                candidate_path.with_name("manifest.json").read_text(encoding="utf-8")
            )
            with candidate_path.open("rb") as artifact:
                checksum = hashlib.file_digest(artifact, "sha256").hexdigest()
            if checksum != manifest.artifact_sha256:
                raise ValueError("El checksum del artefacto no coincide con el manifiesto")
            expected_features = [column for _, column, _ in PLATFORM_FEATURE_ORDER]
            if manifest.feature_order != expected_features:
                raise ValueError("Las variables del manifiesto no coinciden con el contrato")

            loaded_model = joblib_load(candidate_path)
            if not hasattr(loaded_model, "predict_proba"):
                raise TypeError("Loaded object does not expose predict_proba")
            if list(loaded_model.feature_names_in_) != manifest.feature_order:
                raise ValueError("Las variables del modelo no coinciden con el manifiesto")
            if len(loaded_model.classes_) != 2 or set(loaded_model.classes_) != {0, manifest.positive_class}:
                raise ValueError("Las clases del modelo no coinciden con el manifiesto")

            PLATFORM_MODEL_STATE["model"] = loaded_model
            PLATFORM_MODEL_STATE["path"] = str(candidate_path)
            PLATFORM_MODEL_STATE["error"] = None
            PLATFORM_MODEL_STATE["manifest"] = manifest
            logger.info("Loaded platform prediction model from %s", PLATFORM_MODEL_STATE["path"])
            return
        except (OSError, ValueError, TypeError, ImportError, AttributeError) as exc:
            load_errors.append(f"{candidate_path}: {exc}")
            break

    PLATFORM_MODEL_STATE["model"] = None
    PLATFORM_MODEL_STATE["path"] = None
    PLATFORM_MODEL_STATE["error"] = (
        "; ".join(load_errors) if load_errors else "new_workflow.joblib not found"
    )
    logger.error("Platform model could not be loaded: %s", PLATFORM_MODEL_STATE["error"])


def require_platform_model() -> Any:
    if PLATFORM_MODEL_STATE["model"] is None or PLATFORM_MODEL_STATE["manifest"] is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Modelo de predicción no disponible. Configure PREDICTION_MODEL_PATH o proporcione "
                "src/prediction/artifacts/v1/new_workflow.joblib "
                "o src/prediction/models/v1/new_workflow.joblib con manifest.json junto al artefacto. "
                f"Detalles: {PLATFORM_MODEL_STATE['error']}"
            ),
        )

    return PLATFORM_MODEL_STATE["model"]


def platform_model_metadata() -> dict[str, str]:
    require_platform_model()
    manifest = PLATFORM_MODEL_STATE["manifest"]
    return {
        "model_version": manifest.model_version,
        "artifact_sha256": manifest.artifact_sha256,
    }
