#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
diagram_dir="$repo_root/docs/sistema/diagramas"

command -v d2 >/dev/null 2>&1 || {
  echo "D2 CLI no está instalado. Consulta https://d2lang.com/tour/install/." >&2
  exit 1
}

d2 --scale 0.5 --animate-interval 600 "$diagram_dir/arquitectura-general.d2" \
  "$diagram_dir/arquitectura-general.gif"
d2 --animate-interval 600 "$diagram_dir/arquitectura-general.d2" \
  "$diagram_dir/arquitectura-general.svg"

for name in autenticacion-roles prediccion-clinica simulacion-estadistica historiales-clinicos; do
  d2 "$diagram_dir/$name.d2" "$diagram_dir/$name.svg"
done
