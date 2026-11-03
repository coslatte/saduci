#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$ROOT_DIR/.env"
if [[ ! -f "$ENV_FILE" && -f "$ROOT_DIR/src/backend/.env" ]]; then
    ENV_FILE="$ROOT_DIR/src/backend/.env"
fi
COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$ROOT_DIR/src/backend/docker-compose.yml")

usage() {
    cat <<'EOF'
Uso: ./b-run.sh [--up | --down | --detached]

  --up        Inicia el backend conectado a esta terminal.
  --down      Detiene el backend.
  --detached  Inicia el backend en segundo plano e informa el PID del gateway.

Sin opciones, inicia el backend en segundo plano. Si ya está activo, muestra
su estado y permite salir o seguir sus logs en esta terminal.
EOF
}

mode="default"
case "${1:-}" in
    "") ;;
    --up) mode="up" ;;
    --down) mode="down" ;;
    --detached) mode="detached" ;;
    -h|--help) usage; exit 0 ;;
    *) usage >&2; exit 2 ;;
esac
if (($# > 1)); then
    usage >&2
    exit 2
fi

cd "$ROOT_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "No existe un archivo .env. Cópialo desde src/backend/.env.example a la raíz o a src/backend/.env." >&2
    exit 1
fi

if ! docker info >/dev/null 2>&1; then
    echo "Docker no está disponible. Inicia Docker e inténtalo de nuevo." >&2
    exit 1
fi

if [[ "$mode" == "down" ]]; then
    "${COMPOSE[@]}" down
    exit
fi

print_status() {
    echo "Estado actual del backend:"
    "${COMPOSE[@]}" ps
}

print_gateway_pid() {
    local container_id pid
    container_id="$("${COMPOSE[@]}" ps -q api-gateway)"
    if [[ -n "$container_id" ]]; then
        pid="$(docker inspect --format '{{.State.Pid}}' "$container_id")"
        echo "PID del proceso del API Gateway en el host: $pid"
    else
        echo "No se encontró el contenedor del API Gateway para consultar su PID."
    fi
}

if [[ "$mode" == "up" ]]; then
    "${COMPOSE[@]}" up --build
    exit
fi

if [[ "$mode" == "default" ]] && [[ -n "$("${COMPOSE[@]}" ps --status running -q)" ]]; then
    print_status
    print_gateway_pid
    if [[ -t 0 ]]; then
        read -r -p "El backend ya está activo. ¿Salir de esta ventana? [S/n] " answer
        case "$answer" in
            n|N|no|NO|No)
                echo "Siguiendo los logs; el backend continúa en segundo plano. Ctrl-C termina el seguimiento, no los servicios."
                "${COMPOSE[@]}" logs -f
                ;;
            *) echo "Saliendo; el backend sigue activo en segundo plano." ;;
        esac
    else
        echo "No hay terminal interactiva; el backend sigue activo en segundo plano."
    fi
    exit
fi

"${COMPOSE[@]}" up --build -d
print_status
print_gateway_pid
