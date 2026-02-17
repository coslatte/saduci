from __future__ import annotations

import importlib.util
import os
import sys
from pathlib import Path
from types import ModuleType
from typing import Mapping

REPO_ROOT = Path(__file__).resolve().parents[1]


def load_module_from_path(module_name: str, relative_path: str, env: Mapping[str, str] | None = None) -> ModuleType:
    """Load a Python module from a file path, optionally setting environment variables."""
    module_path = REPO_ROOT / relative_path
    if not module_path.exists():
        raise FileNotFoundError(f"Module path not found: {module_path}")

    previous_values: dict[str, str | None] = {}
    if env:
        for key, value in env.items():
            previous_values[key] = os.environ.get(key)
            os.environ[key] = value

    try:
        if module_name in sys.modules:
            del sys.modules[module_name]

        spec = importlib.util.spec_from_file_location(module_name, module_path)
        if spec is None or spec.loader is None:
            raise ImportError(f"Could not create spec for module {module_name} at {module_path}")

        module = importlib.util.module_from_spec(spec)
        sys.modules[module_name] = module
        spec.loader.exec_module(module)
        return module
    finally:
        if env:
            for key, old_value in previous_values.items():
                if old_value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = old_value
