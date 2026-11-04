"""SADUCI - punto de entrada unico para desarrollo local (sin Docker).

Uso:
    python scripts/saduci.py up      # valida, prepara y levanta todo (idempotente)
    python scripts/saduci.py check   # solo valida lo que ya esta corriendo
    python scripts/saduci.py down    # detiene todo
    python scripts/saduci.py logs    # muestra los ultimos errores de cada log

Diseno: ninguna operacion de red espera indefinidamente; los servidores se
lanzan desacoplados y se verifican por log/puerto, nunca leyendo su stdout.
"""
from __future__ import annotations

import argparse
import json
import os
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts"
CORE = ROOT / "apps" / "core"
SRC = CORE / "src"
PLATFORM = ROOT / "apps" / "platform"
LOGS = ROOT / "logs"
COMPOSE = CORE / "compose.yaml"
ENV_FILE = CORE / ".env"
ENV_EXAMPLE = CORE / ".env.example"


def _project_python() -> Path | None:
    """Python del .venv del backend (donde viven las dependencias)."""
    for candidate in (
        CORE / ".venv" / "Scripts" / "python.exe",  # Windows
        CORE / ".venv" / "bin" / "python",          # POSIX
    ):
        if candidate.exists():
            return candidate
    return None


def _relaunch_with_project_python() -> None:
    """Ejecuta este script con el Python del .venv de apps/core.

    Si se lanzo con el Python del sistema, se relanza como proceso hijo con el
    interprete del venv (donde viven alembic, sqlalchemy, ...) y se reenvia su
    codigo de salida. Asi `python scripts/saduci.py up backend` funciona sin
    activar el venv a mano. Si el .venv no existe, sigue con el Python actual.
    """
    if os.environ.get("SADUCI_PROJECT_PYTHON") == "1":
        return
    project_python = _project_python()
    if project_python is None:
        return
    if Path(sys.executable).resolve() == project_python.resolve():
        os.environ["SADUCI_PROJECT_PYTHON"] = "1"
        return
    env = os.environ.copy()
    env["SADUCI_PROJECT_PYTHON"] = "1"
    print(f"[saduci] usando {project_python}", file=sys.stderr, flush=True)
    try:
        code = subprocess.call(
            [str(project_python), str(Path(__file__).resolve()), *sys.argv[1:]],
            env=env,
        )
    except KeyboardInterrupt:
        code = 130
    sys.exit(code)


_relaunch_with_project_python()

HTTP_TIMEOUT = 8          # segundos por peticion HTTP
BOOT_TIMEOUT = 60         # segundosmax para que un servicio levante
START_STAGGER = 0.6       # pausa entre lanzamientos

GATEWAY, USER_SVC = 7000, 7001
PATIENT_SVC, PRED_SVC, SIM_SVC = 7002, 7003, 7004
FRONTEND = 4000

PYTHON = sys.executable
BUN_CANDIDATES = [
    Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "WinGet" / "Links" / "bun.exe",
    Path(os.environ.get("LOCALAPPDATA", "")) / "Programs" / "bun" / "bun.exe",
]

# Entorno LOCAL de desarrollo. El despliegue con Docker Compose usa los
# secretos de apps/core/.env (ver 'saduci.py secrets'), que son independientes:
# compose levanta Postgres nuevos con esos passwords. No unifiques ambos
# valores sin migrar tambien las bases de datos locales.
LOCAL_DB_PASSWORD = "changeme"

BACKENDS = [
    ("user", USER_SVC,
     f"postgresql+psycopg2://user_user:{LOCAL_DB_PASSWORD}@localhost:5432/user_db"),
    ("patient", PATIENT_SVC,
     f"postgresql+asyncpg://patient_user:{LOCAL_DB_PASSWORD}@localhost:5432/patient_db"),
    ("prediction", PRED_SVC,
     f"postgresql+psycopg2://prediction_user:{LOCAL_DB_PASSWORD}@localhost:5432/prediction_db"),
    ("simulation", SIM_SVC,
     f"postgresql+psycopg2://simulation_user:{LOCAL_DB_PASSWORD}@localhost:5432/simulation_db"),
]

GREEN, RED, YELLOW, DIM, RESET = "\033[32m", "\033[31m", "\033[33m", "\033[2m", "\033[0m"

# (nombre, proceso, handle de log) de todo lo que lanzo este script.
RUNNING: list[tuple[str, subprocess.Popen, object | None]] = []


# --------------------------------------------------------------------------- util
def say(msg: str = "") -> None:
    print(msg, flush=True)


def ok(msg: str) -> None:
    say(f"  {GREEN}OK{RESET}    {msg}")


