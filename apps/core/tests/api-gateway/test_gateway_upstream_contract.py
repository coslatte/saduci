"""Contrato gateway <-> microservicios.

Regresion historica: el gateway llamaba a rutas internas que los servicios no
exponian (p. ej. '/predictions' cuando el servicio usa '/api/predictions'), y el
resultado era 404 upstream traducido a 502 en el gateway. Este test no mockea
nada: descubre las rutas reales de cada servicio y comprueba que toda ruta que
el gateway le pide exista de verdad.
"""
from __future__ import annotations

import re
from pathlib import Path

# este archivo: apps/core/tests/api-gateway/test_*.py
# parents[0]=tests/api-gateway  [1]=tests  [2]=core
SRC = Path(__file__).resolve().parents[2] / "src"
GATEWAY_DIR = SRC / "api-gateway"

CLIENT_TO_SERVICE = {
    "user_client": SRC / "user",
    "patient_client": SRC / "patient",
    "prediction_client": SRC / "prediction",
    "simulation_client": SRC / "simulation",
}
CLIENT_RE = r"(user_client|patient_client|prediction_client|simulation_client)"

# upstream -> user-service. El gateway no debe llamar a /auth/me del
# user-service: ese endpoint devuelve 501 a proposito ("use gateway auth").
FORBIDDEN_UPSTREAM = {"/auth/me"}


def _normalize(route: str) -> str:
    """Quita el query string y homogeneiza los parametros de ruta."""
    route = route.split("?", 1)[0]
    return re.sub(r"\{[^}]+\}", "{}", route)


def _declared_routes(service_dir: Path) -> set[tuple[str, str]]:
    """(metodo, ruta) declarados en los routers del servicio."""
    found: set[tuple[str, str]] = set()
    for path in (service_dir / "app" / "api").glob("*.py"):
        text = path.read_text(encoding="utf-8", errors="replace")
        for method, route in re.findall(
            r'@router\.(get|post|put|delete|patch)\(\s*"([^"]+)"', text, re.DOTALL
        ):
            found.add((method.upper(), _normalize(route)))
    return found


def _upstream_calls() -> list[tuple[str, str, str]]:
    """(cliente, metodo, ruta) que el gateway pide a cada servicio."""
    calls: list[tuple[str, str, str]] = []
    for path in (GATEWAY_DIR / "app" / "api").glob("*.py"):
        text = path.read_text(encoding="utf-8", errors="replace")
        for client, method, route in re.findall(
            rf'{CLIENT_RE}\.(get|post|put|delete)\(\s*f?"([^"]+)"', text, re.DOTALL
        ):
            calls.append((client, method.upper(), route))
        for client, route in re.findall(
            rf'_proxy_with_user\(\s*{CLIENT_RE}\s*,\s*f?"([^"]+)"', text, re.DOTALL
        ):
            calls.append((client, "POST", route))
    return calls


class TestContratoDeRutas:
    def test_encuentra_gateway_y_servicios(self):
        assert GATEWAY_DIR.is_dir(), f"no encuentro {GATEWAY_DIR}"
        for service_dir in CLIENT_TO_SERVICE.values():
            assert service_dir.is_dir(), f"no encuentro {service_dir}"

    def test_toda_ruta_upstream_existe_en_su_servicio(self):
        declaradas = {
            client: _declared_routes(service_dir)
            for client, service_dir in CLIENT_TO_SERVICE.items()
        }
        for client, routes in declaradas.items():
            assert routes, f"no se detectaron rutas en {client}"

        fallos = []
        for client, method, route in _upstream_calls():
            if (method, _normalize(route)) not in declaradas[client]:
                fallos.append(f"{client} {method} {route}")

        assert not fallos, (
            "el gateway llama rutas que el servicio no expone:\n  "
            + "\n  ".join(fallos)
        )

    def test_no_delega_auth_me_al_user_service(self):
        for _client, _method, route in _upstream_calls():
            assert route not in FORBIDDEN_UPSTREAM, (
                f"{route} devuelve 501 en el user-service a proposito"
            )

    def test_el_health_existe_en_cada_servicio(self):
        for client, service_dir in CLIENT_TO_SERVICE.items():
            assert ("GET", "/health") in _declared_routes(service_dir), (
                f"{client}: falta GET /health"
            )
