#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

if command -v ss >/dev/null && [[ -n "$(ss -H -ltn 'sport = :3030')" ]]; then
  printf '%s\n' 'El puerto 3030 ya está ocupado. Si el frontend ya está en ejecución, abre http://localhost:3030.' >&2
  printf '%s\n' 'Para identificar el proceso: ss -ltnp "sport = :3030"' >&2
  exit 1
fi

cd "$ROOT_DIR/src/frontend"
if [[ -f .env.local ]]; then
  set -a
  source .env.local
  set +a
fi
export API_URL="${API_URL:-http://localhost:8000}"
exec bun dev