def bad(msg: str) -> None:
    say(f"  {RED}FALLO{RESET} {msg}")


def warn(msg: str) -> None:
    say(f"  {YELLOW}AVISO{RESET} {msg}")


def step(n: int, total: int, title: str) -> None:
    say(f"\n{DIM}[{n}/{total}]{RESET} {title}")


def port_open(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1.0)
        return s.connect_ex((host, port)) == 0


def http(url: str, timeout: int = HTTP_TIMEOUT, payload: dict | None = None):
    data = json.dumps(payload).encode() if payload is not None else None
    headers = {"User-Agent": "saduci-check"}
    if data:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers,
                                 method="POST" if data else "GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode(errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(errors="replace")
    except Exception as e:
        return None, str(e)


def run(cmd: list[str], timeout: int = 30) -> tuple[int, str]:
    """Ejecuta sin bloquear indefinidamente."""
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return p.returncode, (p.stdout or "") + (p.stderr or "")
    except subprocess.TimeoutExpired:
        return 124, f"timeout tras {timeout}s"
    except Exception as e:
        return 1, str(e)


def tail(path: Path, lines: int = 25) -> str:
    if not path.exists():
        return "(sin log)"
    try:
        content = path.read_text(encoding="utf-8", errors="replace").splitlines()
        return "\n".join(content[-lines:])
    except Exception as e:
        return f"(log ilegible: {e})"


def tail_text(text: str, lines: int = 25) -> str:
    return "\n".join(text.splitlines()[-lines:])


# ------------------------------------------------------------------- 1. preflight
def preflight(need_frontend: bool = True) -> list[str]:
    problems: list[str] = []

    if not port_open(5432):
        problems.append(
            "PostgreSQL no escucha en 5432. Inicialo con:  net start postgresql-x64-16"
        )

    try:
        import sqlalchemy  # noqa: F401
        import fastapi  # noqa: F401
        import uvicorn  # noqa: F401
        import psycopg2  # noqa: F401
        import asyncpg  # noqa: F401
        import alembic  # noqa: F401
    except ImportError as e:
        problems.append(
            f"faltan dependencias Python ({e}).  "
            "Instala el entorno con:  cd apps/core && uv sync --all-packages"
        )

    if _project_python() is None:
        problems.append(
            "no existe apps/core/.venv.  Crealo con:  cd apps/core && uv sync --all-packages"
        )

    if need_frontend:
        if not any(b.exists() for b in BUN_CANDIDATES):
            problems.append("no se encontro bun.exe (necesario para el frontend)")

        if not (PLATFORM / "node_modules").exists():
            problems.append("faltan dependencias del frontend.  cd apps/platform && bun install")

    return problems


# ------------------------------------------------------------ 3. base de datos
def db_reachable(db_url: str) -> bool:
    """Comprueba conectividad real con las credenciales que usara la app."""
    try:
        from sqlalchemy import create_engine, text
        url = db_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
        engine = create_engine(
            url,
            connect_args={"connect_timeout": 3},
            pool_pre_ping=True,
        )
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        engine.dispose()
        return True
    except Exception:
        return False


def ensure_database() -> bool:
    """Verifica que las 4 bases existan y sean accesibles.

    No intenta crearlas a ciegas: psql exige el password del superusuario y
    solospot pediria de mas. Si algo falla, indica el remedio exacto."""
    missing = [name for name, _, url in BACKENDS if not db_reachable(url)]
    if not missing:
        ok("las 4 bases de datos responden")
        return True

    psql = Path(r"C:\Program Files\PostgreSQL\16\bin\psql.exe")
    if not psql.exists():
        bad(f"sin acceso a: {', '.join(missing)} (psql no encontrado)")
        return False

    targets = [("user_db", "user_user"), ("patient_db", "patient_user"),
               ("prediction_db", "prediction_user"), ("simulation_db", "simulation_user")]
    sql = "\n".join([
        *[f"CREATE ROLE {u} LOGIN PASSWORD 'changeme';" for _, u in targets],
        *[f"CREATE DATABASE {d} OWNER {u};" for d, u in targets],
        *[f"GRANT ALL ON SCHEMA public TO {u};" for _, u in targets],
    ])
    code, _ = run([str(psql), "-U", "postgres", "-d", "postgres", "-q",
                   "-v", "ON_ERROR_STOP=0", "-c", sql], timeout=25)
    still = [n for n, _, url in BACKENDS if not db_reachable(url)]
    if not still:
        ok("bases/roles creados y accesibles")
        return True
    bad(f"inaccesibles: {', '.join(still)}")
    if code != 0:
        warn("psql requiere el password del superusuario postgres para crear roles")
    warn("remedio: python scripts/fix_db_permissions.py   (o crea roles/DB manualmente)")
    return False


