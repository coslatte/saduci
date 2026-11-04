"""Configuracion compartida de los tests del backend.

Este conftest NO importa modulos de ningun servicio a proposito: cada
servicio es un paquete raiz `app` independiente y no puede coexistir con
otro en el mismo proceso. El aislamiento lo hace `run_tests.py`, que lanza
un subprocess por servicio con el cwd correcto.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

TESTS = Path(__file__).resolve().parent
SRC = TESTS.parent / "src"

# shared_core.security exige SECRET_KEY al importarse (falla ruidosamente si
# falta). Estos valores deben fijarse antes de importar cualquier modulo del
# servicio, por eso van a nivel de modulo y no en una fixture.
os.environ.setdefault("SECRET_KEY", "test-secret-key-deterministic")
os.environ.setdefault("AUTH_USERNAME", "admin")
os.environ.setdefault("AUTH_PASSWORD", "testpass123")
os.environ.setdefault("PREDICTION_NARRATIVE_PROVIDER", "stub")

# Por si se ejecuta pytest directamente sobre un subdirectorio.
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))


@pytest.fixture(autouse=True, scope="session")
def _deterministic_env() -> None:
    """Mantiene el entorno reproducible entre ejecuciones."""
    os.environ.setdefault("SECRET_KEY", "test-secret-key-deterministic")
    os.environ.setdefault("AUTH_USERNAME", "admin")
    os.environ.setdefault("AUTH_PASSWORD", "testpass123")
    os.environ.setdefault("PREDICTION_NARRATIVE_PROVIDER", "stub")
