from __future__ import annotations

import argparse
import json
import logging
import shutil
import subprocess
import time
from dataclasses import dataclass
from functools import partial
from pathlib import Path
from typing import Any, Callable, Iterable, Optional


logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("saduci-init")


@dataclass
class StepResult:
    name: str
    success: bool
    duration: float
    details: str = ""


@dataclass
class CommandResult:
    stdout: str
    stderr: str
    code: int


STEP_ERRORS = (
    RuntimeError,
    ValueError,
    OSError,
    subprocess.SubprocessError,
    json.JSONDecodeError,
)


class StepTracker:
    def __init__(self) -> None:
        self.steps: list[StepResult] = []

    def run_step(self, name: str, action: Callable[..., str], *args: Any, **kwargs: Any) -> bool:
        logger.info("Iniciando paso: %s", name)
        start = time.time()
        ok = False
        details = ""

        try:
            details = action(*args, **kwargs) or "Completado"
            ok = True
            logger.info("Paso '%s' completado ✅", name)
            return True
        except STEP_ERRORS as exc:
            details = str(exc)
            logger.error("Paso '%s' falló ❌: %s", name, exc)
            return False
        finally:
            self.steps.append(StepResult(name=name, success=ok, duration=time.time() - start, details=details))

    def print_report(self) -> None:
        print("\n" + "=" * 68)
        print(f"{'PASO':<34} | {'ESTADO':<11} | {'TIEMPO (s)':<10}")
        print("-" * 68)
        total = 0.0
        success = 0

        for step in self.steps:
            state = "✅ OK" if step.success else "❌ ERROR"
            print(f"{step.name:<34} | {state:<11} | {step.duration:>10.2f}")
            if not step.success:
                print(f"  Detalle: {step.details}")
            total += step.duration
            success += int(step.success)

        print("-" * 68)
        print(f"Total pasos: {len(self.steps)}")
        print(f"Exitosos: {success}")
        print(f"Fallidos: {len(self.steps) - success}")
        print(f"Tiempo total: {total:.2f}s")
        print("=" * 68)


class DockerComposeRunner:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.compose_file = root / "docker-compose.yml"
        self.compose_cmd = self._detect_compose_command()

    @staticmethod
    def _detect_compose_command() -> list[str]:
        if shutil.which("docker") is None:
            return ["docker", "compose"]

        docker_compose = subprocess.run(
            ["docker", "compose", "version"],
            capture_output=True,
            text=True,
            check=False,
        )
        if docker_compose.returncode == 0:
            return ["docker", "compose"]

        if shutil.which("docker-compose"):
            return ["docker-compose"]

        return ["docker", "compose"]

    def run(self, args: Iterable[str], check: bool = True) -> CommandResult:
        command = [*self.compose_cmd, *args]
        process = subprocess.run(
            command,
            cwd=self.root,
            capture_output=True,
            text=True,
            check=False,
        )
        result = CommandResult(stdout=process.stdout.strip(), stderr=process.stderr.strip(), code=process.returncode)
        if check and result.code != 0:
            raise RuntimeError(
                f"Comando falló ({' '.join(command)}): {result.stderr or result.stdout or 'sin salida'}"
            )
        return result