def dbfix() -> None:
    """Reajusta permisos del schema public. Requiere password del superusuario."""
    script = SCRIPTS / "fix_db_permissions.py"
    if script.exists():
        say(f"Ejecuta:  {PYTHON} {script}")
    else:
        bad("falta scripts/fix_db_permissions.py")


# ---------------------------------------------------------------- 4. arranque
def pids_on_port(port: int) -> list[int]:
    """PIDs que escuchan en un puerto dado (netstat, sin dependencias externas)."""
    try:
        out = subprocess.run(["netstat", "-ano"], capture_output=True, text=True,
                             timeout=20).stdout
    except Exception:
        return []
    pids: set[int] = set()
    for line in out.splitlines():
        parts = line.split()
        if len(parts) >= 5 and f":{port}" in parts[1] and parts[-2] == "LISTENING" \
                and parts[-1].isdigit():
            pids.add(int(parts[-1]))
    return sorted(pids)


# Procesos de Docker que publican puertos del proyecto cuando el stack corre en
# contenedores. Nunca hay que matarlos: al liberar puertos se saltan para no
# tumbar Docker Desktop.
DOCKER_PROCESSES = {
    "com.docker.backend.exe",
    "com.docker.build.exe",
    "docker.exe",
    "dockerd.exe",
    "wslrelay.exe",
    "docker desktop.exe",
}


def _process_name(pid: int) -> str:
    try:
        out = subprocess.run(
            ["tasklist", "/FI", f"PID eq {pid}", "/FO", "CSV", "/NH"],
            capture_output=True, text=True, timeout=10,
        ).stdout
        lines = out.splitlines()
        if not lines:
            return ""
        return lines[0].split(",")[0].strip().strip('"').lower()
    except Exception:
        return ""


def free_ports(ports: list[int] | None = None) -> None:
    """Libera SOLO los puertos del proyecto.

    Importante: nunca usar 'taskkill /IM python.exe', porque este script es
    python.exe y se mataria a si mismo (bug que dejo el arranque a medias).
    Tampoco se tocan los procesos de Docker: si el stack corre en contenedores,
    el usuario debe bajarlos con docker compose."""
    ports = ports or [GATEWAY, USER_SVC, PATIENT_SVC, PRED_SVC, SIM_SVC, FRONTEND]
    killed = 0
    docker_busy: list[int] = []
    for port in ports:
        for pid in pids_on_port(port):
            # no matarse a si mismo
            if pid == os.getpid():
                continue
            if _process_name(pid) in DOCKER_PROCESSES:
                docker_busy.append(port)
                continue
            run(["taskkill", "/F", "/PID", str(pid)], timeout=15)
            killed += 1
    if docker_busy:
        warn(f"puertos en uso por Docker {sorted(set(docker_busy))}: "
             "baja el stack con 'docker compose ... down' antes de usar 'up' local")
    if killed:
        time.sleep(1.5)
        say(f"  {killed} proceso(s) previo(s) liberado(s) en puertos {ports}")


def backend_env(db_url: str | None) -> dict:
    env = os.environ.copy()
    env["PYTHONPATH"] = str(SRC) + os.pathsep + env.get("PYTHONPATH", "")
    env["SECRET_KEY"] = "dev-secret-key-cambiar-en-produccion"
    env["CORS_ALLOW_ORIGINS"] = f"http://localhost:{FRONTEND}"
    env["CORS_ALLOW_CREDENTIALS"] = "true"
    env["LOGIN_RATE_LIMIT_MAX"] = "5"
    env["LOGIN_RATE_LIMIT_WINDOW"] = "60"
    env["AUTH_USERNAME"] = "admin"
    env["AUTH_PASSWORD"] = "changeme"
    env["LOG_LEVEL"] = "INFO"
    env["PREDICTION_NARRATIVE_PROVIDER"] = "stub"
    env["PLATFORM_HOST_PORT"] = str(FRONTEND)
    if db_url:
        env["DATABASE_URL"] = db_url
    return env


