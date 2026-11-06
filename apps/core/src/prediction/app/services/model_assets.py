"""Pinned local narrative-model asset and integrity-checked download."""
from __future__ import annotations

import hashlib
import shutil
from pathlib import Path
from urllib.request import urlopen

_SERVICE_DIR = Path(__file__).resolve().parents[2]
NARRATIVE_MODEL_FILENAME = "qwen2.5-1.5b-instruct-q4_k_m.gguf"
NARRATIVE_MODEL_PATH = _SERVICE_DIR / "models" / "llm" / NARRATIVE_MODEL_FILENAME
NARRATIVE_MODEL_URL = (
    "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/"
    "dd26da440ef0330c47919d1ecae0966d24022222/"
    f"{NARRATIVE_MODEL_FILENAME}"
)
NARRATIVE_MODEL_SHA256 = "6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e"


def ensure_narrative_model(path: Path = NARRATIVE_MODEL_PATH) -> None:
    if path.is_file() and _sha256(path) == NARRATIVE_MODEL_SHA256:
        return

    path.parent.mkdir(parents=True, exist_ok=True)
    with urlopen(NARRATIVE_MODEL_URL, timeout=120) as response, path.open("wb") as target:
        shutil.copyfileobj(response, target)

    actual_sha256 = _sha256(path)
    if actual_sha256 != NARRATIVE_MODEL_SHA256:
        path.unlink(missing_ok=True)
        raise ValueError(f"Narrative model checksum mismatch: {actual_sha256}")


def _sha256(path: Path) -> str:
    with path.open("rb") as model_file:
        return hashlib.file_digest(model_file, "sha256").hexdigest()


if __name__ == "__main__":
    ensure_narrative_model()