class SadeciInitializer:
    APP_SERVICES = ["api-gateway", "patient", "prediction", "simulation"]
    DB_SERVICES = ["api-gateway-db", "patient-db", "prediction-db", "simulation-db"]

    def __init__(self, root: Optional[Path] = None) -> None:
        self.root = root or Path(__file__).resolve().parent.parent
        self.runner = DockerComposeRunner(self.root)
        self.compose_file = self.runner.compose_file
        self.tracker = StepTracker()

    def _docker(self, *args: str, check: bool = True) -> CommandResult:
        command = ["docker", *args]
        process = subprocess.run(
            command,
            cwd=self.root,
            capture_output=True,
            text=True,
            check=False,
        )
        result = CommandResult(stdout=process.stdout.strip(), stderr=process.stderr.strip(), code=process.returncode)
        if check and result.code != 0:
            raise RuntimeError(
                f"Comando falló ({' '.join(command)}): {result.stderr or result.stdout or 'sin salida'}"
            )
        return result

    def verify_container_integrity(self) -> bool:
        self.tracker = StepTracker()
        checks = [
            ("Docker instalado", self.check_docker_installed),
            ("Docker daemon activo", self.check_docker_daemon),
            ("docker-compose.yml presente", self.check_compose_file_exists),
            ("Compose válido", self.validate_compose_definition),
            ("Servicios esperados definidos", self.check_expected_services),
        ]
        for name, action in checks:
            if not self.tracker.run_step(name, action):
                self.tracker.print_report()
                return False
        self.tracker.print_report()
        return True

    def initialize(self, with_build: bool = True, wait_seconds: int = 8) -> bool:
        self.tracker = StepTracker()
        steps: list[tuple[str, Callable[[], str]]] = [
            ("Integridad de contenedores", self._require_integrity),
            (
                "Levantar stack",
                partial(self.compose_up, with_build=with_build),
            ),
            ("Verificar estado de servicios", self.verify_services_status),
        ]

        for name, action in steps:
            if not self.tracker.run_step(name, action):
                self.tracker.print_report()
                return False
            if name == "Levantar stack" and wait_seconds > 0:
                logger.info("Esperando %ss para estabilización de contenedores...", wait_seconds)
                time.sleep(wait_seconds)

        self.tracker.print_report()
        return True

    def check_docker_installed(self) -> str:
        if shutil.which("docker") is None:
            raise EnvironmentError("Docker no está instalado o no está en PATH.")
        return "Docker detectado."

    def check_docker_daemon(self) -> str:
        self._docker("info")
        return "Docker daemon en ejecución."

    def check_compose_file_exists(self) -> str:
        if not self.compose_file.exists():
            raise FileNotFoundError(f"No existe {self.compose_file}")
        return f"Archivo encontrado: {self.compose_file.name}"

    def validate_compose_definition(self) -> str:
        self.runner.run(["config", "-q"])
        return "Definición compose válida."

    def check_expected_services(self) -> str:
        result = self.runner.run(["config", "--services"])
        available = {line.strip() for line in result.stdout.splitlines() if line.strip()}
        missing = [svc for svc in [*self.APP_SERVICES, *self.DB_SERVICES] if svc not in available]
        if missing:
            raise RuntimeError(f"Faltan servicios esperados en compose: {', '.join(missing)}")
        return f"Servicios validados ({len(available)}): {', '.join(sorted(available))}"

    def compose_up(self, with_build: bool) -> str:
        args = ["up", "-d"]
        if with_build:
            args.append("--build")
        self.runner.run(args)
        mode = "con build" if with_build else "sin build"
        return f"Stack levantado {mode}."

    def compose_down(self, with_volumes: bool = False) -> str:
        args = ["down"]
        if with_volumes:
            args.append("-v")
        self.runner.run(args)
        suffix = " y volúmenes" if with_volumes else ""
        return f"Stack detenido{suffix}."

    def verify_services_status(self) -> str:
        result = self.runner.run(["ps", "--format", "json"])
        raw = result.stdout.strip()
        if not raw:
            raise RuntimeError("No se detectaron contenedores activos para este proyecto.")

        entries: list[dict[str, Any]]
        try:
            parsed = json.loads(raw)
            entries = parsed if isinstance(parsed, list) else [parsed]
        except json.JSONDecodeError:
            entries = []
            for line in raw.splitlines():
                line = line.strip()
                if line:
                    entries.append(json.loads(line))

        by_service: dict[str, dict[str, str]] = {}
        for item in entries:
            service = str(item.get("Service") or item.get("Name") or "unknown")
            state = str(item.get("State") or "unknown")
            status = str(item.get("Status") or "unknown")
            by_service[service] = {"state": state, "status": status}

        missing_services = [svc for svc in self.APP_SERVICES if svc not in by_service]
        not_running = []
        for service in self.APP_SERVICES:
            if service not in by_service:
                continue
            state = by_service[service]["state"].lower()
            status = by_service[service]["status"].lower()
            if state != "running" and "up" not in status:
                not_running.append(f"{service} ({by_service[service]['state']})")

        if missing_services or not_running:
            details = []
            if missing_services:
                details.append(f"faltan en ps: {', '.join(missing_services)}")
            if not_running:
                details.append(f"no corriendo: {', '.join(not_running)}")
            raise RuntimeError("; ".join(details))

        summary = ", ".join(f"{name}:{info['state']}" for name, info in sorted(by_service.items()))
        return f"Servicios operativos. Estado detectado -> {summary}"

    def _require_integrity(self) -> str:
        self.check_docker_installed()
        self.check_docker_daemon()
        self.check_compose_file_exists()
        self.validate_compose_definition()
        self.check_expected_services()
        return "Integridad validada."


def interactive_cli(app: SadeciInitializer) -> int:
    menu = """
SADUCI-Core :: CLI de Inicialización
====================================
1) Verificación de integridad de contenedores
2) Inicializar stack (up -d --build)
3) Verificar estado actual de servicios
4) Detener stack (down)
0) Salir
"""

    while True:
        print(menu)
        choice = input("Selecciona una opción: ").strip()

        if choice == "1":
            success = app.verify_container_integrity()
        elif choice == "2":
            success = app.initialize(with_build=True)
        elif choice == "3":
            app.tracker = StepTracker()
            success = app.tracker.run_step("Estado de servicios", app.verify_services_status)
            app.tracker.print_report()
        elif choice == "4":
            app.tracker = StepTracker()
            success = app.tracker.run_step("Detener stack", partial(app.compose_down, with_volumes=False))
            app.tracker.print_report()
        elif choice == "0":
            print("Saliendo del CLI.")
            return 0
        else:
            print("Opción inválida. Intenta nuevamente.")
            continue

        print("Resultado: OK\n" if success else "Resultado: ERROR\n")


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="CLI de inicialización para SADUCI-Core")
    parser.add_argument(
        "command",
        nargs="?",
        default="interactive",
        choices=["interactive", "check", "init", "status", "down"],
        help="Comando a ejecutar",
    )
    parser.add_argument(
        "--no-build",
        action="store_true",
        help="En comando 'init', evita recompilar imágenes.",
    )
    parser.add_argument(
        "--down-volumes",
        action="store_true",
        help="En comando 'down', elimina volúmenes.",
    )
    return parser


def main() -> None:
    parser = build_arg_parser()
    args = parser.parse_args()
    app = SadeciInitializer()

    if args.command == "interactive":
        code = interactive_cli(app)
        raise SystemExit(code)

    if args.command == "check":
        raise SystemExit(0 if app.verify_container_integrity() else 1)

    if args.command == "init":
        raise SystemExit(0 if app.initialize(with_build=not args.no_build) else 1)

    if args.command == "status":
        app.tracker = StepTracker()
        ok = app.tracker.run_step("Estado de servicios", app.verify_services_status)
        app.tracker.print_report()
        raise SystemExit(0 if ok else 1)

    if args.command == "down":
        app.tracker = StepTracker()
        ok = app.tracker.run_step("Detener stack", partial(app.compose_down, with_volumes=args.down_volumes))
        app.tracker.print_report()
        raise SystemExit(0 if ok else 1)


if __name__ == "__main__":
    main()