def spawn(name: str, cmd: list[str], cwd: Path, env: dict,
          foreground: bool) -> subprocess.Popen:
    """Lanza un servicio y lo registra para poder detenerlo con `down`.

    En primer plano su salida se canaliza por un pipe: un hilo por servicio lo
    etiqueta con el nombre y lo escribe en la terminal, de modo que todos los
    logs convergen en el mismo sitio. El pipe es obligatorio en ese modo: si el
    proceso escribiera direto a un archivo no habria multiplexor, y si nadie
    consumiera un pipe lleno el servicio se bloquearia solo.

    En segundo plano se redirige direto al archivo, sin hilos ni pipes.
    """
    LOGS.mkdir(parents=True, exist_ok=True)
    log_path = LOGS / f"{name}.log"

    if not foreground:
        handle = open(log_path, "w", encoding="utf-8", errors="replace")
        proc = subprocess.Popen(
            cmd, cwd=str(cwd), env=env,
            stdout=handle, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
        )
        RUNNING.append((name, proc, handle))
        return proc

    proc = subprocess.Popen(
        cmd, cwd=str(cwd), env=env,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
        text=True, encoding="utf-8", errors="replace", bufsize=1,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
    )
    RUNNING.append((name, proc, None))
    return proc


def _pump(name: str, proc: subprocess.Popen, handle) -> None:
    """Copia la salida de un servicio al log y a la terminal etiquetada."""
    tag = f"{DIM}{name:<13}{RESET} | "
    try:
        assert proc.stdout is not None
        for line in proc.stdout:
            if handle is not None:
                handle.write(line)
                handle.flush()
            sys.stdout.write(tag + line)
            sys.stdout.flush()
    except Exception:
        pass
    finally:
        if handle is not None:
            try:
                handle.close()
            except Exception:
                pass


def stream_logs() -> None:
    """Converge los logs de todos los servicios en esta terminal.

    No retorna hasta que el usuario interrumpe o hasta que el ultimo servicio
    se cae, momento en el que informa cual fue en lugar de dejar la terminal
    muda sin explicar nada.
    """
    threads = []
    for name, proc, handle in RUNNING:
        thread = threading.Thread(target=_pump, args=(name, proc, handle), daemon=True)
        thread.start()
        threads.append(thread)

    say("")
    say(DIM + "  Ctrl+C para detener. Los logs siguen en logs\\*.log" + RESET)
    say("")

    try:
        while True:
            alive = [(n, p) for n, p, _ in RUNNING if p.poll() is None]
            if not alive:
                break
            time.sleep(0.4)
    except KeyboardInterrupt:
        stop_running()
        say("")
        warn("detenido por el usuario")
        return

    for thread in threads:
        thread.join(timeout=2)

    say("")
    for name, proc, _ in RUNNING:
        code = proc.poll()
        if code:
            bad(f"{name} termino con codigo {code}  (logs\\{name}.log)")
    say(DIM + "  todos los servicios se detuvieron" + RESET)


def stop_running() -> None:
    """Termina solo los procesos que lanzo este script."""
    for name, proc, _ in RUNNING:
        if proc.poll() is not None:
            continue
        try:
            proc.terminate()
        except Exception:
            pass
    deadline = time.time() + 6
    for name, proc, _ in RUNNING:
        remaining = max(0.1, deadline - time.time())
        try:
            proc.wait(timeout=remaining)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass


def migrate(name: str, env: dict) -> bool:
    """Aplica las migraciones Alembic del servicio antes de arrancarlo."""
    try:
        proc = subprocess.run(
            [PYTHON, "-m", "alembic", "upgrade", "head"],
            cwd=str(SRC / name), env=env, capture_output=True, text=True, timeout=90,
        )
    except Exception as e:
        bad(f"migraciones {name}: {e}")
        return False
    if proc.returncode != 0:
        bad(f"migraciones {name}: fallo (rc={proc.returncode})")
        say(tail_text((proc.stdout or "") + (proc.stderr or "")))
        return False
    ok(f"migraciones {name} al dia")
    return True


