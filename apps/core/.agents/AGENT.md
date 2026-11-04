# AGENT.md — Instrucciones para agentes de IA (saduci-core)

Directrices específicas del backend. El panorama del monorepo está en
`/README.md` y la arquitectura canónica en `docs/sistema/ARCHITECTURE.md`.

## Stack técnico

- **Lenguaje**: Python 3.13 (`requires-python = ">=3.13"`).
- **Framework**: FastAPI + Pydantic; SQLAlchemy 2.
- **Entorno**: `uv` (workspaces). Un único `.venv`; nunca el Python del sistema.
- **Base de datos**: PostgreSQL 16.3 (una base por servicio).
- **Lint**: `ruff` (`line-length = 100`, `target-version = "py313"`,
  `select = ["E", "F", "W"]`, `ignore = ["E402", "E501"]`).

## Servicios y puertos

| Servicio | Puerto | Base de datos | Responsabilidad |
|---|---|---|---|
| `src/api-gateway` | 7000 | — | Enrutado, CORS, JWT, autorización por rol, rate limit, WebSocket de eventos |
| `src/user` | 7001 | `user_db` | Usuarios, registro, login, perfiles |
| `src/patient` | 7002 | `patient_db` | Registro clínico de pacientes (async) |
| `src/prediction` | 7003 | `prediction_db` | Inferencia ML, explicabilidad, narrativa |
| `src/simulation` | 7004 | `simulation_db` | Simulación ICU (SimUCI + fallback) |

Los 4 servicios de datos se publican solo en `127.0.0.1`. El navegador nunca los
alcanza: habla con el BFF de `apps/platform`, que reenvía al gateway :7000.

## Flujo en ejecución

```
Navegador → apps/platform BFF /api/* → API Gateway :7000 → microservicio → su base
```

- El gateway resuelve el JWT y reenvía `X-User-ID`, `X-User-Role` y
  `X-User-Username` a los servicios internos (`app/controllers/auth.py`).
- El gateway traduce los errores de upstream a 502/504 y extrae el `detail`
  real (`app/controllers/proxy.py`). No los reemplaces por mensajes genéricos.
- Cada servicio expone `app.main:app`. Es su paquete raíz: `app/` no se comparte.

## Capas disponibles (MVC por servicio)

- `src/<servicio>/app/api/`: routers FastAPI.
- `src/<servicio>/app/services/`: lógica de negocio.
- `src/<servicio>/app/repositories/`: persistencia.
- `src/<servicio>/app/models/`: entidades y engine SQLAlchemy.
- `src/shared_core/`: kernel compartido — `security`, `exceptions`, `database`,
  `schemas/`, `utils/`.
- `tests/`: suite por servicio (ver Testing).

**Regla de integración:** `api → services → repositories → models`. Un router no
toca la base directamente; un repositorio no conoce HTTP.

## Convenciones del proyecto

- **Database per Service.** Sin claves foráneas entre bases; `user_id` /
  `created_by` se resuelven con los headers de tracking del gateway.
- **Migraciones con Alembic.** Cada servicio con base de datos trae `alembic.ini`
  y `migrations/`. El esquema se aplica con `alembic upgrade head` antes de
  arrancar (CMD de Docker y `saduci.py up`). No se usa `create_all` ni
  `ADD COLUMN` ad-hoc.
- **Dialecto explícito.** `patient` usa `create_async_engine` (`+asyncpg`,
  `+aiosqlite` en tests); el resto usa `create_engine` (`+psycopg2`).
- **Health check por servicio** y logging con el logger de `shared_core`.
- **Contratos en `shared_core/schemas/`.** Un cambio de schema obliga a
  actualizar el test del backend y el mock del frontend en la misma tarea.
- **Idioma.** Identificadores y rutas en inglés; mensajes visibles en español.
  El contrato manda sobre la traducción.

## shared_core

El kernel compartido vive una sola vez en `apps/core/src/shared_core/`. Los
servicios lo consumen como dependencia del workspace (`shared-core = { workspace
= true }`); en Docker, el contexto de build es `apps/core` y cada `Dockerfile`
hace `COPY src/shared_core`. No existen copias por servicio.

**Edita solo `src/shared_core/`.** Un cambio de contrato ahí se refleja en todos
los servicios sin sincronización manual.

## Skills de esta aplicación

En `apps/core/.agents/skills/`:

- `python-code-style`, `python-anti-patterns`, `python-error-handling`,
  `python-configuration`, `python-project-structure`, `python-testing-patterns`.
- `documentation-policy` — gobernanza de `docs/sistema/`.

## Testing

- La suite vive en `apps/core/tests/` y se orquesta con `tests/run_tests.py`:
  **un subprocess de pytest por servicio**, porque cada servicio es un paquete
  raíz `app` independiente y dos no caben en el mismo intérprete.
- `run_tests.py` fija `SECRET_KEY`, `AUTH_USERNAME/PASSWORD`, `NO_PROXY` y una
  `DATABASE_URL` SQLite por suite: ningún test toca la red ni las bases reales.
- Comando oficial: `python scripts/saduci.py test` (o `make test`). Un servicio:
  `python apps/core/tests/run_tests.py user`.
- Los tests son contratos: si cambia un schema, el test debe fallar hasta
  actualizarlo.

## Verificación

| Alcance | Comando |
|---|---|
| Tests | `python scripts/saduci.py test` |
| Lint | `uv run ruff check .` (desde `apps/core`) |
| Entorno | `uv sync --all-packages` (desde `apps/core`) |

No ejecutes `docker compose up --build` ni `deploy-check` durante
implementación salvo que la tarea lo requiera.

## Descubrimiento de código

- Antes de cualquier búsqueda, consulta el grafo de `codebase-memory-mcp`
  (`search_graph`, `trace_path`, `get_code_snippet`, `query_graph`,
  `check_index_coverage`). Es más barato en tokens que leer archivos.
- Usa `grep`/`glob`/lectura directa para literales, configs y verificación, y
  cuando el MCP no esté disponible.
- Detalle en `.agents/skills/codebase-memory-first/SKILL.md` (raíz del monorepo).

## Invariantes obligatorias

1. **Un solo upstream**: navegador → BFF de platform → gateway :7000. Los
   servicios internos no se exponen.
2. **Autenticación centralizada** en el gateway. Un servicio confía en los
   headers `X-User-*`; no revalida el JWT por su cuenta.
3. **Documentación canónica** en `docs/sistema/` (`CHANGELOG.md`,
   `ARCHITECTURE.md`, `API_ENDPOINTS.md`, `RUNNING.md`, `DEPLOY.md`). Sin
   `docs/` locales dentro de `apps/core`.
4. **Secretos por entorno** (`pydantic-settings`); mantener `.env.example` al
   día. Nunca commitear `.env` ni claves.
