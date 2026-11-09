"""In-process CPU model used to verbalize prediction evidence."""
from __future__ import annotations

import asyncio
import os
from pathlib import Path
from threading import Lock
from typing import Any

from shared_core.utils import get_logger
from app.services.model_assets import NARRATIVE_MODEL_PATH

logger = get_logger(__name__)

_MODEL_PATH = Path(os.getenv("PREDICTION_NARRATIVE_MODEL_PATH", str(NARRATIVE_MODEL_PATH)))
_MODEL_STATE: dict[str, Any] = {"model": None, "error": None}
_MODEL_LOCK = Lock()
_MODEL_LOAD_LOCK = Lock()


def load_narrative_model() -> None:
    with _MODEL_LOAD_LOCK:
        if _MODEL_STATE["model"] is not None:
            return
        if not _MODEL_PATH.is_file():
            _MODEL_STATE["model"] = None
            _MODEL_STATE["error"] = f"Narrative model not found at {_MODEL_PATH}"
            logger.warning(_MODEL_STATE["error"])
            return

        try:
            from llama_cpp import Llama

            _MODEL_STATE["model"] = Llama(
                model_path=str(_MODEL_PATH),
                n_ctx=int(os.getenv("PREDICTION_LLM_CONTEXT_SIZE", "2048")),
                n_threads=max(1, int(os.getenv("PREDICTION_LLM_THREADS", "4"))),
                n_batch=128,
                use_mmap=True,
                verbose=False,
            )
            _MODEL_STATE["error"] = None
            logger.info("Loaded local narrative model from %s", _MODEL_PATH)
        except Exception as exc:
            _MODEL_STATE["model"] = None
            _MODEL_STATE["error"] = str(exc)
            logger.exception("Could not load local narrative model: %s", exc)


async def generate_local_narrative(
    system_prompt: str,
    user_prompt: str,
    temperature: float,
) -> str | None:
    if _MODEL_STATE["model"] is None and _MODEL_PATH.is_file():
        await asyncio.to_thread(load_narrative_model)

    model = _MODEL_STATE["model"]
    if model is None:
        return None

    # Use the model's ChatML tokens directly; do not execute the GGUF's embedded
    # Jinja template when formatting clinical input.
    prompt = (
        f"<|im_start|>system\n{system_prompt}<|im_end|>\n"
        f"<|im_start|>user\n{user_prompt}<|im_end|>\n"
        "<|im_start|>assistant\n"
    )

    def complete() -> str:
        with _MODEL_LOCK:
            response = model.create_completion(
                prompt=prompt,
                temperature=min(0.3, max(0.0, temperature)),
                top_p=0.85,
                max_tokens=int(os.getenv("PREDICTION_LLM_MAX_TOKENS", "120")),
                stop=["<|im_end|>", "<|endoftext|>"],
            )
        choices = response.get("choices", [])
        if not choices or not isinstance(choices[0].get("text"), str):
            return ""
        return choices[0]["text"].strip()

    result = await asyncio.to_thread(complete)
    return result or None