def start_backends(foreground: bool = False) -> None:
    for name, port, db_url in BACKENDS:
        env = backend_env(db_url)
        migrate(name, env)
        spawn(
            name,
            [PYTHON, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", str(port)],
            SRC / name, env, foreground,
        )
        time.sleep(START_STAGGER)

    gw_env = backend_env(None)
    gw_env.update({
        "USER_SERVICE_URL": f"http://localhost:{USER_SVC}",
        "PATIENT_SERVICE_URL": f"http://localhost:{PATIENT_SVC}",
        "PREDICTION_SERVICE_URL": f"http://localhost:{PRED_SVC}",
        "SIMULATION_SERVICE_URL": f"http://localhost:{SIM_SVC}",
        "GATEWAY_URL": f"http://localhost:{GATEWAY}",
    })
    spawn(
        "api-gateway",
        [PYTHON, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", str(GATEWAY)],
        SRC / "api-gateway", gw_env, foreground,
    )


def find_bun() -> Path | None:
    return next((b for b in BUN_CANDIDATES if b.exists()), None)


def start_frontend(foreground: bool = False) -> bool:
    bun = find_bun()
    if not bun:
        bad("bun.exe no encontrado; el frontend no se iniciara")
        return False
    spawn("frontend", [str(bun), "run", "dev"], PLATFORM, os.environ.copy(), foreground)
    return True


def wait_for(port: int, label: str, timeout: int = BOOT_TIMEOUT) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if port_open(port):
            return True
        time.sleep(0.7)
    bad(f"{label} no respondio en {timeout}s")
    return False


# ---------------------------------------------------------------- 5. validacion
def validate(need_frontend: bool = True) -> bool:
    all_ok = True
    for name, port, _ in BACKENDS:
        if wait_for(port, f"servicio {name}"):
            ok(f"{name} escuchando en {port}")
        else:
            all_ok = False
    if wait_for(GATEWAY, "api-gateway"):
        ok(f"api-gateway escuchando en {GATEWAY}")
    else:
        all_ok = False

    # health real de los 5 servicios (no basta con que el puerto escuche:
    # compose usa condition: service_healthy, asi que /health debe existir)
    for label, port in (("api-gateway", GATEWAY), ("user", USER_SVC), ("patient", PATIENT_SVC),
                        ("prediction", PRED_SVC), ("simulation", SIM_SVC)):
        st, body = http(f"http://localhost:{port}/health")
        if st == 200:
            ok(f"{label:<12} /health -> 200")
        else:
            bad(f"{label:<12} /health -> {st}  (compose lo requiere para depends_on)")
            all_ok = False

    # login real: gateway -> user-service -> postgres
    st, body = http(f"http://localhost:{GATEWAY}/auth/login", timeout=15,
                    payload={"username": "admin", "password": "changeme"})
    if st == 200 and "access_token" in body:
        ok("login admin -> 200 con JWT (gateway -> user-service -> postgres)")
    else:
        bad(f"login admin -> {st}: {body[:120]}")
        all_ok = False

    if need_frontend:
        all_ok = validate_frontend() and all_ok
    return all_ok


def validate_frontend() -> bool:
    """Check both the Next.js page and its server-side connection to Core."""
    if not port_open(FRONTEND):
        bad(f"frontend no escucha en {FRONTEND}")
        return False

    all_ok = True
    status, _ = http(f"http://localhost:{FRONTEND}/", timeout=30)
    if status == 200:
        ok(f"frontend -> 200 en {FRONTEND}")
    else:
        bad(f"frontend -> {status}")
        all_ok = False

    health_status, health_body = http(
        f"http://localhost:{FRONTEND}/api/health", timeout=8
    )
    try:
        backend_reachable = (
            health_status == 200
            and json.loads(health_body).get("reachable") is True
        )
    except (json.JSONDecodeError, AttributeError, TypeError):
        backend_reachable = False

    if backend_reachable:
        ok("frontend BFF -> API Gateway alcanzable")
    else:
        bad(f"frontend BFF -> API Gateway no alcanzable (HTTP {health_status})")
        all_ok = False

    return all_ok


# ---------------------------------------------------------------------- comandos
def cmd_up(target: str = "all", detach: bool = False) -> int:
    want_backend = target in ("all", "backend")
    want_frontend = target in ("all", "platform")
    foreground = not detach
    total = 4

    label = {"all": "sistema completo", "backend": "backend", "platform": "frontend"}[target]
    say("=" * 62)
    say(f" SADUCI - levantando {label} ({'primer plano' if foreground else 'segundo plano'})")
    say("=" * 62)

    step(1, total, "Preflight")
    problems = preflight(need_frontend=want_frontend)
    if problems:
        for p in problems:
            bad(p)
        say("\n  Corrige lo anterior y reintenta.  Detalle: python scripts/saduci.py check")
        return 1
    ok("Python, PostgreSQL" + (", bun y node_modules" if want_frontend else "") + " presentes")

    if want_backend:
        step(2, total, "Base de datos")
        ensure_database()

        step(3, total, "Arrancando servicios")
        free_ports()
        start_backends(foreground)
        say(f"  backends lanzados (logs en {LOGS})")
        time.sleep(2)

        if want_frontend:
            if start_frontend(foreground):
                say("  frontend lanzado")
            time.sleep(3)

        step(4, total, "Validacion end-to-end")
        good = validate(need_frontend=want_frontend)
    else:
        step(1, total, "Arrancando frontend")
        free_ports([FRONTEND])
        if not start_frontend(foreground):
            return 1
        good = wait_for(FRONTEND, "frontend", timeout=90)
        step(2, total, "Validacion")
        if good:
            good = validate_frontend()

    say("")
    say("=" * 62)
    if good:
        say(f" {GREEN}SISTEMA OPERATIVO{RESET}")
    else:
        say(f" {RED}SISTEMA PARCIAL - revisa logs{RESET}")
    say("=" * 62)
    if want_frontend:
        say(f"  Frontend      http://localhost:{FRONTEND}")
    if want_backend:
        say(f"  API Gateway   http://localhost:{GATEWAY}   (docs: /docs)")
        say(f"  User          http://localhost:{USER_SVC}")
        say(f"  Patient       http://localhost:{PATIENT_SVC}")
        say(f"  Prediction    http://localhost:{PRED_SVC}")
        say(f"  Simulation    http://localhost:{SIM_SVC}")
        say("")
        say("  Login:  admin / changeme")
    say("  Logs:   logs\\*.log      Detener:  python scripts/saduci.py down")
    say("")

    if foreground and good:
        stream_logs()
    return 0 if good else 1


def cmd_check() -> int:
    say("=" * 62)
    say(" SADUCI - verificacion del estado actual")
    say("=" * 62)
    step(1, 3, "Preflight")
    problems = preflight()
    if problems:
        for p in problems:
            bad(p)
    else:
        ok("dependencias presentes")

    step(2, 3, "Puertos")
    for label, port in [("api-gateway", GATEWAY), ("user", USER_SVC), ("patient", PATIENT_SVC),
                        ("prediction", PRED_SVC), ("simulation", SIM_SVC), ("frontend", FRONTEND)]:
        (ok if port_open(port) else bad)(f"{label:<12} :{port}")

    step(3, 3, "Validacion end-to-end")
    return 0 if validate() else 1


def cmd_down() -> int:
    say("Deteniendo todo...")
    stop_running()
    free_ports()
    ok("procesos detenidos")
    return 0


def cmd_test(selector: str | None = None) -> int:
    """Ejecuta la suite de tests del backend.

    Cada servicio es un paquete raiz `app` independiente, asi que la suite se
    lanza en un subprocess por servicio (ver apps/core/tests/run_tests.py).
    La salida se muestra en vivo: capturar y descartar deja al usuario sin
    saber que paso."""
    runner = ROOT / "apps" / "core" / "tests" / "run_tests.py"
    if not runner.exists():
        bad(f"no existe {runner}")
        return 1

    args = [PYTHON, str(runner)] + ([selector] if selector else [])
    say(f"\n{DIM}Ejecutando: {' '.join(args[1:])}{RESET}\n")
    try:
        proc = subprocess.Popen(args, cwd=str(ROOT))
        return proc.wait(timeout=900)
    except subprocess.TimeoutExpired:
        proc.kill()
        bad("la suite supero 900s")
        return 1
    except KeyboardInterrupt:
        proc.kill()
        say("\ninterrumpido")
        return 130


def cmd_logs(follow: bool = False) -> int:
    if follow:
        return _follow_logs()
    for log in sorted(LOGS.glob("*.log")):
        say(f"\n{'=' * 62}\n {log.name}\n{'=' * 62}")
        say(tail(log))
    return 0


def _follow_logs() -> int:
    """Sigue los logs de todos los servicios a la vez, con el nombre de cada uno.

    Cada archivo se lee desde el final y se etiqueta, de modo que la terminal
    muestra el mismo multiplexor que `up` en primer plano, sin tener que haber
    arrancado el sistema con este script.
    """
    if not LOGS.exists() or not any(LOGS.glob("*.log")):
        bad(f"no hay logs en {LOGS}")
        return 1

    handles: dict[str, object] = {}
    offsets: dict[str, int] = {}
    for log in sorted(LOGS.glob("*.log")):
        try:
            handle = open(log, "r", encoding="utf-8", errors="replace")
            handle.seek(0, 2)
            handles[log.stem] = handle
            offsets[log.stem] = handle.tell()
        except Exception:
            continue

    if not handles:
        bad("no se pudieron abrir los logs")
        return 1

    say(DIM + "  Ctrl+C para dejar de seguir" + RESET)
    say("")
    try:
        while True:
            for name, handle in handles.items():
                handle.seek(offsets[name])
                for line in handle:
                    if not line.strip():
                        continue
                    sys.stdout.write(f"{DIM}{name:<13}{RESET} | {line}")
                    sys.stdout.flush()
                offsets[name] = handle.tell()
            time.sleep(0.5)
    except KeyboardInterrupt:
        say("")
        return 0
    finally:
        for handle in handles.values():
            try:
                handle.close()
            except Exception:
                pass


# ------------------------------------------------------- secretos de despliegue
SECRET_KEYS = ["SECRET_KEY", "AUTH_PASSWORD", "USER_DB_PASSWORD",
               "PATIENT_DB_PASSWORD", "PREDICTION_DB_PASSWORD", "SIMULATION_DB_PASSWORD"]
PLACEHOLDERS = ("changeme", "replace-with", "cambiar", "admin12345", "postgres")


def read_env(path: Path) -> dict:
    env: dict[str, str] = {}
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip()
    return env


def cmd_secrets(force: bool = False) -> int:
    """Genera secretos reales en apps/core/.env. Idempotente: solo reemplaza valores
    que siguen siendo placeholders, salvo --force."""
    import secrets as _secrets

    env_path = ENV_FILE
    if not env_path.exists():
        if not ENV_EXAMPLE.exists():
            bad(f"no existe {ENV_FILE} ni {ENV_EXAMPLE}")
            return 1
        env_path.write_text(ENV_EXAMPLE.read_text(encoding="utf-8"), encoding="utf-8")
        say(f"  creado {env_path} desde .env.example")

    env = read_env(env_path)
    changed, kept = [], []
    for key in SECRET_KEYS:
        current = env.get(key, "")
        is_placeholder = (not current) or any(p in current.lower() for p in PLACEHOLDERS)
        if force or is_placeholder:
            env[key] = _secrets.token_urlsafe(32)
            changed.append(key)
        else:
            kept.append(key)

    lines = []
    for key, value in env.items():
        lines.append(f"{key}={value}")
    env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    try:
        env_path.chmod(0o600)
    except Exception:
        pass

    if changed:
        ok(f"secretos generados: {', '.join(changed)}")
    if kept:
        say(f"  {DIM}conservados (ya eran seguros): {', '.join(kept)}{RESET}")
    say(f"  escrito en {env_path}")
    warn(f"NO subas {env_path.name} al control de versiones")
    return 0


# ------------------------------------------------- validacion del despliegue
def _service_uses_async_engine(service_dir: Path) -> bool:
    for path in service_dir.rglob("*.py"):
        if "__pycache__" in path.parts:
            continue
        if "create_async_engine" in path.read_text(encoding="utf-8", errors="replace"):
            return True
    return False


def _service_has_health_route(service_dir: Path) -> bool:
    for path in service_dir.rglob("*.py"):
        if "__pycache__" in path.parts:
            continue
        if '"/health"' in path.read_text(encoding="utf-8", errors="replace"):
            return True
    return False


def _pyproject_deps(service_dir: Path) -> str:
    pj = service_dir / "pyproject.toml"
    return pj.read_text(encoding="utf-8", errors="replace") if pj.exists() else ""


def parse_published_ports(text: str) -> list[tuple[str, str, bool]]:
    """Lee solo las secciones 'ports:' -> (servicio, mapeo, es_local)."""
    out: list[tuple[str, str, bool]] = []
    lines = text.splitlines()
    service: str | None = None
    i = 0
    while i < len(lines):
        raw = lines[i]
        stripped = raw.strip()
        if not stripped or stripped.startswith("#"):
            i += 1
            continue
        indent = len(raw) - len(raw.lstrip())
        if indent == 2 and stripped.endswith(":") and not stripped.startswith("-"):
            service = stripped[:-1]
            i += 1
            continue
        if stripped == "ports:":
            j = i + 1
            while j < len(lines):
                nxt = lines[j]
                if not nxt.strip():
                    j += 1
                    continue
                nind = len(nxt) - len(nxt.lstrip())
                if nind <= indent or not nxt.strip().startswith("-"):
                    break
                entry = nxt.strip()[2:].strip().strip('"').strip("'")
                out.append((service or "?", entry, "127.0.0.1" in entry))
                j += 1
            i = j
            continue
        i += 1
    return out


def cmd_deploy_check() -> int:
    """Verifica que compose.yaml sea coherente con el codigo ANTES de
    desplegar. Detecta los fallos que rompian el stack completo."""
    compose = COMPOSE
    if not compose.exists():
        bad(f"no existe {COMPOSE}")
        return 1
    text = compose.read_text(encoding="utf-8", errors="replace")

    services = {
        "user-service": "user", "patient-service": "patient",
        "prediction-service": "prediction", "simulation-service": "simulation",
    }
    problems = 0

    say(f"\n{'':2}1) /health en cada servicio con healthcheck")
    for svc, folder in services.items():
        d = SRC / folder
        has_route = _service_has_health_route(d)
        has_check = f"{svc}" in text and "/health" in text
        if has_route:
            ok(f"{folder:<11} expone /health")
        else:
            bad(f"{folder:<11} SIN /health -> el healthcheck de compose nunca pasara")
            problems += 1
        if not has_check:
            warn(f"{folder:<11} no aparece en compose (revisar si es intencional)")

    say(f"\n{'':2}2) Dialecto de BD compatible con el engine")
    for svc, folder in services.items():
        d = SRC / folder
        is_async = _service_uses_async_engine(d)
        line = next((ln for ln in text.splitlines()
                     if ln.strip().startswith("- DATABASE_URL=") and f"{folder}_user" in ln), "")
        if not line:
            continue
        url = line.split("=", 1)[1]
        if is_async and "+asyncpg" not in url:
            bad(f"{folder:<11} usa create_async_engine pero la URL no es +asyncpg")
            problems += 1
        elif is_async:
            ok(f"{folder:<11} async + asyncpg (coherente)")
        elif url.startswith("postgresql://"):
            ok(f"{folder:<11} sync + psycopg2 (coherente)")
        else:
            warn(f"{folder:<11} revisa el dialecto: {url[:60]}")

    say(f"\n{'':2}3) Driver declarado en pyproject.toml")
    for svc, folder in services.items():
        d = SRC / folder
        deps = _pyproject_deps(d).lower()
        needs = "asyncpg" if _service_uses_async_engine(d) else "psycopg2"
        if needs in deps:
            ok(f"{folder:<11} declara {needs}")
        else:
            bad(f"{folder:<11} NO declara {needs} -> el contenedor no podra arrancar")
            problems += 1

    say(f"\n{'':2}4) Secretos en apps/core/.env")
    env = read_env(ENV_FILE)
    for key in SECRET_KEYS:
        value = env.get(key, "")
        if not value:
            bad(f"{key} vacio o ausente")
            problems += 1
        elif any(p in value.lower() for p in PLACEHOLDERS):
            bad(f"{key} sigue siendo un placeholder")
            problems += 1
        else:
            ok(f"{key} definido")

    say(f"\n{'':2}5) Puertos publicados (solo platform y api-gateway deben ser publicos)")
    published = parse_published_ports(text)
    for svc, entry, local in published:
        if local:
            ok(f"{svc:<22} {entry}  (solo local)")
        else:
            warn(f"{svc:<22} {entry}  (PUBLICO)")

    bad_services = {s for s, _, local in published if not local} - {"platform", "api-gateway"}
    if bad_services:
        bad(f"expuestos sin querer: {', '.join(sorted(bad_services))}")
        problems += 1
    elif published:
        ok("solo platform y api-gateway quedan publics")

    say("")
    if problems:
        bad(f"{problems} problema(s) bloquean el despliegue")
        say("  corregirlos y volver a ejecutar:  python scripts/saduci.py deploy-check")
        return 1
    ok("compose.yaml es coherente con el codigo")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(
        description="SADUCI - orquestador local y validador de despliegue",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Ejemplos:
  python scripts/saduci.py up                 # todo, primer plano (logs en la misma terminal)
  python scripts/saduci.py up --detach        # todo, segundo plano
  python scripts/saduci.py up backend         # solo gateway + microservicios
  python scripts/saduci.py up platform        # solo el frontend
  python scripts/saduci.py logs --follow      # seguir los logs de todos los servicios
  python scripts/saduci.py down               # detener lo que lanzo este script

Alternativa sin este script, cada aplicacion por su cuenta:
  cd apps/core     && docker compose up --build
  cd apps/platform && bun run dev
""",
    )
    ap.add_argument("cmd", nargs="?", default="up",
                    choices=["up", "check", "down", "logs", "test", "dbfix",
                             "secrets", "deploy-check"])
    ap.add_argument("target", nargs="?", default=None,
                    help="con 'up': all|backend|platform. Con 'test': suite (user, gateway, ...)")
    ap.add_argument("--force", action="store_true",
                    help="con 'secrets': regenera aunque ya sean seguros")
    ap.add_argument("-d", "--detach", action="store_true",
                    help="con 'up': arranca en segundo plano en vez de primer plano")
    ap.add_argument("-f", "--follow", action="store_true",
                    help="con 'logs': sigue la salida en vivo")
    args = ap.parse_args()

    if args.cmd == "up":
        target = args.target or "all"
        if target not in ("all", "backend", "platform"):
            bad(f"objetivo desconocido: {target}  (usa all, backend o platform)")
            return 2
        return cmd_up(target, detach=args.detach)
    if args.cmd == "check":
        return cmd_check()
    if args.cmd == "down":
        return cmd_down()
    if args.cmd == "logs":
        return cmd_logs(follow=args.follow)
    if args.cmd == "test":
        return cmd_test(args.target)
    if args.cmd == "secrets":
        return cmd_secrets(force=args.force)
    if args.cmd == "deploy-check":
        return cmd_deploy_check()
    dbfix()
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        say("\ninterrumpido")
        sys.exit(130)
