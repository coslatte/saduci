"""Orquestador de tests del backend SADUCI.

Cada servicio es un paquete raiz independiente cuyo modulo de entrada es
`app.main:app`. Eso significa que dos servicios NO pueden coexistir en el
mismo proceso de Python (el segundo import de `app` devolveria el modulo
cacheado del primero). Por eso aqui se lanza un subprocess de pytest por
servicio, con el cwd en el directorio del servicio: es exactamente como se
ejecuta en produccion.

Uso:
    python apps/core/tests/run_tests.py            # todos
    python apps/core/tests/run_tests.py user       # solo user
    python apps/core/tests/run_tests.py -k login   # pasa -k a pytest
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

TESTS = Path(__file__).resolve().parent
CORE = TESTS.parent
SRC = CORE / "src"

# (nombre, directorio del servicio, carpeta de tests, DATABASE_URL de test)
# El patient es async (create_async_engine), por eso necesita el dialecto
# +aiosqlite; los demas usan create_engine y driver sync.
SUITES: list[tuple[str, Path, str, str]] = [
    ("shared", SRC, "shared", "sqlite://"),
    ("user", SRC / "user", "user", "sqlite://"),
    ("patient", SRC / "patient", "patient", "sqlite+aiosqlite://"),
    ("prediction", SRC / "prediction", "prediction", "sqlite://"),
    ("simulation", SRC / "simulation", "simulation", "sqlite://"),
    ("api-gateway", SRC / "api-gateway", "api-gateway", "sqlite://"),
]

GREEN, RED, YELLOW, DIM, RESET = "\033[32m", "\033[31m", "\033[33m", "\033[2m", "\033[0m"


def main(argv: list[str]) -> int:
    selectors = [a for a in argv if not a.startswith("-")]
    passthrough = [a for a in argv if a.startswith("-")]

    selected = [s for s in SUITES if not selectors or s[0] in selectors]
    if selectors and not selected:
        print(f"Suite desconocida: {selectors}. Disponibles: "
              f"{', '.join(s[0] for s in SUITES)}")
        return 2

    env = os.environ.copy()
    env["SECRET_KEY"] = "test-secret-key-deterministic"
    env["AUTH_USERNAME"] = "admin"
    env["AUTH_PASSWORD"] = "testpass123"
    env["PYTHONPATH"] = str(SRC) + os.pathsep + env.get("PYTHONPATH", "")
    env["PREDICTION_NARRATIVE_PROVIDER"] = "stub"
    # ningun test debe intentar red ni esperar por un servicio externo
    env["NO_PROXY"] = "*"
    env["HTTPX_TIMEOUT"] = "5"

    broken: list[str] = []

    for name, cwd, folder, db_url in selected:
        test_dir = TESTS / folder
        if not test_dir.exists() or not any(test_dir.glob("test_*.py")):
            print(f"{YELLOW}--{RESET} {name}: sin tests, se omite", flush=True)
            continue

        # nunca tocar las bases reales
        suite_env = dict(env)
        suite_env["DATABASE_URL"] = db_url

        print(f"\n{DIM}=== {name} ==={RESET}", flush=True)
        cmd = [sys.executable, "-m", "pytest", str(test_dir), "-q", "--no-header",
               "-o", "asyncio_mode=auto", "-p", "no:cacheprovider", *passthrough]
        try:
            proc = subprocess.run(cmd, cwd=str(cwd), env=suite_env, timeout=180)
            rc = proc.returncode
        except subprocess.TimeoutExpired:
            print(f"{RED}TIMEOUT{RESET} {name} supero 180s", flush=True)
            rc = 124
        except Exception as exc:  # noqa: BLE001
            print(f"{RED}ERROR{RESET} {name}: {exc}", flush=True)
            rc = 1

        if rc == 0:
            print(f"{GREEN}OK{RESET}   {name}", flush=True)
        elif rc == 1:
            print(f"{RED}FALLO{RESET} {name} (tests rojos)", flush=True)
            broken.append(name)
        else:
            print(f"{RED}ERROR{RESET} {name} (rc={rc})", flush=True)
            broken.append(name)

    print(f"\n{'=' * 58}", flush=True)
    if broken:
        print(f"{RED}Suites con problemas: {', '.join(broken)}{RESET}", flush=True)
        return 1
    print(f"{GREEN}Todas las suites en verde{RESET}", flush=True)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except KeyboardInterrupt:
        print("\ninterrumpido")
        sys.exit(130)
