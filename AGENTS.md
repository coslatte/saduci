# AGENTS.md — SADUCI

Instrucciones compartidas para agentes de IA en este monorepo. Aplican a todo el
repositorio; lo específico de cada aplicación vive en `apps/core/.agents/AGENT.md`
y `apps/platform/.agents/AGENT.md`, y en `apps/*/.agents/skills/`. La metodología
vendor-neutral está en `docs/ai/`.

## Fuentes de verdad

| Qué | Dónde |
|---|---|
| Arquitectura, API, ejecución, despliegue | `docs/sistema/` |
| Metodología de agentes y herramientas | `docs/ai/` |
| Contratos del backend | código en `apps/core/src/`, no la documentación |
| Estado actual y cambios | `git status`, `git log` |

No dupliques información del repositorio en instrucciones o skills: consulta la
fuente con las herramientas.

## Reglas de descubrimiento

1. **Grafo primero.** Antes de `grep`/`glob`, consulta `codebase-memory-mcp`
   (`search_graph`, `trace_path`, `get_code_snippet`, `query_graph`,
   `get_architecture`). Es más barato en contexto que leer archivos.
2. **Navegación de símbolos.** Para definición y referencias exactas usa Serena
   (LSP) o `get_code_snippet`; no leas el archivo entero para ver una función.
3. **Historia.** `git log`, `git show`, `git blame` responden el porqué. El
   grafo no guarda historial.
4. **Reescritura estructural.** Cambios de patrón a escala con `ast-grep`, no
   con `sed` ni regex.
5. **Fallback.** Usa `Grep`, `Glob` y `Read` para literales, configs, archivos
   no-código y verificación, o si el MCP no está disponible.

Detalle y ejemplos en `docs/ai/tooling.md` y la skill `codebase-memory-first`.

## Flujo obligatorio

No pases de la petición a la edición. Entiende, busca, navega, traza, revisa el
historial, evalúa el impacto, implementa y verifica. El flujo completo está en
`docs/ai/workflow.md`.

## Evidencia

- Toda afirmación sobre el código se sostiene con evidencia; cita `ruta:línea`.
- Antes de decir "nadie llama a esto" o "es la única implementación", llama a
  `check_index_coverage` sobre las rutas citadas. Un resultado limpio no prueba
  completitud.
- Si una ruta no está indexada, el grafo no es confiable ahí: lee el código.

## Verificación

La autoridad son los comandos del repositorio. Ningún cambio se declara
terminado sin ejecutarlos.

| Alcance | Comando |
|---|---|
| Backend · tests | `python scripts/saduci.py test` |
| Backend · lint | `uv run ruff check .` (desde `apps/core`) |
| Frontend · tests | `cd apps/platform && bun run test` |
| Frontend · tipos | `cd apps/platform && bunx tsc --noEmit` |
| Frontend · lint | `cd apps/platform && bun run lint` |

`bun run build` solo si el usuario lo pide explícitamente.

## Propósito y marca

- El nombre canónico es **SADUCI — Sistema de Ayuda a la Decisión en la Unidad
  de Cuidados Intensivos**.
- Describe el propósito del software como ayuda para la valoración clínica y la
  toma de decisiones. En el nombre, el branding y los textos propios del
  sistema, usa «ayuda»/«ayudar»; no describas esa función como «apoyo»/«apoyar».
- Presenta SADUCI como una herramienta que ayuda al personal clínico; no como
  sustituto de su criterio profesional.
- Conserva sin cambios las citas textuales y los nombres técnicos canónicos
  cuando «apoyo» forme parte de la fuente citada o de su terminología oficial.

## Idioma

El código (identificadores, rutas, commits, claves de entorno) va en inglés; los
textos visibles y la documentación, en español. El contrato del backend manda
sobre la traducción. Detalle en la skill `project-language`.

## Dónde va cada archivo

Antes de crear un archivo, identifica su categoría y ubícalo según el mapa de la
skill `monorepo-layout`. No crees `docs/`, `scripts/`, `tests/` ni `infra/`
dentro de `apps/*/`.

## Indexación

Indexa la fuente de verdad; excluye salida generada: `.git/`, `node_modules/`,
`.next/`, `dist/`, `build/`, `.venv/`, `__pycache__/`, `coverage/`, `logs/`,
`cache/`, `generated/`. No indexar indiscriminadamente el filesystem.

## Seguridad

Herramientas y almacenamiento locales primero; servicios remotos solo si están
aprobados. No versionar ni registrar claves, tokens, credenciales, `.env`,
certificados ni índices personales. Los servidores MCP reciben solo los permisos
necesarios.

## Herramientas nuevas

Ninguna herramienta entra solo porque "es de IA". Debe cubrir una capacidad
(`UNDERSTAND`, `SEARCH`, `NAVIGATE`, `TRACE`, `REMEMBER`, `MODIFY`, `VERIFY`,
`OBSERVE`), no duplicar lo existente y ser MCP-compatible y compartible. Criterio
completo en `docs/ai/tooling.md`.

## Adaptadores por host

Este archivo (`AGENTS.md`) es la fuente para OpenCode y Codex. `CLAUDE.md` y
`GEMINI.md` son adaptadores ligeros que apuntan aquí. Los servidores MCP del
proyecto se declaran en `opencode.jsonc`.
